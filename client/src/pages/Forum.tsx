import { useEffect, useState } from "react";
import axios from "axios";
import PageLayout from "../components/layout/PageLayout";

const API = "http://localhost:5000/messages";

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
}

type PlatformMessage = {
  _id: string;
  subject: string;
  body: string;
  broadcastType: "BROADCAST" | "MULTICAST" | "UNICAST";
  senderUser: { name: string; role: string };
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

type SentMessage = {
  _id: string;
  subject: string;
  body: string;
  adminRead: boolean;
  createdAt: string;
};

type Tab = "inbox" | "compose" | "sent";

export default function Forum({ onLogout: _onLogout }: { onLogout?: () => void }) {
  const [tab, setTab] = useState<Tab>("inbox");
  const [inbox, setInbox] = useState<PlatformMessage[]>([]);
  const [sent, setSent] = useState<SentMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState<PlatformMessage | null>(null);

  // Compose state
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState("");

  const fetchInbox = async () => {
    try {
      const res = await axios.get(`${API}/my`, { headers: getAuthHeaders() });
      setInbox(res.data.messages || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch {
      setInbox([]);
    }
  };

  const fetchSent = async () => {
    try {
      const res = await axios.get(`${API}/my-sent`, { headers: getAuthHeaders() });
      setSent(res.data.messages || []);
    } catch {
      setSent([]);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchInbox(), fetchSent()]).finally(() => setLoading(false));
  }, []);

  const openMessage = async (msg: PlatformMessage) => {
    setSelectedMsg(msg);
    if (!msg.isRead) {
      try {
        await axios.put(`${API}/${msg._id}/read`, {}, { headers: getAuthHeaders() });
        setInbox(prev =>
          prev.map(m => m._id === msg._id ? { ...m, isRead: true } : m)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch { /* silent */ }
    }
  };

  const markAllRead = async () => {
    try {
      await axios.put(`${API}/mark-all-read`, {}, { headers: getAuthHeaders() });
      setInbox(prev => prev.map(m => ({ ...m, isRead: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setSendError("Subject and message are required.");
      return;
    }
    setSending(true);
    setSendError("");
    try {
      await axios.post(`${API}/company-send`, { subject, body }, { headers: getAuthHeaders() });
      setSendSuccess(true);
      setSubject("");
      setBody("");
      await fetchSent();
      setTimeout(() => {
        setSendSuccess(false);
        setTab("sent");
      }, 1500);
    } catch (err: any) {
      setSendError(err.response?.data?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const broadcastBadge = (type: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      BROADCAST: { label: "All Companies", cls: "bg-blue-100 text-blue-700 border-blue-200" },
      MULTICAST: { label: "Multiple Companies", cls: "bg-purple-100 text-purple-700 border-purple-200" },
      UNICAST: { label: "Just You", cls: "bg-green-100 text-green-700 border-green-200" }
    };
    const b = map[type] || { label: type, cls: "bg-gray-100 text-gray-600" };
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide ${b.cls}`}>
        {b.label}
      </span>
    );
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <PageLayout title="Forum" description="Messages from CarbonX platform and your team">
        <div className="flex items-center justify-center h-80">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500" />
            <p className="text-slate-400 text-sm animate-pulse">Loading messages…</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Forum" description="Platform messages and communications">
      <div className="flex h-[calc(100vh-120px)] overflow-hidden">

        {/* ── LEFT PANEL: tab list + message list ── */}
        <div className="w-80 shrink-0 flex flex-col border-r border-slate-200 bg-white">

          {/* Tabs */}
          <div className="flex border-b border-slate-200">
            {(["inbox", "compose", "sent"] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelectedMsg(null); }}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${
                  tab === t
                    ? "border-b-2 border-green-600 text-green-700 bg-green-50"
                    : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
                }`}
              >
                {t === "inbox" && unreadCount > 0 ? (
                  <span className="flex items-center justify-center gap-1.5">
                    Inbox
                    <span className="bg-green-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {unreadCount}
                    </span>
                  </span>
                ) : (
                  t === "compose" ? "✉ Compose" : t.charAt(0).toUpperCase() + t.slice(1)
                )}
              </button>
            ))}
          </div>

          {/* Mark all read */}
          {tab === "inbox" && unreadCount > 0 && (
            <div className="px-4 py-2 bg-green-50 border-b border-green-100">
              <button
                onClick={markAllRead}
                className="text-xs text-green-700 hover:text-green-900 font-semibold underline underline-offset-2"
              >
                Mark all as read
              </button>
            </div>
          )}

          {/* Message list */}
          <div className="flex-1 overflow-y-auto">
            {tab === "inbox" && (
              <>
                {inbox.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <span className="text-3xl mb-2">📭</span>
                    <p className="text-sm">No messages yet</p>
                  </div>
                ) : (
                  inbox.map(msg => (
                    <button
                      key={msg._id}
                      onClick={() => openMessage(msg)}
                      className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        selectedMsg?._id === msg._id ? "bg-green-50 border-l-2 border-l-green-500" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className={`text-sm truncate leading-tight ${!msg.isRead ? "font-bold text-slate-800" : "font-medium text-slate-600"}`}>
                          {msg.subject}
                        </p>
                        {!msg.isRead && (
                          <span className="shrink-0 w-2 h-2 rounded-full bg-green-500 mt-1" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mb-1.5 line-clamp-1">{msg.body}</p>
                      <div className="flex items-center gap-2">
                        {broadcastBadge(msg.broadcastType)}
                        <span className="text-[10px] text-slate-400">{formatDate(msg.createdAt)}</span>
                      </div>
                    </button>
                  ))
                )}
              </>
            )}

            {tab === "sent" && (
              <>
                {sent.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                    <span className="text-3xl mb-2">📤</span>
                    <p className="text-sm">No sent messages</p>
                  </div>
                ) : (
                  sent.map(msg => (
                    <div
                      key={msg._id}
                      className="px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 cursor-default"
                    >
                      <p className="text-sm font-semibold text-slate-700 truncate mb-1">{msg.subject}</p>
                      <p className="text-xs text-slate-400 line-clamp-1 mb-1.5">{msg.body}</p>
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          msg.adminRead
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-amber-100 text-amber-700 border-amber-200"
                        }`}>
                          {msg.adminRead ? "✓ Seen" : "Pending"}
                        </span>
                        <span className="text-[10px] text-slate-400">{formatDate(msg.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {tab === "compose" && (
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">To</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-lg border border-slate-200">
                    <span className="text-lg">🛡️</span>
                    <span className="text-sm font-semibold text-slate-700">Platform Admin</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Subject</label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Enter subject…"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Message</label>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={5}
                    placeholder="Write your message to the platform admin…"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                  />
                </div>

                {sendError && (
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                    {sendError}
                  </div>
                )}
                {sendSuccess && (
                  <div className="text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-lg font-semibold">
                    ✓ Message sent successfully!
                  </div>
                )}

                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-lg text-sm transition-colors"
                >
                  {sending ? "Sending…" : "Send Message"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL: message detail ── */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {tab === "compose" ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 select-none">
              <span className="text-6xl mb-4">✉️</span>
              <p className="text-lg font-semibold text-slate-400">Compose a message</p>
              <p className="text-sm text-slate-400 mt-1">Fill in the form to contact Platform Admin</p>
            </div>
          ) : selectedMsg ? (
            <div className="max-w-2xl mx-auto p-8">
              <button
                onClick={() => setSelectedMsg(null)}
                className="text-sm text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-1.5 font-medium"
              >
                ← Back to inbox
              </button>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h2 className="text-xl font-bold text-slate-800 leading-tight">{selectedMsg.subject}</h2>
                    {broadcastBadge(selectedMsg.broadcastType)}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        P
                      </div>
                      <span className="font-semibold text-slate-700">
                        {selectedMsg.senderUser?.name || "Platform Admin"}
                      </span>
                    </div>
                    <span>·</span>
                    <span>{formatDate(selectedMsg.createdAt)}</span>
                  </div>
                </div>

                {/* Body */}
                <div className="px-8 py-6">
                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedMsg.body}</p>
                </div>

                {/* Footer action */}
                <div className="px-8 py-4 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={() => { setTab("compose"); setSelectedMsg(null); setSubject(`Re: ${selectedMsg.subject}`); }}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-green-700 hover:text-green-800 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg border border-green-200 transition-colors"
                  >
                    ↩ Reply to Platform Admin
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 select-none">
              {tab === "inbox" ? (
                <>
                  <span className="text-6xl mb-4">📨</span>
                  <p className="text-lg font-semibold text-slate-400">Select a message to read</p>
                  <p className="text-sm text-slate-400 mt-1">
                    {inbox.length === 0 ? "Your inbox is empty" : `${inbox.length} message${inbox.length !== 1 ? "s" : ""} from platform`}
                  </p>
                </>
              ) : (
                <>
                  <span className="text-6xl mb-4">📤</span>
                  <p className="text-lg font-semibold text-slate-400">Sent messages</p>
                  <p className="text-sm text-slate-400 mt-1">{sent.length} message{sent.length !== 1 ? "s" : ""} sent to platform admin</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}