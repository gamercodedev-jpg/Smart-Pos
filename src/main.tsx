import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { registerServiceWorker } from "./pwa/registerServiceWorker";
import { BrowserRouter } from "react-router-dom";
import { TenantProvider } from "./contexts/TenantContext";
import { AuthProvider } from "./contexts/AuthContext";

registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <TenantProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <App />
      </BrowserRouter>
    </TenantProvider>
  </AuthProvider>
);
