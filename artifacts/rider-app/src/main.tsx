import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { initErrorReporter } from "./lib/error-reporter";
import { patchLeafletDefaultIcon } from "./lib/leafletIconFix";

initErrorReporter();

/* Apply the Leaflet default-marker patch once at app boot so every map
   instance (Active trip, MiniMap, dashboard) renders proper marker icons
   instead of broken-image placeholders. */
patchLeafletDefaultIcon();

createRoot(document.getElementById("root")!).render(<App />);
