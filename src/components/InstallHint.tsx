import { useEffect, useState } from "react";
import { Share, Plus, X, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "install-hint-dismissed";

/**
 * Hinweis, die Seite zum Startbildschirm hinzuzufügen.
 *
 * Nicht wegen der Optik: Auf dem iPhone gibt es Push-Meldungen ausschließlich
 * für Seiten, die tatsächlich hinzugefügt wurden – im Safari-Tab bleibt es
 * still. Ohne diesen Hinweis würde die Hälfte der Mitglieder nie erfahren,
 * warum bei ihnen nichts ankommt.
 *
 * Android und Chrome bieten die Installation selbst an; dort wird der
 * eingebaute Dialog benutzt. Safari kann das nicht, dort steht die Anleitung.
 */
export default function InstallHint() {
  const [promptEvent, setPromptEvent] = useState<InstallEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    // Bereits installiert? Dann nie fragen.
    const installed =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as { standalone?: boolean }).standalone === true;
    if (installed) return;

    try {
      if (localStorage.getItem(DISMISSED_KEY)) return;
    } catch {
      // Zugriff auf den Speicher kann blockiert sein – dann eben ohne Merken.
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as InstallEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // Safari auf iOS kennt beforeinstallprompt nicht.
    const ua = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
    if (isIos && isSafari) setShowIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignorieren
    }
    setPromptEvent(null);
    setShowIosHint(false);
  };

  if (!promptEvent && !showIosHint) return null;

  return (
    <div className="fixed bottom-4 inset-x-4 sm:left-auto sm:right-4 sm:w-80 z-40 rounded-lg border bg-card shadow-lg p-4">
      <div className="flex items-start gap-3">
        <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary shrink-0">
          <Smartphone size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">Auf den Startbildschirm legen</p>

          {promptEvent ? (
            <>
              <p className="text-xs text-muted-foreground mt-0.5">
                Öffnet sich dann wie eine App, und du bekommst Benachrichtigungen aufs Gerät.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={async () => {
                    await promptEvent.prompt();
                    await promptEvent.userChoice;
                    dismiss();
                  }}
                >
                  Hinzufügen
                </Button>
                <Button size="sm" variant="ghost" onClick={dismiss}>Nein danke</Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mt-0.5">
                Auf dem iPhone gibt es Benachrichtigungen nur so. Im Browser-Tab bleibt es still.
              </p>
              <ol className="text-xs text-muted-foreground mt-2 space-y-1">
                <li className="flex items-center gap-1.5">
                  <Share size={13} className="shrink-0" /> Unten auf „Teilen" tippen
                </li>
                <li className="flex items-center gap-1.5">
                  <Plus size={13} className="shrink-0" /> „Zum Home-Bildschirm" wählen
                </li>
              </ol>
              <Button size="sm" variant="ghost" className="mt-2 -ml-2" onClick={dismiss}>
                Verstanden
              </Button>
            </>
          )}
        </div>

        <button
          onClick={dismiss}
          aria-label="Hinweis schließen"
          className="p-1 -m-1 text-muted-foreground hover:text-foreground shrink-0"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
