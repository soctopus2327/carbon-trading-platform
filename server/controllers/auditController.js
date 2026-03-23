const Audit = require("../models/Audit");
const Company = require("../models/Company");
const TradeListing = require("../models/TradeListing");
const Transaction = require("../models/Transaction");
const { generateAuditFromPdf } = require("../ai/services/auditRunner");

async function buildCompanyContextForAudit(companyId) {
  const [company, listings, txAgg, pendingTransactions] = await Promise.all([
    Company.findById(companyId)
      .select("name companyType status emissionLevel carbonCredits riskScore")
      .lean(),
    TradeListing.countDocuments({ sellerCompany: companyId, status: "ACTIVE" }),
    Transaction.aggregate([
      { $match: { $or: [{ buyerCompany: companyId }, { sellerCompany: companyId }] } },
      {
        $group: {
          _id: null,
          txCount: { $sum: 1 },
          credits: { $sum: "$credits" },
          volume: { $sum: "$totalAmount" },
        },
      },
    ]),
    Transaction.countDocuments({
      $or: [{ buyerCompany: companyId }, { sellerCompany: companyId }],
      status: "PENDING",
    }),
  ]);

  const stats = txAgg[0] || {};

  return {
    company_name: company?.name || "Unknown",
    company_type: company?.companyType || "UNKNOWN",
    company_status: company?.status || "UNKNOWN",
    emission_level: company?.emissionLevel || 0,
    carbon_credits_balance: company?.carbonCredits || 0,
    risk_score: company?.riskScore || 0,
    active_listings: listings,
    total_transactions: stats.txCount || 0,
    total_credits_traded: stats.credits || 0,
    total_trade_volume: stats.volume || 0,
    pending_transactions: pendingTransactions,
  };
}

exports.generateAudit = async (req, res) => {
  const companyId = req.user?.company ? String(req.user.company) : null;
  const provider = String(req.body.provider || "lmstudio").trim();
  const reportPeriod = String(req.body.reportPeriod || "").trim();
  const pdfPath = req.file?.path;

  if (!companyId) {
    return res.status(403).json({ message: "Audit generation is available for company users only" });
  }

  if (!pdfPath) {
    return res.status(400).json({ message: "Emission report PDF is required" });
  }

  const company = await Company.findById(companyId).select("emissionLevel");
  if (!company) {
    return res.status(404).json({ message: "Company not found" });
  }

  const audit = await Audit.create({
    company: companyId,
    auditor: req.user._id,
    emissionLevel: company.emissionLevel || 0,
    status: "PENDING",
    reportPeriod,
    sourceDocumentPath: pdfPath,
    sourceDocumentName: req.file.originalname,
  });

  try {
    const companyContext = await buildCompanyContextForAudit(companyId);
    const generated = await generateAuditFromPdf({
      provider,
      pdfPath,
      companyContext,
      reportPeriod,
    });

    audit.status = "GENERATED";
    audit.summary = generated.summary;
    audit.findings = generated.findings;
    audit.recommendations = generated.recommendations;
    audit.riskLevel = generated.riskLevel;
    audit.limitations = generated.limitations;
    audit.report = generated.reportText;
    audit.meta = {
      provider: generated.meta?.provider_used || generated.meta?.provider || provider,
      model: generated.meta?.model_name || "unknown",
      timings: generated.meta?.runner_timings_ms || {},
      sources: generated.sources || [],
    };
    audit.generatedAt = new Date();
    await audit.save();

    return res.status(201).json({
      message: "Audit report generated",
      audit,
    });
  } catch (err) {
    audit.status = "FAILED";
    audit.errorMessage = err.message || "Audit generation failed";
    await audit.save();

    return res.status(500).json({ message: err.message || "Audit generation failed", auditId: audit._id });
  }
};

exports.getAuditById = async (req, res) => {
  const audit = await Audit.findById(req.params.id)
    .populate("company", "name")
    .populate("auditor", "name email");

  if (!audit) {
    return res.status(404).json({ message: "Audit not found" });
  }

  const isOwner = req.user?.company && String(req.user.company) === String(audit.company?._id || audit.company);
  const isPlatformAdmin = req.user?.role === "PLATFORM_ADMIN";

  if (!isOwner && !isPlatformAdmin) {
    return res.status(403).json({ message: "Not authorized to view this audit" });
  }

  return res.json(audit);
};

exports.listMyAudits = async (req, res) => {
  const companyId = req.user?.company ? String(req.user.company) : null;
  if (!companyId) {
    return res.status(200).json([]);
  }

  const audits = await Audit.find({ company: companyId })
    .sort({ createdAt: -1 })
    .populate("auditor", "name");

  return res.json(audits);
};
