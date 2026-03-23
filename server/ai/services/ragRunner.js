const { spawn } = require("child_process");
const path = require("path");

const RAG_ROOT = path.join(__dirname, "..", "carbon_trading_rag");
const WEB_CHAT_SCRIPT = path.join(RAG_ROOT, "scripts", "web_chat.py");
const PYTHON_BIN = process.env.ADVISOR_PYTHON_PATH || "python";

const PROVIDER = {
  OPENAI: "openai",
  LMSTUDIO: "lmstudio",
};

function getModelNameForProvider(provider) {
  if (provider === PROVIDER.LMSTUDIO) {
    return process.env.LMSTUDIO_MODEL || "unknown-lmstudio-model";
  }
  return process.env.OPENAI_MODEL || "gpt-4o-mini";
}

function withTimeout(ms) {
  const timeoutMs = Number(ms) > 0 ? Number(ms) : 2000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timer };
}

async function isLmStudioAvailable() {
  const baseUrl = (process.env.LMSTUDIO_BASE_URL || "http://localhost:1234/v1").replace(/\/$/, "");
  const { controller, timer } = withTimeout(process.env.LMSTUDIO_HEALTHCHECK_TIMEOUT_MS || 2000);

  try {
    const response = await fetch(`${baseUrl}/models`, {
      method: "GET",
      signal: controller.signal,
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

function runPythonChat({ question, provider, pdfPath, companyContext }) {
  return new Promise((resolve, reject) => {
    const args = [WEB_CHAT_SCRIPT, "--question", question, "--provider", provider];
    if (pdfPath) args.push("--pdf", pdfPath);
    if (companyContext && typeof companyContext === "object") {
      const encodedContext = Buffer.from(JSON.stringify(companyContext), "utf8").toString("base64");
      args.push("--company-context-base64", encodedContext);
    }

    const child = spawn(PYTHON_BIN, args, {
      cwd: RAG_ROOT,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
        PYTHONUTF8: "1",
        PYTHONPATH: [RAG_ROOT, process.env.PYTHONPATH || ""]
          .filter(Boolean)
          .join(path.delimiter),
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
        return reject(new Error(stderr || "Advisor engine failed"));
      }

      try {
        const parsed = JSON.parse(stdout.trim());
        if (parsed.error) {
          return reject(new Error(parsed.error));
        }
        resolve(parsed);
      } catch {
        reject(new Error("Invalid JSON from advisor engine"));
      }
    });
  });
}

function runPythonChatStream({ question, provider, pdfPath, companyContext, onToken }) {
  return new Promise((resolve, reject) => {
    const args = [WEB_CHAT_SCRIPT, "--question", question, "--provider", provider, "--stream"];
    if (pdfPath) args.push("--pdf", pdfPath);
    if (companyContext && typeof companyContext === "object") {
      const encodedContext = Buffer.from(JSON.stringify(companyContext), "utf8").toString("base64");
      args.push("--company-context-base64", encodedContext);
    }

    const child = spawn(PYTHON_BIN, args, {
      cwd: RAG_ROOT,
      env: {
        ...process.env,
        PYTHONIOENCODING: "utf-8",
        PYTHONUTF8: "1",
        PYTHONPATH: [RAG_ROOT, process.env.PYTHONPATH || ""]
          .filter(Boolean)
          .join(path.delimiter),
      },
    });

    let stderr = "";
    let stdoutBuffer = "";
    let finalPayload = null;

    child.stdout.on("data", (data) => {
      stdoutBuffer += data.toString();
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const parsed = JSON.parse(trimmed);
          if (parsed.type === "token" && typeof parsed.token === "string") {
            onToken?.(parsed.token);
          } else if (parsed.type === "final" && parsed.payload) {
            finalPayload = parsed.payload;
          }
        } catch {
          // Ignore non-JSON noise to keep stream resilient.
        }
      }
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("error", (err) => reject(err));

    child.on("close", (code) => {
      if (code !== 0) {
        return reject(new Error(stderr || "Advisor engine failed"));
      }

      if (!finalPayload) {
        const leftover = stdoutBuffer.trim();
        if (leftover) {
          try {
            const parsed = JSON.parse(leftover);
            if (parsed.type === "final" && parsed.payload) {
              finalPayload = parsed.payload;
            }
          } catch {
            // keep default error below
          }
        }
      }

      if (!finalPayload) {
        return reject(new Error("Invalid streaming payload from advisor engine"));
      }

      if (finalPayload.error) {
        return reject(new Error(finalPayload.error));
      }

      resolve(finalPayload);
    });
  });
}

async function runAdvisorChat({ question, provider = PROVIDER.OPENAI, pdfPath, companyContext = null }) {
  const totalStart = Date.now();

  const requestedProvider = provider === PROVIDER.LMSTUDIO ? PROVIDER.LMSTUDIO : PROVIDER.OPENAI;
  const healthStart = Date.now();
  const lmStudioAvailable = await isLmStudioAvailable();
  const lmStudioHealthcheckMs = Date.now() - healthStart;

  const providerUsed =
    requestedProvider === PROVIDER.LMSTUDIO && lmStudioAvailable
      ? PROVIDER.LMSTUDIO
      : PROVIDER.OPENAI;

  const fallbackReason =
    requestedProvider === PROVIDER.LMSTUDIO && !lmStudioAvailable
      ? "LM Studio unavailable, using OpenAI fallback"
      : null;

  const pythonStart = Date.now();
  const parsed = await runPythonChat({
    question,
    provider: providerUsed,
    pdfPath,
    companyContext,
  });
  const pythonExecutionMs = Date.now() - pythonStart;

  const totalRunnerMs = Date.now() - totalStart;

  return {
    ...parsed,
    meta: {
      ...(parsed.meta || {}),
      model_name: parsed?.meta?.model_name || getModelNameForProvider(providerUsed),
      requested_provider: requestedProvider,
      provider_used: providerUsed,
      fallback_reason: fallbackReason,
      lmstudio_available: lmStudioAvailable,
      runner_timings_ms: {
        lmstudio_healthcheck_ms: lmStudioHealthcheckMs,
        python_execution_ms: pythonExecutionMs,
        runner_total_ms: totalRunnerMs,
      },
    },
  };
}

async function runAdvisorChatStream({
  question,
  provider = PROVIDER.OPENAI,
  pdfPath,
  companyContext = null,
  onToken,
}) {
  const totalStart = Date.now();

  const requestedProvider = provider === PROVIDER.LMSTUDIO ? PROVIDER.LMSTUDIO : PROVIDER.OPENAI;
  const healthStart = Date.now();
  const lmStudioAvailable = await isLmStudioAvailable();
  const lmStudioHealthcheckMs = Date.now() - healthStart;

  const providerUsed =
    requestedProvider === PROVIDER.LMSTUDIO && lmStudioAvailable
      ? PROVIDER.LMSTUDIO
      : PROVIDER.OPENAI;

  const fallbackReason =
    requestedProvider === PROVIDER.LMSTUDIO && !lmStudioAvailable
      ? "LM Studio unavailable, using OpenAI fallback"
      : null;

  const pythonStart = Date.now();
  const parsed = await runPythonChatStream({
    question,
    provider: providerUsed,
    pdfPath,
    companyContext,
    onToken,
  });
  const pythonExecutionMs = Date.now() - pythonStart;

  const totalRunnerMs = Date.now() - totalStart;

  return {
    ...parsed,
    meta: {
      ...(parsed.meta || {}),
      model_name: parsed?.meta?.model_name || getModelNameForProvider(providerUsed),
      requested_provider: requestedProvider,
      provider_used: providerUsed,
      fallback_reason: fallbackReason,
      lmstudio_available: lmStudioAvailable,
      runner_timings_ms: {
        lmstudio_healthcheck_ms: lmStudioHealthcheckMs,
        python_execution_ms: pythonExecutionMs,
        runner_total_ms: totalRunnerMs,
      },
    },
  };
}

async function getAdvisorRuntimeMeta(preferredProvider = PROVIDER.LMSTUDIO) {
  const requestedProvider =
    preferredProvider === PROVIDER.LMSTUDIO ? PROVIDER.LMSTUDIO : PROVIDER.OPENAI;
  const lmStudioAvailable = await isLmStudioAvailable();
  const providerUsed =
    requestedProvider === PROVIDER.LMSTUDIO && lmStudioAvailable
      ? PROVIDER.LMSTUDIO
      : PROVIDER.OPENAI;

  return {
    requested_provider: requestedProvider,
    provider_used: providerUsed,
    provider: providerUsed,
    model_name: getModelNameForProvider(providerUsed),
    fallback_reason:
      requestedProvider === PROVIDER.LMSTUDIO && !lmStudioAvailable
        ? "LM Studio unavailable, using OpenAI fallback"
        : null,
    lmstudio_available: lmStudioAvailable,
  };
}

module.exports = { runAdvisorChat, runAdvisorChatStream, getAdvisorRuntimeMeta };