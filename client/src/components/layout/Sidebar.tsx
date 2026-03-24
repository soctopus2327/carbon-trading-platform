import { useState } from "react";
import { ChevronDown, LogOut } from "lucide-react";

interface SidebarProps {
  setPage: (page: string) => void;
  page: string;
  onLogout?: () => void;
}

export default function Sidebar({ setPage, page, onLogout }: SidebarProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  
  let role: string | null = null;
  try {
    const rawUser = localStorage.getItem("user");
    role = rawUser ? JSON.parse(rawUser)?.role || null : null;
  } catch {
    role = null;
  }
  if (!role) role = localStorage.getItem("role");
  const canAccessMarketplace = role === "ADMIN" || role === "TRADER";
  const canAccessAllianceMarketplace = role === "ADMIN" || role === "TRADER";
  const canAccessAllianceMembers = role === "ADMIN" || role === "TRADER";
  
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");

    if (onLogout) {
      onLogout();
    }

    setPage("home");
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const isAlliancePage = page.startsWith("alliance");

  return (
    <aside className="w-64 bg-gradient-to-b from-green-600 to-green-700 text-white border-r border-green-800 flex flex-col shrink-0 h-screen sticky top-0">

      {/* Top Section */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Logo */}
        <div className="p-6 border-b border-green-500 flex-shrink-0">
          <div className="text-2xl font-bold">CarbonX</div>
          <p className="text-xs text-green-100 mt-1">
            Carbon Trading Platform
          </p>
        </div>

        {/* Navigation - Scrollable */}
        <nav className="px-3 py-4 overflow-y-auto flex-1">

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
            label="AI Emission Advisor"
            active={page === "ai"}
            onClick={() => setPage("ai")}
          />

          <NavItem
            label="Settings"
            active={page === "settings"}
            onClick={() => setPage("settings")}
          />

          {/* Alliance Section - Collapsible */}
          <CollapsibleSection
            label="Alliance"
            isExpanded={expandedSection === "alliance"}
            isActive={isAlliancePage}
            onToggle={() => toggleSection("alliance")}
          >
            <SubNavItem
              label="Alliance Dashboard"
              active={page === "alliance-dashboard"}
              onClick={() => setPage("alliance-dashboard")}
            />
            {canAccessAllianceMarketplace && (
              <SubNavItem
                label="Alliance Marketplace"
                active={page === "alliance-marketplace"}
                onClick={() => setPage("alliance-marketplace")}
              />
            )}
            {canAccessAllianceMembers && (
              <SubNavItem
                label="Alliance Network"
                active={page === "alliance-members"}
                onClick={() => setPage("alliance-members")}
              />
            )}
          </CollapsibleSection>

        </nav>
      </div>

      {/* Logout - Fixed at bottom */}
      <div className="p-4 border-t border-green-500 bg-green-800 bg-opacity-40 flex-shrink-0">
        <button
          onClick={handleLogout}
          className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white py-3 rounded-lg hover:from-red-700 hover:to-red-800 active:scale-95 transition-all font-semibold text-sm shadow-lg flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
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

interface CollapsibleSectionProps {
  label: string;
  isExpanded: boolean;
  isActive: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function CollapsibleSection({
  label,
  isExpanded,
  isActive,
  onToggle,
  children,
}: CollapsibleSectionProps) {
  return (
    <div className="mt-2">
      <div
        onClick={onToggle}
        className={`px-4 py-3 rounded-lg cursor-pointer transition font-medium flex items-center justify-between ${
          isActive
            ? "bg-white text-green-700 shadow-lg"
            : "text-green-100 hover:bg-white hover:bg-opacity-10"
        }`}
      >
        {label}
        <ChevronDown
          size={18}
          className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
        />
      </div>
      {isExpanded && (
        <div className="mt-2 space-y-1 border-l-2 border-green-400">
          {children}
        </div>
      )}
    </div>
  );
}

interface SubNavItemProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function SubNavItem({ label, active, onClick }: SubNavItemProps) {
  return (
    <div
      onClick={onClick}
      className={`px-4 py-2.5 rounded-lg cursor-pointer transition text-sm font-medium ml-2 ${
        active
          ? "bg-white bg-opacity-25 text-white border-l-2 border-white"
          : "text-green-100 hover:bg-white hover:bg-opacity-10"
      }`}
    >
      {label}
    </div>
  );
}