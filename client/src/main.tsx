import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import PlatformAdminPortal from "./pages/PlatformAdminPortal.tsx";

const isPlatformAdmin = window.location.pathname === "/admin";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isPlatformAdmin ? <PlatformAdminPortal /> : <App />}
  </StrictMode>
);