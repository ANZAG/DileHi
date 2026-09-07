import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Meldet eine neue Fassung und lädt sie auf Zuruf.
 *
 * Der Service Worker übernimmt bewusst nicht von selbst. Sonst tauscht er die
 * Anwendung mitten im Tippen aus – und wer gerade einen langen Beitrag
 * schreibt, verliert ihn. Umgekehrt darf er die alte Fassung auch nicht
 * unbegrenzt festhalten: Der Deploy löscht die alten Dateien, dann findet die
 * offene Seite ihre Programmteile nicht mehr. Also fragen statt entscheiden.
 */
export default function AppUpdatePrompt() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || import.meta.env.DEV) return;

    let registration: ServiceWorkerRegistration | undefined;

    const check = (reg: ServiceWorkerRegistration) => {
      if (reg.waiting) setWaiting(reg.waiting);
      reg.addEventListener("updatefound", () => {
        const next = reg.installing;
        if (!next) return;
        next.addEventListener("statechange", () => {
          // "installed" bei vorhandenem Controller heisst: Es gibt eine neue
          // Fassung, die alte laeuft noch.
          if (next.state === "installed" && navigator.serviceWorker.controller) setWaiting(next);
        });
      });
    };

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;
        check(reg);
        // Stündlich nachsehen – sonst merkt eine tagelang offene Seite nichts.
        const timer = setInterval(() => reg.update().catch(() => undefined), 60 * 60 * 1000);
        return () => clearInterval(timer);
      })
      .catch(() => undefined);

    // Nach dem Wechsel einmal neu laden, damit alle Teile zusammenpassen.
    let reloading = false;
    const onChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onChange);
      void registration;
    };
  }, []);

  if (!waiting) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:w-80 z-50 rounded-lg border bg-card shadow-lg p-4">
      <p className="text-sm font-medium">Neue Fassung verfügbar</p>
      <p className="text-xs text-muted-foreground mt-0.5">
        Es gibt eine Aktualisierung. Ungespeicherte Eingaben gehen dabei verloren.
      </p>
      <div className="flex gap-2 mt-3">
        <Button size="sm" onClick={() => waiting.postMessage("uebernehmen")}>
          <RefreshCw size={14} className="mr-1" /> Jetzt laden
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setWaiting(null)}>
          Später
        </Button>
      </div>
    </div>
  );
}
