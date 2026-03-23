import { useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import PageLayout from "../components/layout/PageLayout";
import {
  Sparkles,
  Bot,
  ArrowUp,
  TrendingUp,
  Leaf,
  ShieldCheck,
  Paperclip,
  FileText,
  X,
  Loader2,
} from "lucide-react";
import { fetchAdvisorInsights, streamAdvisorMessage } from "../api/advisorApi";

type AIAdvisorProps = {
  onLogout?: () => void;
};

type ChatMessage = {
  id: number;
  role: "assistant" | "user";
  text: string;
  meta: string;
};

const starterMessages: ChatMessage[] = [
  {
    id: 1,
    role: "assistant",
    text: "Good morning. I reviewed your latest profile and found opportunities in offset mix, timing, and retirement strategy.",
    meta: "AI Advisor",
  },
  {
    id: 2,
    role: "assistant",
    text: "Ask me for a 30-day action plan and I will break it into low-risk and high-impact steps.",
    meta: "AI Advisor",
  },
];

const quickPrompts = [
  "Build my 30-day reduction plan",
  "Which credits should I retire first?",
  "Show risk in current portfolio",
  "Best buy window this month",
];

export default function AIAdvisor({ onLogout: _onLogout }: AIAdvisorProps) {
  void _onLogout;

  const preferredProvider: "openai" | "lmstudio" = "lmstudio";

  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(starterMessages);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [insightCards, setInsightCards] = useState<Array<{ type: string; text: string }>>([]);
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [liveModel, setLiveModel] = useState({
    provider: "openai" as "openai" | "lmstudio",
    modelName: "loading...",
    fallbackReason: "" as string | null,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const loadInsights = async () => {
      try {
        const data = await fetchAdvisorInsights(preferredProvider);
        if (Array.isArray(data?.cards) && data.cards.length > 0) {
          setInsightCards(data.cards);
        }
        if (Array.isArray(data?.steps)) {
          setNextSteps(data.steps);
        }
        if (data?.model) {
          setLiveModel({
            provider: data.model.provider_used || data.model.provider || "openai",
            modelName: data.model.model_name || "unknown",
            fallbackReason: data.model.fallback_reason || null,
          });
        }
      } catch {
        setInsightCards([]);
        setNextSteps([]);
      }
    };

    void loadInsights();
  }, []);

  const onFilePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;

    if (file.type !== "application/pdf") {
      window.alert("Please attach a PDF document.");
      event.target.value = "";
      return;
    }

    setAttachedFile(file);
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const sendChatMessage = async () => {
    const question = messageInput.trim();
    if (!question || isSending) return;

    const userMessage: ChatMessage = {
      id: Date.now(),
      role: "user",
      text: question,
      meta: "You",
    };

    setMessages((prev) => [...prev, userMessage]);
    setMessageInput("");
    setIsSending(true);

    const assistantMessageId = Date.now() + 1;
    const assistantPlaceholder: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      text: "",
      meta: "AI Advisor",
    };
    setMessages((prev) => [...prev, assistantPlaceholder]);

    try {
      await streamAdvisorMessage(
        {
        question,
        provider: preferredProvider,
        document: attachedFile,
        },
        {
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, text: `${message.text}${token}` }
                  : message
              )
            );
          },
          onFinal: (response) => {
            if (response.meta) {
              setLiveModel({
                provider: response.meta.provider_used || response.meta.provider || "openai",
                modelName: response.meta.model_name || "unknown",
                fallbackReason: response.meta.fallback_reason || null,
              });
            }

            setMessages((prev) =>
              prev.map((message) =>
                message.id === assistantMessageId
                  ? { ...message, text: response.answer || message.text || "No answer returned by the advisor." }
                  : message
              )
            );
          },
          onError: (message) => {
            setMessages((prev) =>
              prev.map((item) =>
                item.id === assistantMessageId
                  ? { ...item, text: message || "I could not reach the advisor service. Please try again." }
                  : item
              )
            );
          },
        }
      );
    } catch (error: unknown) {
      const message =
        error && typeof error === "object" && "response" in error
          ? String((error as { response?: { data?: { message?: string } } }).response?.data?.message || "")
          : "";

      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantMessageId
            ? { ...item, text: message || "I could not reach the advisor service. Please try again." }
            : item
        )
      );
    } finally {
      clearAttachment();
      setIsSending(false);
    }
  };

  const onInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void sendChatMessage();
    }
  };

  return (
    <PageLayout
      title="AI Advisor"
      description="Portfolio guidance, compliance signals, and action planning"
      compact
    >
      <div className="grid grid-cols-1 xl:grid-cols-[1.7fr_1fr] gap-5 h-[calc(100vh-210px)] min-h-0">
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-0">
          <header className="p-5 border-b border-gray-200 bg-gradient-to-r from-emerald-50 via-emerald-100/40 to-cyan-50">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-600 to-emerald-700 text-white flex items-center justify-center shadow-md">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Advisor Session</h2>
                  <p className="text-sm text-gray-600">
                    Live model: {liveModel.provider}/{liveModel.modelName}
                  </p>
                  {liveModel.fallbackReason ? (
                    <p className="text-xs text-amber-700 mt-1">{liveModel.fallbackReason}</p>
                  ) : null}
                </div>
              </div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Connected
              </span>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-white to-gray-50 min-h-0">
            <div className="space-y-4">
              {messages.map((item) => (
                <article key={item.id} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                    <Bot size={17} />
                  </div>
                  <div>
                    <div
                      className={`border rounded-xl px-4 py-3 text-sm shadow-sm max-w-2xl leading-6 whitespace-pre-wrap ${
                        item.role === "user"
                          ? "bg-emerald-600 text-white border-emerald-600"
                          : "bg-white text-gray-800 border-gray-200"
                      }`}
                    >
                      {item.text}
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">{item.meta}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <footer className="p-4 border-t border-gray-200 bg-white">
            <div className="flex flex-wrap gap-2 mb-3">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setMessageInput(prompt)}
                  className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <input
                id="advisor-attachment"
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={onFilePicked}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition"
              >
                <Paperclip size={15} />
                Attach Document
              </button>

              {attachedFile ? (
                <div className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
                  <FileText size={14} />
                  <span className="max-w-[220px] truncate">{attachedFile.name}</span>
                  <button
                    type="button"
                    onClick={clearAttachment}
                    className="text-emerald-800 hover:text-emerald-900"
                    aria-label="Remove attachment"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : null}
            </div>

            <div className="flex items-center bg-gray-100 rounded-xl px-3 py-2 border border-gray-200 focus-within:ring-2 focus-within:ring-emerald-300 focus-within:border-emerald-400">
              <input
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                onKeyDown={onInputKeyDown}
                className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-500"
                placeholder="Ask for recommendations, risk checks, or reduction roadmap..."
              />
              <button
                onClick={() => void sendChatMessage()}
                disabled={isSending}
                className="ml-2 rounded-lg px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition inline-flex items-center gap-2 text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSending ? "Sending" : "Send"}
                {isSending ? <Loader2 size={15} className="animate-spin" /> : <ArrowUp size={15} />}
              </button>
            </div>
          </footer>
        </section>

        <aside className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 min-h-0 flex flex-col gap-3 overflow-hidden">
          <h3 className="text-base font-bold text-gray-900">Advisor Insights</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
            {insightCards.map((card) => {
              const type = String(card.type || "").toLowerCase();

              if (type === "market") {
                return (
                  <div key={card.type} className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
                    <div className="flex items-center gap-2 text-cyan-800 mb-1">
                      <TrendingUp size={15} />
                      <p className="text-xs font-bold uppercase tracking-wide">Market</p>
                    </div>
                    <p className="text-sm text-cyan-900 font-semibold">{card.text}</p>
                  </div>
                );
              }

              if (type === "compliance") {
                return (
                  <div key={card.type} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center gap-2 text-amber-800 mb-1">
                      <ShieldCheck size={15} />
                      <p className="text-xs font-bold uppercase tracking-wide">Compliance</p>
                    </div>
                    <p className="text-sm text-amber-900 font-semibold">{card.text}</p>
                  </div>
                );
              }

              return (
                <div key={card.type} className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="flex items-center gap-2 text-emerald-800 mb-1">
                    <Leaf size={15} />
                    <p className="text-xs font-bold uppercase tracking-wide">Reduction</p>
                  </div>
                  <p className="text-sm text-emerald-900 font-semibold">{card.text}</p>
                </div>
              );
            })}
            {insightCards.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                No trade insights are available yet.
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex-1 min-h-0 overflow-y-auto">
            <p className="text-sm font-bold text-gray-900 mb-3">Recommended Next Steps</p>
            <ul className="space-y-3 text-sm text-gray-700">
              {nextSteps.map((step) => (
                <li key={step} className="bg-white border border-gray-200 rounded-lg p-3">
                  {step}
                </li>
              ))}
              {nextSteps.length === 0 ? (
                <li className="bg-white border border-gray-200 rounded-lg p-3">
                  No actionable steps yet. Complete a few trades to unlock trend-based guidance.
                </li>
              ) : null}
            </ul>
          </div>
        </aside>
      </div>
    </PageLayout>
  );
}
