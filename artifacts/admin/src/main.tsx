import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { loadPlatformConfig } from "./lib/platformConfig";

if (import.meta.env.DEV) {
  window.addEventListener("unhandledrejection", (event) => {
    const msg = event.reason?.message ?? String(event.reason ?? "");
    if (msg.includes("WebSocket closed without opened")) {
      event.preventDefault();
    }
  });
}

loadPlatformConfig();

createRoot(document.getElementById("root")!).render(<App />);
