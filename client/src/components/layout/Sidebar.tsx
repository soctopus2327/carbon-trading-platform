export default function Sidebar({
  setPage,
  page,
  onLogout,
}: {
  setPage: (page: string) => void;
  page: string;
  onLogout?: () => void;
}) {
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (onLogout) {
      onLogout();
    }
  };
  return (
    <aside className="w-64 bg-gradient-to-b from-green-600 to-green-700 text-white border-r border-green-800 flex flex-col justify-between h-screen">

      <div>

        {/* Logo */}
        <div className="p-6 border-b border-green-500">
          <div className="text-2xl font-bold flex items-center gap-2">
            Desis 2025
          </div>
          <p className="text-xs text-green-100 mt-1">Carbon Trading Platform</p>
        </div>

        {/* Menu */}
        <nav className="px-3 py-6 space-y-2">

          <NavItem
            label="Dashboard"
            icon=""
            active={page === "dashboard"}
            onClick={() => setPage("dashboard")}
          />

          <NavItem
            label="Marketplace"
            icon=""
            active={page === "marketplace"}
            onClick={() => setPage("marketplace")}
          />

          <NavItem
            label="Holdings & Retire"
            icon=""
            active={page === "holdings"}
            onClick={() => setPage("holdings")}
          />

          <NavItem
            label="Reports"
            icon=""
            active={page === "reports"}
            onClick={() => setPage("reports")}
          />

          <NavItem
            label="AI Advisor"
            icon=""
            active={page === "ai"}
            onClick={() => setPage("ai")}
          />

          <NavItem
            label="Admin Panel"
            icon=""
            active={page === "admin"}
            onClick={() => setPage("admin")}
          />

          <NavItem
            label="Settings"
            icon=""
            active={page === "settings"}
            onClick={() => setPage("settings")}
          />

        </nav>

      </div>

      {/* Bottom Card */}
      <div className="p-4 border-t border-green-500 space-y-3">
        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-700 text-white py-2 rounded-lg hover:bg-red-700 transition font-semibold text-sm shadow-md"
        >
          Logout
        </button>
      </div>

    </aside>
  );
}


function NavItem({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active?: boolean;
  onClick?: () => void;
}) {

  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 rounded-lg cursor-pointer transition font-medium flex items-center gap-3 ${
        active
          ? "bg-white text-green-700 shadow-lg"
          : "text-green-100 hover:bg-white hover:bg-opacity-10"
      }`}
    >
      <span className="text-lg">{icon}</span>
      {label}
    </div>
  );
}
