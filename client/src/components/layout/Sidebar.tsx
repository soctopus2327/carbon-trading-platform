export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r">
      <div className="p-6 font-semibold text-lg">Desis 2025</div>

      <nav className="px-4 space-y-2">
        <NavItem label="Dashboard" active />
        <NavItem label="Marketplace" />
        <NavItem label="Holdings & Retire" />
        <NavItem label="Reports" />
        <NavItem label="AI Advisor" />
        <NavItem label="Admin Panel" />
        <NavItem label="Settings" />
      </nav>
    </aside>
  );
}

function NavItem({
  label,
  active,
}: {
  label: string;
  active?: boolean;
}) {
  return (
    <div
      className={`flex items-center px-4 py-2 rounded-lg cursor-pointer ${
        active
          ? "bg-gray-900 text-white"
          : "text-gray-600 hover:bg-gray-100"
      }`}
    >
      {label}
    </div>
  );
}
