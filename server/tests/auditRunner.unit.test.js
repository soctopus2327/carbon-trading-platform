const { EventEmitter } = require("events");

jest.mock("child_process", () => ({
  spawn: jest.fn(),
}));

let spawn;

function makeChild() {
  const child = new EventEmitter();
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  return child;
}

describe("ai/services/auditRunner", () => {
  beforeEach(() => {
    jest.resetModules();
    ({ spawn } = require("child_process"));
    spawn.mockReset();
  });

  test("generateAuditFromPdf returns parsed python payload on success", async () => {
    spawn.mockImplementation(() => {
      const child = makeChild();
      setImmediate(() => {
        child.stdout.emit(
          "data",
          Buffer.from(JSON.stringify({ summary: "ok", riskLevel: "LOW", findings: [] }))
        );
        child.emit("close", 0);
      });
      return child;
    });

    const { generateAuditFromPdf } = require("../ai/services/auditRunner");

    const result = await generateAuditFromPdf({
      provider: "openai",
      pdfPath: "tmp/sample.pdf",
      companyContext: { risk_score: 20 },
      reportPeriod: "2025-Q4",
    });

    expect(result.summary).toBe("ok");
    expect(result.riskLevel).toBe("LOW");
    const spawnArgs = spawn.mock.calls[0][1];
    expect(spawnArgs).toContain("--pdf");
    expect(spawnArgs).toContain("tmp/sample.pdf");
  });

  test("generateAuditFromPdf falls back when python runner fails", async () => {
    spawn.mockImplementation(() => {
      const child = makeChild();
      setImmediate(() => {
        child.stderr.emit("data", Buffer.from("python failed"));
        child.emit("close", 1);
      });
      return child;
    });

    const { generateAuditFromPdf } = require("../ai/services/auditRunner");

    const result = await generateAuditFromPdf({
      provider: "lmstudio",
      pdfPath: "tmp/sample.pdf",
      companyContext: { risk_score: 85, pending_transactions: 13, total_transactions: 30 },
      reportPeriod: "2026-Q1",
    });

    expect(result.meta.provider_used).toBe("fallback");
    expect(result.riskLevel).toBe("HIGH");
    expect(result.summary).toMatch(/fallback audit/i);
    expect(result.limitations.join(" ")).toMatch(/python failed/i);
  });
});
