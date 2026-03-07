import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import PlatformAdminPortal from "./pages/PlatformAdminPortal.tsx";
import GoogleTranslateBootstrap from "./components/GoogleTranslate.tsx";

const isPlatformAdmin = window.location.pathname === "/admin";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <GoogleTranslateBootstrap />
    {isPlatformAdmin ? <PlatformAdminPortal /> : <App />}
  </StrictMode>
);
