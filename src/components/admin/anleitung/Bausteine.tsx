import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";

/**
 * Bausteine für Einrichtungsanleitungen in der Verwaltung.
 *
 * Mailversand und Dateiablage erklären beide, wie man DING mit Microsoft 365
 * verbindet. Solange jede Anleitung ihre eigenen Kästen, Nummern und
 * Kopierfelder hatte, sahen sie verschieden aus und sagten dasselbe verschieden.
 * Hier stehen die Teile einmal – und damit auch der Einrichtungsassistent,
 * wenn er kommt.
 */

export function Schritt({ nummer, titel, children }: { nummer: number; titel: string; children: React.ReactNode }) {
  return (
    <section className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
        {nummer}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <h4 className="font-medium">{titel}</h4>
        {children}
      </div>
    </section>
  );
}

export function Liste({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 space-y-1.5">{children}</ul>;
}

/** Ein Wert, den man unterwegs einträgt, damit spätere Texte fertig ausgefüllt sind. Wird nicht gespeichert. */
export function Eingabe({ label, wert, setze, beispiel }: {
  label: string;
  wert: string;
  setze: (v: string) => void;
  beispiel: string;
}) {
  return (
    <label className="block mt-2 space-y-1">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <Input value={wert} onChange={(e) => setze(e.target.value)} placeholder={beispiel} className="h-9 bg-background" />
    </label>
  );
}

/** Ein Text zum Einfügen, mit einem Knopf, der ihn in die Zwischenablage legt. */
export function Kopierfeld({ text, mehrzeilig = false }: { text: string; mehrzeilig?: boolean }) {
  const [kopiert, setKopiert] = useState(false);

  const kopieren = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setKopiert(true);
      window.setTimeout(() => setKopiert(false), 1500);
    } catch {
      // Ohne Zugriff auf die Zwischenablage bleibt der Text markierbar stehen.
    }
  };

  return (
    <div className="my-2 flex items-start gap-2 rounded-md border bg-background p-2">
      <pre className={`flex-1 min-w-0 text-xs font-mono ${mehrzeilig ? "whitespace-pre" : "whitespace-pre-wrap break-all"} overflow-x-auto`}>
        {text}
      </pre>
      <button
        type="button"
        onClick={kopieren}
        className="shrink-0 inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="In die Zwischenablage kopieren"
      >
        {kopiert ? <Check size={13} className="text-green-700" /> : <Copy size={13} />}
        {kopiert ? "Kopiert" : "Kopieren"}
      </button>
    </div>
  );
}

/** Eine Zeile der Secrets-Tabelle: Name zum Kopieren, daneben, was hineingehört. */
export function Geheimnis({ name, wert }: { name: string; wert: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-2">
      <div className="sm:w-64 shrink-0">
        <Kopierfeld text={name} />
      </div>
      <span className="text-xs text-muted-foreground">{wert}</span>
    </div>
  );
}

export function Geheimnisse({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md border bg-background divide-y">{children}</div>;
}

/** Wo die Secrets hingehören – steht in beiden Anleitungen gleich. */
export function SecretsOrt() {
  return (
    <Liste>
      <li>Öffne <b>supabase.com</b>, wähle euer Projekt und links <b>Edge Functions</b> → <b>Secrets</b>.</li>
      <li>Leg die folgenden Einträge an – links der Name, rechts der Wert. Was schon da ist, bleibt, wie es ist.</li>
    </Liste>
  );
}

/** Der aufklappbare Rahmen einer Anleitung. */
export function Anleitung({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <details className="rounded-lg border bg-muted/30 text-sm">
      <summary className="cursor-pointer font-medium p-3">{titel}</summary>
      <div className="px-3 pb-4 space-y-5">{children}</div>
    </details>
  );
}

/** Der gemeinsame Hinweis zur Verzeichnis-ID: eine Organisation, ein Wert. */
export const MANDANT_HINWEIS =
  "die Verzeichnis-ID (Mandant) – dieselbe für Mailversand und Dateiablage. Steht sie schon da, weil das andere bereits eingerichtet ist, ist nichts zu tun.";
