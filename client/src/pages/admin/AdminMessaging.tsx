import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { 
  Mail, Send, Inbox, PlusCircle, Trash2, Building2, 
  CheckCircle2, AlertCircle, Loader2, Search, X, Users, User, Globe
} from "lucide-react";

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
  
  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [companySearch, setCompanySearch] = useState("");

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
    } catch (err) {
      console.error("Fetch error", err);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, []);

  // Filter Logic for Inbox/Sent
  const filteredInbox = useMemo(() => {
    return inbox.filter(msg => 
      msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.senderCompany?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [inbox, searchQuery]);

  const filteredSent = useMemo(() => {
    return sent.filter(msg => 
      msg.subject.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [sent, searchQuery]);

  // Filter Logic for Company Selection
  const filteredCompanies = useMemo(() => {
    return companies.filter(c => 
      c.name.toLowerCase().includes(companySearch.toLowerCase())
    );
  }, [companies, companySearch]);

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setSendError("Subject and message body are required.");
      return;
    }
    if ((broadcastType === "UNICAST" || broadcastType === "MULTICAST") && selectedCompanies.length === 0) {
      setSendError("Please select at least one recipient.");
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
      setCompanySearch("");
      await fetchData();
      setTimeout(() => {
        setSendSuccess(false);
        setView("sent");
      }, 1200);
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
        setInbox(prev => prev.map(m => (m._id === msg._id ? { ...m, adminRead: true } : m)));
        setUnreadCount(prev => Math.max(0, prev - 1));
      } catch {}
    }
  };

  const deleteMsg = async (id: string) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await axios.delete(`${API}/${id}`, { headers: getHeaders() });
      setSent(prev => prev.filter(m => m._id !== id));
      setSelectedSent(null);
    } catch {}
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
    new Date(d).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });

  const typeConfig: Record<string, { color: string; label: string; icon: any }> = {
    BROADCAST: { color: "bg-emerald-100 text-emerald-700", label: "All Companies", icon: Globe },
    MULTICAST: { color: "bg-blue-100 text-blue-700", label: "Group", icon: Users },
    UNICAST: { color: "bg-purple-100 text-purple-700", label: "Individual", icon: User }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50">
        <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium">Syncing communications...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
      {/* SIDEBAR */}
      <div className="w-80 shrink-0 flex flex-col bg-white border-r border-slate-200">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-8 w-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              <Mail className="text-white h-5 w-5" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">Portal Hub</h2>
          </div>
          <p className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Communication Center</p>
        </div>

        <nav className="px-4 space-y-1 mb-4">
          {[
            { key: "compose" as View, label: "Compose", icon: PlusCircle },
            { key: "inbox" as View, label: "Inbox", icon: Inbox, badge: unreadCount },
            { key: "sent" as View, label: "Sent Items", icon: Send }
          ].map(item => (
            <button
              key={item.key}
              onClick={() => {
                setView(item.key);
                setSelectedSent(null);
                setSelectedInbox(null);
                setSearchQuery("");
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                view === item.key
                  ? "bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-200/50"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon className={`h-5 w-5 ${view === item.key ? "text-emerald-600" : "text-slate-400"}`} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge ? (
                <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        {view !== "compose" && (
          <div className="px-4 mb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-emerald-500/20 placeholder:text-slate-400"
              />
            </div>
          </div>
        )}

        <div className="flex-1 border-t border-slate-100 mt-2 overflow-y-auto custom-scrollbar">
          {view === "inbox" && filteredInbox.map(msg => (
            <div
              key={msg._id}
              onClick={() => openInboxMsg(msg)}
              className={`cursor-pointer p-4 border-b border-slate-50 transition-all ${
                selectedInbox?._id === msg._id ? "bg-emerald-50/50 border-r-2 border-emerald-500" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${msg.adminRead ? "bg-slate-100 text-slate-500" : "bg-emerald-100 text-emerald-700"}`}>
                  {msg.adminRead ? "Read" : "New"}
                </span>
                <span className="text-[10px] text-slate-400">{formatDate(msg.createdAt)}</span>
              </div>
              <p className={`text-sm truncate ${!msg.adminRead ? "font-bold text-slate-900" : "text-slate-600"}`}>
                {msg.subject}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {msg.senderCompany?.name}
              </p>
            </div>
          ))}

          {view === "sent" && filteredSent.map(msg => (
            <div
              key={msg._id}
              onClick={() => setSelectedSent(msg)}
              className={`cursor-pointer p-4 border-b border-slate-50 transition-all ${
                selectedSent?._id === msg._id ? "bg-emerald-50/50 border-r-2 border-emerald-500" : "hover:bg-slate-50"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${typeConfig[msg.broadcastType]?.color}`}>
                  {typeConfig[msg.broadcastType]?.label}
                </span>
                <span className="text-[10px] text-slate-400">{formatDate(msg.createdAt)}</span>
              </div>
              <p className="text-sm font-bold text-slate-800 truncate">{msg.subject}</p>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN PANEL */}
      <main className="flex-1 flex flex-col min-w-0 bg-white shadow-2xl m-4 rounded-2xl border border-slate-200 overflow-hidden">
        
        {view === "compose" && (
          <div className="h-full flex flex-col">
            <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">New Message</h3>
                <p className="text-sm text-slate-500">Select an audience and draft your message.</p>
              </div>
              <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                {(["BROADCAST", "MULTICAST", "UNICAST"] as const).map((t) => {
                  const Icon = typeConfig[t].icon;
                  return (
                    <button
                      key={t}
                      onClick={() => {
                        setBroadcastType(t);
                        setSelectedCompanies([]);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                        broadcastType === t 
                        ? "bg-emerald-600 text-white shadow-md" 
                        : "text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {typeConfig[t].label}
                    </button>
                  );
                })}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              <div className="max-w-3xl space-y-8">
                
                {/* Company Search & Multi-select */}
                {(broadcastType === "MULTICAST" || broadcastType === "UNICAST") && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {broadcastType === "UNICAST" ? "Select Recipient" : "Select Group Recipients"}
                      </label>
                      <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input 
                          placeholder="Filter companies..."
                          value={companySearch}
                          onChange={(e) => setCompanySearch(e.target.value)}
                          className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 max-h-40 overflow-y-auto custom-scrollbar">
                      {filteredCompanies.length > 0 ? (
                        filteredCompanies.map(c => (
                          <button
                            key={c._id}
                            onClick={() => toggleCompany(c._id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                              selectedCompanies.includes(c._id)
                                ? "bg-emerald-600 text-white shadow-sm"
                                : "bg-white text-slate-600 border border-slate-200 hover:border-emerald-300"
                            }`}
                          >
                            {c.name}
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-slate-400 italic py-2">No companies found matching your search.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <input
                    placeholder="Subject Line"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full text-2xl font-bold text-slate-900 border-none focus:ring-0 placeholder:text-slate-200 p-0"
                  />
                  <div className="h-px bg-slate-100 w-full" />
                  <textarea
                    placeholder="Start typing your message..."
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    rows={10}
                    className="w-full text-slate-700 border-none focus:ring-0 placeholder:text-slate-300 resize-none p-0 leading-relaxed text-lg"
                  />
                </div>
              </div>
            </div>

            <footer className="px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {sendError && <span className="text-red-600 text-xs font-bold flex items-center gap-1"><AlertCircle className="h-4 w-4"/> {sendError}</span>}
                {sendSuccess && <span className="text-emerald-600 text-xs font-bold flex items-center gap-1"><CheckCircle2 className="h-4 w-4"/> Message Dispatched</span>}
              </div>
              <button
                onClick={handleSend}
                disabled={sending}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-bold px-8 py-2.5 rounded-xl shadow-lg transition-all flex items-center gap-2"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                {sending ? "Sending..." : "Send Now"}
              </button>
            </footer>
          </div>
        )}

        {(selectedInbox || selectedSent) ? (
          <div className="h-full flex flex-col">
            <div className="p-8 border-b border-slate-100">
              <div className="flex justify-between items-start mb-6">
                <h3 className="text-2xl font-bold text-slate-900">{(selectedInbox || selectedSent)?.subject}</h3>
                {selectedSent && (
                  <button onClick={() => deleteMsg(selectedSent._id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
                  {(selectedInbox?.senderUser?.name || selectedSent?.senderUser?.name || "A")[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedInbox ? selectedInbox.senderCompany?.name : "Internal Admin"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {selectedInbox ? selectedInbox.senderUser?.email : selectedSent?.senderUser?.email}
                  </p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">Timestamp</p>
                  <p className="text-xs text-slate-600 font-medium">{formatDate((selectedInbox || selectedSent)!.createdAt)}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 p-8 overflow-y-auto whitespace-pre-wrap text-slate-700 leading-relaxed bg-slate-50/30">
              {(selectedInbox || selectedSent)?.body}
            </div>
          </div>
        ) : view !== "compose" && (
          <div className="h-full flex flex-col items-center justify-center text-slate-300">
            <Mail className="h-16 w-16 mb-4 stroke-[1px]" />
            <p className="text-lg font-medium">Select a thread to view content</p>
          </div>
        )}
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #10B981; }
      `}</style>
    </div>
  );
}