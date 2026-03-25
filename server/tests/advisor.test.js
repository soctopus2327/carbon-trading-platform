"use strict";

const mongoose = require("mongoose");

// ─── Mock all external dependencies before requiring the controller ───────────
jest.mock("fs/promises", () => ({
  unlink: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../models/AdvisorConversation");
jest.mock("../models/Company");
jest.mock("../models/TradeListing");
jest.mock("../models/Transaction");

jest.mock("../ai/services/ragRunner", () => ({
  runAdvisorChat: jest.fn(),
  runAdvisorChatStream: jest.fn(),
  getAdvisorRuntimeMeta: jest.fn(),
}));

jest.mock("../ai/services/marketNewsContextService", () => ({
  getMarketNewsDigest: jest.fn(),
}));

// ─── Import mocked modules ────────────────────────────────────────────────────
const fs = require("fs/promises");
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

const controller = require("../controllers/advisorController");

function buildReqRes(overrides = {}) {
  const req = {
    user: {
      _id: new mongoose.Types.ObjectId(),
      company: new mongoose.Types.ObjectId(),
    },
    body: {},
    params: {},
    query: {},
    file: null,
    ...overrides,
  };

  const res = {
    _status: 200,
    _body: null,
    _written: [],
    _ended: false,
    _headers: {},
    status(code) {
      this._status = code;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    },
    write(chunk) {
      this._written.push(chunk);
    },
    end() {
      this._ended = true;
    },
    set(headers) {
      this._headers = { ...this._headers, ...headers };
    },
    get headersSent() {
      return this._written.length > 0 || this._ended;
    },
  };

  return { req, res };
}

function parsedChunks(res) {
  return res._written.map((c) => JSON.parse(c));
}

const validId = () => new mongoose.Types.ObjectId().toString();

function mockConversationInstance(overrides = {}) {
  return {
    _id: new mongoose.Types.ObjectId(),
    title: "New chat",
    messages: [],
    save: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function silenceConsoleError() {
  return jest.spyOn(console, "error").mockImplementation(() => {});
}

function setupDefaultMocks() {
  // Market news
  getMarketNewsDigest.mockResolvedValue({
    digest: ["News A", "News B"],
    meta: { cache_hit: false, stale: false },
  });

  // Model metadata
  getAdvisorRuntimeMeta.mockResolvedValue({
    provider: "openai",
    model_name: "gpt-4o",
  });

  // Company
  Company.findById = jest.fn().mockReturnValue({
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue({
      name: "Acme Corp",
      companyType: "BUYER",
      status: "ACTIVE",
      carbonCredits: 100,
      emissionLevel: 50,
      riskScore: 3,
      points: 200,
      coins: 10,
    }),
  });
  Company.countDocuments = jest.fn().mockResolvedValue(5);

  // TradeListing
  TradeListing.countDocuments = jest.fn().mockResolvedValue(3);
  TradeListing.aggregate = jest.fn().mockResolvedValue([
    { listedCredits: 500, remaining: 500 },
  ]);

  // Transaction
  Transaction.countDocuments = jest.fn().mockResolvedValue(2);
  Transaction.aggregate = jest.fn().mockResolvedValue([
    {
      totalCredits: 1000,
      totalVolume: 50000,
      transactionCount: 20,
      creditsTraded: 1000,
      volume: 50000,
      avgTradePrice: 50,
      credits: 1000,
      amount: 50000,
      avgPrice: 50,
    },
  ]);

  // AI services
  runAdvisorChat.mockResolvedValue({
    answer: "Here is the advisor answer.",
    sources: [{ title: "Doc A" }],
    meta: { tokens: 100 },
  });

  runAdvisorChatStream.mockImplementation(async ({ onToken }) => {
    onToken("Hello ");
    onToken("world");
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  setupDefaultMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

// =============================================================================
// 1. listConversations
// =============================================================================

describe("listConversations", () => {
  const mockConvDocs = [
    {
      _id: new mongoose.Types.ObjectId(),
      title: "Chat 1",
      lastActive: new Date("2024-01-10"),
      createdAt: new Date("2024-01-01"),
      messages: [
        { role: "user", content: "hi" },
        { role: "assistant", content: "hello" },
      ],
    },
  ];

  function mockFind(docs) {
    AdvisorConversation.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(docs),
    });
  }

  it("returns conversations list for a company-scoped user", async () => {
    mockFind(mockConvDocs);
    const { req, res } = buildReqRes();

    await controller.listConversations(req, res);

    expect(res._body.success).toBe(true);
    expect(Array.isArray(res._body.conversations)).toBe(true);
    expect(res._body.conversations).toHaveLength(1);
  });

  it("returns scope='platform' when user has no company", async () => {
    mockFind([]);
    const { req, res } = buildReqRes({
      user: { _id: new mongoose.Types.ObjectId(), company: null },
    });

    await controller.listConversations(req, res);

    expect(res._body.scope).toBe("platform");
  });

  it("passes correct DB filter (company ObjectId string) to AdvisorConversation.find", async () => {
    mockFind([]);
    const companyId = new mongoose.Types.ObjectId();
    const { req, res } = buildReqRes({
      user: { _id: new mongoose.Types.ObjectId(), company: companyId },
    });

    await controller.listConversations(req, res);

    expect(AdvisorConversation.find).toHaveBeenCalledWith(
      expect.objectContaining({ company: companyId.toString() })
    );
  });

  it("passes company:null filter when user has no company", async () => {
    mockFind([]);
    const { req, res } = buildReqRes({
      user: { _id: new mongoose.Types.ObjectId(), company: null },
    });

    await controller.listConversations(req, res);

    expect(AdvisorConversation.find).toHaveBeenCalledWith(
      expect.objectContaining({ company: null })
    );
  });

  it("maps messageCount correctly from messages array length", async () => {
    mockFind(mockConvDocs);
    const { req, res } = buildReqRes();

    await controller.listConversations(req, res);

    expect(res._body.conversations[0].messageCount).toBe(2);
  });

  it("returns HTTP 500 on unexpected DB error", async () => {
    silenceConsoleError();
    AdvisorConversation.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockRejectedValue(new Error("DB down")),
    });
    const { req, res } = buildReqRes();

    await controller.listConversations(req, res);

    expect(res._status).toBe(500);
    expect(res._body.success).toBe(false);
  });
});

// =============================================================================
// 2. getConversation
// =============================================================================

describe("getConversation", () => {
  function mockFindOne(doc) {
    AdvisorConversation.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue(doc),
    });
  }

  it("returns HTTP 400 for an invalid (non-ObjectId) conversation ID", async () => {
    const { req, res } = buildReqRes({ params: { id: "not-an-objectid" } });

    await controller.getConversation(req, res);

    expect(res._status).toBe(400);
    expect(res._body.success).toBe(false);
  });

  it("returns HTTP 404 when conversation does not exist in DB", async () => {
    mockFindOne(null);
    const { req, res } = buildReqRes({ params: { id: validId() } });

    await controller.getConversation(req, res);

    expect(res._status).toBe(404);
    expect(res._body.success).toBe(false);
  });

  it("returns full conversation shape (title, messages, messageCount) on success", async () => {
    const id = new mongoose.Types.ObjectId();
    mockFindOne({
      _id: id,
      title: "My chat",
      messages: [{ role: "user", content: "hello" }],
      lastActive: new Date(),
      createdAt: new Date(),
    });
    const { req, res } = buildReqRes({ params: { id: id.toString() } });

    await controller.getConversation(req, res);

    expect(res._body.success).toBe(true);
    expect(res._body.conversation).toMatchObject({
      title: "My chat",
      messageCount: 1,
    });
    expect(Array.isArray(res._body.conversation.messages)).toBe(true);
  });

  it("returns HTTP 500 on unexpected DB error", async () => {
    silenceConsoleError();
    AdvisorConversation.findOne = jest.fn().mockReturnValue({
      lean: jest.fn().mockRejectedValue(new Error("crash")),
    });
    const { req, res } = buildReqRes({ params: { id: validId() } });

    await controller.getConversation(req, res);

    expect(res._status).toBe(500);
  });
});

// =============================================================================
// 3. updateConversation
// =============================================================================

describe("updateConversation", () => {
  function mockFindOneAndUpdate(returnValue) {
    AdvisorConversation.findOneAndUpdate = jest.fn().mockReturnValue({
      select: jest.fn().mockResolvedValue(returnValue),
    });
  }

  it("returns HTTP 400 for an invalid (non-ObjectId) conversation ID", async () => {
    const { req, res } = buildReqRes({
      params: { id: "bad-id" },
      body: { title: "Good title" },
    });

    await controller.updateConversation(req, res);

    expect(res._status).toBe(400);
  });

  it("returns HTTP 400 when title is missing from request body", async () => {
    const { req, res } = buildReqRes({
      params: { id: validId() },
      body: {},
    });

    await controller.updateConversation(req, res);

    expect(res._status).toBe(400);
    expect(res._body.message).toMatch(/title/i);
  });

  it("returns HTTP 400 when title is whitespace-only", async () => {
    const { req, res } = buildReqRes({
      params: { id: validId() },
      body: { title: "   " },
    });

    await controller.updateConversation(req, res);

    expect(res._status).toBe(400);
  });

  it("returns HTTP 404 when conversation does not exist in DB", async () => {
    mockFindOneAndUpdate(null);
    const { req, res } = buildReqRes({
      params: { id: validId() },
      body: { title: "Valid title" },
    });

    await controller.updateConversation(req, res);

    expect(res._status).toBe(404);
  });

  it("updates and returns conversation on success", async () => {
    const doc = { _id: validId(), title: "Valid title", lastActive: new Date() };
    mockFindOneAndUpdate(doc);
    const { req, res } = buildReqRes({
      params: { id: validId() },
      body: { title: "Valid title" },
    });

    await controller.updateConversation(req, res);

    expect(res._body.success).toBe(true);
    expect(res._body.conversation.title).toBe("Valid title");
  });

  it("truncates titles longer than 100 characters before saving", async () => {
    const longTitle = "X".repeat(150);
    let capturedTitle;

    AdvisorConversation.findOneAndUpdate = jest.fn().mockImplementation((_filter, update) => {
      capturedTitle = update.title;
      return {
        select: jest.fn().mockResolvedValue({ _id: validId(), title: update.title }),
      };
    });

    const { req, res } = buildReqRes({
      params: { id: validId() },
      body: { title: longTitle },
    });

    await controller.updateConversation(req, res);

    expect(capturedTitle.length).toBe(100);
  });

  it("returns HTTP 500 on unexpected DB error", async () => {
    silenceConsoleError();
    AdvisorConversation.findOneAndUpdate = jest.fn().mockReturnValue({
      select: jest.fn().mockRejectedValue(new Error("db error")),
    });
    const { req, res } = buildReqRes({
      params: { id: validId() },
      body: { title: "Title" },
    });

    await controller.updateConversation(req, res);

    expect(res._status).toBe(500);
  });
});

// =============================================================================
// 4. deleteConversation
// =============================================================================

describe("deleteConversation", () => {
  it("returns HTTP 400 for an invalid (non-ObjectId) conversation ID", async () => {
    const { req, res } = buildReqRes({ params: { id: "bad" } });

    await controller.deleteConversation(req, res);

    expect(res._status).toBe(400);
  });

  it("returns HTTP 404 when deletedCount === 0 (not owned / not found)", async () => {
    AdvisorConversation.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 0 });
    const { req, res } = buildReqRes({ params: { id: validId() } });

    await controller.deleteConversation(req, res);

    expect(res._status).toBe(404);
  });

  it("returns success:true with message on successful deletion", async () => {
    AdvisorConversation.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 1 });
    const { req, res } = buildReqRes({ params: { id: validId() } });

    await controller.deleteConversation(req, res);

    expect(res._body.success).toBe(true);
    expect(typeof res._body.message).toBe("string");
  });

  it("returns HTTP 500 on unexpected DB error", async () => {
    silenceConsoleError();
    AdvisorConversation.deleteOne = jest.fn().mockRejectedValue(new Error("crash"));
    const { req, res } = buildReqRes({ params: { id: validId() } });

    await controller.deleteConversation(req, res);

    expect(res._status).toBe(500);
  });
});

// =============================================================================
// 5. chat (non-streaming)
// =============================================================================

describe("chat", () => {
  function setupNewConversation() {
    const conv = mockConversationInstance();
    AdvisorConversation.mockImplementation(() => conv);
    return conv;
  }

  it("returns HTTP 400 when question is empty", async () => {
    const { req, res } = buildReqRes({ body: { question: "" } });

    await controller.chat(req, res);

    expect(res._status).toBe(400);
    expect(res._body.success).toBe(false);
  });

  it("returns HTTP 400 when question is whitespace-only", async () => {
    const { req, res } = buildReqRes({ body: { question: "   " } });

    await controller.chat(req, res);

    expect(res._status).toBe(400);
  });

  it("deletes uploaded PDF file even when question validation fails", async () => {
    const { req, res } = buildReqRes({
      body: { question: "" },
      file: { path: "/tmp/early-exit.pdf" },
    });

    await controller.chat(req, res);

    expect(fs.unlink).toHaveBeenCalledWith("/tmp/early-exit.pdf");
  });

  it("creates a NEW AdvisorConversation when no conversationId provided", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({ body: { question: "What is carbon?" } });

    await controller.chat(req, res);

    expect(AdvisorConversation).toHaveBeenCalledWith(
      expect.objectContaining({ title: "New chat", messages: [] })
    );
    expect(res._body.success).toBe(true);
  });

  it("saves user message then assistant message (save called exactly twice)", async () => {
    const conv = setupNewConversation();
    const { req, res } = buildReqRes({ body: { question: "Hello" } });

    await controller.chat(req, res);

    expect(conv.save).toHaveBeenCalledTimes(2);
  });

  it("loads an existing conversation when a valid conversationId is provided", async () => {
    const existingId = validId();
    const conv = mockConversationInstance({
      _id: new mongoose.Types.ObjectId(existingId),
    });
    AdvisorConversation.findOne = jest.fn().mockResolvedValue(conv);

    const { req, res } = buildReqRes({
      body: { question: "Follow-up", conversationId: existingId },
    });

    await controller.chat(req, res);

    expect(AdvisorConversation.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: existingId })
    );
    expect(res._body.conversationId).toBe(existingId);
  });

  it("returns HTTP 404 when referenced conversationId is not found", async () => {
    AdvisorConversation.findOne = jest.fn().mockResolvedValue(null);
    const { req, res } = buildReqRes({
      body: { question: "Hello", conversationId: validId() },
    });

    await controller.chat(req, res);

    expect(res._status).toBe(404);
  });

  it("passes company-scoped companyContext (scope='company') to runAdvisorChat", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({ body: { question: "Credits?" } });

    await controller.chat(req, res);

    expect(runAdvisorChat).toHaveBeenCalledWith(
      expect.objectContaining({
        companyContext: expect.objectContaining({ scope: "company" }),
      })
    );
  });

  it("passes platform-scoped companyContext (scope='platform') when user has no company", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({
      user: { _id: new mongoose.Types.ObjectId(), company: null },
      body: { question: "Platform?" },
    });

    await controller.chat(req, res);

    expect(runAdvisorChat).toHaveBeenCalledWith(
      expect.objectContaining({
        companyContext: expect.objectContaining({ scope: "platform" }),
      })
    );
  });

  it("includes market_news_digest in companyContext passed to runAdvisorChat", async () => {
    setupNewConversation();
    getMarketNewsDigest.mockResolvedValue({
      digest: ["Breaking: Carbon prices rise"],
      meta: { cache_hit: false, stale: false },
    });
    const { req, res } = buildReqRes({ body: { question: "News?" } });

    await controller.chat(req, res);

    const ctx = runAdvisorChat.mock.calls[0][0].companyContext;
    expect(ctx.market_news_digest).toBe("Breaking: Carbon prices rise");
  });

  it("resolves provider='lmstudio' when explicitly requested", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({
      body: { question: "Hello", provider: "lmstudio" },
    });

    await controller.chat(req, res);

    expect(runAdvisorChat).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "lmstudio" })
    );
  });

  it("defaults provider to 'openai' for any unrecognised provider value", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({
      body: { question: "Hello", provider: "magical-ai" },
    });

    await controller.chat(req, res);

    expect(runAdvisorChat).toHaveBeenCalledWith(
      expect.objectContaining({ provider: "openai" })
    );
  });

  it("passes pdfPath to runAdvisorChat when a file is uploaded", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({
      body: { question: "Summarise" },
      file: { path: "/tmp/doc.pdf" },
    });

    await controller.chat(req, res);

    expect(runAdvisorChat).toHaveBeenCalledWith(
      expect.objectContaining({ pdfPath: "/tmp/doc.pdf" })
    );
  });

  it("deletes uploaded PDF file after a successful chat response", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({
      body: { question: "Summarise" },
      file: { path: "/tmp/success.pdf" },
    });

    await controller.chat(req, res);

    expect(fs.unlink).toHaveBeenCalledWith("/tmp/success.pdf");
  });

  it("deletes uploaded PDF file even when runAdvisorChat throws", async () => {
    silenceConsoleError();
    setupNewConversation();
    runAdvisorChat.mockRejectedValue(new Error("AI down"));
    const { req, res } = buildReqRes({
      body: { question: "Summarise" },
      file: { path: "/tmp/fail.pdf" },
    });

    await controller.chat(req, res);

    expect(fs.unlink).toHaveBeenCalledWith("/tmp/fail.pdf");
  });

  it("returns HTTP 500 and error message when runAdvisorChat throws", async () => {
    silenceConsoleError();
    setupNewConversation();
    runAdvisorChat.mockRejectedValue(new Error("AI exploded"));
    const { req, res } = buildReqRes({ body: { question: "Hello" } });

    await controller.chat(req, res);

    expect(res._status).toBe(500);
    expect(res._body.message).toBe("AI exploded");
  });

  it("response body includes answer, sources, conversationId, title, and meta", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({ body: { question: "Hello" } });

    await controller.chat(req, res);

    expect(res._body).toMatchObject({
      success: true,
      answer: "Here is the advisor answer.",
      sources: expect.any(Array),
      conversationId: expect.any(String),
      title: expect.any(String),
      meta: expect.any(Object),
    });
  });

  it("meta.controller_timings_ms.total_ms is a non-negative number", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({ body: { question: "Hello" } });

    await controller.chat(req, res);

    expect(res._body.meta.controller_timings_ms.total_ms).toBeGreaterThanOrEqual(0);
  });
});

// =============================================================================
// 6. chatStream 
// =============================================================================

describe("chatStream", () => {
  function setupNewConversation() {
    const conv = mockConversationInstance();
    AdvisorConversation.mockImplementation(() => conv);
    return conv;
  }

  it("returns HTTP 400 when question is empty", async () => {
    const { req, res } = buildReqRes({ body: { question: "" } });

    await controller.chatStream(req, res);

    expect(res._status).toBe(400);
  });

  it("returns HTTP 400 when question is whitespace-only", async () => {
    const { req, res } = buildReqRes({ body: { question: "  " } });

    await controller.chatStream(req, res);

    expect(res._status).toBe(400);
  });

  it("deletes uploaded PDF file even when question validation fails", async () => {
    const { req, res } = buildReqRes({
      body: { question: "" },
      file: { path: "/tmp/stream-early.pdf" },
    });

    await controller.chatStream(req, res);

    expect(fs.unlink).toHaveBeenCalledWith("/tmp/stream-early.pdf");
  });

  it("sets Content-Type: application/x-ndjson response header", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({ body: { question: "stream" } });

    await controller.chatStream(req, res);

    expect(res._headers["Content-Type"]).toBe("application/x-ndjson");
  });

  it("sets Cache-Control: no-cache response header", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({ body: { question: "stream" } });

    await controller.chatStream(req, res);

    expect(res._headers["Cache-Control"]).toBe("no-cache");
  });

  it("sets Connection: keep-alive response header", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({ body: { question: "stream" } });

    await controller.chatStream(req, res);

    expect(res._headers["Connection"]).toBe("keep-alive");
  });

  it("creates a NEW AdvisorConversation when no conversationId provided", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({ body: { question: "stream" } });

    await controller.chatStream(req, res);

    expect(AdvisorConversation).toHaveBeenCalledWith(
      expect.objectContaining({ title: "New chat", messages: [] })
    );
  });

  it("loads an existing conversation when a valid conversationId is provided", async () => {
    const existingId = validId();
    const conv = mockConversationInstance({
      _id: new mongoose.Types.ObjectId(existingId),
    });
    AdvisorConversation.findOne = jest.fn().mockResolvedValue(conv);

    const { req, res } = buildReqRes({
      body: { question: "stream", conversationId: existingId },
    });

    await controller.chatStream(req, res);

    expect(AdvisorConversation.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ _id: existingId })
    );
  });

  it("writes { type:'token' } chunks for every token emitted", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({ body: { question: "stream" } });

    await controller.chatStream(req, res);

    const tokens = parsedChunks(res).filter((c) => c.type === "token");
    expect(tokens).toHaveLength(2);
  });

  it("writes tokens in the correct order", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({ body: { question: "stream" } });

    await controller.chatStream(req, res);

    const tokens = parsedChunks(res).filter((c) => c.type === "token");
    expect(tokens[0].token).toBe("Hello ");
    expect(tokens[1].token).toBe("world");
  });

  it("writes a final { type:'final' } chunk after all tokens", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({ body: { question: "stream" } });

    await controller.chatStream(req, res);

    const chunks = parsedChunks(res);
    expect(chunks[chunks.length - 1].type).toBe("final");
  });

  it("final chunk payload.answer contains all tokens concatenated in order", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({ body: { question: "stream" } });

    await controller.chatStream(req, res);

    const finalChunk = parsedChunks(res).find((c) => c.type === "final");
    expect(finalChunk.payload.answer).toBe("Hello world");
  });

  it("final chunk payload.conversationId is present", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({ body: { question: "stream" } });

    await controller.chatStream(req, res);

    const finalChunk = parsedChunks(res).find((c) => c.type === "final");
    expect(finalChunk.payload.conversationId).toBeDefined();
  });

  it("calls res.end() after successful stream", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({ body: { question: "stream" } });

    await controller.chatStream(req, res);

    expect(res._ended).toBe(true);
  });

  it("saves assistant message with metadata.streamed === true", async () => {
    const conv = setupNewConversation();
    const { req, res } = buildReqRes({ body: { question: "stream" } });

    await controller.chatStream(req, res);

    const assistantMsg = conv.messages.find((m) => m.role === "assistant");
    expect(assistantMsg?.metadata?.streamed).toBe(true);
  });

  it("writes { type:'error' } chunk when runAdvisorChatStream throws", async () => {
    silenceConsoleError();
    setupNewConversation();
    runAdvisorChatStream.mockRejectedValue(new Error("stream exploded"));
    const { req, res } = buildReqRes({ body: { question: "stream" } });

    await controller.chatStream(req, res);

    const errorChunk = parsedChunks(res).find((c) => c.type === "error");
    expect(errorChunk).toBeDefined();
  });

  it("calls res.end() even when streaming fails", async () => {
    silenceConsoleError();
    setupNewConversation();
    runAdvisorChatStream.mockRejectedValue(new Error("crash"));
    const { req, res } = buildReqRes({ body: { question: "stream" } });

    await controller.chatStream(req, res);

    expect(res._ended).toBe(true);
  });

  it("deletes uploaded PDF file after successful stream", async () => {
    setupNewConversation();
    const { req, res } = buildReqRes({
      body: { question: "stream" },
      file: { path: "/tmp/stream-ok.pdf" },
    });

    await controller.chatStream(req, res);

    expect(fs.unlink).toHaveBeenCalledWith("/tmp/stream-ok.pdf");
  });

  it("deletes uploaded PDF file when streaming fails", async () => {
    silenceConsoleError();
    setupNewConversation();
    runAdvisorChatStream.mockRejectedValue(new Error("crash"));
    const { req, res } = buildReqRes({
      body: { question: "stream" },
      file: { path: "/tmp/stream-fail.pdf" },
    });

    await controller.chatStream(req, res);

    expect(fs.unlink).toHaveBeenCalledWith("/tmp/stream-fail.pdf");
  });
});

// =============================================================================
// 7. getInsights 
// =============================================================================

describe("getInsights", () => {
  it("response contains exactly 3 insight cards", async () => {
    const { req, res } = buildReqRes({ query: {} });

    await controller.getInsights(req, res);

    expect(res._body.cards).toHaveLength(3);
  });

  it("response contains exactly 4 action steps", async () => {
    const { req, res } = buildReqRes({ query: {} });

    await controller.getInsights(req, res);

    expect(res._body.steps).toHaveLength(4);
  });

  it("scope is set to the company name when user belongs to a company", async () => {
    const { req, res } = buildReqRes({ query: {} });

    await controller.getInsights(req, res);

    expect(res._body.scope).toBe("Acme Corp");
  });

  it("scope is 'Platform' when user has no company (companyId is null/falsy)", async () => {
    const { req, res } = buildReqRes({
      user: { _id: new mongoose.Types.ObjectId(), company: null },
      query: {},
    });

    await controller.getInsights(req, res);

    expect(res._body.scope).toBe("Platform");
  });

  it("scope falls back to 'Company' when company document returns null from DB", async () => {
    Company.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue(null),
    });
    const { req, res } = buildReqRes({ query: {} });

    await controller.getInsights(req, res);

    expect(res._body.scope).toBe("Company");
  });

  it("response includes model metadata (provider + model_name)", async () => {
    const { req, res } = buildReqRes({ query: {} });

    await controller.getInsights(req, res);

    expect(res._body.model).toMatchObject({
      provider: "openai",
      model_name: "gpt-4o",
    });
  });

  it("Reduction card text references credits retired/moved and credits listed", async () => {
    const { req, res } = buildReqRes({ query: {} });

    await controller.getInsights(req, res);

    const card = res._body.cards.find((c) => c.type === "Reduction");
    expect(card.text).toMatch(/credits retired\/moved/i);
    expect(card.text).toMatch(/credits listed for sale/i);   // ← FIXED
  });

  it("Market card text references active listings and average settled price", async () => {
    const { req, res } = buildReqRes({ query: {} });

    await controller.getInsights(req, res);

    const card = res._body.cards.find((c) => c.type === "Market");
    expect(card.text).toMatch(/active listings/i);
    expect(card.text).toMatch(/average settled price/i);
  });

  it("Compliance card text references pending trades and success rate", async () => {
    const { req, res } = buildReqRes({ query: {} });

    await controller.getInsights(req, res);

    const card = res._body.cards.find((c) => c.type === "Compliance");
    expect(card.text).toMatch(/pending/i);
    expect(card.text).toMatch(/success rate/i);
  });

  it("action steps text references pending transactions", async () => {
    const { req, res } = buildReqRes({ query: {} });

    await controller.getInsights(req, res);

    expect(res._body.steps.join(" ")).toMatch(/pending/i);
  });

  it("returns HTTP 500 and success:false on unexpected DB error", async () => {
    silenceConsoleError();
    TradeListing.countDocuments.mockRejectedValue(new Error("db fail"));
    const { req, res } = buildReqRes({ query: {} });

    await controller.getInsights(req, res);

    expect(res._status).toBe(500);
    expect(res._body.success).toBe(false);
  });
});

// =============================================================================
// 8. Market news enrichment
// =============================================================================

describe("market news enrichment", () => {
  function setupConv() {
    const conv = mockConversationInstance();
    AdvisorConversation.mockImplementation(() => conv);
    return conv;
  }

  it("chat still succeeds when getMarketNewsDigest throws (graceful degradation)", async () => {
    silenceConsoleError();
    setupConv();
    getMarketNewsDigest.mockRejectedValue(new Error("news API down"));
    const { req, res } = buildReqRes({ body: { question: "anything" } });

    await controller.chat(req, res);

    expect(res._body.success).toBe(true);
  });

  it("market_news_digest is '' and market_news_items is 0 on news failure", async () => {
    silenceConsoleError();
    setupConv();
    getMarketNewsDigest.mockRejectedValue(new Error("news API down"));
    const { req, res } = buildReqRes({ body: { question: "anything" } });

    await controller.chat(req, res);

    const ctx = runAdvisorChat.mock.calls[0][0].companyContext;
    expect(ctx.market_news_digest).toBe("");
    expect(ctx.market_news_items).toBe(0);
  });

  it("market_news_cache_hit is true when digest comes from cache", async () => {
    setupConv();
    getMarketNewsDigest.mockResolvedValue({
      digest: ["Cached news"],
      meta: { cache_hit: true, stale: false },
    });
    const { req, res } = buildReqRes({ body: { question: "cache?" } });

    await controller.chat(req, res);

    const ctx = runAdvisorChat.mock.calls[0][0].companyContext;
    expect(ctx.market_news_cache_hit).toBe(true);
  });

  it("market_news_cache_stale is true when digest is stale", async () => {
    setupConv();
    getMarketNewsDigest.mockResolvedValue({
      digest: ["Old news"],
      meta: { cache_hit: true, stale: true },
    });
    const { req, res } = buildReqRes({ body: { question: "stale?" } });

    await controller.chat(req, res);

    const ctx = runAdvisorChat.mock.calls[0][0].companyContext;
    expect(ctx.market_news_cache_stale).toBe(true);
  });

  it("market_news_context_ms is present in companyContext", async () => {
    setupConv();
    const { req, res } = buildReqRes({ body: { question: "timing?" } });

    await controller.chat(req, res);

    const ctx = runAdvisorChat.mock.calls[0][0].companyContext;
    expect(typeof ctx.market_news_context_ms).toBe("number");
  });

  it("digest strings are joined with ' | ' separator", async () => {
    setupConv();
    getMarketNewsDigest.mockResolvedValue({
      digest: ["Item 1", "Item 2", "Item 3"],
      meta: { cache_hit: false, stale: false },
    });
    const { req, res } = buildReqRes({ body: { question: "digest?" } });

    await controller.chat(req, res);

    const ctx = runAdvisorChat.mock.calls[0][0].companyContext;
    expect(ctx.market_news_digest).toBe("Item 1 | Item 2 | Item 3");
  });
});