import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import { watchForReloadLoop, clearReloadWatch } from "./lib/recovery";
import "./index.css";

// Vor allem anderen: Erkennt die Seite eine Neulade-Schleife, raeumt sie
// Service Worker und Zwischenspeicher weg und startet einmal sauber. Sonst
// kommt man aus so einem Zustand nur ueber die Entwicklerwerkzeuge heraus.
watchForReloadLoop();

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);

// Laeuft die Anwendung eine Weile, war es keine Schleife.
window.setTimeout(clearReloadWatch, 10_000);
