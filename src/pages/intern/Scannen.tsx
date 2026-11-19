import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, FileUp, ImagePlus, Loader2, Pencil, RotateCcw, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { SEITE } from "@/lib/layout";
import { KameraAufnahme } from "@/components/scan/KameraAufnahme";
import { NeuZuschneiden } from "@/components/scan/NeuZuschneiden";
import { Seitenliste } from "@/components/scan/Seitenliste";
import { WeicheWahl } from "@/components/scan/WeicheWahl";
import { useTexterkennung } from "@/components/scan/useTexterkennung";
import { abschliessen, seitenInReihenfolge, type Schritt } from "@/lib/scan/abschluss";
import { STANDARD_VIERECK, type Viereck } from "@/lib/scan/geometrie";
import { ocrBeenden, SCHRIFT_NAME, type SchriftWahl } from "@/lib/scan/ocr";
import {
  allesLoeschen, dateiLaden, dateiLoeschen, dateiSpeichern, neueKennung, sitzungLaden, sitzungSpeichern, textLoeschen,
  type Aufnahme, type Sitzung, type Weiche,
} from "@/lib/scan/speicher";
import { seitenAusAufnahme, type Zuschnitt } from "@/lib/scan/verarbeitung";

/**
 * Quellensammlung → Scannen: ein Buch mit Webcam oder Handy aufnehmen,
 * Text erkennen lassen und als durchsuchbares PDF in die Quellensammlung
 * legen. Ablauf und Gründe: docs/scannen.md.
 */

const STANDARD_ZUSCHNITT: Zuschnitt = { drehung: 0, viereck: STANDARD_VIERECK, doppelseite: true, bund: 0.5, farbig: false };
const GANZES_BILD: Viereck = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
const ZUSCHNITT_MERKER = "scan-zuschnitt";

/** Kamera und Buch stehen beim nächsten Mal meist wieder so – also merken. */
function gemerkterZuschnitt(): Zuschnitt {
  try {
    const z = JSON.parse(localStorage.getItem(ZUSCHNITT_MERKER) ?? "null") as Zuschnitt | null;
    if (z && Array.isArray(z.viereck) && z.viereck.length === 4) return { ...STANDARD_ZUSCHNITT, ...z };
  } catch { /* ohne Merker */ }
  return STANDARD_ZUSCHNITT;
}

const leereSitzung = (zuschnitt: Zuschnitt): Sitzung => ({
  version: 1, weiche: null, zuschnitt, schriftWahl: "auto", schrift: null, aufnahmen: [],
});

const SCHRITT_TEXT: Record<Schritt, string> = {
  pdf: "PDF wird gebaut",
  hochladen: "Wird nach SharePoint geladen",
  zuordnen: "Quelle wird eingetragen",
  text: "Text wird für die Suche abgelegt",
  fertig: "Fertig",
};

function zielText(w: Weiche): string {
  if (w.art === "quelle") return `an die Quelle „${w.titel}"`;
  if (w.art === "neu") return `als neue Quelle „${w.titel}"`;
  return `in den Posteingang („${w.titel}")`;
}

const Scannen = () => {
  const [params] = useSearchParams();
  const queryClient = useQueryClient();
  const [sitzung, setSitzung] = useState<Sitzung | null>(null);
  const sitzungRef = useRef<Sitzung | null>(null);
  sitzungRef.current = sitzung;
  const [bilder, setBilder] = useState<Map<string, string>>(new Map());
  const [inArbeit, setInArbeit] = useState(0);
  const [weicheZeigen, setWeicheZeigen] = useState(false);
  const [zuschneiden, setZuschneiden] = useState<{ aufnahmeId: string; roh: Blob; zuschnitt: Zuschnitt } | null>(null);
  const [lauf, setLauf] = useState<{ schritt: Schritt; anteil: number } | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [fertig, setFertig] = useState<{ name: string; eingang: boolean } | null>(null);
  const kette = useRef<Promise<void>>(Promise.resolve());
  const speicherFehler = useRef(false);

  const { data: fileStorage, isLoading: ablageLaedt } = useQuery({
    queryKey: ["file-storage"],
    queryFn: async () => {
      const { data } = await supabase.from("app_settings").select("file_storage").maybeSingle();
      return (data as { file_storage?: string } | null)?.file_storage ?? "supabase";
    },
  });

  const aendern = useCallback((f: (s: Sitzung) => Sitzung) => setSitzung((s) => (s ? f(s) : s)), []);

  // Eine angefangene Sitzung wieder aufnehmen.
  useEffect(() => {
    let aktiv = true;
    (async () => {
      const gespeichert = await sitzungLaden();
      if (!aktiv) return;
      if (gespeichert?.version === 1) {
        const urls = new Map<string, string>();
        for (const s of gespeichert.aufnahmen.flatMap((a) => a.seiten)) {
          const b = await dateiLaden(s.bildId);
          if (b) urls.set(s.bildId, URL.createObjectURL(b));
        }
        if (!aktiv) return;
        setBilder(urls);
        setSitzung(gespeichert);
      } else {
        setSitzung(leereSitzung(gemerkterZuschnitt()));
      }
    })();
    return () => {
      aktiv = false;
      void ocrBeenden();
    };
  }, []);

  useEffect(() => () => { for (const u of bilder.values()) URL.revokeObjectURL(u); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sitzung) return;
    sitzungSpeichern(sitzung).catch(() => {
      if (speicherFehler.current) return;
      speicherFehler.current = true;
      setFehler("Der Zwischenspeicher des Browsers nimmt nichts mehr an. Lade das Buch bald hoch – bei einem Absturz wären die Seiten weg.");
    });
  }, [sitzung]);

  // Nicht aus Versehen weg, solange etwas verloren gehen könnte.
  useEffect(() => {
    if (inArbeit === 0 && !lauf) return;
    const warnen = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", warnen);
    return () => window.removeEventListener("beforeunload", warnen);
  }, [inArbeit, lauf]);

  const ocr = useTexterkennung(sitzung, (schrift) => aendern((s) => ({ ...s, schrift })));

  const zuschnittSetzen = (z: Zuschnitt) => {
    aendern((s) => ({ ...s, zuschnitt: z }));
    try { localStorage.setItem(ZUSCHNITT_MERKER, JSON.stringify(z)); } catch { /* ohne Merker */ }
  };

  const bilderMerken = (paare: [string, Blob][]) =>
    setBilder((alt) => {
      const neu = new Map(alt);
      for (const [id, b] of paare) neu.set(id, URL.createObjectURL(b));
      return neu;
    });

  const bilderVergessen = (ids: string[]) =>
    setBilder((alt) => {
      const neu = new Map(alt);
      for (const id of ids) {
        const u = neu.get(id);
        if (u) URL.revokeObjectURL(u);
        neu.delete(id);
      }
      return neu;
    });

  /** Aus einem Bild die Seiten machen. Der Reihe nach, damit die Reihenfolge stimmt. */
  const seitenMachen = async (roh: Blob, zuschnitt: Zuschnitt) => {
    const fertige = await seitenAusAufnahme(roh, zuschnitt);
    const seiten = [];
    const paare: [string, Blob][] = [];
    for (const f of fertige) {
      const bildId = neueKennung();
      await dateiSpeichern(bildId, f.bild);
      paare.push([bildId, f.bild]);
      seiten.push({ id: neueKennung(), bildId, breite: f.breite, hoehe: f.hoehe });
    }
    bilderMerken(paare);
    return seiten;
  };

  const aufnahmeHinzufuegen = (roh: Blob, zuschnitt: Zuschnitt) => {
    setInArbeit((n) => n + 1);
    kette.current = kette.current.then(async () => {
      try {
        const rohId = neueKennung();
        await dateiSpeichern(rohId, roh);
        const seiten = await seitenMachen(roh, zuschnitt);
        aendern((s) => ({ ...s, aufnahmen: [...s.aufnahmen, { id: neueKennung(), rohId, zuschnitt, seiten }] }));
      } catch (err) {
        setFehler(`Eine Aufnahme liess sich nicht verarbeiten: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setInArbeit((n) => n - 1);
      }
    });
  };

  const vonKamera = useCallback((roh: Blob) => {
    const z = sitzungRef.current?.zuschnitt ?? STANDARD_ZUSCHNITT;
    aufnahmeHinzufuegen(roh, z);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Bilder von aussen: Fotos aus der Kamera-App, Seiten aus der Software
   * eines Buchscanners. Sie sind schon zugeschnitten; geteilt wird nur, wenn
   * „Doppelseite" eingeschaltet ist. Nach Dateinamen sortiert, so wie
   * Scanner und Kameras sie durchzählen.
   */
  const bilderUebernehmen = (dateien: FileList | null) => {
    if (!dateien?.length || !sitzung) return;
    const z: Zuschnitt = { ...sitzung.zuschnitt, drehung: 0, viereck: GANZES_BILD };
    [...dateien]
      .filter((d) => d.type.startsWith("image/"))
      .sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true }))
      .forEach((d) => aufnahmeHinzufuegen(d, z));
  };

  const aufnahmeEntfernen = async (a: Aufnahme) => {
    await dateiLoeschen(a.rohId);
    for (const s of a.seiten) { await dateiLoeschen(s.bildId); await textLoeschen(s.id); }
    bilderVergessen(a.seiten.map((s) => s.bildId));
  };

  const aufnahmeLoeschen = (id: string) => {
    const a = sitzung?.aufnahmen.find((x) => x.id === id);
    if (!a) return;
    aendern((s) => ({ ...s, aufnahmen: s.aufnahmen.filter((x) => x.id !== id) }));
    void aufnahmeEntfernen(a);
  };

  const seiteLoeschen = (aufnahmeId: string, seiteId: string) => {
    const a = sitzung?.aufnahmen.find((x) => x.id === aufnahmeId);
    const seite = a?.seiten.find((s) => s.id === seiteId);
    if (!a || !seite) return;
    if (a.seiten.length === 1) return aufnahmeLoeschen(aufnahmeId);
    aendern((s) => ({
      ...s,
      aufnahmen: s.aufnahmen.map((x) => (x.id === aufnahmeId ? { ...x, seiten: x.seiten.filter((y) => y.id !== seiteId) } : x)),
    }));
    void dateiLoeschen(seite.bildId);
    void textLoeschen(seite.id);
    bilderVergessen([seite.bildId]);
  };

  const verschieben = (id: string, richtung: -1 | 1) =>
    aendern((s) => {
      const i = s.aufnahmen.findIndex((a) => a.id === id);
      const j = i + richtung;
      if (i < 0 || j < 0 || j >= s.aufnahmen.length) return s;
      const liste = [...s.aufnahmen];
      [liste[i], liste[j]] = [liste[j], liste[i]];
      return { ...s, aufnahmen: liste };
    });

  const zuschneidenOeffnen = async (id: string) => {
    const a = sitzung?.aufnahmen.find((x) => x.id === id);
    if (!a) return;
    const roh = await dateiLaden(a.rohId);
    if (!roh) return setFehler("Das ursprüngliche Bild dieser Aufnahme fehlt im Zwischenspeicher.");
    setZuschneiden({ aufnahmeId: id, roh, zuschnitt: a.zuschnitt });
  };

  const zuschneidenUebernehmen = (z: Zuschnitt) => {
    const auftrag = zuschneiden;
    setZuschneiden(null);
    if (!auftrag) return;
    setInArbeit((n) => n + 1);
    kette.current = kette.current.then(async () => {
      try {
        const alt = sitzungRef.current?.aufnahmen.find((a) => a.id === auftrag.aufnahmeId);
        if (!alt) return;
        const seiten = await seitenMachen(auftrag.roh, z);
        aendern((s) => ({
          ...s,
          aufnahmen: s.aufnahmen.map((a) => (a.id === auftrag.aufnahmeId ? { ...a, zuschnitt: z, seiten } : a)),
        }));
        for (const s of alt.seiten) { await dateiLoeschen(s.bildId); await textLoeschen(s.id); }
        bilderVergessen(alt.seiten.map((s) => s.bildId));
      } catch (err) {
        setFehler(`Neu zuschneiden ging nicht: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setInArbeit((n) => n - 1);
      }
    });
  };

  const schriftWaehlen = (wahl: SchriftWahl) => {
    if (!sitzung) return;
    const bisher = sitzung.schriftWahl === "auto" ? sitzung.schrift : sitzung.schriftWahl;
    aendern((s) => ({ ...s, schriftWahl: wahl, schrift: wahl === "auto" ? s.schrift : wahl }));
    if (wahl !== "auto" && wahl !== bisher) void ocr.alleNeu();
  };

  const neuAnfangen = async () => {
    if (sitzung && sitzung.aufnahmen.length > 0 && !window.confirm("Alle Seiten dieses Buches verwerfen?")) return;
    await allesLoeschen();
    bilderVergessen([...bilder.keys()]);
    setSitzung(leereSitzung(sitzung?.zuschnitt ?? gemerkterZuschnitt()));
    setFehler(null);
  };

  const hochladen = async () => {
    const s = sitzungRef.current;
    if (!s?.weiche) return;
    setFehler(null);
    setLauf({ schritt: "pdf", anteil: 0 });
    try {
      const stand = await abschliessen(s, s.abschluss ?? {}, (schritt, anteil, st) => {
        setLauf({ schritt, anteil });
        aendern((x) => ({ ...x, abschluss: st }));
      });
      setFertig({ name: stand.dateiName ?? s.weiche.titel, eingang: s.weiche.art === "eingang" });
      await allesLoeschen();
      bilderVergessen([...bilder.keys()]);
      setSitzung(leereSitzung(s.zuschnitt));
      queryClient.invalidateQueries({ queryKey: ["sources"] });
    } catch (err) {
      setFehler(`${err instanceof Error ? err.message : String(err)} – Die Seiten bleiben erhalten; „Hochladen" versucht es noch einmal.`);
    } finally {
      setLauf(null);
    }
  };

  const seitenZahl = sitzung ? seitenInReihenfolge(sitzung).length : 0;

  return (
    <div className={SEITE}>
      <Link to="/intern/quellen" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft size={16} /> Quellensammlung
      </Link>
      <h1 className="font-serif text-2xl font-bold mb-6">Buch scannen</h1>

      {fertig && (
        <div className="mb-6 p-4 rounded-lg border border-green-600/40 bg-green-600/5 flex items-start gap-3">
          <CheckCircle2 className="text-green-600 shrink-0 mt-0.5" size={20} />
          <div className="text-sm space-y-1 flex-1">
            <p className="font-medium">„{fertig.name}" ist hochgeladen.</p>
            <p className="text-muted-foreground">
              {fertig.eingang
                ? "Die Datei liegt im Posteingang. Zuordnen unter Verwaltung → Mitgliederbereich → Eingangskorb."
                : "Die Quelle steht in der Quellensammlung; ihr Text ist dort durchsuchbar."}
            </p>
            <div className="flex gap-3 pt-1">
              <Link to="/intern/quellen" className="text-primary hover:underline">Zur Quellensammlung</Link>
              <button type="button" onClick={() => setFertig(null)} className="text-primary hover:underline">Nächstes Buch</button>
            </div>
          </div>
        </div>
      )}

      {fehler && (
        <div className="mb-6 p-3 rounded-lg border border-destructive/40 bg-destructive/5 text-sm text-destructive flex justify-between gap-3">
          <span>{fehler}</span>
          <button type="button" onClick={() => setFehler(null)} className="shrink-0 underline">Ausblenden</button>
        </div>
      )}

      {ablageLaedt || !sitzung ? (
        <p className="text-sm text-muted-foreground"><Loader2 className="inline animate-spin mr-2" size={14} />Wird geladen …</p>
      ) : fileStorage !== "sharepoint" ? (
        <p className="text-sm text-muted-foreground">
          Scannen braucht die Dateiablage in SharePoint – Scans ganzer Bücher sind zu gross für den Speicher von Supabase.
          Einrichten unter Verwaltung → Allgemeine Einstellungen → Erscheinungsbild → Dateiablage.
        </p>
      ) : !sitzung.weiche || weicheZeigen ? (
        <WeicheWahl
          vorgabe={sitzung.weiche}
          epochVorgabe={params.get("epoche") ?? ""}
          ordnerVorgabe={params.get("ordner")}
          onWahl={(weiche) => {
            // Nach einem halben Hochladen gehört die Datei schon irgendwohin –
            // dann gilt der neue Weg nur, wenn noch nichts oben ist.
            aendern((s) => ({ ...s, weiche, abschluss: s.abschluss?.driveItemId ? s.abschluss : undefined }));
            setWeicheZeigen(false);
          }}
        />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg border bg-card text-sm">
            <span>
              {seitenZahl} {seitenZahl === 1 ? "Seite" : "Seiten"} {zielText(sitzung.weiche)}
            </span>
            <span className="flex gap-3">
              <button type="button" onClick={() => setWeicheZeigen(true)} className="inline-flex items-center gap-1 text-primary hover:underline">
                <Pencil size={14} /> Ziel ändern
              </button>
              <button type="button" onClick={() => void neuAnfangen()} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <RotateCcw size={14} /> Neu anfangen
              </button>
            </span>
          </div>

          <KameraAufnahme zuschnitt={sitzung.zuschnitt} onZuschnitt={zuschnittSetzen} onAufnahme={vonKamera} />

          <div className="flex flex-wrap items-center gap-2 text-sm">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-muted cursor-pointer">
              <ImagePlus size={16} /> Bilder übernehmen
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { bilderUebernehmen(e.target.files); e.target.value = ""; }} />
            </label>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-md border hover:bg-muted cursor-pointer sm:hidden">
              <Smartphone size={16} /> Foto mit der Kamera-App
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { bilderUebernehmen(e.target.files); e.target.value = ""; }} />
            </label>
            <label className="inline-flex items-center gap-2 ml-auto">
              Schrift
              <select
                value={sitzung.schriftWahl}
                onChange={(e) => schriftWaehlen(e.target.value as SchriftWahl)}
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="auto">
                  Automatisch{sitzung.schriftWahl === "auto" && sitzung.schrift ? ` (${SCHRIFT_NAME[sitzung.schrift]})` : ""}
                </option>
                <option value="antiqua">Antiqua</option>
                <option value="fraktur">Fraktur</option>
              </select>
            </label>
          </div>
          <p className="text-xs text-muted-foreground -mt-4">
            „Bilder übernehmen" nimmt fertige Seiten – etwa aus der Software eines Buchscanners oder Fotos vom Handy – in diese Reihe auf.
          </p>

          {inArbeit > 0 && (
            <p className="text-sm text-muted-foreground"><Loader2 className="inline animate-spin mr-2" size={14} />{inArbeit} {inArbeit === 1 ? "Aufnahme wird" : "Aufnahmen werden"} verarbeitet …</p>
          )}

          {sitzung.aufnahmen.length > 0 && (
            <Seitenliste
              aufnahmen={sitzung.aufnahmen}
              bilder={bilder}
              ocr={ocr.stand}
              onVerschieben={verschieben}
              onAufnahmeLoeschen={aufnahmeLoeschen}
              onSeiteLoeschen={seiteLoeschen}
              onZuschneiden={(id) => void zuschneidenOeffnen(id)}
              onNeuLesen={(id) => void ocr.seiteNeu(id)}
            />
          )}

          {seitenZahl > 0 && (
            <div className="p-4 rounded-lg border bg-card space-y-3">
              {lauf ? (
                <div className="space-y-2">
                  <p className="text-sm"><Loader2 className="inline animate-spin mr-2" size={14} />{SCHRITT_TEXT[lauf.schritt]} …</p>
                  <Progress value={Math.round(lauf.anteil * 100)} className="h-1.5" />
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground">
                    {ocr.offen > 0
                      ? `Die Texterkennung liest noch ${ocr.offen} ${ocr.offen === 1 ? "Seite" : "Seiten"}. Wer jetzt hochlädt, bekommt für diese Seiten keinen Text.`
                      : `Alle ${seitenZahl} Seiten sind gelesen.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => void hochladen()}
                    disabled={inArbeit > 0}
                    className={`inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md disabled:opacity-50 ${ocr.offen > 0 ? "border hover:bg-muted" : "bg-primary text-primary-foreground hover:bg-primary/90"}`}
                  >
                    <FileUp size={16} /> {ocr.offen > 0 ? "Trotzdem hochladen" : "PDF bauen und hochladen"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      <NeuZuschneiden
        roh={zuschneiden?.roh ?? null}
        zuschnitt={zuschneiden?.zuschnitt ?? null}
        onSchliessen={() => setZuschneiden(null)}
        onUebernehmen={zuschneidenUebernehmen}
      />
    </div>
  );
};

export default Scannen;
