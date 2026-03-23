import axios from "axios";
import { TextDecoder as UtilTextDecoder, TextEncoder as UtilTextEncoder } from "util";
import { streamAdvisorMessage } from "../api/advisorApi";

jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("advisorApi streamAdvisorMessage", () => {
  const TOKEN = "token-123";
  const originalFetch = (globalThis as any).fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("token", TOKEN);
    (globalThis as any).fetch = jest.fn();
    (globalThis as any).TextDecoder = UtilTextDecoder;
  });

  afterEach(() => {
    (globalThis as any).fetch = originalFetch;
  });

  function mockStreamResponse(lines: string[]) {
    const encoder = new UtilTextEncoder();
    const encodedChunks = lines.map((line) => encoder.encode(line));
    let index = 0;

    return {
      ok: true,
      status: 200,
      body: {
        getReader: () => ({
          read: jest.fn(async () => {
            if (index < encodedChunks.length) {
              const value = encodedChunks[index];
              index += 1;
              return { done: false, value };
            }
            return { done: true, value: undefined };
          }),
        }),
      },
    } as unknown as Response;
  }

  it("parses token and final events while preserving apostrophes/unicode", async () => {
    const fetchMock = (globalThis as any).fetch as jest.Mock;
    fetchMock.mockResolvedValue(
      mockStreamResponse([
        '{"type":"token","token":"don\u2019t"}\n',
        '{"type":"token","token":" worry"}\n',
        '{"type":"final","payload":{"message":"ok","answer":"don\u2019t worry","sources":[],"meta":{"provider":"openai","top_k":1,"dynamic_top_k":1}}}\n',
      ])
    );

    const receivedTokens: string[] = [];
    let finalAnswer = "";

    await streamAdvisorMessage(
      {
        question: "test",
        provider: "openai",
      },
      {
        onToken: (token) => receivedTokens.push(token),
        onFinal: (payload) => {
          finalAnswer = payload.answer;
        },
      }
    );

    expect(receivedTokens.join("")).toBe("don’t worry");
    expect(finalAnswer).toBe("don’t worry");
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:5000/advisor/chat/stream",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: `Bearer ${TOKEN}` }),
      })
    );

  });

  it("throws when stream endpoint is unavailable", async () => {
    const fetchMock = (globalThis as any).fetch as jest.Mock;
    fetchMock.mockResolvedValue({
      ok: false,
      status: 500,
      body: null,
    } as Response);

    await expect(
      streamAdvisorMessage(
        {
          question: "test",
          provider: "openai",
        },
        {}
      )
    ).rejects.toThrow("Stream failed with status 500");

  });

  it("ignores malformed stream lines but still processes valid events", async () => {
    const fetchMock = (globalThis as any).fetch as jest.Mock;
    fetchMock.mockResolvedValue(
      mockStreamResponse([
        "not-json\n",
        '{"type":"token","token":"Hello"}\n',
        '{"type":"final","payload":{"message":"ok","answer":"Hello","sources":[],"meta":{"provider":"openai","top_k":1,"dynamic_top_k":1}}}\n',
      ])
    );

    const receivedTokens: string[] = [];
    let finalAnswer = "";

    await streamAdvisorMessage(
      {
        question: "test",
      },
      {
        onToken: (token) => receivedTokens.push(token),
        onFinal: (payload) => {
          finalAnswer = payload.answer;
        },
      }
    );

    expect(receivedTokens).toEqual(["Hello"]);
    expect(finalAnswer).toBe("Hello");

  });

  void mockedAxios;
});
