/// <reference types="@testing-library/jest-dom" />
import React from "react";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import AIAdvisor from "../pages/AIAdvisor";
import * as advisorApi from "../api/advisorApi";

// ─── Mocks ────────────────────────────────────────────────────────────────────
jest.mock("../components/layout/PageLayout", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("../api/advisorApi", () => ({
  fetchAdvisorInsights: jest.fn(),
  streamAdvisorMessage: jest.fn(),
}));

const mockedFetchInsights = advisorApi.fetchAdvisorInsights as jest.Mock;
const mockedStreamMessage = advisorApi.streamAdvisorMessage as jest.Mock;

const mockFetch = jest.fn();
(global as any).fetch = mockFetch;

// ─── Mock Data ───────────────────────────────────────────────────────────────
const mockInsightsResponse = {
  cards: [
    { type: "Reduction", text: "1,000 credits retired/moved in total. Currently 500 credits listed for sale." },
    { type: "Market", text: "3 active listings • Average settled price: 50.00 per credit." },
    { type: "Compliance", text: "2 pending transaction(s) • 0 overdue pay-later • 92% overall success rate." },
  ],
  steps: [
    "Review and settle the 2 pending transaction(s) before creating new listings.",
    "Clear the 2 overdue pay-later obligation(s) to avoid compliance issues.",
    "Monitor weekly trade volume (0) and rebalance your listing strategy.",
    "Consider retiring high-cost or low-impact credits first if reduction targets are approaching."
  ],
  model: { provider: "lmstudio", model_name: "llama-3.1", fallback_reason: null },
};

const mockConversationsResponse = {
  success: true,
  conversations: [
    { _id: "conv-1", title: "Portfolio Review", lastActive: "2024-06-01T10:00:00Z", messageCount: 5 },
    { _id: "conv-2", title: "Credit Strategy", lastActive: "2024-05-28T08:30:00Z", messageCount: 3 },
  ],
};

const mockConversationDetail = {
  success: true,
  conversation: {
    title: "Portfolio Review",
    messages: [
      { role: "user", content: "What's my portfolio risk?" },
      { role: "assistant", content: "Your portfolio has moderate risk exposure." },
    ],
  },
};

const mockCreditStrategyDetail = {
  success: true,
  conversation: {
    title: "Credit Strategy",
    messages: [{ role: "user", content: "Which credits to retire?" }],
  },
};

const baseFinalResponse = {
  sources: [],
  meta: { provider: "openai", model_name: "gpt-4o", fallback_reason: null },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setupDefaultMocks() {
  mockedFetchInsights.mockResolvedValue(mockInsightsResponse);

  mockFetch
    .mockResolvedValueOnce({ ok: true, json: async () => mockInsightsResponse })
    .mockResolvedValueOnce({ ok: true, json: async () => mockConversationsResponse })
    .mockResolvedValueOnce({ ok: true, json: async () => mockConversationDetail });
}

async function waitForAppReady() {
  await waitFor(() => {
    expect(screen.getByText("Conversations")).toBeInTheDocument();
    expect(screen.getByText("Advisor Insights")).toBeInTheDocument();
  }, { timeout: 3000 });
}

async function waitForInsightsLoaded() {
  await waitFor(() => {
    expect(screen.getByText(/credits retired\/moved/i)).toBeInTheDocument();
  }, { timeout: 3000 });
}

describe("AIAdvisor", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => { });
    localStorage.setItem("token", "test-token");
    (window.HTMLElement.prototype as any).scrollIntoView = jest.fn();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    localStorage.clear();
  });

  // ── Initial Rendering ──────────────────────────────────────────────────────
  describe("Initial Rendering", () => {
    it("renders the Conversations panel", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      expect(await screen.findByText("Conversations")).toBeInTheDocument();
    });

    it("renders the Advisor Insights panel", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      expect(await screen.findByText("Advisor Insights")).toBeInTheDocument();
    });

    it("renders all quick prompt buttons", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForAppReady();
      [
        "Build my 30-day reduction plan",
        "Which credits should I retire first?",
        "Show risk in current portfolio",
        "Best buy window this month",
      ].forEach((p) => expect(screen.getByText(p)).toBeInTheDocument());
    });

    it("renders the chat input with correct placeholder", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForAppReady();
      expect(screen.getByPlaceholderText("Ask about your portfolio, credits, compliance...")).toBeInTheDocument();
    });

    it("renders Send button disabled when input is empty", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForAppReady();
      expect(screen.getByRole("button", { name: /send/i })).toBeDisabled();
    });
  });

  // ── Data Loading ───────────────────────────────────────────────────────────
  describe("Data Loading", () => {
    it("fetches insights from correct endpoint on mount", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/advisor/insights"),
          expect.any(Object)
        )
      );
    });

    it("displays insight cards returned from API", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForInsightsLoaded();
      expect(screen.getByText(/credits retired\/moved/i)).toBeInTheDocument();
      expect(screen.getByText(/active listings/i)).toBeInTheDocument();
    });

    it("displays next steps returned from API", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForInsightsLoaded();
      expect(screen.getByText(/Review and settle the 2 pending transaction/i)).toBeInTheDocument();
    });

    it("displays model provider and name in header", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForInsightsLoaded();
      expect(screen.getByText(/lmstudio · llama-3.1/i)).toBeInTheDocument();
    });

    it("fetches conversations with auth token on mount", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:5000/advisor/conversations",
          expect.objectContaining({
            headers: expect.objectContaining({ Authorization: "Bearer test-token" }),
          })
        )
      );
    });

    it("auto-loads the most recent conversation", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:5000/advisor/conversations/conv-1",
          expect.anything()
        )
      );
    });

    it("renders both conversations in the sidebar", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitFor(() => expect(screen.getByText("Credit Strategy")).toBeInTheDocument());
    });

    it("shows empty state when no conversations exist", async () => {
      mockedFetchInsights.mockResolvedValue(mockInsightsResponse);
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, conversations: [] }) });
      render(<AIAdvisor />);
      expect(await screen.findByText("No conversations yet")).toBeInTheDocument();
    });

    it("shows fallback when steps array is empty", async () => {
      mockedFetchInsights.mockResolvedValue({ ...mockInsightsResponse, steps: [] });
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, conversations: [] }) });
      render(<AIAdvisor />);
      expect(await screen.findByText("No actionable steps available yet.")).toBeInTheDocument();
    });
  });

  // ── Conversation Selection ─────────────────────────────────────────────────
  describe("Conversation Selection", () => {
    it("loads a conversation when clicked in the sidebar", async () => {
      mockedFetchInsights.mockResolvedValue(mockInsightsResponse);
      mockFetch
        .mockResolvedValueOnce({ ok: true, json: async () => mockInsightsResponse })
        .mockResolvedValueOnce({ ok: true, json: async () => mockConversationsResponse })
        .mockResolvedValueOnce({ ok: true, json: async () => mockConversationDetail })
        .mockResolvedValueOnce({ ok: true, json: async () => mockCreditStrategyDetail });

      render(<AIAdvisor />);
      await waitFor(() => screen.getByText("Credit Strategy"));

      fireEvent.click(screen.getByText("Credit Strategy"));

      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:5000/advisor/conversations/conv-2",
          expect.anything()
        )
      );
    });

    it("highlights the active conversation in the sidebar", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);

      await waitFor(() => {
        const activeButton = screen.getByRole("button", {
          name: /Portfolio Review.*1\/6\/2024/i,
        });
        expect(activeButton).toBeInTheDocument();
      });

      const activeButton = screen.getByRole("button", {
        name: /Portfolio Review.*1\/6\/2024/i,
      });

      expect(activeButton).toHaveClass("bg-emerald-50/80");
      expect(activeButton).toHaveClass("border-l-4");
      expect(activeButton).toHaveClass("border-emerald-500");
    });

    it("renders loaded conversation messages in the chat panel", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitFor(() => screen.getByText("What's my portfolio risk?"));
      expect(screen.getByText("Your portfolio has moderate risk exposure.")).toBeInTheDocument();
    });
  });

  // ── New Conversation ───────────────────────────────────────────────────────
  describe("New Conversation", () => {
    it("resets chat when clicking 'New Chat' in the header", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForInsightsLoaded();

      fireEvent.click(screen.getByTitle("New Conversation"));

      expect(screen.queryByText("What's my portfolio risk?")).not.toBeInTheDocument();
      expect(await screen.findByText("Hello! I'm your AI Advisor. How can I help you today?")).toBeInTheDocument();
    });

    it("resets chat when clicking + in the sidebar", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForInsightsLoaded();

      fireEvent.click(screen.getByTitle("New Conversation"));

      expect(screen.queryByText("What's my portfolio risk?")).not.toBeInTheDocument();
    });

    it("shows starter greeting after resetting", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForAppReady();

      fireEvent.click(screen.getByTitle("New Conversation"));

      expect(await screen.findByText("Hello! I'm your AI Advisor. How can I help you today?")).toBeInTheDocument();
    });

    it("shows 'New Chat' title in the header after resetting", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForAppReady();

      fireEvent.click(screen.getByTitle("New Conversation"));

      expect(await screen.findByRole("heading", { name: "New Chat" })).toBeInTheDocument();
    });
  });

  // ── Sending Messages ───────────────────────────────────────────────────────
  describe("Sending Messages", () => {
    beforeEach(() => {
      mockedStreamMessage.mockImplementation(async (_payload, handlers) => {
        handlers.onFinal?.({ answer: "AI response", ...baseFinalResponse });
      });
    });

    it("enables Send button when input has text", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForAppReady();

      fireEvent.change(
        screen.getByPlaceholderText("Ask about your portfolio, credits, compliance..."),
        { target: { value: "Hello" } }
      );
      expect(screen.getByRole("button", { name: /send/i })).toBeEnabled();
    });

    it("populates input when a quick prompt is clicked", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForAppReady();

      fireEvent.click(screen.getByText("Show risk in current portfolio"));
      expect(
        (screen.getByPlaceholderText("Ask about your portfolio, credits, compliance...") as HTMLInputElement).value
      ).toBe("Show risk in current portfolio");
    });

    it("calls streamAdvisorMessage with the typed question", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForAppReady();

      fireEvent.change(
        screen.getByPlaceholderText("Ask about your portfolio, credits, compliance..."),
        { target: { value: "What is my risk exposure?" } }
      );
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      await waitFor(() =>
        expect(mockedStreamMessage).toHaveBeenCalledWith(
          expect.objectContaining({ question: "What is my risk exposure?" }),
          expect.any(Object)
        )
      );
    });

    it("appends user message to chat immediately after sending", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForAppReady();

      fireEvent.change(
        screen.getByPlaceholderText("Ask about your portfolio, credits, compliance..."),
        { target: { value: "My question" } }
      );
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      expect(await screen.findByText("My question")).toBeInTheDocument();
    });

    it("displays the assistant reply after streaming completes", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForAppReady();

      fireEvent.change(
        screen.getByPlaceholderText("Ask about your portfolio, credits, compliance..."),
        { target: { value: "Analyse portfolio" } }
      );
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      expect(await screen.findByText("AI response")).toBeInTheDocument();
    });

    it("clears input field after sending", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForAppReady();

      const input = screen.getByPlaceholderText("Ask about your portfolio, credits, compliance...") as HTMLInputElement;
      fireEvent.change(input, { target: { value: "Test message" } });
      fireEvent.click(screen.getByRole("button", { name: /send/i }));

      await waitFor(() => expect(input.value).toBe(""));
    });

    it("sends message when Enter key is pressed", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForAppReady();

      const input = screen.getByPlaceholderText("Ask about your portfolio, credits, compliance...");
      fireEvent.change(input, { target: { value: "Enter test" } });
      fireEvent.keyDown(input, { key: "Enter", shiftKey: false });

      await waitFor(() => expect(mockedStreamMessage).toHaveBeenCalled());
    });
  });

  // ── File Attachment ────────────────────────────────────────────────────────
  describe("File Attachment", () => {
    it("shows attached PDF file name", async () => {
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitForAppReady();

      const file = new File(["content"], "report.pdf", { type: "application/pdf" });
      const fileInput = document.querySelector("#file-upload") as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(screen.getByText("report.pdf")).toBeInTheDocument();
    });

    it("rejects non-PDF files and shows an alert", async () => {
      setupDefaultMocks();
      const alertMock = jest.spyOn(window, "alert").mockImplementation(() => { });
      render(<AIAdvisor />);
      await waitForAppReady();

      const file = new File(["content"], "image.png", { type: "image/png" });
      const fileInput = document.querySelector("#file-upload") as HTMLInputElement;

      await act(async () => {
        fireEvent.change(fileInput, { target: { files: [file] } });
      });

      expect(alertMock).toHaveBeenCalledWith("Please attach a PDF document.");
      alertMock.mockRestore();
    });
  });

  // ── Authorization ──────────────────────────────────────────────────────────
  describe("Authorization", () => {
    it("includes the auth token in conversation API requests", async () => {
      localStorage.setItem("token", "my-secret-token");
      setupDefaultMocks();
      render(<AIAdvisor />);
      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          "http://localhost:5000/advisor/conversations",
          expect.objectContaining({
            headers: expect.objectContaining({ Authorization: "Bearer my-secret-token" }),
          })
        )
      );
    });

    it("uses empty string when no token in localStorage", async () => {
      localStorage.removeItem("token");
      mockedFetchInsights.mockResolvedValue(mockInsightsResponse);
      mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, conversations: [] }) });
      render(<AIAdvisor />);
      await waitFor(() =>
        expect(mockFetch).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            headers: expect.objectContaining({ Authorization: "Bearer " }),
          })
        )
      );
    });
  });
});