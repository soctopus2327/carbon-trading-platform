import { useEffect, useState } from "react";
import Dashboard from "./pages/Dashboard";
import Marketplace from "./pages/Marketplace";
import CompanyRegister from "./pages/CompanyRegister";
import Sidebar from "./components/layout/Sidebar";
import Holdings from "./pages/Holdings";
import Reports from "./pages/Reports";
import AIAdvisor from "./pages/AIAdvisor";
import Settings from "./pages/Settings";
import Home from "./pages/Home";
import News from "./pages/News";
import ManagePeople from "./pages/ManagePeople";

const PAGE_TO_PATH: Record<string, string> = {
  home: "/",
  register: "/register",
  dashboard: "/dashboard",
  marketplace: "/marketplace",
  holdings: "/holdings",
  reports: "/reports",
  news: "/news",
  ai: "/ai",
  settings: "/settings",
  "manage-people": "/manage-people"
};

const PATH_TO_PAGE: Record<string, string> = Object.fromEntries(
  Object.entries(PAGE_TO_PATH).map(([page, path]) => [path, page])
);

function currentRole() {
  const storedRole = localStorage.getItem("role");
  if (storedRole) return storedRole;

  const rawUser = localStorage.getItem("user");
  if (!rawUser) return null;

  try {
    return JSON.parse(rawUser)?.role || null;
  } catch {
    return null;
  }
}

function canAccessMarketplace(role: string | null) {
  return role === "ADMIN" || role === "TRADER";
}

export default function App() {
  const [page, setPage] = useState("home");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const rawUser = localStorage.getItem("user");
    const authed = !!(token && rawUser);
    setIsAuthenticated(authed);
    const requestedPage = PATH_TO_PAGE[window.location.pathname] || "home";

    if (!authed) {
      if (requestedPage === "register") {
        setPage("register");
      } else {
        setPage("home");
        if (window.location.pathname !== "/") {
          window.history.replaceState({}, "", "/");
        }
      }
      return;
    }

    if (rawUser) {
      try {
        const parsedUser = JSON.parse(rawUser);
        if (parsedUser?.role) localStorage.setItem("role", parsedUser.role);
      } catch {
        // ignore malformed user payload and fallback to dashboard
      }
    }

    const role = currentRole();

    if (requestedPage === "manage-people" && role !== "ADMIN") {
      setPage("dashboard");
      window.history.replaceState({}, "", "/dashboard");
      return;
    }
    if (requestedPage === "marketplace" && !canAccessMarketplace(role)) {
      setPage("dashboard");
      window.history.replaceState({}, "", "/dashboard");
      return;
    }

    setPage(requestedPage);
  }, []);

  useEffect(() => {
    const syncPageFromPath = () => {
      const token = localStorage.getItem("token");
      const rawUser = localStorage.getItem("user");
      const authed = !!(token && rawUser);
      setIsAuthenticated(authed);

      const requestedPage = PATH_TO_PAGE[window.location.pathname] || (authed ? "dashboard" : "home");
      const role = currentRole();

      if (!authed) {
        if (requestedPage === "register") {
          setPage("register");
          return;
        }
        setPage("home");
        return;
      }

      if (requestedPage === "manage-people" && role !== "ADMIN") {
        setPage("dashboard");
        window.history.replaceState({}, "", "/dashboard");
        return;
      }
      if (requestedPage === "marketplace" && !canAccessMarketplace(role)) {
        setPage("dashboard");
        window.history.replaceState({}, "", "/dashboard");
        return;
      }

      setPage(requestedPage);
    };

    window.addEventListener("popstate", syncPageFromPath);
    return () => window.removeEventListener("popstate", syncPageFromPath);
  }, []);

  useEffect(() => {
    const safePage = !isAuthenticated && page !== "home" && page !== "register" ? "home" : page;
    const targetPath = PAGE_TO_PATH[safePage] || "/";
    if (window.location.pathname !== targetPath) {
      window.history.replaceState({}, "", targetPath);
    }
  }, [isAuthenticated, page]);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPage("home");
    window.history.replaceState({}, "", "/");
  };

  if (!isAuthenticated) {
    if (page === "register") {
      return (
        <CompanyRegister
          onSuccess={() => {
            setIsAuthenticated(true);
            setPage("dashboard");
            window.history.replaceState({}, "", "/dashboard");
          }}
        />
      );
    }

    return <Home setPage={setPage} />;
  }

  if (page === "home") {
    return <Home setPage={setPage} />;
  }

  return (
    <div className="flex h-screen text-black bg-gray-50 overflow-hidden">
      <Sidebar setPage={setPage} page={page} onLogout={handleLogout} />

      {page === "dashboard" && <Dashboard />}
      {page === "marketplace" && <Marketplace />}
      {page === "holdings" && <Holdings onLogout={handleLogout} />}
      {page === "reports" && <Reports onLogout={handleLogout} />}
      {page === "news" && <News onLogout={handleLogout} />}
      {page === "ai" && <AIAdvisor onLogout={handleLogout} />}
      {page === "settings" && <Settings setPage={setPage} />}
      {page === "manage-people" && <ManagePeople setPage={setPage} />}
      {page === "register" && (
        <CompanyRegister
          onSuccess={() => {
            setIsAuthenticated(true);
            setPage("dashboard");
            window.history.replaceState({}, "", "/dashboard");
          }}
        />
      )}
    </div>
  );
}
