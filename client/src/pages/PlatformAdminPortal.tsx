import { useState } from "react";
import PlatformAdminLogin from "./admin/PlatformAdminLogin";
import AdminDashboard from "./admin/AdminDashboard";
import CompanyManagement from "./admin/CompanyManagement";
import UserManagement from "./admin/UserManagement";
import TransactionsAudit from "./admin/TransactionsAudit";
import PlatformAdminSidebar from "../components/admin/PlatformAdminSidebar";

type Page = "dashboard" | "companies" | "users" | "transactions";

export default function PlatformAdminPortal() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!(
      localStorage.getItem("platformAdminToken") &&
      localStorage.getItem("platformAdminUser")
    );
  });

  const [page, setPage] = useState<Page>("dashboard");

  const handleLogout = () => {
    localStorage.removeItem("platformAdminToken");
    localStorage.removeItem("platformAdminUser");
    setIsAuthenticated(false);
  };

  if (!isAuthenticated) {
    return <PlatformAdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen bg-gray-50 text-black overflow-hidden">
      <PlatformAdminSidebar page={page} setPage={setPage} onLogout={handleLogout} />

      <main className="flex-1 overflow-y-auto">
        {page === "dashboard" && <AdminDashboard />}
        {page === "companies" && <CompanyManagement />}
        {page === "users" && <UserManagement />}
        {page === "transactions" && <TransactionsAudit />}
      </main>
    </div>
  );
}