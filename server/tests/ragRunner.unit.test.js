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

describe("ai/services/ragRunner", () => {
  beforeEach(() => {
    jest.resetModules();
    ({ spawn } = require("child_process"));
    spawn.mockReset();
    process.env.OPENAI_MODEL = "gpt-test";
    process.env.LMSTUDIO_MODEL = "lmstudio-test";
  });

  test("runAdvisorChat falls back to OpenAI when LM Studio is unavailable", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    spawn.mockImplementation(() => {
      const child = makeChild();
      setImmediate(() => {
        child.stdout.emit("data", Buffer.from(JSON.stringify({ answer: "ok", meta: {} })));
        child.emit("close", 0);
      });
      return child;
    });

    const { runAdvisorChat } = require("../ai/services/ragRunner");

    const result = await runAdvisorChat({
      question: "hi",
      provider: "lmstudio",
      companyContext: { a: 1 },
    });

    const spawnArgs = spawn.mock.calls[0][1];
    expect(spawnArgs).toContain("--provider");
    expect(spawnArgs).toContain("openai");
    expect(result.meta.provider_used).toBe("openai");
    expect(result.meta.fallback_reason).toMatch(/LM Studio unavailable/i);
  });

  test("runAdvisorChatStream emits token callbacks and resolves final payload", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    spawn.mockImplementation(() => {
      const child = makeChild();
      setImmediate(() => {
        child.stdout.emit(
          "data",
          Buffer.from(
            `${JSON.stringify({ type: "token", token: "hello " })}\n${JSON.stringify({ type: "token", token: "world" })}\n`
          )
        );
        child.stdout.emit(
          "data",
          Buffer.from(`${JSON.stringify({ type: "final", payload: { answer: "hello world", meta: {} } })}\n`)
        );
        child.emit("close", 0);
      });
      return child;
    });

    const { runAdvisorChatStream } = require("../ai/services/ragRunner");
    const tokens = [];

    const result = await runAdvisorChatStream({
      question: "q",
      provider: "lmstudio",
      onToken: (token) => tokens.push(token),
    });

    expect(tokens).toEqual(["hello ", "world"]);
    expect(result.answer).toBe("hello world");
    expect(result.meta.provider_used).toBe("lmstudio");
  });

  test("getAdvisorRuntimeMeta returns OpenAI fallback metadata", async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false });

    const { getAdvisorRuntimeMeta } = require("../ai/services/ragRunner");
    const meta = await getAdvisorRuntimeMeta("lmstudio");

    expect(meta.requested_provider).toBe("lmstudio");
    expect(meta.provider_used).toBe("openai");
    expect(meta.model_name).toBe("gpt-test");
    expect(meta.fallback_reason).toMatch(/LM Studio unavailable/i);
  });
});
