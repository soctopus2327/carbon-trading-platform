const { spawn } = require("child_process");
const path = require("path");

const AUDIT_GENERATOR_SCRIPT = path.join(__dirname, "..", "audit_generator", "audit_generator.py");
const PYTHON_BIN = process.env.ADVISOR_PYTHON_PATH || "python";

function toNumber(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function inferRiskLevel(companyContext) {
  const riskScore = toNumber(companyContext?.risk_score);
  const pendingTransactions = toNumber(companyContext?.pending_transactions);

  if (riskScore >= 80 || pendingTransactions >= 12) return "HIGH";
  if (riskScore >= 45 || pendingTransactions >= 5) return "MEDIUM";
  return "LOW";
}

function buildFallbackAudit({ companyContext, reportPeriod, reason }) {
  const riskLevel = inferRiskLevel(companyContext);
  const credits = toNumber(companyContext?.total_credits_traded);
  const txCount = toNumber(companyContext?.total_transactions);
  const pending = toNumber(companyContext?.pending_transactions);

  const findings = [
    {
      title: "Insufficient AI extraction coverage",
      severity: "MEDIUM",
      evidence: "Audit was generated using fallback rules because the AI analysis backend was unavailable.",
      impact: "Document-level evidence may be incomplete until the AI pipeline is restored.",
    },
    {
      title: "Transaction activity review",
      severity: pending > 0 ? "MEDIUM" : "LOW",
      evidence: `Total transactions: ${txCount}; pending transactions: ${pending}; credits traded: ${credits}.`,
      impact:
        pending > 0
          ? "Pending trades can delay reconciliation and period closure."
          : "No immediate settlement backlog detected.",
    },
  ];

  const recommendations = [
    {
      action: "Re-run AI audit once model service is available",
      priority: "HIGH",
      rationale: "A full evidence-backed PDF analysis is required for higher-confidence findings.",
    },
    {
      action: "Validate pending transactions and ledger consistency",
      priority: pending > 0 ? "HIGH" : "MEDIUM",
      rationale: "Reducing pending volume improves reporting completeness before submission.",
    },
  ];

  const summary = [
    `Audit period: ${reportPeriod || "unspecified"}.`,
    "A fallback audit was generated due to temporary AI service unavailability.",
    `Company risk is currently assessed as ${riskLevel}.`,
  ].join(" ");

  const limitations = [
    "Fallback mode used heuristic checks and did not perform full document semantic analysis.",
    reason ? `Runner error: ${reason}` : "Runner error details unavailable.",
  ];

  return {
    summary,
    riskLevel,
    findings,
    recommendations,
    limitations,
    reportText: summary,
    sources: [],
    meta: {
      provider_used: "fallback",
      model_name: "none",
      fallback_reason: "AI backend unavailable",
    },
  };
}

function runPythonAuditCore({ provider, pdfPath, companyContext, reportPeriod }) {
  return new Promise((resolve, reject) => {
    const args = [
      AUDIT_GENERATOR_SCRIPT,
      "--provider",
      provider,
      "--pdf",
      pdfPath,
      "--report-period",
      String(reportPeriod || ""),
    ];

    if (companyContext && typeof companyContext === "object") {
      const encodedContext = Buffer.from(JSON.stringify(companyContext), "utf8").toString("base64");
      args.push("--company-context-base64", encodedContext);
    }

    const child = spawn(PYTHON_BIN, args, {
      cwd: path.join(__dirname, ".."),
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
        PYTHONUTF8: "1",
      },
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (err) => reject(err));

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || "Audit Python core failed"));
      }

      try {
        const parsed = JSON.parse(String(stdout || "").trim());
        if (parsed?.error) {
          return reject(new Error(parsed.error));
        }
        return resolve(parsed);
      } catch {
        return reject(new Error("Invalid JSON from audit Python core"));
      }
    });
  });
}

async function generateAuditFromPdf({ provider = "lmstudio", pdfPath, companyContext, reportPeriod }) {
  try {
    return await runPythonAuditCore({
      provider,
      pdfPath,
      companyContext,
      reportPeriod,
    });
  } catch (error) {
    return buildFallbackAudit({
      companyContext,
      reportPeriod,
      reason: error?.message || "Unknown runner error",
    });
  }
}

module.exports = {
  generateAuditFromPdf,
};
