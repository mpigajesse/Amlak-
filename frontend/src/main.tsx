// Polices Fontsource — self-hosted, pas de dépendance Google Fonts
import "@fontsource/fraunces/400.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/400-italic.css";
import "@fontsource/ibm-plex-sans/300.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";

// Styles globaux + tokens CSS
import "@/styles/globals.css";

import { createRoot } from "react-dom/client";
import App from "@/App";

const rootEl = document.getElementById("root");

if (!rootEl) {
  throw new Error("Élément #root introuvable dans le DOM.");
}

// StrictMode désactivé temporairement : il double-monte les useEffect en dev,
// ce qui peut laisser des résidus (body.style.overflow, focus traps) si
// les cleanups ne sont pas idempotents. À réactiver après audit.
createRoot(rootEl).render(<App />);
