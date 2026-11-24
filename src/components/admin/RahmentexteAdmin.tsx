import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ladeRahmenVerwaltung, loescheRahmentext, sichereRahmentext, sprachSchluessel } from "@/daten/sprachen";
import { useAuth } from "@/hooks/useAuth";
import { useBranding } from "@/hooks/useBranding";
import { useToast } from "@/hooks/use-toast";
import { invokeFunction } from "@/lib/functionError";
import { RAHMENARTEN, rahmentexteSammeln, type Rahmenart, type Rahmenzeile } from "@/lib/rahmentexte";
import { SPRACHNAMEN, ZUSATZSPRACHEN, type Zusatzsprache } from "@/lib/sprachen.mjs";

const feld = (schluessel: string, sprache: Zusatzsprache) => `${schluessel}|${sprache}`;

/**
 * Die kurzen öffentlichen Texte in den anderen Sprachen.
 *
 * Was auf den öffentlichen Seiten steht, aber zu keiner Seite gehört:
 * Menüpunkte, Untertitel und Fuss, die Beschreibungen der Bilder, die
 * Aufzählung „Für Besucher", die Quellen. Kurze Texte, deshalb eine schlichte
 * Tabelle statt eines Editors, nach Art gegliedert. Ein leeres Feld heisst:
 * Hier bleibt das Deutsche stehen.
 *
 * Die Tabelle steht an zwei Stellen. Unter der Seitenliste mit allem – und
 * mit `arten` dort, wo das Deutsche gepflegt wird: unter der Quellenliste nur
 * die Quellen, unter der Galerie nur die Galeriebilder. Wer einen deutschen
 * Text ändert, hat die Übersetzung so gleich darunter und sieht, dass sie
 * veraltet ist.
 *
 * Gezeigt wird, was jemand auch ändern darf – dieselbe Regel wie in der
 * Datenbank (site_text_translation_editable): das Recht am Seitenaufbau für
 * alles, sonst das Recht, mit dem das Deutsche gepflegt wird.
 */
export default function RahmentexteAdmin({ arten, titel = "Menü und Rahmen in anderen Sprachen" }: {
  /** Nur diese Arten zeigen. Ohne Angabe alle. */
  arten?: Rahmenart[];
  titel?: string;
}) {
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const marke = useBranding();
  const [offen, setOffen] = useState(false);
  const [werte, setWerte] = useState<Record<string, string>>({});

  const erlaubt = RAHMENARTEN
    .filter((a) => !arten || arten.includes(a.art))
    .filter((a) => hasPermission("site.layout_edit") || (a.recht !== null && hasPermission(a.recht)));
  const gewaehlt = erlaubt.map((a) => a.art);
  const artenSchluessel = gewaehlt.join(",");

  const { data, error: ladefehler } = useQuery({
    queryKey: sprachSchluessel.rahmenVerwaltungVon(gewaehlt),
    enabled: offen && gewaehlt.length > 0,
    queryFn: () => ladeRahmenVerwaltung(gewaehlt),
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

  const zeilen = useMemo(
    () => (data ? rahmentexteSammeln({ ...data.stand, marke }) : []).filter((z) => artenSchluessel.split(",").includes(z.art)),
    [data, marke, artenSchluessel],
  );
  const vorhanden = useMemo(
    () => new Map((data?.texte ?? []).map((t) => [feld(`${t.kind}:${t.ref}`, t.lang as Zusatzsprache), t])),
    [data],
  );

  const sichern = useMutation({
    mutationFn: async () => {
      for (const z of zeilen) {
        for (const lang of ZUSATZSPRACHEN) {
          const neu = (werte[feld(z.schluessel, lang)] ?? "").trim();
          const alt = vorhanden.get(feld(z.schluessel, lang));
          // Unverändert und auf dem Stand: nicht anfassen, sonst gälte ein
          // maschineller Text als von Hand gesichert.
          if (alt && alt.value === neu && !alt.is_stale) continue;
          if (!alt && neu === "") continue;
          if (neu === "") await loescheRahmentext(z.art, z.ref, lang);
          else await sichereRahmentext(z.art, z.ref, lang, neu);
        }
      }
    },
    onSuccess: () => { toast({ title: "Gesichert" }); frisch(); },
    onError: (err: Error) => toast({ title: "Nicht gesichert", description: err.message, variant: "destructive" }),
  });

  const maschine = useMutation({
    mutationFn: () => invokeFunction("translate-page", { body: { art: "rahmen", arten: gewaehlt } }),
    onSuccess: () => {
      toast({ title: "Übersetzt", description: "Nur was fehlte oder veraltet war. Literaturangaben bleiben, wie sie sind." });
      frisch();
    },
    onError: (err: Error) => toast({ title: "Nicht übersetzt", description: err.message, variant: "destructive" }),
  });

  if (gewaehlt.length === 0) return null;

  const merker = (schluessel: string, lang: Zusatzsprache) => {
    const t = vorhanden.get(feld(schluessel, lang));
    if (!t) return null;
    if (t.is_stale) return "veraltet";
    return t.is_machine ? "maschinell" : null;
  };
  /** Wie viele Felder einer Gruppe noch leer oder veraltet sind. */
  const offeneFelder = (gruppe: Rahmenzeile[]) =>
    gruppe.reduce((n, z) => n + ZUSATZSPRACHEN.filter((s) => {
      const t = vorhanden.get(feld(z.schluessel, s));
      return !t || t.is_stale;
    }).length, 0);

  const tabelle = (gruppe: Rahmenzeile[]) => (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="py-1 pr-3 font-medium">Deutsch</th>
            {ZUSATZSPRACHEN.map((s) => <th key={s} className="py-1 pr-3 font-medium">{SPRACHNAMEN[s]}</th>)}
          </tr>
        </thead>
        <tbody>
          {gruppe.map((z) => (
            <tr key={z.schluessel} className="align-top">
              <td className="py-1 pr-3 min-w-[10rem] max-w-[22rem]">
                <span className="block break-words">{z.text}</span>
                <span className="block text-[11px] text-muted-foreground">
                  {z.ort}
                  {/* Die Maschine lässt sie stehen; meist ist das auch richtig. */}
                  {!z.maschinell && `${z.ort ? " · " : ""}Literaturangabe – bleibt in der Regel, wie sie ist`}
                </span>
              </td>
              {ZUSATZSPRACHEN.map((s) => {
                const hinweis = merker(z.schluessel, s);
                return (
                  <td key={s} className="py-1 pr-3 min-w-[10rem]">
                    <Input
                      lang={s}
                      aria-label={`${z.text} – ${SPRACHNAMEN[s]}`}
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
  );

  const gruppen = erlaubt
    .map((a) => ({ ...a, zeilen: zeilen.filter((z) => z.art === a.art) }))
    .filter((g) => g.zeilen.length > 0);

  return (
    <div className="mt-6 rounded-lg border bg-card" data-rahmentexte>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 p-3 text-left text-sm font-medium"
        aria-expanded={offen}
        onClick={() => setOffen(!offen)}
      >
        <span className="flex items-center gap-2"><Languages size={15} /> {titel}</span>
        <ChevronDown size={15} className={offen ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {offen && (
        <div className="border-t p-3 space-y-3">
          <p className="text-xs text-muted-foreground">
            Kurze Texte der öffentlichen Seite, die zu keiner einzelnen Seite gehören.
            Ein leeres Feld heisst: Dort bleibt das Deutsche stehen.
          </p>
          {ladefehler ? (
            // Fehlt die Tabelle noch, ist das die Auskunft, die weiterhilft.
            <p className="text-sm text-destructive">
              Die Übersetzungen sind nicht erreichbar ({ladefehler.message}). Ist die Migration „mehrsprachig“ eingespielt?
            </p>
          ) : !data ? (
            <p className="text-sm text-muted-foreground">Lade …</p>
          ) : gruppen.length === 0 ? (
            <p className="text-sm text-muted-foreground">Hier gibt es noch keine deutschen Texte.</p>
          ) : gruppen.length === 1 ? (
            tabelle(gruppen[0].zeilen)
          ) : (
            gruppen.map((g) => {
              const fehlt = offeneFelder(g.zeilen);
              return (
                // Menü und Rahmen offen, die langen Listen zugeklappt: Hundert
                // Galeriebilder sollen die sieben Menüpunkte nicht verdrängen.
                <details key={g.art} open={g.art === "menu" || g.art === "settings"} className="rounded-md border px-3 py-2">
                  <summary className="cursor-pointer text-sm font-medium">
                    {g.titel}{" "}
                    <span className="font-normal text-muted-foreground">
                      – {g.zeilen.length} {g.zeilen.length === 1 ? "Text" : "Texte"}
                      {fehlt > 0 ? `, ${fehlt} Felder leer oder veraltet` : ", alles übersetzt"}
                    </span>
                  </summary>
                  <div className="pt-2">{tabelle(g.zeilen)}</div>
                </details>
              );
            })
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
