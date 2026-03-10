import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  ArrowRightLeft, 
  MessageSquare, 
  LogOut, 
  ShieldCheck 
} from "lucide-react";

type Page = "dashboard" | "companies" | "users" | "transactions" | "messaging";

interface Props {
  page: Page;
  setPage: (p: Page) => void;
  onLogout: () => void;
}

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "companies", label: "Companies", icon: Building2 },
  { key: "users", label: "Users", icon: Users },
  { key: "transactions", label: "Transactions", icon: ArrowRightLeft },
  { key: "messaging", label: "Messaging", icon: MessageSquare }
] as const;

export default function PlatformAdminSidebar({ page, setPage, onLogout }: Props) {
  const adminUser = JSON.parse(localStorage.getItem("platformAdminUser") || "{}");

  return (
    <aside className="w-72 bg-slate-900 text-white flex flex-col justify-between h-screen shrink-0 border-r border-slate-800 shadow-2xl">
      {/* Brand Header */}
      <div>
        <div className="p-8">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-xl shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-white leading-none">Platform Admin</p>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest mt-1">Desis 2026</p>
            </div>
          </div>
        </div>

        {/* Navigation Navigation */}
        <nav className="px-4 py-2 space-y-1.5">
          {NAV.map(({ key, label, icon: Icon }) => {
            const isActive = page === key;
            return (
              <button
                key={key}
                onClick={() => setPage(key)}
                className={`w-full flex items-center gap-3.5 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/40"
                    : "bg-emerald-500/90 text-white/80 hover:text-white hover:bg-emerald-600"
                }`}
              >
                <Icon
                  className={`h-5 w-5 ${
                    isActive
                      ? "text-white"
                      : "text-white/70 group-hover:text-white"
                  }`}
                />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* User & Footer */}
      <div className="p-6 space-y-4 bg-slate-950/30">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Authenticated As</span>
            <p className="text-sm font-bold text-white truncate">{adminUser.name || "Administrator"}</p>
            <p className="text-xs text-slate-500 truncate mt-0.5">{adminUser.email}</p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 group"
        >
          <LogOut className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Sign Out System
        </button>
        
        <p className="text-center text-[10px] text-slate-600 font-medium">
          Secure Terminal v4.2.0
        </p>
      </div>
    </aside>
  );
}