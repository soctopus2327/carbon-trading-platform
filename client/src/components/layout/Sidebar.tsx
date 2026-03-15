interface SidebarProps {
  setPage: (page: string) => void;
  page: string;
  onLogout?: () => void;
}

export default function Sidebar({ setPage, page, onLogout }: SidebarProps) {
  let role: string | null = null;
  try {
    const rawUser = localStorage.getItem("user");
    role = rawUser ? JSON.parse(rawUser)?.role || null : null;
  } catch {
    role = null;
  }
  if (!role) role = localStorage.getItem("role");
  const canAccessMarketplace = role === "ADMIN" || role === "TRADER";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");

    if (onLogout) {
      onLogout();
    }

     setPage("home");
  };

  return (
    <aside className="w-64 bg-gradient-to-b from-green-600 to-green-700 text-white border-r border-green-800 flex flex-col justify-between h-screen shrink-0">
      
      {/* Top Section */}
      <div>
        {/* Logo */}
        <div className="p-6 border-b border-green-500">
          <div className="text-2xl font-bold">CarbonX</div>
          <p className="text-xs text-green-100 mt-1">
            Carbon Trading Platform
          </p>
        </div>

        {/* Navigation */}
        <nav className="px-3 py-4">

          <NavItem
            label="Home"
            active={page === "home"}
            onClick={() => setPage("home")}
          />

          <NavItem
            label="Dashboard"
            active={page === "dashboard"}
            onClick={() => setPage("dashboard")}
          />

          {canAccessMarketplace && (
            <NavItem
              label="Marketplace"
              active={page === "marketplace"}
              onClick={() => setPage("marketplace")}
            />
          )}

          <NavItem
            label="Holdings & Retire"
            active={page === "holdings"}
            onClick={() => setPage("holdings")}
          />

          <NavItem
            label="Reports"
            active={page === "reports"}
            onClick={() => setPage("reports")}
          />

          <NavItem
            label="News"
            active={page === "news"}
            onClick={() => setPage("news")}
          />

          <NavItem
            label="Forum"
            active={page === "forum"}
            onClick={() => setPage("forum")}
          />

          <NavItem
            label="AI Emission Advisor"
            active={page === "ai"}
            onClick={() => setPage("ai")}
          />

          <NavItem
            label="Settings"
            active={page === "settings"}
            onClick={() => setPage("settings")}
          />

        </nav>
      </div>

      {/* Logout */}
      <div className="p-4 border-t border-green-500">
        <button
          onClick={handleLogout}
          className="w-full bg-red-700 text-white py-2 rounded-lg hover:bg-red-800 transition font-semibold text-sm shadow-md"
        >
          Logout
        </button>
      </div>

    </aside>
  );
}

interface NavItemProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavItem({ label, active, onClick }: NavItemProps) {
  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 rounded-lg cursor-pointer transition font-medium ${
        active
          ? "bg-white text-green-700 shadow-lg"
          : "text-green-100 hover:bg-white hover:bg-opacity-10"
      }`}
    >
      {label}
    </div>
  );
}