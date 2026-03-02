import { useState, useEffect } from "react";

import Dashboard from "./pages/Dashboard";
import Marketplace from "./pages/Marketplace";
import CompanyRegister from "./pages/CompanyRegister";
import Sidebar from "./components/layout/Sidebar";
import Holdings from "./pages/Holdings";
import Reports from "./pages/Reports";
import AIAdvisor from "./pages/AIAdvisor";
import Settings from "./pages/Settings";

export default function App() {

  const [page, setPage] = useState("dashboard");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    setIsAuthenticated(!!(token && user));
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPage("dashboard");
  };

  // If not authenticated, show company register page
  if (!isAuthenticated) {
    return <CompanyRegister />;
  }

  return (
    <div className="flex h-screen text-black bg-gray-50">

      <Sidebar setPage={setPage} page={page} onLogout={handleLogout} />

      {page === "dashboard" && <Dashboard onLogout={handleLogout} />}

      {page === "marketplace" && <Marketplace onLogout={handleLogout} />}

      {page === "holdings" && <Holdings onLogout={handleLogout} />}

      {page === "reports" && <Reports onLogout={handleLogout} />}

      {page === "ai" && <AIAdvisor onLogout={handleLogout} />}

      {page === "settings" && <Settings setPage={setPage} onLogout={handleLogout} />}

      {page === "register" && <CompanyRegister onSuccess={() => { setIsAuthenticated(true); setPage("dashboard"); }} />}

    </div>
  );
}


//renders the main page