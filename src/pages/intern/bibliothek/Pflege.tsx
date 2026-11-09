import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FolderUp, ImageOff, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { Rahmen, StatusAbzeichen } from "@/components/bibliothek/Bausteine";
import { db, useBilder, useKarten, useVerweise, type Bild } from "@/hooks/useBibliothek";
import { useBibliotheksrechte } from "@/hooks/useBibliothek";
import {
  REIHENFOLGE, VORSCHAU_KANTE, WEB_KANTE, artVon, bildpfadVon, dateiLesen, speicherorte, type Art, type Eintrag,
} from "@/lib/bibliothekDateien";
import { verkleinern } from "@/lib/imageConversion";

const ART_LABEL: Record<Art, string> = {
  darstellung: "Darstellungen", seite: "Seiten", quelle: "Quellen", bild: "Bildtafeln", karte: "Karten",
};

interface Fehler { datei: string; meldung: string }
interface Vorbereitet {
  eintraege: Eintrag[];
  bilder: { pfad: string; datei: File }[];
  fehler: Fehler[];
  uebergangen: number;
}

/** Den relativen Pfad einer Datei aus Ordnerauswahl oder Ziehen. */
const pfadVon = (f: File) => (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name;

async function vorbereiten(dateien: File[]): Promise<Vorbereitet> {
  const v: Vorbereitet = { eintraege: [], bilder: [], fehler: [], uebergangen: 0 };
  for (const f of dateien) {
    const pfad = pfadVon(f);
    const art = artVon(pfad);
    const bild = art ? null : bildpfadVon(pfad);
    if (art) {
      try {
        const { daten, text } = dateiLesen(await f.text());
        v.eintraege.push({ art, datei: pfad, daten, text });
      } catch (e) {
        v.fehler.push({ datei: pfad, meldung: (e as Error).message });
      }
    } else if (bild) {
      v.bilder.push({ pfad: bild, datei: f });
    } else {
      v.uebergangen++;
    }
  }
  v.eintraege.sort((a, b) => REIHENFOLGE.indexOf(a.art) - REIHENFOLGE.indexOf(b.art) || a.datei.localeCompare(b.datei));
  return v;
}

/**
 * Pflege der Bibliothek: den Ordner hochladen, so wie er im OneDrive liegt.
 *
 * Markdown-Dateien gehen durch library_import() – dieselben Prüfungen wie
 * beim Einpflegen per SQL. Bilder werden hier im Browser verkleinert: Die
 * Seite bekommt eine Webfassung mit höchstens 2000 px und eine Vorschau mit
 * 600 px, das Original bleibt, wo es ist. Ein Bild, das schon in derselben
 * Grösse hochgeladen ist, wird übersprungen.
 */
export default function BibliothekPflege() {
  const { pflegen } = useBibliotheksrechte();
  const qc = useQueryClient();
  const eingabe = useRef<HTMLInputElement>(null);
  const [vorbereitet, setVorbereitet] = useState<Vorbereitet | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [fortschritt, setFortschritt] = useState({ fertig: 0, gesamt: 0, was: "" });
  const [ergebnis, setErgebnis] = useState<{ eingespielt: number; bilder: number; uebersprungen: number; fehler: Fehler[] } | null>(null);
  const [neuHochladen, setNeuHochladen] = useState(false);

  const { data: karten = [] } = useKarten();
  const { data: verweise = [] } = useVerweise();
  const { data: bilder = new Map<string, Bild & { bytes?: number }>() } = useBilder();
  const { data: groessen = new Map<string, number>() } = useQuery({
    queryKey: ["bibliothek", "bildgroessen"],
    enabled: pflegen,
    queryFn: async () => {
      const { data } = await db.from("library_images").select("path, bytes");
      return new Map(((data ?? []) as { path: string; bytes: number | null }[]).map((b) => [b.path, b.bytes ?? -1]));
    },
  });
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

  const waehlen = async (liste: FileList | null) => {
    if (!liste?.length) return;
    setErgebnis(null);
    setVorbereitet(await vorbereiten([...liste]));
  };

  const einspielen = async () => {
    if (!vorbereitet) return;
    setLaeuft(true);
    const fehler: Fehler[] = [...vorbereitet.fehler];
    let eingespielt = 0;
    let hochgeladen = 0;
    let uebersprungen = 0;
    const gesamt = vorbereitet.eintraege.length + vorbereitet.bilder.length;
    let fertig = 0;
    const weiter = (was: string) => setFortschritt({ fertig: ++fertig, gesamt, was });

    for (const e of vorbereitet.eintraege) {
      const { error } = await db.rpc("library_import", { _art: e.art, _d: e.daten, _text: e.text });
      if (error) fehler.push({ datei: e.datei, meldung: error.message });
      else eingespielt++;
      weiter(e.datei);
    }

    for (const b of vorbereitet.bilder) {
      try {
        if (!neuHochladen && groessen.get(b.pfad) === b.datei.size) {
          uebersprungen++;
        } else {
          const { objekt, vorschau } = speicherorte(b.pfad);
          const web = await verkleinern(b.datei, WEB_KANTE, 0.85);
          const klein = await verkleinern(b.datei, VORSCHAU_KANTE, 0.8);
          for (const [ziel, blob] of [[objekt, web.datei], [vorschau, klein.datei]] as const) {
            const { error } = await supabase.storage.from("library")
              .upload(ziel, blob, { upsert: true, contentType: "image/webp", cacheControl: "3600" });
            if (error) throw new Error(error.message);
          }
          const { error } = await db.from("library_images").upsert({
            path: b.pfad, object: objekt, preview: vorschau, width: web.breite, height: web.hoehe, bytes: b.datei.size,
          });
          if (error) {
            // Die Datenbank hat das Bild abgelehnt (kein Rechtsstatus) – dann
            // soll es auch nicht im Speicher liegen bleiben.
            await supabase.storage.from("library").remove([objekt, vorschau]);
            throw new Error(error.message);
          }
          hochgeladen++;
        }
      } catch (err) {
        fehler.push({ datei: `bilder/${b.pfad}`, meldung: (err as Error).message });
      }
      weiter(b.pfad);
    }

    setErgebnis({ eingespielt, bilder: hochgeladen, uebersprungen, fehler });
    setVorbereitet(null);
    setLaeuft(false);
    if (eingabe.current) eingabe.current.value = "";
    qc.invalidateQueries({ queryKey: ["bibliothek"] });
  };

  const zaehlen = (art: Art) => vorbereitet?.eintraege.filter((e) => e.art === art).length ?? 0;
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
      untertitel="Den Ordner der Bibliothek hochladen. Neues kommt dazu, Geändertes wird ersetzt, Unverändertes bleibt.">
      <section className="mb-6 rounded-lg border bg-card p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={eingabe}
            type="file"
            multiple
            className="hidden"
            id="bibliothek-ordner"
            // Ordnerauswahl. Steht nicht in den Typen von React, die Browser können es alle.
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            onChange={(e) => waehlen(e.target.files)}
          />
          <Button asChild disabled={laeuft}>
            <label htmlFor="bibliothek-ordner" className="cursor-pointer">
              <FolderUp size={16} className="mr-1.5" /> Ordner wählen
            </label>
          </Button>
          <div className="flex items-center gap-2">
            <Checkbox id="neu-hochladen" checked={neuHochladen} onCheckedChange={(v) => setNeuHochladen(v === true)} />
            <Label htmlFor="neu-hochladen" className="text-sm font-normal">Bilder auch dann neu hochladen, wenn sie schon da sind</Label>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Erwartet wird der Aufbau aus dem Standard: <code>darstellungen/</code>, <code>quellen/</code>, <code>karten/&lt;Kürzel&gt;/</code>,{" "}
          <code>bilder/&lt;Quelle oder Kürzel&gt;/</code>, <code>seiten/</code>. Ordner, die mit <code>_</code> beginnen, und die README werden übergangen.
        </p>

        {vorbereitet && (
          <div className="rounded border p-3 space-y-2">
            <p className="text-sm">
              Gefunden:{" "}
              {REIHENFOLGE.filter((a) => zaehlen(a)).map((a) => `${zaehlen(a)} ${ART_LABEL[a]}`).join(", ") || "keine Einträge"}
              {vorbereitet.bilder.length > 0 && `, ${vorbereitet.bilder.length} Bilder`}
              {vorbereitet.uebergangen > 0 && ` (${vorbereitet.uebergangen} andere Dateien übergangen)`}.
            </p>
            <FehlerListe fehler={vorbereitet.fehler} titel="Nicht lesbar" />
            <div className="flex gap-2">
              <Button onClick={einspielen} disabled={laeuft || (!vorbereitet.eintraege.length && !vorbereitet.bilder.length)}>
                {laeuft && <Loader2 size={15} className="mr-1.5 animate-spin" />} Einspielen
              </Button>
              <Button variant="ghost" onClick={() => setVorbereitet(null)} disabled={laeuft}>Abbrechen</Button>
            </div>
            {laeuft && (
              <div className="space-y-1">
                <Progress value={(fortschritt.fertig / Math.max(1, fortschritt.gesamt)) * 100} />
                <p className="text-xs text-muted-foreground truncate">{fortschritt.fertig} von {fortschritt.gesamt} · {fortschritt.was}</p>
              </div>
            )}
          </div>
        )}

        {ergebnis && (
          <div className="rounded border p-3 space-y-2" role="status">
            <p className="flex items-center gap-2 text-sm">
              {ergebnis.fehler.length ? <AlertTriangle size={16} className="text-amber-600" /> : <CheckCircle2 size={16} className="text-green-600" />}
              {ergebnis.eingespielt} Einträge eingespielt, {ergebnis.bilder} Bilder hochgeladen
              {ergebnis.uebersprungen > 0 && `, ${ergebnis.uebersprungen} unveränderte Bilder übersprungen`}.
            </p>
            <FehlerListe fehler={ergebnis.fehler} titel="Nicht übernommen" />
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
                    {pfade.map((p) => <li key={p} className="flex items-center gap-1"><ImageOff size={12} /> {p}</li>)}
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
                      {{ insert: "neu", update: "geändert", delete: "gelöscht" }[v.operation] ?? v.operation}
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

function FehlerListe({ fehler, titel }: { fehler: Fehler[]; titel: string }) {
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
