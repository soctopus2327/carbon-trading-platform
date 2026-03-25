// AIAdvisor.tsx
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
  Plus,
  MessageSquare,
  RotateCcw,
  Zap,
} from "lucide-react";
import { fetchAdvisorInsights, streamAdvisorMessage } from "../api/advisorApi";

type AIAdvisorProps = { onLogout?: () => void };

type ChatMessage = {
  id: number | string;
  role: "assistant" | "user";
  text: string;
  meta: string;
};

type Conversation = {
  _id: string;
  title: string;
  lastActive: string;
  messageCount: number;
};

const starterMessages: ChatMessage[] = [
  {
    id: 1,
    role: "assistant",
    text: "Hello! I'm your AI Advisor. How can I help you today?",
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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [currentTitle, setCurrentTitle] = useState("New Chat");
  const [insightCards, setInsightCards] = useState<Array<{ type: string; text: string }>>([]);
  const [nextSteps, setNextSteps] = useState<string[]>([]);
  const [liveModel, setLiveModel] = useState({
    provider: "openai" as "openai" | "lmstudio",
    modelName: "loading...",
    fallbackReason: "" as string | null,
  });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/advisor/insights?provider=${preferredProvider}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
            },
          }
        );

        if (!res.ok) throw new Error("Failed to fetch insights");

        const insightsData = await res.json();

        setInsightCards(Array.isArray(insightsData.cards) ? insightsData.cards : []);
        setNextSteps(Array.isArray(insightsData.steps) ? insightsData.steps : []);

        if (insightsData.model) {
          setLiveModel({
            provider: insightsData.model.provider || preferredProvider,
            modelName: insightsData.model.model_name || insightsData.model.modelName || "Unknown Model",
            fallbackReason: insightsData.model.fallback_reason || insightsData.model.fallbackReason || null,
          });
        }

        await loadConversations();
      } catch (err) {
        console.error("Failed to load insights", err);
        setInsightCards([
          { type: "Reduction", text: "No reduction data available yet." },
          { type: "Market", text: "Market data will appear once you have active listings." },
          { type: "Compliance", text: "Compliance insights will be available after your first trades." },
        ]);
        setNextSteps(["Start by creating your first listing", "Complete your company profile"]);
      }
    };

    loadData();
  }, [preferredProvider]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = async () => {
    try {
      const res = await fetch("http://localhost:5000/advisor/conversations", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.conversations)) {
        setConversations(data.conversations);
        if (!currentConversationId && data.conversations.length > 0) {
          const mostRecent = data.conversations[0];
          await loadConversation(mostRecent._id);
        }
      }
    } catch (err) {
      console.error("Failed to load conversations", err);
    }
  };

  const loadConversation = async (convId: string) => {
    try {
      const res = await fetch(`http://localhost:5000/advisor/conversations/${convId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
      });
      const data = await res.json();
      if (data.success && data.conversation) {
        setCurrentConversationId(convId);
        setCurrentTitle(data.conversation.title);
        setMessages(
          data.conversation.messages.map((m: any, idx: number) => ({
            id: idx + 1,
            role: m.role,
            text: m.content,
            meta: m.role === "user" ? "You" : "AI Advisor",
          }))
        );
      }
    } catch (err) {
      console.error("Failed to load conversation", err);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(null);
    setCurrentTitle("New Chat");
    setMessages(starterMessages);
    setMessageInput("");
    setAttachedFile(null);
  };

  const onFilePicked = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Please attach a PDF document.");
      event.target.value = "";
      return;
    }
    setAttachedFile(file);
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
          conversationId: currentConversationId || "",
        },
        {
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, text: `${msg.text}${token}` }
                  : msg
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
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, text: response.answer || msg.text || "No answer returned." }
                  : msg
              )
            );

            if (response.conversationId && !currentConversationId) {
              setCurrentConversationId(response.conversationId);
              setCurrentTitle(response.title || "New Chat");
              loadConversations();
            }
          },
          onError: (message) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, text: message || "Service error. Try again." }
                  : msg
              )
            );
          },
        }
      );
    } catch (err) {
      console.error(err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? { ...msg, text: "Connection error. Please try again." }
            : msg
        )
      );
    } finally {
      clearAttachment();
      setIsSending(false);
    }
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendChatMessage();
    }
  };

  return (
    <PageLayout title="AI Advisor" description="Portfolio guidance & action planning" compact>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,340px)_1fr] gap-6 h-[calc(100vh-200px)] min-h-0 bg-gray-50/40 overflow-hidden">
        {/* Left column: History + Insights stacked vertically */}
        <div className="flex flex-col gap-6 overflow-hidden">
          {/* 1. Conversation History – scrollable */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-2xl shadow-sm flex flex-col overflow-hidden flex-1 min-h-0">
            <div className="p-5 border-b border-gray-200/70 flex items-center justify-between bg-gradient-to-r from-emerald-50/80 to-white shrink-0">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare size={18} className="text-emerald-600" />
                Conversations
              </h3>
              <button
                onClick={startNewConversation}
                className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-600 transition-colors"
                title="New Conversation"
              >
                <Plus size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 py-3 min-h-0">
              {conversations.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500 flex flex-col items-center gap-2 mt-8">
                  <MessageSquare size={32} className="opacity-40" />
                  <p>No conversations yet</p>
                  <p className="text-xs">Start chatting to create one</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv._id}
                    onClick={() => loadConversation(conv._id)}
                    className={`w-full text-left px-4 py-3.5 rounded-xl flex items-center gap-3 transition-all duration-200 ${
                      currentConversationId === conv._id
                        ? "bg-emerald-50/80 border-l-4 border-emerald-500 shadow-sm"
                        : "hover:bg-gray-50/80"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-100 to-cyan-100 flex items-center justify-center shrink-0">
                      <MessageSquare size={16} className="text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{conv.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(conv.lastActive).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* 2. Advisor Insights  */}
          <div className="bg-white/80 backdrop-blur-sm border border-gray-200/80 rounded-2xl shadow-md p-6 flex flex-col overflow-hidden flex-1 min-h-0">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-5 shrink-0">
              <Zap size={20} className="text-emerald-600" />
              Advisor Insights
            </h3>

            <div className="flex-1 overflow-y-auto space-y-6 min-h-0 pr-2">
              {/* Insight Cards */}
              {insightCards.length > 0 ? (
                insightCards.map((card, index) => {
                  const type = String(card.type || "").toLowerCase();
                  let Icon = Leaf;
                  let colorClass = "emerald";

                  if (type === "market") {
                    Icon = TrendingUp;
                    colorClass = "cyan";
                  } else if (type === "compliance") {
                    Icon = ShieldCheck;
                    colorClass = "amber";
                  }

                  return (
                    <div
                      key={index}
                      className={`rounded-2xl p-5 shadow-sm border bg-${colorClass}-50/80 border-${colorClass}-200/70 hover:shadow transition-all`}
                    >
                      <div className={`flex items-center gap-2.5 text-${colorClass}-800 mb-3`}>
                        <Icon size={18} />
                        <p className="text-xs font-bold uppercase tracking-widest">{card.type}</p>
                      </div>
                      <p className="text-sm leading-relaxed text-gray-900 font-medium">
                        {card.text}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-10 text-gray-500">
                  Loading insights...
                </div>
              )}

              {/* Next Steps */}
              <div className="rounded-2xl border bg-gray-50/80 border-gray-200/70 p-5 shadow-sm">
                <p className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ArrowUp size={17} className="text-emerald-600" />
                  Recommended Next Steps
                </p>
                <ul className="space-y-3 text-sm">
                  {nextSteps.map((step, i) => (
                    <li
                      key={i}
                      className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow transition-all"
                    >
                      {step}
                    </li>
                  ))}
                  {nextSteps.length === 0 && (
                    <li className="text-gray-500 italic text-center py-8">
                      No actionable steps available yet.
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Chat*/}
        <section className="bg-white/90 backdrop-blur-sm border border-gray-200/80 rounded-2xl shadow-md flex flex-col overflow-hidden">
          <header className="p-5 border-b border-gray-200/70 bg-gradient-to-r from-emerald-50 via-white to-cyan-50/30 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 truncate max-w-[340px]">
                    {currentTitle}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-sm text-gray-600 font-medium">
                      {liveModel.provider} · {liveModel.modelName}
                    </span>
                    {liveModel.fallbackReason && (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                        {liveModel.fallbackReason}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* <button
                  onClick={startNewConversation}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
                >
                  <RotateCcw size={16} />
                  New Chat
                </button> */}

                <div className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-800 rounded-full border border-emerald-200/70 shadow-sm">
                  <Zap size={12} className="text-emerald-600" />
                  Live
                </div>
              </div>
            </div>
          </header>

          {/* Scrollable chat messages */}
          <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-gray-50/50 to-white min-h-0">
            <div className="space-y-6 max-w-5xl mx-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
                >
                  <div className={`flex items-start gap-3 max-w-[82%]`}>
                    {msg.role === "assistant" && (
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shrink-0 shadow-sm border border-emerald-200/50">
                        <Bot size={18} className="text-emerald-700" />
                      </div>
                    )}

                    <div
                      className={`rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed shadow-sm transition-all duration-200 ${
                        msg.role === "user"
                          ? "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white"
                          : "bg-white text-gray-800 border border-gray-200/80"
                      }`}
                    >
                     {msg.text || (
                      <Loader2 size={18} className="animate-spin text-emerald-600" />
                    )}
                    </div>

                    {msg.role === "user" && (
                      <div className="w-9 h-9 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0 text-gray-600 font-medium border border-gray-200/70">
                        You
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <footer className="p-5 border-t border-gray-200/70 bg-white/80 backdrop-blur-sm shrink-0">
            <div className="flex flex-wrap gap-2 mb-4">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setMessageInput(prompt)}
                  className="px-4 py-2 rounded-full text-sm font-medium bg-emerald-50/80 text-emerald-700 border border-emerald-200/70 hover:bg-emerald-100/80 hover:border-emerald-300 transition-all shadow-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 mb-4">
              <input
                id="file-upload"
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                onChange={onFilePicked}
                className="hidden"
              />

              {attachedFile && (
                <div className="flex items-center gap-2.5 px-4 py-2 bg-emerald-50/80 border border-emerald-200/70 rounded-xl text-sm text-emerald-800 shadow-sm">
                  <FileText size={16} />
                  <span className="max-w-[200px] truncate font-medium">{attachedFile.name}</span>
                  <button onClick={clearAttachment} className="text-emerald-700 hover:text-emerald-900">
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            <div className="relative flex items-center bg-gray-100/80 backdrop-blur-sm rounded-2xl px-5 py-3.5 border border-gray-200/70 focus-within:ring-2 focus-within:ring-emerald-400/50 focus-within:border-emerald-400/50 transition-all shadow-inner">
              <input
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Ask about your portfolio, credits, compliance..."
                className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500 text-[15px]"
                disabled={isSending}
              />
              <button
                onClick={sendChatMessage}
                disabled={isSending || !messageInput.trim()}
                className="ml-3 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-medium hover:from-emerald-700 hover:to-emerald-800 disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md flex items-center gap-2"
              >
                {isSending ? (
                  <>
                    Sending
                    <Loader2 size={18} className="animate-spin" />
                  </>
                ) : (
                  <>
                    Send
                    <ArrowUp size={18} />
                  </>
                )}
              </button>
            </div>
          </footer>
        </section>
      </div>
    </PageLayout>
  );
}