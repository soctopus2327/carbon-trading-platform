import { useEffect, useState } from "react";
import axios from "axios";
import PageLayout from "../components/layout/PageLayout";
import { 
  Inbox, 
  Send, 
  PenSquare, 
  MoreHorizontal, 
  CheckCircle2, 
  Clock, 
  ArrowLeft,
  MailOpen,
  User,
  ShieldCheck,
  Loader2
} from "lucide-react";

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

export default function Forum() {
  const [tab, setTab] = useState<Tab>("inbox");
  const [inbox, setInbox] = useState<PlatformMessage[]>([]);
  const [sent, setSent] = useState<SentMessage[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedMsg, setSelectedMsg] = useState<PlatformMessage | null>(null);

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
      BROADCAST: { label: "Global", cls: "bg-blue-50 text-blue-700 ring-blue-600/20" },
      MULTICAST: { label: "Group", cls: "bg-purple-50 text-purple-700 ring-purple-600/20" },
      UNICAST: { label: "Private", cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" }
    };
    const b = map[type] || { label: type, cls: "bg-slate-50 text-slate-600 ring-slate-600/20" };
    return (
      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ring-1 ring-inset uppercase tracking-widest ${b.cls}`}>
        {b.label}
      </span>
    );
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  if (loading) {
    return (
      <PageLayout title="Forum" description="Communication terminal">
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <Loader2 className="h-10 w-10 text-emerald-500 animate-spin" />
          <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">Syncing Encrypted Channel...</p>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout title="Forum" description="Platform messages and secure communications">
      <div className="flex h-[calc(100vh-160px)] overflow-hidden bg-white rounded-2xl border border-slate-200 shadow-sm">

        {/* ── LEFT PANEL ── */}
        <div className="w-80 shrink-0 flex flex-col border-r border-slate-100 bg-slate-50/50">
          
          {/* Navigation Tabs */}
          <div className="p-4 space-y-1">
            <TabButton 
              active={tab === "inbox"} 
              onClick={() => {setTab("inbox"); setSelectedMsg(null);}} 
              icon={Inbox} 
              label="Inbox" 
              count={unreadCount} 
            />
            <TabButton 
              active={tab === "sent"} 
              onClick={() => {setTab("sent"); setSelectedMsg(null);}} 
              icon={Send} 
              label="Sent" 
            />
            <button
              onClick={() => {setTab("compose"); setSelectedMsg(null);}}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                tab === "compose" 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200" 
                  : "bg-white text-emerald-600 border border-emerald-100 hover:bg-emerald-50 shadow-sm"
              }`}
            >
              <PenSquare className="h-4 w-4" />
              Compose
            </button>
          </div>

          <div className="px-4 pb-2 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Recent Activity</span>
            {tab === "inbox" && unreadCount > 0 && (
              <button onClick={markAllRead} className="text-[10px] font-bold text-emerald-600 hover:underline">Mark all read</button>
            )}
          </div>

          {/* List Area */}
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {tab === "inbox" && inbox.map(msg => (
              <MessageListItem 
                key={msg._id}
                active={selectedMsg?._id === msg._id}
                unread={!msg.isRead}
                subject={msg.subject}
                body={msg.body}
                date={formatDate(msg.createdAt)}
                badge={broadcastBadge(msg.broadcastType)}
                onClick={() => openMessage(msg)}
              />
            ))}

            {tab === "sent" && sent.map(msg => (
              <MessageListItem 
                key={msg._id}
                subject={msg.subject}
                body={msg.body}
                date={formatDate(msg.createdAt)}
                status={msg.adminRead ? "Seen" : "Pending"}
                onClick={() => {}}
              />
            ))}
            
            {((tab === "inbox" && inbox.length === 0) || (tab === "sent" && sent.length === 0)) && (
              <div className="mt-20 text-center px-6">
                <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MailOpen className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-bold text-slate-500">No transmissions</p>
                <p className="text-xs text-slate-400 mt-1">Your message log is currently empty.</p>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div className="flex-1 overflow-y-auto bg-white">
          {tab === "compose" ? (
            <div className="max-w-xl mx-auto py-12 px-6">
              <div className="mb-8">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">New Transmission</h2>
                <p className="text-slate-500 text-sm">Direct line to CarbonX Platform Administrators</p>
              </div>

              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-4">
                  <div className="bg-slate-900 p-2 rounded-lg">
                    <ShieldCheck className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Recipient</p>
                    <p className="text-sm font-bold text-slate-800">Platform Command Center</p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Subject</label>
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Brief summary of request..."
                    className="w-full bg-white border-2 border-slate-100 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none transition-all text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Message Detail</label>
                  <textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={8}
                    placeholder="Describe your inquiry in detail..."
                    className="w-full bg-white border-2 border-slate-100 focus:border-emerald-500 rounded-xl px-4 py-3 outline-none transition-all text-sm font-medium resize-none"
                  />
                </div>

                {sendError && <p className="text-xs font-bold text-rose-600 bg-rose-50 p-3 rounded-lg border border-rose-100">{sendError}</p>}
                {sendSuccess && <p className="text-xs font-bold text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">✓ Message transmitted successfully.</p>}

                <button
                  onClick={handleSend}
                  disabled={sending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-100 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Transmit Message
                </button>
              </div>
            </div>
          ) : selectedMsg ? (
            <div className="p-8 max-w-3xl mx-auto">
              <button
                onClick={() => setSelectedMsg(null)}
                className="flex items-center gap-2 text-slate-400 hover:text-emerald-600 text-xs font-black uppercase tracking-widest mb-8 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Close Message
              </button>

              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-8 py-8 border-b border-slate-100">
                  <div className="flex justify-between items-start gap-4 mb-6">
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-tight">{selectedMsg.subject}</h2>
                    {broadcastBadge(selectedMsg.broadcastType)}
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                      <ShieldCheck className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{selectedMsg.senderUser?.name || "Platform Admin"}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{formatDate(selectedMsg.createdAt)}</p>
                    </div>
                  </div>
                </div>

                <div className="px-8 py-10">
                  <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm">{selectedMsg.body}</p>
                </div>

                <div className="px-8 py-6 bg-slate-50 border-t border-slate-100">
                  <button
                    onClick={() => { setTab("compose"); setSelectedMsg(null); setSubject(`Re: ${selectedMsg.subject}`); }}
                    className="flex items-center gap-2 bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-200 text-emerald-600 font-bold px-6 py-3 rounded-xl transition-all shadow-sm"
                  >
                    <PenSquare className="h-4 w-4" />
                    Reply to Admin
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-300">
              <div className="bg-slate-50 w-20 h-20 rounded-3xl flex items-center justify-center mb-4">
                <Inbox className="h-10 w-10 text-slate-200" />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.2em]">Select an Item to View Details</p>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

// Sub-components for cleaner structure
function TabButton({ active, onClick, icon: Icon, label, count }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
        active ? "bg-white text-emerald-600 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-white/60"
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 ${active ? "text-emerald-500" : "text-slate-400"}`} />
        {label}
      </div>
      {count > 0 && (
        <span className="bg-emerald-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md min-w-[20px]">
          {count}
        </span>
      )}
    </button>
  );
}

function MessageListItem({ active, unread, subject, body, date, badge, status, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl mb-1 transition-all group ${
        active ? "bg-white shadow-md ring-1 ring-slate-200" : "hover:bg-white"
      }`}
    >
      <div className="flex justify-between items-start mb-1">
        <p className={`text-sm truncate w-4/5 ${unread ? "font-black text-slate-900" : "font-bold text-slate-600"}`}>
          {subject}
        </p>
        {unread && <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shadow-lg shadow-emerald-200" />}
      </div>
      <p className="text-xs text-slate-400 line-clamp-1 mb-3 font-medium">{body}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {badge}
          {status && (
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-1 ${status === 'Seen' ? 'text-emerald-500 bg-emerald-50' : 'text-amber-500 bg-amber-50'}`}>
              {status === 'Seen' ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
              {status}
            </span>
          )}
        </div>
        <span className="text-[10px] font-bold text-slate-400">{date}</span>
      </div>
    </button>
  );
}