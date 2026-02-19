import { useState } from "react";

import Dashboard from "./pages/Dashboard";
import Marketplace from "./pages/Marketplace";
import Sidebar from "./components/layout/Sidebar";
import Holdings from "./pages/Holdings";
import Reports from "./pages/Reports";
import AIAdvisor from "./pages/AIAdvisor";
import Settings from "./pages/Settings";

export default function App() {

  const [page, setPage] = useState("dashboard");

  return (
    <div className="flex h-screen bg-gray-50">

      <Sidebar setPage={setPage} page={page} />

      {page === "dashboard" && <Dashboard />}

      {page === "marketplace" && <Marketplace />}

      {page === "holdings" && <Holdings />}

      {page === "reports" && <Reports />}

      {page === "ai" && <AIAdvisor />}

      {page === "settings" && <Settings />}

    </div>
  );
}


//renders the main page