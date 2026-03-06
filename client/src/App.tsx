import { useState, useEffect } from "react";

import Dashboard from "./pages/Dashboard";
import Marketplace from "./pages/Marketplace";
import CompanyRegister from "./pages/CompanyRegister";
import Sidebar from "./components/layout/Sidebar";
import Holdings from "./pages/Holdings";
import Reports from "./pages/Reports";
import AIAdvisor from "./pages/AIAdvisor";
import Settings from "./pages/Settings";
import News from "./pages/News";

// ── NEW ──
import PlatformAdminPortal from "./pages/PlatformAdminPortal";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    setIsAuthenticated(!!(token && user));
  }, []);

  // ── NEW: If URL hash is #platform-admin, render the separate admin portal ──
  // To access: navigate to http://localhost:5173/#platform-admin
  if (window.location.hash === "#platform-admin") {
    return <PlatformAdminPortal />;
  }

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPage("dashboard");
  };

  if (!isAuthenticated) {
    return <CompanyRegister />;
  }

  return (
    <div className="flex h-screen text-black bg-gray-50 overflow-hidden">
      <Sidebar setPage={setPage} page={page} onLogout={handleLogout} />

      {page === "dashboard" && <Dashboard onLogout={handleLogout} />}
      {page === "marketplace" && <Marketplace onLogout={handleLogout} />}
      {page === "holdings" && <Holdings onLogout={handleLogout} />}
      {page === "reports" && <Reports onLogout={handleLogout} />}
      {page === "news" && <News onLogout={handleLogout} />}
      {page === "ai" && <AIAdvisor onLogout={handleLogout} />}
      {page === "settings" && <Settings setPage={setPage} onLogout={handleLogout} />}
      {page === "register" && (
        <CompanyRegister
          onSuccess={() => {
            setIsAuthenticated(true);
            setPage("dashboard");
          }}
        />
      )}
    </div>
  );
}
