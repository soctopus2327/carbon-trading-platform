export default function Sidebar({
  setPage,
  page,
}: {
  setPage: (page: string) => void;
  page: string;
}) {
  return (
    <aside className="w-64 bg-white border-r flex flex-col justify-between">

      <div>

        {/* Logo */}
        <div className="p-6 font-semibold text-lg">
          Desis 2025
        </div>

        {/* Menu */}
        <nav className="px-4 space-y-2">

          <NavItem
            label="Dashboard"
            active={page === "dashboard"}
            onClick={() => setPage("dashboard")}
          />

          <NavItem
            label="Marketplace"
            active={page === "marketplace"}
            onClick={() => setPage("marketplace")}
          />

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
            label="AI Advisor"
            active={page === "ai"}
            onClick={() => setPage("ai")}
          />

          <NavItem
            label="Admin Panel"
            active={page === "admin"}
            onClick={() => setPage("admin")}
          />

          <NavItem
            label="Settings"
            active={page === "settings"}
            onClick={() => setPage("settings")}
          />

        </nav>

      </div>

      {/* Bottom Card */}
      <div className="p-4">
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="font-semibold text-sm">
            Net Zero Status
          </div>

          <div className="text-xs text-gray-600 mt-1">
            You're 12 tons away from your monthly target.
          </div>

          <button className="mt-3 w-full bg-green-600 text-white py-1 rounded">
            Offset Now
          </button>
        </div>
      </div>

    </aside>
  );
}


function NavItem({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {

  return (
    <div
      onClick={onClick}
      className={`px-4 py-2 rounded-lg cursor-pointer transition ${
        active
          ? "bg-gray-900 text-white"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {label}
    </div>
  );
}
