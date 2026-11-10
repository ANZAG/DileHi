import { useParams } from "react-router-dom";
import { Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Rahmen, Text } from "@/components/bibliothek/Bausteine";
import { RollenWahl } from "@/components/bibliothek/Themen";
import { useDarstellungen, useGewaehlteRolle, useThemen } from "@/hooks/useBibliothek";
import { KAPITEL_AUSRUESTUNG, abschnitt, fuerRolle, inReihenfolge, kapitelDer, themenBaum } from "@/lib/bibliothek";

/**
 * Prüfliste für eine Rolle: alle Themenseiten aus Kapitel 8 in ihrer
 * Reihenfolge, je Seite die Kurzantwort und „Was das für uns heißt". Zum
 * Ausdrucken vor einer Veranstaltung – deshalb ohne Bilder und ohne Belege.
 */
export default function BibliothekPruefliste() {
  const { darstellung: id } = useParams();
  const { data: darstellungen = [], isLoading } = useDarstellungen();
  const { data: themen = [] } = useThemen();
  const [rolle, waehlen] = useGewaehlteRolle(id);
  const d = darstellungen.find((x) => x.id === id);
  const krumen = [{ label: "Wissensbibliothek", to: "/intern/bibliothek" }];

  if (isLoading) return <Rahmen krumen={krumen} titel="Prüfliste"><Loader2 className="animate-spin" /></Rahmen>;
  if (!d) return <Rahmen krumen={krumen} titel="Darstellung nicht gefunden"><p className="text-muted-foreground">Eine Darstellung „{id}“ gibt es nicht.</p></Rahmen>;

  const kapitel = kapitelDer(d.chapters).find((k) => k.nr === KAPITEL_AUSRUESTUNG);
  const seiten = inReihenfolge(themenBaum(themen.filter((t) => t.presentation_id === d.id), KAPITEL_AUSRUESTUNG))
    .filter((t) => fuerRolle(t.roles, rolle));
  const rollenName = d.roles.find((r) => r.id === rolle)?.titel ?? "alle Rollen";
  const heute = new Date().toLocaleDateString("de-DE");

  return (
    <Rahmen
      krumen={[...krumen, { label: d.id, to: `/intern/bibliothek/${d.id}` }, { label: "Prüfliste" }]}
      titel={`Prüfliste: ${rollenName}`}
      untertitel={`${d.title} · Kapitel ${KAPITEL_AUSRUESTUNG} ${kapitel?.titel ?? ""}`}
      aktion={<Button size="sm" onClick={() => window.print()} className="print:hidden"><Printer size={15} className="mr-1" /> Drucken</Button>}
    >
      {/* Beim Drucken nur die Liste: Kopf, Fuss und Navigation der Seite weg. */}
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm 15mm 18mm; }
          body * { visibility: hidden !important; }
          #pruefliste, #pruefliste * { visibility: visible !important; }
          #pruefliste { position: absolute; left: 0; top: 0; width: 100%; }
          #pruefliste article { break-inside: avoid; }
        }
      `}</style>

      <div className="mb-6 print:hidden">
        <RollenWahl darstellung={d} rolle={rolle} waehlen={waehlen} mitPruefliste={false} />
      </div>

      <div id="pruefliste">
        <header className="mb-4 hidden print:block">
          <h1 className="text-xl font-bold">Prüfliste {rollenName} – {d.title}</h1>
          <p className="text-xs">Kapitel {KAPITEL_AUSRUESTUNG} {kapitel?.titel} · gedruckt {heute} · Wissensbibliothek, nur für den Verein</p>
        </header>
        {seiten.length === 0 ? (
          <p className="text-muted-foreground">In Kapitel {KAPITEL_AUSRUESTUNG} gibt es für diese Auswahl noch keine Themenseite.</p>
        ) : (
          <ol className="space-y-4">
            {seiten.map((t, i) => {
              const kurz = abschnitt(t.body, "Kurzantwort");
              const soll = abschnitt(t.body, "Was das für uns heißt");
              return (
                <li key={t.id}>
                  <article className="rounded-lg border bg-card p-4 print:rounded-none print:border-0 print:border-b print:p-0 print:pb-3">
                    <h2 className="mb-1 flex items-start gap-2 font-serif text-lg font-bold">
                      <span className="inline-flex h-5 w-5 shrink-0 translate-y-1 border-2 border-foreground print:inline-flex" aria-hidden />
                      <span>{i + 1}. {t.title}</span>
                    </h2>
                    {kurz && <Text inhalt={kurz} className="max-w-none" />}
                    {soll && (
                      <div className="mt-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Was das für uns heißt</p>
                        <Text inhalt={soll} className="max-w-none" />
                      </div>
                    )}
                  </article>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Rahmen>
  );
}
