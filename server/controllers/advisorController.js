const fs = require("fs/promises");
const { runAdvisorChat, runAdvisorChatStream, getAdvisorRuntimeMeta } = require("../ai/services/ragRunner");
const { getMarketNewsDigest } = require("../ai/services/marketNewsContextService");
const Company = require("../models/Company");
const TradeListing = require("../models/TradeListing");
const Transaction = require("../models/Transaction");

const PROVIDER = {
  OPENAI: "openai",
  LMSTUDIO: "lmstudio",
};

function resolveRequestedProvider(value) {
  return value === PROVIDER.LMSTUDIO ? PROVIDER.LMSTUDIO : PROVIDER.OPENAI;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

async function enrichContextWithMarketNews(baseContext) {
  const start = Date.now();
  const payload = await getMarketNewsDigest({
    ttlMs: 15 * 60 * 1000,
    timeoutMs: 800,
    limit: 3,
  });

  return {
    ...baseContext,
    market_news_digest: (payload.digest || []).join(" | "),
    market_news_items: (payload.digest || []).length,
    market_news_cache_hit: Boolean(payload.meta?.cache_hit),
    market_news_cache_stale: Boolean(payload.meta?.stale),
    market_news_context_ms: Date.now() - start,
  };
}

async function buildCompanyContextForChat(companyId) {
  if (!companyId) {
    const [totalCompanies, activeListings, recentTransactionsAgg] = await Promise.all([
      Company.countDocuments({}),
      TradeListing.countDocuments({ status: "ACTIVE" }),
      Transaction.aggregate([
        { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        {
          $group: {
            _id: null,
            totalCredits: { $sum: "$credits" },
            totalVolume: { $sum: "$totalAmount" },
          },
        },
      ]),
    ]);

    return enrichContextWithMarketNews({
      scope: "platform",
      total_companies: totalCompanies,
      active_listings: activeListings,
      credits_traded_last_30d: recentTransactionsAgg[0]?.totalCredits || 0,
      volume_last_30d: recentTransactionsAgg[0]?.totalVolume || 0,
    });
  }

  const [company, activeListings, listingsAgg, txAgg, pendingTx, successfulTx] = await Promise.all([
    Company.findById(companyId)
      .select("name companyType status carbonCredits emissionLevel points coins riskScore")
      .lean(),
    TradeListing.countDocuments({ sellerCompany: companyId, status: "ACTIVE" }),
    TradeListing.aggregate([
      { $match: { sellerCompany: companyId, status: "ACTIVE" } },
      {
        $group: {
          _id: null,
          listedCredits: { $sum: "$remainingQuantity" },
        },
      },
    ]),
    Transaction.aggregate([
      {
        $match: {
          $or: [{ buyerCompany: companyId }, { sellerCompany: companyId }],
        },
      },
      {
        $group: {
          _id: null,
          transactionCount: { $sum: 1 },
          creditsTraded: { $sum: "$credits" },
          volume: { $sum: "$totalAmount" },
          avgTradePrice: { $avg: "$pricePerCredit" },
        },
      },
    ]),
    Transaction.countDocuments({
      $or: [{ buyerCompany: companyId }, { sellerCompany: companyId }],
      status: "PENDING",
    }),
    Transaction.countDocuments({
      $or: [{ buyerCompany: companyId }, { sellerCompany: companyId }],
      status: "SUCCESS",
    }),
  ]);

  const tradeSummary = txAgg[0] || {};
  const listedSummary = listingsAgg[0] || {};
  const totalTransactions = tradeSummary.transactionCount || 0;
  const successRate = totalTransactions > 0 ? Math.round((successfulTx / totalTransactions) * 100) : 0;

  return enrichContextWithMarketNews({
    scope: "company",
    company_name: company?.name || "Unknown",
    company_type: company?.companyType || "UNKNOWN",
    company_status: company?.status || "UNKNOWN",
    carbon_credits_balance: company?.carbonCredits || 0,
    emission_level: company?.emissionLevel || 0,
    risk_score: company?.riskScore || 0,
    points: company?.points || 0,
    coins: company?.coins || 0,
    active_listings: activeListings,
    listed_credits_open: listedSummary.listedCredits || 0,
    transaction_count: totalTransactions,
    credits_traded_total: tradeSummary.creditsTraded || 0,
    trade_volume_total: tradeSummary.volume || 0,
    avg_trade_price: tradeSummary.avgTradePrice || 0,
    pending_transactions: pendingTx,
    success_rate_percent: successRate,
  });
}

async function buildInsightsForScope(companyId) {
  const listingFilter = companyId ? { sellerCompany: companyId } : {};
  const transactionFilter = companyId
    ? { $or: [{ buyerCompany: companyId }, { sellerCompany: companyId }] }
    : {};

  const [
    activeListings,
    openSupply,
    transactions,
    successfulTransactions,
    pendingTransactions,
    payLaterDue,
    totalCreditsMoved,
    totalVolume,
    avgPriceAgg,
  ] = await Promise.all([
    TradeListing.countDocuments({ ...listingFilter, status: "ACTIVE" }),
    TradeListing.aggregate([
      { $match: { ...listingFilter, status: "ACTIVE" } },
      { $group: { _id: null, remaining: { $sum: "$remainingQuantity" } } },
    ]),
    Transaction.countDocuments(transactionFilter),
    Transaction.countDocuments({ ...transactionFilter, status: "SUCCESS" }),
    Transaction.countDocuments({ ...transactionFilter, status: "PENDING" }),
    Transaction.countDocuments({
      ...transactionFilter,
      payLater: true,
      payLaterDate: { $lt: new Date() },
      status: { $ne: "SUCCESS" },
    }),
    Transaction.aggregate([
      { $match: transactionFilter },
      { $group: { _id: null, credits: { $sum: "$credits" } } },
    ]),
    Transaction.aggregate([
      { $match: transactionFilter },
      { $group: { _id: null, amount: { $sum: "$totalAmount" } } },
    ]),
    Transaction.aggregate([
      { $match: { ...transactionFilter, status: "SUCCESS" } },
      { $group: { _id: null, avgPrice: { $avg: "$pricePerCredit" } } },
    ]),
  ]);

  const openSupplyCredits = openSupply[0]?.remaining || 0;
  const movedCredits = totalCreditsMoved[0]?.credits || 0;
  const movedAmount = totalVolume[0]?.amount || 0;
  const averagePrice = avgPriceAgg[0]?.avgPrice || 0;
  const successRate = transactions > 0 ? Math.round((successfulTransactions / transactions) * 100) : 0;

  return {
    cards: [
      {
        type: "Reduction",
        text: `${formatNumber(movedCredits)} credits moved; ${formatNumber(openSupplyCredits)} credits currently listed.`,
      },
      {
        type: "Market",
        text: `${activeListings} active listings with avg settled price ${averagePrice.toFixed(2)} per credit.`,
      },
      {
        type: "Compliance",
        text: `${pendingTransactions} pending trades, ${payLaterDue} overdue pay-later items, ${successRate}% success rate.`,
      },
    ],
    steps: [
      `Review ${pendingTransactions} pending transaction(s) and clear blockers before creating new listings.`,
      `Prioritize settlement of ${payLaterDue} overdue pay-later transaction(s).`,
      `Track total trade volume of ${formatNumber(movedAmount)} and rebalance listing supply weekly.`,
    ],
  };
}

async function buildLiveModelMeta(preferredProvider) {
  return getAdvisorRuntimeMeta(preferredProvider);
}

exports.chat = async (req, res) => {
  const controllerStart = Date.now();

  const question = (req.body.question || "").trim();
  const provider = resolveRequestedProvider(String(req.body.provider || PROVIDER.LMSTUDIO).trim());
  const pdfPath = req.file?.path;

  if (!question) {
    if (pdfPath) await fs.unlink(pdfPath).catch(() => {});
    return res.status(400).json({ message: "Question is required" });
  }

  try {
    const companyContextStart = Date.now();
    const companyContext = await buildCompanyContextForChat(req.user?.company ? String(req.user.company) : null);
    const companyContextMs = Date.now() - companyContextStart;

    const ragStart = Date.now();
    const result = await runAdvisorChat({ question, provider, pdfPath, companyContext });
    const ragMs = Date.now() - ragStart;

    return res.json({
      message: "Advisor response generated",
      answer: result.answer,
      sources: result.sources || [],
      meta: {
        ...(result.meta || {}),
        controller_timings_ms: {
          company_context_ms: companyContextMs,
          rag_call_ms: ragMs,
          controller_total_ms: Date.now() - controllerStart,
        },
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Advisor failed" });
  } finally {
    if (pdfPath) {
      await fs.unlink(pdfPath).catch(() => {});
    }
  }
};

exports.getInsights = async (req, res) => {
  try {
    const preferredProvider = resolveRequestedProvider(String(req.query.provider || PROVIDER.LMSTUDIO).trim());
    const userCompanyId = req.user?.company ? String(req.user.company) : null;

    const [model, insights] = await Promise.all([
      buildLiveModelMeta(preferredProvider),
      buildInsightsForScope(userCompanyId),
    ]);

    if (userCompanyId) {
      const company = await Company.findById(userCompanyId).select("name");
      return res.json({
        ...insights,
        scope: company?.name || "Company",
        model,
      });
    }

    return res.json({
      ...insights,
      scope: "Platform",
      model,
    });
  } catch (err) {
    return res.status(500).json({ message: err.message || "Failed to load advisor insights" });
  }
};

exports.chatStream = async (req, res) => {
  const controllerStart = Date.now();

  const question = (req.body.question || "").trim();
  const provider = resolveRequestedProvider(String(req.body.provider || PROVIDER.LMSTUDIO).trim());
  const pdfPath = req.file?.path;

  if (!question) {
    if (pdfPath) await fs.unlink(pdfPath).catch(() => {});
    return res.status(400).json({ message: "Question is required" });
  }

  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const companyContextStart = Date.now();
    const companyContext = await buildCompanyContextForChat(req.user?.company ? String(req.user.company) : null);
    const companyContextMs = Date.now() - companyContextStart;

    const ragStart = Date.now();
    const result = await runAdvisorChatStream({
      question,
      provider,
      pdfPath,
      companyContext,
      onToken: (token) => {
        res.write(`${JSON.stringify({ type: "token", token })}\n`);
      },
    });
    const ragMs = Date.now() - ragStart;

    res.write(
      `${JSON.stringify({
        type: "final",
        payload: {
          message: "Advisor response generated",
          answer: result.answer,
          sources: result.sources || [],
          meta: {
            ...(result.meta || {}),
            controller_timings_ms: {
              company_context_ms: companyContextMs,
              rag_call_ms: ragMs,
              controller_total_ms: Date.now() - controllerStart,
            },
          },
        },
      })}\n`
    );
    res.end();
  } catch (err) {
    res.write(
      `${JSON.stringify({
        type: "error",
        message: err.message || "Advisor failed",
      })}\n`
    );
    res.end();
  } finally {
    if (pdfPath) {
      await fs.unlink(pdfPath).catch(() => {});
    }
  }
};