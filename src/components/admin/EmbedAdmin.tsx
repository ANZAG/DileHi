import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { embedUrl } from "@/lib/publicAddresses";

type Resource = "events" | "personas" | "gallery";

const RESOURCES: { key: Resource; label: string; desc: string }[] = [
  { key: "events", label: "Nächste Veranstaltungen", desc: "Alle öffentlich freigegebenen Termine ab heute." },
  { key: "personas", label: "Unsere Darstellungen", desc: "Vom Herold freigegebene Darstellungen, ohne Namen." },
  { key: "gallery", label: "Galerie", desc: "Die neuesten Bilder aus der Galerie." },
];

/**
 * Schnipsel zum Einbinden auf fremden Websites.
 *
 * Drei Formen, weil Vereine und Partner sehr unterschiedlich ausgestattet sind:
 * Wer eine eigene Website baut, nimmt die Daten; wer ein normales CMS hat, den
 * Script-Schnipsel; wer einen Baukasten benutzt, der nur iframes zulässt, die
 * dritte Variante.
 */
export default function EmbedAdmin() {
  const [resource, setResource] = useState<Resource>("events");
  const [limit, setLimit] = useState(3);
  const [copied, setCopied] = useState<string | null>(null);

  // Über die eigene Seite: Der Schnipsel steht bei jemand anderem im
  // Quelltext und soll einen Umzug der Datenbank überleben.
  const base = embedUrl(window.location.origin, resource);

  const snippets = [
    {
      id: "js",
      label: "Für die eigene Website (empfohlen)",
      hint: "Übernimmt Schrift und Farben der Zielseite und wächst mit dem Inhalt mit.",
      code: `<div id="termine"></div>\n<script src="${base}.js?limit=${limit}" data-target="#termine"></script>`,
    },
    {
      id: "iframe",
      label: "Für Baukastensysteme",
      hint: "Wenn nur ein iframe erlaubt ist, etwa bei Jimdo, Wix oder WordPress ohne Script-Rechte.",
      code: `<iframe src="${base}.html?limit=${limit}" style="width:100%;height:420px;border:0" loading="lazy" title="Einbindung"></iframe>`,
    },
    {
      id: "json",
      label: "Als Daten",
      hint: "Für alle, die die Darstellung selbst übernehmen wollen.",
      code: `${base}?format=json&limit=${limit}`,
    },
  ];

  const copy = async (id: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const active = RESOURCES.find((r) => r.key === resource)!;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-lg font-semibold">Einbindung auf anderen Websites</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Inhalte, die ohnehin öffentlich sind, lassen sich auf fremden Seiten anzeigen:
          etwa bei einem Museum, das eine Veranstaltung mit euch ausrichtet.
        </p>
      </div>

      <div>
        <Label className="text-sm">Was soll angezeigt werden?</Label>
        <div className="grid sm:grid-cols-3 gap-2 mt-1.5">
          {RESOURCES.map((r) => (
            <button
              key={r.key}
              onClick={() => setResource(r.key)}
              className={`text-left p-3 rounded-lg border transition-colors ${
                resource === r.key ? "border-primary bg-primary/5" : "hover:bg-muted/50"
              }`}
            >
              <span className={`text-sm font-medium ${resource === r.key ? "text-primary" : ""}`}>
                {r.label}
              </span>
              <span className="block text-xs text-muted-foreground mt-0.5">{r.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="embed-limit" className="text-sm">Wie viele Einträge?</Label>
        <div className="flex items-center gap-2 mt-1.5">
          <input
            id="embed-limit"
            type="range"
            min={1}
            max={12}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="flex-1 max-w-xs accent-primary"
          />
          <span className="text-sm tabular-nums w-8">{limit}</span>
          <Button variant="outline" size="sm" asChild className="ml-auto">
            <a href={`${base}.html?limit=${limit}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink size={14} className="mr-1" /> Vorschau
            </a>
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {snippets.map((s) => (
          <div key={s.id} className="rounded-lg border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.hint}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => copy(s.id, s.code)} className="shrink-0">
                {copied === s.id ? <Check size={14} className="mr-1 text-emerald-600" /> : <Copy size={14} className="mr-1" />}
                Kopieren
              </Button>
            </div>
            <pre className="mt-2 p-2.5 rounded bg-muted text-xs overflow-x-auto"><code>{s.code}</code></pre>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground border-t pt-3">
        Es wird nur ausgeliefert, was ohnehin öffentlich ist: für die Website freigegebene Termine,
        vom Herold freigegebene Darstellungen (ohne Namen) und Galeriebilder. Die Antworten werden
        15 Minuten zwischengespeichert. Änderungen erscheinen also mit kurzer Verzögerung.
        Zurzeit ausgewählt: {active.label}.
      </p>
    </div>
  );
}
