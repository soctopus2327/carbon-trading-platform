jest.mock("fs/promises", () => ({
  unlink: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../ai/services/ragRunner", () => ({
  runAdvisorChat: jest.fn(),
  runAdvisorChatStream: jest.fn(),
  getAdvisorRuntimeMeta: jest.fn(),
}));

jest.mock("../ai/services/marketNewsContextService", () => ({
  getMarketNewsDigest: jest.fn().mockResolvedValue({
    digest: ["Market update headline"],
    meta: { cache_hit: true, stale: false },
  }),
}));

jest.mock("../models/Company", () => ({
  countDocuments: jest.fn(),
  findById: jest.fn(),
}));

jest.mock("../models/TradeListing", () => ({
  countDocuments: jest.fn(),
}));

jest.mock("../models/Transaction", () => ({
  aggregate: jest.fn(),
  countDocuments: jest.fn(),
}));

const fs = require("fs/promises");
const { runAdvisorChatStream } = require("../ai/services/ragRunner");
const Company = require("../models/Company");
const TradeListing = require("../models/TradeListing");
const Transaction = require("../models/Transaction");
const advisorController = require("../controllers/advisorController");

function createResponseMock() {
  const res = {
    statusCode: 200,
    payload: null,
    headers: {},
    setHeader: jest.fn((key, value) => {
      res.headers[key] = value;
    }),
    write: jest.fn(),
    end: jest.fn(),
    status: jest.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: jest.fn((payload) => {
      res.payload = payload;
      return res;
    }),
  };

  return res;
}

describe("advisorController.chatStream unit", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    Company.countDocuments.mockResolvedValue(4);
    TradeListing.countDocuments.mockResolvedValue(2);
    Transaction.aggregate.mockResolvedValue([{ totalCredits: 120, totalVolume: 5000 }]);
  });

  it("returns 400 when question is missing", async () => {
    const req = {
      body: {},
      query: {},
      user: { company: null },
      file: undefined,
    };
    const res = createResponseMock();

    await advisorController.chatStream(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Question is required" });
  });

  it("streams token events and final payload", async () => {
    runAdvisorChatStream.mockImplementation(async ({ onToken }) => {
      onToken("don't ");
      onToken("worry");
      return {
        answer: "don't worry",
        sources: [],
        meta: {
          provider: "openai",
          top_k: 1,
          dynamic_top_k: 1,
        },
      };
    });

    const req = {
      body: { question: "Explain this", provider: "openai" },
      query: {},
      user: { company: null },
      file: undefined,
    };
    const res = createResponseMock();

    await advisorController.chatStream(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "application/x-ndjson; charset=utf-8");
    expect(res.write).toHaveBeenCalled();

    const writes = res.write.mock.calls.map((call) => call[0]);
    expect(writes.some((line) => line.includes('"type":"token"') && line.includes("don't"))).toBe(true);
    expect(writes.some((line) => line.includes('"type":"final"') && line.includes("don't worry"))).toBe(true);
    expect(res.end).toHaveBeenCalled();
  });

  it("streams error event when runner fails", async () => {
    runAdvisorChatStream.mockRejectedValue(new Error("stream failed"));

    const req = {
      body: { question: "Explain this", provider: "openai" },
      query: {},
      user: { company: null },
      file: undefined,
    };
    const res = createResponseMock();

    await advisorController.chatStream(req, res);

    const writes = res.write.mock.calls.map((call) => call[0]);
    expect(writes.some((line) => line.includes('"type":"error"') && line.includes("stream failed"))).toBe(true);
    expect(res.end).toHaveBeenCalled();
  });

  it("cleans up uploaded pdf in finally block", async () => {
    runAdvisorChatStream.mockResolvedValue({
      answer: "ok",
      sources: [],
      meta: { provider: "openai", top_k: 1, dynamic_top_k: 1 },
    });

    const req = {
      body: { question: "Explain this", provider: "openai" },
      query: {},
      user: { company: null },
      file: { path: "tmp/sample.pdf" },
    };
    const res = createResponseMock();

    await advisorController.chatStream(req, res);

    expect(fs.unlink).toHaveBeenCalledWith("tmp/sample.pdf");
  });
});
