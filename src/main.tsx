import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import { watchForReloadLoop, clearReloadWatch } from "./lib/recovery";
import "./index.css";
import { ladeSchriften } from "./lib/schriften";

// Die Vorgabeschriften sofort laden, nicht erst wenn die Vereinsdaten da
// sind. Ein Verein mit anderer Schrift laedt seine zusaetzlich nach; das
// bisschen doppelt ist besser als eine Sekunde Ersatzschrift.
ladeSchriften(["DM Serif Display", "Inter"]);

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
