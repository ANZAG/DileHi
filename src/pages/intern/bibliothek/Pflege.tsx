import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, CloudDownload, ImageOff, Loader2, PlugZap, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Rahmen, StatusAbzeichen } from "@/components/bibliothek/Bausteine";
import {
  db, useBibliotheksrechte, useBilder, useDarstellungen, useKarten, useQuellen, useSeiten, useTafeln, useVerweise, type Bild,
} from "@/hooks/useBibliothek";
import {
  REIHENFOLGE, nichtMehrImOrdner, ordnerLesen, type Art, type Meldung, type OrdnerDatei,
} from "@/lib/bibliothekDateien";
import { invokeFunction } from "@/lib/functionError";

const ART_LABEL: Record<Art, string> = {
  darstellung: "Darstellungen", seite: "Seiten", quelle: "Quellen", bild: "Bildtafeln", karte: "Karten",
};
const TABELLE: Record<Art, { tabelle: string; spalte: string }> = {
  darstellung: { tabelle: "library_presentations", spalte: "id" },
  seite: { tabelle: "library_pages", spalte: "slug" },
  quelle: { tabelle: "library_sources", spalte: "id" },
  bild: { tabelle: "library_plates", spalte: "id" },
  karte: { tabelle: "library_cards", spalte: "id" },
};

interface Ergebnis {
  gefunden: string;
  eingespielt: number;
  bilder: number;
  bilderEntfernt: number;
  fehler: Meldung[];
  veraltet: { art: Art; id: string }[];
}

/**
 * Pflege der Bibliothek.
 *
 * Gepflegt wird im Ordner in SharePoint, synchronisiert auf den eigenen
 * Rechner: Karten schreiben, Ausschnitte ablegen. Hier wird er eingelesen.
 * Markdown geht durch library_import() – dieselben Prüfungen wie beim
 * Einpflegen per SQL –, Bilder werden nur verzeichnet; sie bleiben in
 * SharePoint.
 *
 * Neues kommt dazu, Geändertes wird ersetzt. Was im Ordner fehlt, bleibt
 * stehen, bis jemand es hier ausdrücklich entfernt.
 */
export default function BibliothekPflege() {
  const { pflegen } = useBibliotheksrechte();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [laeuft, setLaeuft] = useState(false);
  const [schritt, setSchritt] = useState({ fertig: 0, gesamt: 0, was: "" });
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);

  const { data: karten = [] } = useKarten();
  const { data: quellen = [] } = useQuellen();
  const { data: tafeln = [] } = useTafeln();
  const { data: darstellungen = [] } = useDarstellungen();
  const { data: seiten = [] } = useSeiten();
  const { data: verweise = [] } = useVerweise();
  const { data: bilder = new Map<string, Bild>() } = useBilder();
  const { data: verlauf = [] } = useQuery({
    queryKey: ["bibliothek", "verlauf"],
    enabled: pflegen,
    queryFn: async () => {
      const { data } = await db.from("library_history")
        .select("id, table_name, entry_id, operation, changed_at").order("id", { ascending: false }).limit(25);
      return (data ?? []) as { id: number; table_name: string; entry_id: string; operation: string; changed_at: string }[];
    },
  });

  const fehlendeBilder = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const v of verweise) {
      for (const p of [v.pointer_image, v.page_image]) {
        if (p && !bilder.has(p)) m.set(v.card_id, [...(m.get(v.card_id) ?? []), p]);
      }
    }
    return m;
  }, [verweise, bilder]);
  const offen = karten.filter((k) => k.status !== "checked");

  const einlesen = async () => {
    setLaeuft(true);
    setErgebnis(null);
    try {
      setSchritt({ fertig: 0, gesamt: 0, was: "Ordner wird gelesen …" });
      const { files } = await invokeFunction<{ files: OrdnerDatei[] }>("library-files", { body: { action: "scan" } });
      const { eintraege, bilder: zeilen, fehler, uebergangen } = ordnerLesen(files);
      const lesefehler = fehler.length;
      const zaehlen = (art: Art) => eintraege.filter((e) => e.art === art).length;
      const gefunden = [
        ...REIHENFOLGE.filter(zaehlen).map((a) => `${zaehlen(a)} ${ART_LABEL[a]}`),
        `${zeilen.length} Bilder`,
        ...(uebergangen ? [`${uebergangen} andere Dateien übergangen`] : []),
      ].join(", ");

      let eingespielt = 0;
      const gesamt = eintraege.length + 1;
      for (const [i, e] of eintraege.entries()) {
        setSchritt({ fertig: i, gesamt, was: e.datei });
        const { error } = await db.rpc("library_import", { _art: e.art, _d: e.daten, _text: e.text });
        if (error) fehler.push({ datei: e.datei, meldung: error.message });
        else eingespielt++;
      }

      // Bilder: erst alle auf einmal. Lehnt die Datenbank eines ab (Ordner
      // ohne Quelle, also ohne Rechtsstatus), einzeln – damit klar ist, welches.
      setSchritt({ fertig: eintraege.length, gesamt, was: "Bilder werden verzeichnet …" });
      let verzeichnet = 0;
      if (zeilen.length) {
        const { error } = await db.from("library_images").upsert(zeilen);
        if (!error) verzeichnet = zeilen.length;
        else {
          for (const z of zeilen) {
            const { error: einzeln } = await db.from("library_images").upsert(z);
            if (einzeln) fehler.push({ datei: `bilder/${z.path}`, meldung: einzeln.message });
            else verzeichnet++;
          }
        }
      }
      const imOrdner = new Set(zeilen.map((z) => z.path));
      const weg = [...bilder.keys()].filter((p) => !imOrdner.has(p));
      if (weg.length) await db.from("library_images").delete().in("path", weg);

      // Ist eine Datei nicht lesbar, kennen wir ihre Kennung nicht – dann
      // sähe ihr Eintrag aus wie gelöscht. Also erst gar nichts anbieten.
      const veraltet = lesefehler ? [] : nichtMehrImOrdner(eintraege, {
        darstellung: darstellungen.map((d) => d.id),
        seite: seiten.map((s) => s.slug),
        quelle: quellen.map((q) => q.id),
        bild: tafeln.map((t) => t.id),
        karte: karten.map((k) => k.id),
      });

      setErgebnis({ gefunden, eingespielt, bilder: verzeichnet, bilderEntfernt: weg.length, fehler, veraltet });
    } catch (e) {
      toast({ title: "Einlesen fehlgeschlagen", description: (e as Error).message, variant: "destructive" });
    } finally {
      setLaeuft(false);
      qc.invalidateQueries({ queryKey: ["bibliothek"] });
    }
  };

  /** Rückwärts entfernen: erst Karten, dann was sie zitieren. */
  const entfernen = async (liste: { art: Art; id: string }[]) => {
    const fehler: Meldung[] = [];
    for (const v of [...liste].sort((a, b) => REIHENFOLGE.indexOf(b.art) - REIHENFOLGE.indexOf(a.art))) {
      const { tabelle, spalte } = TABELLE[v.art];
      const { error } = await db.from(tabelle).delete().eq(spalte, v.id);
      if (error) fehler.push({ datei: v.id, meldung: error.message });
    }
    qc.invalidateQueries({ queryKey: ["bibliothek"] });
    setErgebnis((e) => e && { ...e, veraltet: e.veraltet.filter((v) => fehler.some((f) => f.datei === v.id)), fehler: [...e.fehler, ...fehler] });
    if (!fehler.length) toast({ title: `${liste.length} Einträge entfernt` });
  };

  const krumen = [{ label: "Wissensbibliothek", to: "/intern/bibliothek" }, { label: "Pflege" }];
  if (!pflegen) {
    return (
      <Rahmen krumen={krumen} titel="Pflege">
        <p className="text-muted-foreground">Dafür braucht es das Recht „Wissensbibliothek pflegen“.</p>
      </Rahmen>
    );
  }

  return (
    <Rahmen krumen={krumen} titel="Pflege der Wissensbibliothek"
      untertitel="Gepflegt wird im Ordner in SharePoint. Hier wird er eingelesen.">
      <section className="mb-6 rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={einlesen} disabled={laeuft}>
            {laeuft ? <Loader2 size={16} className="mr-1.5 animate-spin" /> : <CloudDownload size={16} className="mr-1.5" />}
            Aus SharePoint einlesen
          </Button>
          <p className="text-sm text-muted-foreground">
            Neues kommt dazu, Geändertes wird ersetzt, Unverändertes bleibt, wie es ist.
          </p>
        </div>

        {laeuft && (
          <div className="space-y-1">
            <Progress value={schritt.gesamt ? (schritt.fertig / schritt.gesamt) * 100 : 5} />
            <p className="text-xs text-muted-foreground truncate">{schritt.was}</p>
          </div>
        )}

        {ergebnis && (
          <div className="rounded border p-3 space-y-2" role="status">
            <p className="text-sm text-muted-foreground">Im Ordner: {ergebnis.gefunden}.</p>
            <p className="flex items-center gap-2 text-sm">
              {ergebnis.fehler.length ? <AlertTriangle size={16} className="text-amber-600" /> : <CheckCircle2 size={16} className="text-green-600" />}
              {ergebnis.eingespielt} Einträge eingelesen, {ergebnis.bilder} Bilder verzeichnet
              {ergebnis.bilderEntfernt > 0 && `, ${ergebnis.bilderEntfernt} nicht mehr vorhandene Bilder ausgetragen`}.
            </p>
            <FehlerListe fehler={ergebnis.fehler} titel="Nicht übernommen" />
            {ergebnis.veraltet.length > 0 && (
              <div className="rounded border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900 space-y-2">
                <p className="font-medium">Nicht mehr im Ordner ({ergebnis.veraltet.length})</p>
                <p>Gelöscht, umbenannt – oder nur noch nicht synchronisiert. Erst entfernen, wenn das sicher ist.</p>
                <ul className="font-mono text-xs">
                  {ergebnis.veraltet.map((v) => <li key={`${v.art}-${v.id}`}>{ART_LABEL[v.art]}: {v.id}</li>)}
                </ul>
                <Button size="sm" variant="outline" onClick={() => entfernen(ergebnis.veraltet)}>
                  <Trash2 size={14} className="mr-1" /> Aus der Bibliothek entfernen
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="font-serif text-xl font-bold mb-2">Bilder fehlen</h2>
          {fehlendeBilder.size === 0 ? <p className="text-sm text-muted-foreground">Alle Bilder, auf die Karten verweisen, sind da.</p> : (
            <ul className="divide-y rounded-lg border bg-card text-sm">
              {[...fehlendeBilder].map(([karte, pfade]) => (
                <li key={karte} className="px-3 py-2">
                  <Link to={`/intern/bibliothek/karte/${karte}`} className="font-mono text-primary hover:underline">{karte}</Link>
                  <ul className="mt-1 text-xs text-muted-foreground">
                    {pfade.map((p) => <li key={p} className="flex items-center gap-1"><ImageOff size={12} /> bilder/{p}</li>)}
                  </ul>
                </li>
              ))}
            </ul>
          )}

          <h2 className="font-serif text-xl font-bold mt-6 mb-2">Nicht geprüft</h2>
          {offen.length === 0 ? <p className="text-sm text-muted-foreground">Alle Karten sind geprüft.</p> : (
            <ul className="divide-y rounded-lg border bg-card text-sm">
              {offen.map((k) => (
                <li key={k.id} className="flex items-center gap-2 px-3 py-2">
                  <Link to={`/intern/bibliothek/karte/${k.id}`} className="font-mono text-primary hover:underline">{k.id}</Link>
                  <StatusAbzeichen status={k.status} />
                </li>
              ))}
            </ul>
          )}

          <Ablage />
        </section>

        <section>
          <h2 className="font-serif text-xl font-bold mb-2">Zuletzt geändert</h2>
          {verlauf.length === 0 ? <p className="text-sm text-muted-foreground">Noch nichts.</p> : (
            <ul className="divide-y rounded-lg border bg-card text-sm">
              {verlauf.map((v) => (
                <li key={v.id} className="flex items-baseline justify-between gap-3 px-3 py-1.5">
                  <span>
                    <span className="font-mono">{v.entry_id}</span>{" "}
                    <span className="text-muted-foreground">
                      {{ insert: "neu", update: "geändert", delete: "entfernt" }[v.operation] ?? v.operation}
                      {v.table_name === "library_findings" && " (Fundstellen)"}
                      {v.table_name === "library_images" && " (Bild)"}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(v.changed_at).toLocaleString("de-DE", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Rahmen>
  );
}

/**
 * Wo der Ordner liegt: Adresse der SharePoint-Website und der Weg in deren
 * Dokumentbibliothek. Eine eigene Website oder die der Quellensammlung.
 */
function Ablage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: einstellung } = useQuery({
    queryKey: ["bibliothek", "ablage"],
    queryFn: async () => {
      const { data } = await db.from("library_settings").select("site_url, folder").maybeSingle();
      return (data ?? { site_url: null, folder: "Bibliothek" }) as { site_url: string | null; folder: string };
    },
  });
  const [site, setSite] = useState("");
  const [ordner, setOrdner] = useState("Bibliothek");
  const [pruefung, setPruefung] = useState<{ ok: boolean; text: string } | null>(null);
  const [prueft, setPrueft] = useState(false);

  useEffect(() => {
    if (!einstellung) return;
    setSite(einstellung.site_url ?? "");
    setOrdner(einstellung.folder);
  }, [einstellung]);

  const geaendert = !!einstellung && (site !== (einstellung.site_url ?? "") || ordner !== einstellung.folder);

  const speichern = async () => {
    const { error } = await db.from("library_settings")
      .update({ site_url: site.trim() || null, folder: ordner.trim().replace(/^\/+|\/+$/g, "") || "Bibliothek" })
      .eq("id", true);
    if (error) toast({ title: "Nicht gespeichert", description: error.message, variant: "destructive" });
    else {
      setPruefung(null);
      qc.invalidateQueries({ queryKey: ["bibliothek", "ablage"] });
    }
  };

  const pruefen = async () => {
    setPrueft(true);
    try {
      const r = await invokeFunction<{ ok: boolean; site: string; library?: string; folder: string; entries?: number; meldung?: string }>(
        "library-files", { body: { action: "status" } }
      );
      setPruefung(r.ok
        ? { ok: true, text: `Verbunden: „${r.site}“, Ordner „${r.folder}“ mit ${r.entries ?? "?"} Einträgen.` }
        : { ok: false, text: r.meldung ?? "Ordner nicht gefunden." });
    } catch (e) {
      setPruefung({ ok: false, text: (e as Error).message });
    } finally {
      setPrueft(false);
    }
  };

  return (
    <div className="mt-6 rounded-lg border bg-card p-4 space-y-3">
      <h2 className="font-semibold">Ablage in SharePoint</h2>
      <div className="space-y-1">
        <Label htmlFor="bib-site">Adresse der SharePoint-Website</Label>
        <Input id="bib-site" value={site} onChange={(e) => setSite(e.target.value)} placeholder="https://verein.sharepoint.com/sites/Bibliothek" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="bib-ordner">Ordner in den Dokumenten der Website</Label>
        <Input id="bib-ordner" value={ordner} onChange={(e) => setOrdner(e.target.value)} placeholder="Bibliothek" />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={speichern} disabled={!geaendert}>Speichern</Button>
        <Button size="sm" variant="outline" onClick={pruefen} disabled={prueft || geaendert}>
          {prueft ? <Loader2 size={14} className="mr-1 animate-spin" /> : <PlugZap size={14} className="mr-1" />} Verbindung prüfen
        </Button>
      </div>
      {pruefung && (
        <p className={`text-sm flex items-start gap-1.5 ${pruefung.ok ? "text-green-700" : "text-red-700"}`}>
          {pruefung.ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <XCircle size={15} className="mt-0.5 shrink-0" />}
          {pruefung.text}
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Liegt der Ordner auf der Website der Quellensammlung, ist nichts weiter zu tun. Eine andere Website muss
        für DING eigens freigegeben sein (Schritt 5 der SharePoint-Anleitung, mit ihrer Adresse); ohne Freigabe
        meldet die Prüfung „darf diese Website nicht lesen“.
      </p>
    </div>
  );
}

function FehlerListe({ fehler, titel }: { fehler: Meldung[]; titel: string }) {
  if (!fehler.length) return null;
  return (
    <div className="rounded border border-red-200 bg-red-50 p-2 text-sm text-red-900">
      <p className="font-medium flex items-center gap-1.5"><XCircle size={14} /> {titel} ({fehler.length})</p>
      <ul className="mt-1 space-y-1">
        {fehler.map((f, i) => (
          <li key={i}><span className="font-mono text-xs">{f.datei}</span>: {f.meldung}</li>
        ))}
      </ul>
    </div>
  );
}
