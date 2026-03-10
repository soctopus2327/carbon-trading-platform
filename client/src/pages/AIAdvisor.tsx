import { useState } from "react";
import PageLayout from "../components/layout/PageLayout";
import { Sparkles, Bot, ArrowUp, TrendingUp, Leaf, ShieldCheck } from "lucide-react";

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
  const [messageInput, setMessageInput] = useState("");

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
                  <p className="text-sm text-gray-600">Live model: Gemini 2.5 Flash</p>
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
              {starterMessages.map((item) => (
                <article key={item.id} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                    <Bot size={17} />
                  </div>
                  <div>
                    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 shadow-sm max-w-2xl leading-6">
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

            <div className="flex items-center bg-gray-100 rounded-xl px-3 py-2 border border-gray-200 focus-within:ring-2 focus-within:ring-emerald-300 focus-within:border-emerald-400">
              <input
                value={messageInput}
                onChange={(event) => setMessageInput(event.target.value)}
                className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-500"
                placeholder="Ask for recommendations, risk checks, or reduction roadmap..."
              />
              <button className="ml-2 rounded-lg px-3 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition inline-flex items-center gap-2 text-sm font-semibold">
                Send
                <ArrowUp size={15} />
              </button>
            </div>
          </footer>
        </section>

        <aside className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 min-h-0 flex flex-col gap-3 overflow-hidden">
          <h3 className="text-base font-bold text-gray-900">Advisor Insights</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 text-emerald-800 mb-1">
                <Leaf size={15} />
                <p className="text-xs font-bold uppercase tracking-wide">Reduction</p>
              </div>
              <p className="text-sm text-emerald-900 font-semibold">Scope 3 down by 6.2% possible</p>
            </div>

            <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-4">
              <div className="flex items-center gap-2 text-cyan-800 mb-1">
                <TrendingUp size={15} />
                <p className="text-xs font-bold uppercase tracking-wide">Market</p>
              </div>
              <p className="text-sm text-cyan-900 font-semibold">Forestry credits showing stable demand</p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <div className="flex items-center gap-2 text-amber-800 mb-1">
                <ShieldCheck size={15} />
                <p className="text-xs font-bold uppercase tracking-wide">Compliance</p>
              </div>
              <p className="text-sm text-amber-900 font-semibold">Audit gap detected in April retirements</p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 flex-1 min-h-0 overflow-y-auto">
            <p className="text-sm font-bold text-gray-900 mb-3">Recommended Next Steps</p>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="bg-white border border-gray-200 rounded-lg p-3">Shift 12% of offsets to high-verification forestry projects.</li>
              <li className="bg-white border border-gray-200 rounded-lg p-3">Retire older vintage holdings first to lower compliance risk.</li>
              <li className="bg-white border border-gray-200 rounded-lg p-3">Run weekly buy-window checks before major procurement.</li>
            </ul>
          </div>
        </aside>
      </div>
    </PageLayout>
  );
}
