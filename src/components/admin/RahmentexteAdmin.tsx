import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ladeRahmenVerwaltung, loescheRahmentext, sichereRahmentext, sprachSchluessel } from "@/daten/sprachen";
import { useBranding } from "@/hooks/useBranding";
import { useToast } from "@/hooks/use-toast";
import { invokeFunction } from "@/lib/functionError";
import { SPRACHNAMEN, ZUSATZSPRACHEN, type Zusatzsprache } from "@/lib/sprachen.mjs";

/** Die öffentlichen Texte aus den Angaben der Organisation, die übersetzt werden. */
const ANGABEN = [
  ["org_tagline", "Untertitel"],
  ["seo_description", "Beschreibung für Suchmaschinen"],
  ["footer_navigation_label", "Fuss: Titel der Spalte Navigation"],
  ["footer_legal_label", "Fuss: Titel der Spalte Rechtliches"],
] as const;

const feld = (schluessel: string, sprache: Zusatzsprache) => `${schluessel}|${sprache}`;

/**
 * Menüpunkte und Rahmentexte in den anderen Sprachen.
 *
 * Was auf jeder öffentlichen Seite steht, aber zu keiner Seite gehört: die
 * Namen der Menüpunkte, der Untertitel, die Spaltentitel im Fuss. Kurze
 * Texte, deshalb eine schlichte Tabelle statt eines Editors. Ein leeres Feld
 * heisst: Hier bleibt das Deutsche stehen.
 */
export default function RahmentexteAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const marke = useBranding();
  const [offen, setOffen] = useState(false);
  const [werte, setWerte] = useState<Record<string, string>>({});

  const { data, error: ladefehler } = useQuery({
    queryKey: sprachSchluessel.rahmenVerwaltung(),
    enabled: offen,
    queryFn: ladeRahmenVerwaltung,
    retry: false,
  });

  useEffect(() => {
    if (!data) return;
    setWerte(Object.fromEntries(data.texte.map((t) => [feld(`${t.kind}:${t.ref}`, t.lang as Zusatzsprache), t.value])));
  }, [data]);

  const frisch = () => {
    queryClient.invalidateQueries({ queryKey: sprachSchluessel.rahmenVerwaltung() });
    queryClient.invalidateQueries({ queryKey: sprachSchluessel.rahmentexte() });
  };

  const zeilen = [
    ...(data?.menue ?? []).map((m) => ({ schluessel: `menu:${m.id}`, name: "Menüpunkt", deutsch: m.label })),
    ...ANGABEN.map(([spalte, name]) => ({ schluessel: `settings:${spalte}`, name, deutsch: marke[spalte] ?? "" })),
  ].filter((z) => z.deutsch.trim() !== "");

  const sichern = useMutation({
    mutationFn: async () => {
      const vorher = new Map((data?.texte ?? []).map((t) => [feld(`${t.kind}:${t.ref}`, t.lang as Zusatzsprache), t]));
      for (const z of zeilen) {
        const trenner = z.schluessel.indexOf(":");
        const kind = z.schluessel.slice(0, trenner);
        const ref = z.schluessel.slice(trenner + 1);
        for (const lang of ZUSATZSPRACHEN) {
          const neu = (werte[feld(z.schluessel, lang)] ?? "").trim();
          const alt = vorher.get(feld(z.schluessel, lang));
          // Unverändert und auf dem Stand: nicht anfassen, sonst gälte ein
          // maschineller Text als von Hand gesichert.
          if (alt && alt.value === neu && !alt.is_stale) continue;
          if (!alt && neu === "") continue;
          if (neu === "") await loescheRahmentext(kind, ref, lang);
          else await sichereRahmentext(kind, ref, lang, neu);
        }
      }
    },
    onSuccess: () => { toast({ title: "Gesichert" }); frisch(); },
    onError: (err: Error) => toast({ title: "Nicht gesichert", description: err.message, variant: "destructive" }),
  });

  const maschine = useMutation({
    mutationFn: () => invokeFunction("translate-page", { body: { art: "rahmen" } }),
    onSuccess: () => { toast({ title: "Übersetzt", description: "Von Hand gesicherte Texte sind unverändert geblieben." }); frisch(); },
    onError: (err: Error) => toast({ title: "Nicht übersetzt", description: err.message, variant: "destructive" }),
  });

  const merker = (schluessel: string, lang: Zusatzsprache) => {
    const t = data?.texte.find((x) => `${x.kind}:${x.ref}` === schluessel && x.lang === lang);
    if (!t) return null;
    if (t.is_stale) return "veraltet";
    return t.is_machine ? "maschinell" : null;
  };

  return (
    <div className="mt-6 rounded-lg border bg-card">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 p-3 text-left text-sm font-medium"
        aria-expanded={offen}
        onClick={() => setOffen(!offen)}
      >
        <span className="flex items-center gap-2"><Languages size={15} /> Menü und Rahmen in anderen Sprachen</span>
        <ChevronDown size={15} className={offen ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {offen && (
        <div className="border-t p-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Die Namen der Menüpunkte und die kurzen Texte, die auf jeder öffentlichen Seite stehen.
            Ein leeres Feld heisst: Dort bleibt das Deutsche stehen.
          </p>
          {ladefehler ? (
            // Fehlt die Tabelle noch, ist das die Auskunft, die weiterhilft.
            <p className="text-sm text-destructive">
              Die Übersetzungen sind nicht erreichbar ({ladefehler.message}). Ist die Migration „mehrsprachig“ eingespielt?
            </p>
          ) : !data ? (
            <p className="text-sm text-muted-foreground">Lade …</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="py-1 pr-3 font-medium">Deutsch</th>
                    {ZUSATZSPRACHEN.map((s) => <th key={s} className="py-1 pr-3 font-medium">{SPRACHNAMEN[s]}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {zeilen.map((z) => (
                    <tr key={z.schluessel} className="align-top">
                      <td className="py-1 pr-3 min-w-[10rem]">
                        <span className="block break-words">{z.deutsch}</span>
                        <span className="block text-[11px] text-muted-foreground">{z.name}</span>
                      </td>
                      {ZUSATZSPRACHEN.map((s) => {
                        const hinweis = merker(z.schluessel, s);
                        return (
                          <td key={s} className="py-1 pr-3 min-w-[10rem]">
                            <Input
                              lang={s}
                              aria-label={`${z.deutsch} – ${SPRACHNAMEN[s]}`}
                              value={werte[feld(z.schluessel, s)] ?? ""}
                              onChange={(e) => setWerte((w) => ({ ...w, [feld(z.schluessel, s)]: e.target.value }))}
                              className="h-8"
                            />
                            {hinweis && (
                              <span className={`block text-[11px] ${hinweis === "veraltet" ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"}`}>
                                {hinweis === "veraltet" ? "veraltet – das Deutsche wurde geändert" : "maschinell, ungeprüft"}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" size="sm" disabled={maschine.isPending || !data} onClick={() => maschine.mutate()}>
              <Languages size={15} className="mr-1" /> {maschine.isPending ? "Übersetzt …" : "Fehlendes maschinell übersetzen"}
            </Button>
            <Button size="sm" disabled={sichern.isPending || !data} onClick={() => sichern.mutate()}>Sichern</Button>
          </div>
        </div>
      )}
    </div>
  );
}
