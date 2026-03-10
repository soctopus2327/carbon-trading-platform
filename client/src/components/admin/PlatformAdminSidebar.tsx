type Page = "dashboard" | "companies" | "users" | "transactions";

interface Props {
  page: Page;
  setPage: (p: Page) => void;
  onLogout: () => void;
}

const NAV: { key: Page; label: string; icon: string }[] = [
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "companies", label: "Companies", icon: "🏢" },
  { key: "users", label: "Users", icon: "👥" },
  { key: "transactions", label: "Transactions", icon: "💱" }
];

export default function PlatformAdminSidebar({ page, setPage, onLogout }: Props) {
  const adminUser = JSON.parse(localStorage.getItem("platformAdminUser") || "{}");

  return (
    <aside className="w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex flex-col justify-between h-screen shrink-0">
      {/* Logo */}
      <div>
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-2 text-lg font-bold">
            <span className="text-2xl">🛡️</span>
            <div>
              <p className="leading-none">Platform Admin</p>
              <p className="text-xs text-slate-400 font-normal mt-0.5">Desis 2025</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 py-5 space-y-1">
          {NAV.map(({ key, label, icon }) => (
            <button
              key={key}
              onClick={() => setPage(key)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                page === key
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "text-slate-300 hover:bg-slate-700"
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Bottom */}
      <div className="p-4 border-t border-slate-700">
        <div className="bg-slate-700 rounded-xl p-3 mb-3">
          <p className="text-xs text-slate-400 font-semibold uppercase">Logged in as</p>
          <p className="text-sm font-semibold text-white mt-0.5 truncate">{adminUser.name || "Admin"}</p>
          <p className="text-xs text-slate-400 truncate">{adminUser.email}</p>
        </div>
        <button
          onClick={onLogout}
          className="w-full bg-red-700 hover:bg-red-800 text-white py-2 rounded-lg text-sm font-semibold transition"
        >
          Logout
        </button>
      </div>
    </aside>
  );
}