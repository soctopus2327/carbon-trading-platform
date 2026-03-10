import { useEffect, useState } from "react";
import axios from "axios";

const API = "http://localhost:5000/messages";

function getHeaders() {
  const token = localStorage.getItem("platformAdminToken");
  return { Authorization: `Bearer ${token}` };
}

type SentMessage = {
  _id: string;
  subject: string;
  body: string;
  broadcastType: "BROADCAST" | "MULTICAST" | "UNICAST";
  senderUser: { name: string; email: string };
  recipients: { company: { name: string; status: string }; isRead: boolean }[];
  createdAt: string;
};

type InboxMessage = {
  _id: string;
  subject: string;
  body: string;
  senderUser: { name: string; email: string; role: string };
  senderCompany: { name: string; status: string };
  adminRead: boolean;
  adminReadAt: string | null;
  createdAt: string;
};

type Company = { _id: string; name: string; companyType: string };

type View = "compose" | "sent" | "inbox";

export default function AdminMessaging() {
  const [view, setView] = useState<View>("inbox");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [sent, setSent] = useState<SentMessage[]>([]);
  const [inbox, setInbox] = useState<InboxMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedSent, setSelectedSent] = useState<SentMessage | null>(null);
  const [selectedInbox, setSelectedInbox] = useState<InboxMessage | null>(null);

  // Compose state
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [broadcastType, setBroadcastType] = useState<"BROADCAST" | "MULTICAST" | "UNICAST">("BROADCAST");
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState(false);
  const [sendError, setSendError] = useState("");

  const fetchData = async () => {
    try {
      const [sentRes, inboxRes, companiesRes] = await Promise.all([
        axios.get(`${API}/sent`, { headers: getHeaders() }),
        axios.get(`${API}/inbox`, { headers: getHeaders() }),
        axios.get(`${API}/companies-list`, { headers: getHeaders() })
      ]);
      setSent(sentRes.data.messages || []);
      setInbox(inboxRes.data.messages || []);
      setUnreadCount(inboxRes.data.unreadCount || 0);
      setCompanies(companiesRes.data || []);
    } catch { /* silent */ }
  };

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, []);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setSendError("Subject and message body are required.");
      return;
    }
    if ((broadcastType === "UNICAST" || broadcastType === "MULTICAST") && selectedCompanies.length === 0) {
      setSendError("Please select at least one company.");
      return;
    }
    setSending(true);
    setSendError("");
    try {
      await axios.post(
        `${API}/send`,
        { subject, body, broadcastType, companyIds: selectedCompanies },
        { headers: getHeaders() }
      );
      setSendSuccess(true);
      setSubject("");
      setBody("");
      setSelectedCompanies([]);
      setBroadcastType("BROADCAST");
      await fetchData();
      setTimeout(() => { setSendSuccess(false); setView("sent"); }, 1500);
    } catch (err: any) {
      setSendError(err.response?.data?.message || "Failed to send.");
    } finally {
      setSending(false);
    }
  };

  const openInboxMsg = async (msg: InboxMessage) => {
    setSelectedInbox(msg);
    if (!msg.adminRead) {
      try {
        await axios.put(`${API}/${msg._id}/admin-read`, {}, { headers: getHeaders() });
        setInbox(prev => prev.map(m => m._id === msg._id ? { ...m, adminRead: true } : m));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch { /* silent */ }
    }
  };

  const deleteMsg = async (id: string) => {
    try {
      await axios.delete(`${API}/${id}`, { headers: getHeaders() });
      setSent(prev => prev.filter(m => m._id !== id));
      setSelectedSent(null);
    } catch { /* silent */ }
  };

  const toggleCompany = (id: string) => {
    if (broadcastType === "UNICAST") {
      setSelectedCompanies([id]);
    } else {
      setSelectedCompanies(prev =>
        prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
      );
    }
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const broadcastLabel: Record<string, { color: string; label: string }> = {
    BROADCAST: { color: "bg-blue-100 text-blue-700", label: "All Companies" },
    MULTICAST: { color: "bg-purple-100 text-purple-700", label: "Multiple" },
    UNICAST: { color: "bg-green-100 text-green-700", label: "Single" }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
          <p className="text-slate-400 text-sm animate-pulse">Loading messages…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden bg-gray-50">

      {/* ── LEFT PANEL ── */}
      <div className="w-80 shrink-0 flex flex-col border-r border-slate-200 bg-white h-full">

        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-800">Messaging</h2>
          <p className="text-xs text-slate-400 mt-0.5">Communicate with companies</p>
        </div>

        {/* Nav */}
        <div className="flex flex-col gap-1 p-3 border-b border-slate-100">
          {[
            { key: "compose" as View, icon: "✏️", label: "Compose" },
            {
              key: "inbox" as View, icon: "📥", label: "Inbox",
              badge: unreadCount > 0 ? unreadCount : null
            },
            { key: "sent" as View, icon: "📤", label: "Sent" }
          ].map(item => (
            <button
              key={item.key}
              onClick={() => { setView(item.key); setSelectedSent(null); setSelectedInbox(null); }}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                view === item.key
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>{item.icon}</span>
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge && (
                <span className="bg-red-500 text-white text-xs font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto">
          {view === "inbox" && (
            <>
              {inbox.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-300">
                  <span className="text-3xl mb-2">📭</span>
                  <p className="text-sm">No messages from companies</p>
                </div>
              ) : (
                inbox.map(msg => (
                  <button
                    key={msg._id}
                    onClick={() => openInboxMsg(msg)}
                    className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      selectedInbox?._id === msg._id ? "bg-indigo-50 border-l-2 border-l-indigo-500" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-0.5">
                      <p className={`text-sm truncate ${!msg.adminRead ? "font-bold text-slate-800" : "text-slate-600"}`}>
                        {msg.subject}
                      </p>
                      {!msg.adminRead && <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-1" />}
                    </div>
                    <p className="text-xs text-slate-500 font-medium truncate">{msg.senderCompany?.name}</p>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(msg.createdAt)}</p>
                  </button>
                ))
              )}
            </>
          )}

          {view === "sent" && (
            <>
              {sent.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-slate-300">
                  <span className="text-3xl mb-2">📭</span>
                  <p className="text-sm">No sent messages</p>
                </div>
              ) : (
                sent.map(msg => (
                  <button
                    key={msg._id}
                    onClick={() => setSelectedSent(msg)}
                    className={`w-full text-left px-4 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                      selectedSent?._id === msg._id ? "bg-indigo-50 border-l-2 border-l-indigo-500" : ""
                    }`}
                  >
                    <p className="text-sm font-semibold text-slate-700 truncate mb-0.5">{msg.subject}</p>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${broadcastLabel[msg.broadcastType]?.color}`}>
                        {broadcastLabel[msg.broadcastType]?.label}
                      </span>
                      <span className="text-[10px] text-slate-400">{msg.recipients?.length} recipient{msg.recipients?.length !== 1 ? "s" : ""}</span>
                    </div>
                    <p className="text-xs text-slate-400">{formatDate(msg.createdAt)}</p>
                  </button>
                ))
              )}
            </>
          )}
        </div>
      </div>

      {/* ── MAIN PANEL ── */}
      <div className="flex-1 overflow-y-auto">

        {/* COMPOSE VIEW */}
        {view === "compose" && (
          <div className="max-w-2xl mx-auto p-8">
            <h3 className="text-xl font-bold text-slate-800 mb-6">New Message</h3>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
              {/* Broadcast Type */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Send To</label>
                <div className="flex gap-2">
                  {(["BROADCAST", "MULTICAST", "UNICAST"] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => { setBroadcastType(t); setSelectedCompanies([]); }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                        broadcastType === t
                          ? "bg-indigo-600 text-white border-indigo-600 shadow"
                          : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
                      }`}
                    >
                      {t === "BROADCAST" ? "All Companies" : t === "MULTICAST" ? "Multiple" : "One Company"}
                    </button>
                  ))}
                </div>
                {broadcastType === "BROADCAST" && (
                  <p className="text-xs text-slate-400 mt-2">Message will be sent to all active companies.</p>
                )}
              </div>

              {/* Company selector */}
              {(broadcastType === "UNICAST" || broadcastType === "MULTICAST") && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                    Select {broadcastType === "UNICAST" ? "Company" : "Companies"}
                    {selectedCompanies.length > 0 && (
                      <span className="ml-2 text-indigo-600 normal-case font-semibold">
                        ({selectedCompanies.length} selected)
                      </span>
                    )}
                  </label>
                  <div className="border border-slate-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                    {companies.length === 0 ? (
                      <p className="text-sm text-slate-400 p-3">No active companies found.</p>
                    ) : (
                      companies.map(c => (
                        <label
                          key={c._id}
                          className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors ${
                            selectedCompanies.includes(c._id) ? "bg-indigo-50" : ""
                          }`}
                        >
                          <input
                            type={broadcastType === "UNICAST" ? "radio" : "checkbox"}
                            checked={selectedCompanies.includes(c._id)}
                            onChange={() => toggleCompany(c._id)}
                            className="accent-indigo-600"
                          />
                          <span className="text-sm font-medium text-slate-700">{c.name}</span>
                          <span className="text-xs text-slate-400 ml-auto">{c.companyType}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Subject</label>
                <input
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  placeholder="Enter message subject…"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Body */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Message</label>
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  rows={6}
                  placeholder="Write your message to the companies…"
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              {sendError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl">
                  {sendError}
                </div>
              )}
              {sendSuccess && (
                <div className="text-xs text-green-700 bg-green-50 border border-green-200 px-4 py-2.5 rounded-xl font-semibold">
                  ✓ Message sent successfully!
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={sending}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-colors shadow-md"
              >
                {sending ? "Sending…" : "Send Message"}
              </button>
            </div>
          </div>
        )}

        {/* INBOX DETAIL */}
        {view === "inbox" && selectedInbox && (
          <div className="max-w-2xl mx-auto p-8">
            <button
              onClick={() => setSelectedInbox(null)}
              className="text-sm text-slate-400 hover:text-slate-600 mb-6 flex items-center gap-1.5"
            >
              ← Back to inbox
            </button>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-800 mb-3">{selectedInbox.subject}</h2>
                <div className="flex items-center gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
                      {selectedInbox.senderCompany?.name?.[0] || "C"}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{selectedInbox.senderCompany?.name}</p>
                      <p className="text-xs text-slate-400">{selectedInbox.senderUser?.name} · {selectedInbox.senderUser?.email}</p>
                    </div>
                  </div>
                  <span className="ml-auto text-xs text-slate-400">{formatDate(selectedInbox.createdAt)}</span>
                </div>
              </div>
              <div className="px-8 py-6">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedInbox.body}</p>
              </div>
            </div>
          </div>
        )}

        {/* SENT DETAIL */}
        {view === "sent" && selectedSent && (
          <div className="max-w-2xl mx-auto p-8">
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setSelectedSent(null)}
                className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1.5"
              >
                ← Back to sent
              </button>
              <button
                onClick={() => deleteMsg(selectedSent._id)}
                className="text-sm text-red-500 hover:text-red-700 font-medium"
              >
                Delete
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-slate-100">
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-xl font-bold text-slate-800 flex-1">{selectedSent.subject}</h2>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${broadcastLabel[selectedSent.broadcastType]?.color}`}>
                    {broadcastLabel[selectedSent.broadcastType]?.label}
                  </span>
                </div>
                <p className="text-sm text-slate-400">{formatDate(selectedSent.createdAt)}</p>
              </div>
              <div className="px-8 py-6">
                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap mb-6">{selectedSent.body}</p>
                {selectedSent.recipients?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
                      Recipients ({selectedSent.recipients.length})
                    </p>
                    <div className="space-y-2">
                      {selectedSent.recipients.map((r, i) => (
                        <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-100">
                          <span className="text-sm font-medium text-slate-700">{r.company?.name || "—"}</span>
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                            r.isRead ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                          }`}>
                            {r.isRead ? "✓ Read" : "Unread"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {((view === "inbox" && !selectedInbox) ||
          (view === "sent" && !selectedSent)) && (
          <div className="flex flex-col items-center justify-center h-full text-slate-300 select-none">
            <span className="text-6xl mb-4">{view === "inbox" ? "📥" : "📤"}</span>
            <p className="text-lg font-semibold text-slate-400">
              {view === "inbox" ? "Select a message to read" : "Select a sent message"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}