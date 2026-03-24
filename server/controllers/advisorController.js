// controllers/advisorController.js

const fs = require("fs/promises");
const mongoose = require("mongoose");
const AdvisorConversation = require("../models/AdvisorConversation");
const Company = require("../models/Company");
const TradeListing = require("../models/TradeListing");
const Transaction = require("../models/Transaction");

const {
  runAdvisorChat,
  runAdvisorChatStream,
  getAdvisorRuntimeMeta,
} = require("../ai/services/ragRunner");
const { getMarketNewsDigest } = require("../ai/services/marketNewsContextService");

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

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────

async function enrichContextWithMarketNews(baseContext) {
  const start = Date.now();
  try {
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
  } catch (err) {
    console.error("Market news enrichment failed:", err);
    return {
      ...baseContext,
      market_news_digest: "",
      market_news_items: 0,
      market_news_context_ms: Date.now() - start,
    };
  }
}

async function buildCompanyContextForChat(companyId) {
  if (!companyId) {
    const [totalCompanies, activeListings, recentTxAgg] = await Promise.all([
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

    const tx = recentTxAgg[0] || {};

    return enrichContextWithMarketNews({
      scope: "platform",
      total_companies: totalCompanies,
      active_listings: activeListings,
      credits_traded_last_30d: tx.totalCredits || 0,
      volume_last_30d: tx.totalVolume || 0,
    });
  }

  const [company, activeListings, listingsAgg, txAgg, pendingTx, successfulTx] = await Promise.all([
    Company.findById(companyId)
      .select("name companyType status carbonCredits emissionLevel points coins riskScore")
      .lean(),
    TradeListing.countDocuments({ sellerCompany: companyId, status: "ACTIVE" }),
    TradeListing.aggregate([
      { $match: { sellerCompany: companyId, status: "ACTIVE" } },
      { $group: { _id: null, listedCredits: { $sum: "$remainingQuantity" } } },
    ]),
    Transaction.aggregate([
      { $match: { $or: [{ buyerCompany: companyId }, { sellerCompany: companyId }] } },
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

  const trade = txAgg[0] || {};
  const listed = listingsAgg[0] || {};
  const totalTx = trade.transactionCount || 0;
  const successRate = totalTx > 0 ? Math.round((successfulTx / totalTx) * 100) : 0;

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
    listed_credits_open: listed.listedCredits || 0,
    transaction_count: totalTx,
    credits_traded_total: trade.creditsTraded || 0,
    trade_volume_total: trade.volume || 0,
    avg_trade_price: trade.avgTradePrice || 0,
    pending_transactions: pendingTx,
    success_rate_percent: successRate,
  });
}

async function buildInsightsForScope(companyId) {
  const listingFilter = companyId ? { sellerCompany: companyId } : {};
  const txFilter = companyId
    ? { $or: [{ buyerCompany: companyId }, { sellerCompany: companyId }] }
    : {};

  const [
    activeListings,
    openSupply,
    transactions,
    successfulTx,
    pendingTx,
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
    Transaction.countDocuments(txFilter),
    Transaction.countDocuments({ ...txFilter, status: "SUCCESS" }),
    Transaction.countDocuments({ ...txFilter, status: "PENDING" }),
    Transaction.countDocuments({
      ...txFilter,
      payLater: true,
      payLaterDate: { $lt: new Date() },
      status: { $ne: "SUCCESS" },
    }),
    Transaction.aggregate([
      { $match: txFilter },
      { $group: { _id: null, credits: { $sum: "$credits" } } },
    ]),
    Transaction.aggregate([
      { $match: txFilter },
      { $group: { _id: null, amount: { $sum: "$totalAmount" } } },
    ]),
    Transaction.aggregate([
      { $match: { ...txFilter, status: "SUCCESS" } },
      { $group: { _id: null, avgPrice: { $avg: "$pricePerCredit" } } },
    ]),
  ]);

  return {
    cards: [
      {
        type: "Reduction",
        text: `${formatNumber(totalCreditsMoved[0]?.credits || 0)} credits moved; ${formatNumber(openSupply[0]?.remaining || 0)} credits currently listed.`,
      },
      {
        type: "Market",
        text: `${activeListings} active listings with avg settled price ${(avgPriceAgg[0]?.avgPrice || 0).toFixed(2)} per credit.`,
      },
      {
        type: "Compliance",
        text: `${pendingTx} pending trades, ${payLaterDue} overdue pay-later items, ${transactions > 0 ? Math.round((successfulTx / transactions) * 100) : 0}% success rate.`,
      },
    ],
    steps: [
      `Review ${pendingTx} pending transaction(s) and clear blockers before creating new listings.`,
      `Prioritize settlement of ${payLaterDue} overdue pay-later transaction(s).`,
      `Track total trade volume of ${formatNumber(totalVolume[0]?.amount || 0)} and rebalance listing supply weekly.`,
    ],
  };
}

async function buildLiveModelMeta(preferredProvider) {
  try {
    return await getAdvisorRuntimeMeta(preferredProvider);
  } catch (err) {
    console.error("Failed to get model meta:", err);
    return { provider: preferredProvider, model_name: "unknown" };
  }
}

// ────────────────────────────────────────────────
// Conversation History
// ────────────────────────────────────────────────

exports.listConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const companyId = req.user?.company ? String(req.user.company) : null;

    const filter = companyId
      ? { user: userId, company: companyId }
      : { user: userId, company: null };

    const convs = await AdvisorConversation.find(filter)
      .select("_id title lastActive createdAt messages")
      .sort({ lastActive: -1 })
      .limit(50)
      .lean();

    res.json({
      success: true,
      conversations: convs.map(c => ({
        _id: c._id.toString(),
        title: c.title,
        lastActive: c.lastActive,
        createdAt: c.createdAt,
        messageCount: c.messages?.length || 0,
      })),
      scope: companyId ? "company" : "platform",
    });
  } catch (err) {
    console.error("listConversations error:", err);
    res.status(500).json({ success: false, message: "Failed to list conversations" });
  }
};

exports.getConversation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid conversation ID" });
    }

    const conv = await AdvisorConversation.findOne({
      _id: id,
      user: req.user._id,
    }).lean();

    if (!conv) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    res.json({
      success: true,
      conversation: {
        _id: conv._id.toString(),
        title: conv.title,
        messages: conv.messages,
        lastActive: conv.lastActive,
        createdAt: conv.createdAt,
        messageCount: conv.messages?.length || 0,
      },
    });
  } catch (err) {
    console.error("getConversation error:", err);
    res.status(500).json({ success: false, message: "Failed to load conversation" });
  }
};

exports.updateConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    if (!title?.trim()) {
      return res.status(400).json({ success: false, message: "Title is required" });
    }

    const updated = await AdvisorConversation.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { title: title.trim().slice(0, 100) },
      { new: true }
    ).select("_id title lastActive");

    if (!updated) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    res.json({ success: true, conversation: updated });
  } catch (err) {
    console.error("updateConversation error:", err);
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

exports.deleteConversation = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const result = await AdvisorConversation.deleteOne({
      _id: id,
      user: req.user._id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: "Not found" });
    }

    res.json({ success: true, message: "Conversation deleted" });
  } catch (err) {
    console.error("deleteConversation error:", err);
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};

// ────────────────────────────────────────────────
// Chat (non-stream)
// ────────────────────────────────────────────────

exports.chat = async (req, res) => {
  const start = Date.now();
  const { question, provider: provInput, conversationId } = req.body;
  const pdfPath = req.file?.path;
  const provider = resolveRequestedProvider(provInput);
  const userId = req.user._id;
  const companyId = req.user?.company ? String(req.user.company) : null;

  if (!question?.trim()) {
    if (pdfPath) await fs.unlink(pdfPath).catch(() => {});
    return res.status(400).json({ success: false, message: "Question required" });
  }

  let conversation;

  try {
    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
      conversation = await AdvisorConversation.findOne({
        _id: conversationId,
        user: userId,
      });
      if (!conversation) {
        return res.status(404).json({ success: false, message: "Conversation not found" });
      }
    } else {
      // Always create NEW conversation when no conversationId is provided
      conversation = new AdvisorConversation({
        user: userId,
        company: companyId || null,
        title: "New chat",
        messages: [],
      });
    }

    conversation.messages.push({
      role: "user",
      content: question.trim(),
      timestamp: new Date(),
    });
    await conversation.save();

    const companyContext = await buildCompanyContextForChat(companyId);
    const ragResult = await runAdvisorChat({ question, provider, pdfPath, companyContext });

    conversation.messages.push({
      role: "assistant",
      content: ragResult.answer,
      sources: ragResult.sources || [],
      metadata: ragResult.meta || {},
      timestamp: new Date(),
    });
    await conversation.save();

    res.json({
      success: true,
      answer: ragResult.answer,
      sources: ragResult.sources || [],
      conversationId: conversation._id.toString(),
      title: conversation.title,
      meta: {
        ...(ragResult.meta || {}),
        controller_timings_ms: { total_ms: Date.now() - start },
      },
    });
  } catch (err) {
    console.error("chat error:", err);
    res.status(500).json({ success: false, message: err.message || "Advisor failed" });
  } finally {
    if (pdfPath) await fs.unlink(pdfPath).catch(() => {});
  }
};

// ────────────────────────────────────────────────
// Chat Stream
// ────────────────────────────────────────────────

exports.chatStream = async (req, res) => {
  const start = Date.now();
  const { question, provider: provInput, conversationId } = req.body;
  const pdfPath = req.file?.path;
  const provider = resolveRequestedProvider(provInput);
  const userId = req.user._id;
  const companyId = req.user?.company ? String(req.user.company) : null;

  if (!question?.trim()) {
    if (pdfPath) await fs.unlink(pdfPath).catch(() => {});
    return res.status(400).json({ success: false, message: "Question required" });
  }

  res.set({
    "Content-Type": "application/x-ndjson",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  let conversation;

  try {
    if (conversationId && mongoose.Types.ObjectId.isValid(conversationId)) {
      conversation = await AdvisorConversation.findOne({
        _id: conversationId,
        user: userId,
      });
      if (!conversation) throw new Error("Conversation not found");
    } else {
      // Always create NEW conversation when no conversationId is provided
      conversation = new AdvisorConversation({
        user: userId,
        company: companyId || null,
        title: "New chat",
        messages: [],
      });
    }

    conversation.messages.push({
      role: "user",
      content: question.trim(),
      timestamp: new Date(),
    });
    await conversation.save();

    const companyContext = await buildCompanyContextForChat(companyId);

    let fullAnswer = "";
    const sources = [];

    await runAdvisorChatStream({
      question,
      provider,
      pdfPath,
      companyContext,
      onToken: (token) => {
        fullAnswer += token;
        res.write(JSON.stringify({ type: "token", token }) + "\n");
      },
    });

    conversation.messages.push({
      role: "assistant",
      content: fullAnswer,
      sources,
      metadata: { streamed: true },
      timestamp: new Date(),
    });
    await conversation.save();

    res.write(
      JSON.stringify({
        type: "final",
        payload: {
          answer: fullAnswer,
          sources,
          conversationId: conversation._id.toString(),
          title: conversation.title,
          meta: {
            controller_timings_ms: { total_ms: Date.now() - start },
          },
        },
      }) + "\n"
    );
    res.end();
  } catch (err) {
    console.error("chatStream error:", err);
    if (!res.headersSent) {
      res.write(JSON.stringify({ type: "error", message: err.message || "Streaming failed" }) + "\n");
    } else {
      res.write(JSON.stringify({ type: "error", message: "Streaming interrupted" }) + "\n");
    }
    res.end();
  } finally {
    if (pdfPath) await fs.unlink(pdfPath).catch(() => {});
  }
};

// ────────────────────────────────────────────────
// Insights
// ────────────────────────────────────────────────

exports.getInsights = async (req, res) => {
  try {
    const preferredProvider = resolveRequestedProvider(req.query.provider || PROVIDER.LMSTUDIO);
    const companyId = req.user?.company ? String(req.user.company) : null;

    const [model, insights] = await Promise.all([
      buildLiveModelMeta(preferredProvider),
      buildInsightsForScope(companyId),
    ]);

    let scope = "Platform";
    if (companyId) {
      const company = await Company.findById(companyId).select("name").lean();
      scope = company?.name || "Company";
    }

    res.json({
      ...insights,
      scope,
      model,
    });
  } catch (err) {
    console.error("getInsights error:", err);
    res.status(500).json({ success: false, message: "Failed to load insights" });
  }
};