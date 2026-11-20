import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Camera, CheckCircle2, FileUp, ImagePlus, Loader2, Pencil, RotateCcw, RotateCw, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { SEITE } from "@/lib/layout";
import { KameraAufnahme } from "@/components/scan/KameraAufnahme";
import { NeuZuschneiden } from "@/components/scan/NeuZuschneiden";
import { OrdnerBeobachten } from "@/components/scan/OrdnerBeobachten";
import { Seitenliste } from "@/components/scan/Seitenliste";
import { pruefungFuer, pruefungZaehlen, seitePruefen } from "@/lib/scan/pruefung";
import { WeicheWahl } from "@/components/scan/WeicheWahl";
import { useTexterkennung } from "@/components/scan/useTexterkennung";
import { abschliessen, seitenInReihenfolge, textExport, type Schritt } from "@/lib/scan/abschluss";
import { STANDARD_VIERECK, type Viereck } from "@/lib/scan/geometrie";
import { seitenFinden } from "@/lib/scan/seitenFinden";
import { ocrBeenden, SCHRIFT_NAME, type SchriftWahl } from "@/lib/scan/ocr";
import { nachName } from "@/lib/scan/ordner";
import { ersetzenIn, seitenBezeichnung, type ErsetzenZiel } from "@/lib/scan/ersetzen";
import {
  allesLoeschen, dateiLaden, dateiLoeschen, dateiSpeichern, neueKennung, sitzungLaden, sitzungSpeichern, textLoeschen,
  type Aufnahme, type Sitzung, type Weiche,
} from "@/lib/scan/speicher";
import { seitenAusAufnahme, type Zuschnitt } from "@/lib/scan/verarbeitung";
import { zuschnittDrehen } from "@/lib/scan/verarbeitungKern";
import { useToast } from "@/hooks/use-toast";

/**
 * Quellensammlung → Scannen: ein Buch mit Webcam oder Handy aufnehmen,
 * Text erkennen lassen und als durchsuchbares PDF in die Quellensammlung
 * legen. Ablauf und Gründe: docs/scannen.md.
 */

const STANDARD_ZUSCHNITT: Zuschnitt = {
  drehung: 0, viereck: STANDARD_VIERECK, doppelseite: true, bund: 0.5, farbig: false, finger: true, glaetten: true, randAuto: true,
};
const GANZES_BILD: Viereck = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];

/** Das Buch in einem Foto suchen (verkleinert, wie in der Vorschau der Kamera). */
async function randImBild(bild: Blob, doppel: boolean): Promise<Viereck | null> {
  try {
    const bmp = await createImageBitmap(bild);
    const f = Math.min(1, 800 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bmp.width * f));
    c.height = Math.max(1, Math.round(bmp.height * f));
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    ctx.drawImage(bmp, 0, 0, c.width, c.height);
    bmp.close();
    const daten = ctx.getImageData(0, 0, c.width, c.height).data;
    return seitenFinden({ breite: c.width, hoehe: c.height, daten }, { doppel });
  } catch {
    return null;
  }
}
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
  const { toast } = useToast();
  const [sitzung, setSitzung] = useState<Sitzung | null>(null);
  const sitzungRef = useRef<Sitzung | null>(null);
  sitzungRef.current = sitzung;
  const [bilder, setBilder] = useState<Map<string, string>>(new Map());
  const [inArbeit, setInArbeit] = useState(0);
  const [weicheZeigen, setWeicheZeigen] = useState(false);
  // Am Handy läuft die Kamera im Vollbild: Dort verdeckt das Kamerabild sonst
  // alle Knöpfe. Ausserhalb steht statt der Vorschau nur ein Knopf, damit die
  // Seitenliste zu sehen ist.
  const [istHandy] = useState(() => {
    try { return window.matchMedia("(pointer: coarse) and (max-width: 900px)").matches; } catch { return false; }
  });
  const [vollbild, setVollbild] = useState(istHandy);
  const [zuschneiden, setZuschneiden] = useState<{ aufnahmeId: string; roh: Blob; zuschnitt: Zuschnitt } | null>(null);
  const [lauf, setLauf] = useState<{ schritt: Schritt; anteil: number } | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [fertig, setFertig] = useState<{ name: string; eingang: boolean; markdown?: string } | null>(null);
  /** Die nächste Aufnahme ersetzt diese Seite(n); `doppelVorher` stellt die Einstellung danach wieder her. */
  const [ersetzen, setErsetzen] = useState<(ErsetzenZiel & { text: string; doppelVorher: boolean }) | null>(null);
  const ersetzenRef = useRef(ersetzen);
  ersetzenRef.current = ersetzen;
  /** Kurz hervorgehoben (und ins Bild gerollt): die gerade ersetzte Aufnahme. */
  const [markiert, setMarkiert] = useState<string | null>(null);
  /** Die letzte Aufnahme ist unscharf: in der Kamera gleich anbieten, sie zu ersetzen. */
  const [warnung, setWarnung] = useState<{ aufnahmeId: string; text: string } | null>(null);
  const kette = useRef<Promise<void>>(Promise.resolve());
  const speicherFehler = useRef(false);
  const glaettHinweis = useRef(false);

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

  const ocr = useTexterkennung(sitzung, (schrift) => aendern((s) => ({ ...s, schrift })), (id, grad) => kopfstand(id, grad));

  const zuschnittSetzen = useCallback((z: Zuschnitt) => {
    aendern((s) => ({ ...s, zuschnitt: z }));
    try { localStorage.setItem(ZUSCHNITT_MERKER, JSON.stringify(z)); } catch { /* ohne Merker */ }
  }, [aendern]);

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
    const { seiten: fertige, hinweis } = await seitenAusAufnahme(roh, zuschnitt);
    if (hinweis && !glaettHinweis.current) {
      glaettHinweis.current = true;
      setFehler(hinweis);
    }
    const seiten = [];
    const paare: [string, Blob][] = [];
    for (const f of fertige) {
      const bildId = neueKennung();
      await dateiSpeichern(bildId, f.bild);
      paare.push([bildId, f.bild]);
      seiten.push({ id: neueKennung(), bildId, breite: f.breite, hoehe: f.hoehe, befund: f.befund });
    }
    bilderMerken(paare);
    return seiten;
  };

  /** `vorher`: den Zuschnitt erst in der Reihe bestimmen (Rand eines übernommenen Fotos). */
  const aufnahmeHinzufuegen = (roh: Blob, zuschnittFest: Zuschnitt, vorher?: (z: Zuschnitt) => Promise<Zuschnitt>) => {
    setInArbeit((n) => n + 1);
    kette.current = kette.current.then(async () => {
      try {
        const zuschnitt = vorher ? await vorher(zuschnittFest) : zuschnittFest;
        const rohId = neueKennung();
        await dateiSpeichern(rohId, roh);
        const seiten = await seitenMachen(roh, zuschnitt);
        const id = neueKennung();
        aendern((s) => ({ ...s, aufnahmen: [...s.aufnahmen, { id, rohId, zuschnitt, seiten }] }));
        if (seiten.some((x) => seitePruefen(x.befund, undefined).gruende.includes("unscharf"))) {
          setWarnung({ aufnahmeId: id, text: seiten.length > 1 ? "Letzte Aufnahme unscharf" : "Letzte Seite unscharf" });
        }
      } catch (err) {
        setFehler(`Eine Aufnahme liess sich nicht verarbeiten: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setInArbeit((n) => n - 1);
      }
    });
  };

  /** Eine neue Aufnahme an die Stelle einer alten (oder einer ihrer Seiten) setzen. */
  const aufnahmeErsetzen = (roh: Blob, zuschnittFest: Zuschnitt, ziel: ErsetzenZiel, vorher?: (z: Zuschnitt) => Promise<Zuschnitt>) => {
    setInArbeit((n) => n + 1);
    kette.current = kette.current.then(async () => {
      try {
        const zuschnitt = vorher ? await vorher(zuschnittFest) : zuschnittFest;
        const rohId = neueKennung();
        await dateiSpeichern(rohId, roh);
        const seiten = await seitenMachen(roh, zuschnitt);
        const neu: Aufnahme = { id: neueKennung(), rohId, zuschnitt, seiten };
        const s = sitzungRef.current;
        const e = s ? ersetzenIn(s.aufnahmen, ziel, neu) : null;
        if (!e) {
          // Inzwischen gelöscht: dann eben hinten anhängen.
          aendern((x) => ({ ...x, aufnahmen: [...x.aufnahmen, neu] }));
          return;
        }
        aendern((x) => ({ ...x, aufnahmen: ersetzenIn(x.aufnahmen, ziel, neu)?.aufnahmen ?? x.aufnahmen }));
        setMarkiert(neu.id);
        if (e.weg.aufnahme) await dateiLoeschen(e.weg.aufnahme.rohId);
        for (const w of e.weg.seiten) { await dateiLoeschen(w.bildId); await textLoeschen(w.id); }
        bilderVergessen(e.weg.seiten.map((w) => w.bildId));
      } catch (err) {
        setFehler(`Die neue Aufnahme liess sich nicht verarbeiten: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setInArbeit((n) => n - 1);
      }
    });
  };

  /** Seite(n) neu aufnehmen: Kamera auf, die nächste Aufnahme ersetzt sie. */
  const ersetzenStarten = (aufnahmeId: string, seiteId?: string) => {
    const s = sitzungRef.current;
    const a = s?.aufnahmen.find((x) => x.id === aufnahmeId);
    if (!s || !a) return;
    const ziel = { aufnahmeId, seiteId: a.seiten.length > 1 ? seiteId : undefined };
    setErsetzen({ ...ziel, text: seitenBezeichnung(s.aufnahmen, ziel), doppelVorher: s.zuschnitt.doppelseite });
    // Eine Seite einer Doppelseite nimmt man einzeln auf, eine ganze Aufnahme so wie zuvor.
    zuschnittSetzen({ ...s.zuschnitt, doppelseite: !ziel.seiteId && a.seiten.length > 1 });
    if (istHandy) setVollbild(true);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const ersetzenBeenden = () => {
    const e = ersetzenRef.current;
    const z = sitzungRef.current?.zuschnitt;
    setErsetzen(null);
    if (e && z && z.doppelseite !== e.doppelVorher) zuschnittSetzen({ ...z, doppelseite: e.doppelVorher });
  };

  const vonKamera = useCallback((roh: Blob) => {
    setWarnung(null);
    const z = sitzungRef.current?.zuschnitt ?? STANDARD_ZUSCHNITT;
    const e = ersetzenRef.current;
    if (e) {
      aufnahmeErsetzen(roh, z, e);
      ersetzenBeenden();
      // Zurück zur Liste, damit man die neue Seite gleich sieht.
      if (istHandy) setTimeout(() => setVollbild(false), 700);
      return;
    }
    aufnahmeHinzufuegen(roh, z);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Die Warnung verschwindet nach einer Weile von selbst.
  useEffect(() => {
    if (!warnung) return;
    const t = setTimeout(() => setWarnung(null), 12000);
    return () => clearTimeout(t);
  }, [warnung]);

  // Die ersetzte Aufnahme ins Bild rollen und kurz hervorheben.
  useEffect(() => {
    if (!markiert || vollbild) return;
    const t = setTimeout(() => document.getElementById(`aufnahme-${markiert}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
    const aus = setTimeout(() => setMarkiert(null), 4000);
    return () => { clearTimeout(t); clearTimeout(aus); };
  }, [markiert, vollbild]);

  /**
   * Bilder von aussen: Fotos aus der Kamera-App, Seiten aus der Software
   * eines Buchscanners. Fotos werden auf das Buch zugeschnitten, Seiten
   * eines Scanners nicht; geteilt wird nur, wenn „Doppelseite"
   * eingeschaltet ist. Nach Dateinamen sortiert, so wie Scanner und
   * Kameras sie durchzählen.
   */
  /**
   * `glaetten`: Fotos aus der Kamera-App ja (wie eingestellt), Seiten aus
   * der Software eines Buchscanners nein – die hat schon geglättet.
   */
  const bildVonAussen = (d: File, glaetten?: boolean) => {
    const z = sitzungRef.current?.zuschnitt ?? STANDARD_ZUSCHNITT;
    const zuschnitt: Zuschnitt = { ...z, drehung: 0, viereck: GANZES_BILD, glaetten: glaetten ?? z.glaetten };
    // Fotos (nicht die Seiten eines Buchscanners): Das Buch im Bild suchen
    // und zuschneiden – Tisch und Nachbarseite fallen weg. Findet sich
    // nichts Sicheres (etwa ein schon zugeschnittenes Bild), bleibt es ganz.
    const vorher = glaetten === undefined ? async (x: Zuschnitt) => ({ ...x, viereck: (await randImBild(d, x.doppelseite)) ?? GANZES_BILD }) : undefined;
    // Wartet eine Seite auf Ersatz, nimmt das erste Bild ihren Platz ein.
    const e = ersetzenRef.current;
    if (e) {
      aufnahmeErsetzen(d, zuschnitt, e, vorher);
      ersetzenBeenden();
      return;
    }
    aufnahmeHinzufuegen(d, zuschnitt, vorher);
  };

  const bilderUebernehmen = (dateien: FileList | null) => {
    if (!dateien?.length) return;
    [...dateien]
      .filter((d) => d.type.startsWith("image/"))
      .sort((a, b) => nachName(a.name, b.name))
      .forEach((d) => bildVonAussen(d));
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

  /** Eine Aufnahme mit anderem Zuschnitt neu verarbeiten; die alten Seiten gehen. */
  const aufnahmeNeu = (aufnahmeId: string, z: Zuschnitt, extra: Partial<Aufnahme> = {}) => {
    setInArbeit((n) => n + 1);
    kette.current = kette.current.then(async () => {
      try {
        const alt = sitzungRef.current?.aufnahmen.find((a) => a.id === aufnahmeId);
        if (!alt) return;
        const roh = await dateiLaden(alt.rohId);
        if (!roh) throw new Error("Das ursprüngliche Bild fehlt im Zwischenspeicher.");
        const seiten = await seitenMachen(roh, z);
        aendern((s) => ({
          ...s,
          aufnahmen: s.aufnahmen.map((a) => (a.id === aufnahmeId ? { ...a, ...extra, zuschnitt: z, seiten } : a)),
        }));
        for (const s of alt.seiten) { await dateiLoeschen(s.bildId); await textLoeschen(s.id); }
        bilderVergessen(alt.seiten.map((s) => s.bildId));
      } catch (err) {
        setFehler(`Neu verarbeiten ging nicht: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setInArbeit((n) => n - 1);
      }
    });
  };

  const zuschneidenUebernehmen = (z: Zuschnitt) => {
    const auftrag = zuschneiden;
    setZuschneiden(null);
    if (auftrag) aufnahmeNeu(auftrag.aufnahmeId, z);
  };

  /**
   * Die Texterkennung meldet: Diese Aufnahme steht auf dem Kopf (oder quer).
   * Sie wird gedreht neu verarbeitet – und wenn die Kamera noch so steht wie
   * bei dieser Aufnahme, dreht auch der Zuschnitt für die nächsten Seiten mit.
   * Je Aufnahme nur einmal, auch wenn beide Hälften einer Doppelseite melden.
   */
  const kopfstand = useCallback((aufnahmeId: string, grad: 90 | 180 | 270) => {
    const s = sitzungRef.current;
    const a = s?.aufnahmen.find((x) => x.id === aufnahmeId);
    if (!s || !a || a.ausgerichtet) return;
    aendern((x) => ({ ...x, aufnahmen: x.aufnahmen.map((y) => (y.id === aufnahmeId ? { ...y, ausgerichtet: true } : y)) }));
    aufnahmeNeu(aufnahmeId, zuschnittDrehen(a.zuschnitt, grad), { ausgerichtet: true });
    // Lag nur der Text dieser Seite quer (von der Aufbereitung gedreht), gilt
    // das nicht für die Kamera.
    const nurDieSeite = a.seiten.some((x) => x.befund?.quer);
    if (!nurDieSeite && s.zuschnitt.drehung === a.zuschnitt.drehung) {
      zuschnittSetzen({ ...zuschnittDrehen(s.zuschnitt, grad), drehungVersatz: ((s.zuschnitt.drehungVersatz ?? 0) + grad) % 360 });
      toast({
        title: grad === 180 ? "Die Seiten standen auf dem Kopf" : "Die Seiten lagen quer",
        description: "Gedreht – auch für die nächsten Aufnahmen. Mit „Drehen“ lässt es sich ändern.",
      });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const alleDrehen = () => {
    const s = sitzungRef.current;
    if (!s) return;
    for (const a of s.aufnahmen) aufnahmeNeu(a.id, zuschnittDrehen(a.zuschnitt, 180), { ausgerichtet: true });
    zuschnittSetzen({ ...zuschnittDrehen(s.zuschnitt, 180), drehungVersatz: ((s.zuschnitt.drehungVersatz ?? 0) + 180) % 360 });
  };

  /**
   * Eine einzelne Seite um 90° drehen – etwa eine Tafel, die quer im Buch
   * steht. Gedreht wird das fertige Seitenbild; der Text wird neu gelesen.
   * Die Aufnahme gilt danach als ausgerichtet und wird nicht mehr von selbst
   * gedreht.
   */
  const seiteDrehen = (aufnahmeId: string, seiteId: string) => {
    setInArbeit((n) => n + 1);
    kette.current = kette.current.then(async () => {
      try {
        const a = sitzungRef.current?.aufnahmen.find((x) => x.id === aufnahmeId);
        const seite = a?.seiten.find((x) => x.id === seiteId);
        if (!a || !seite) return;
        const bild = await dateiLaden(seite.bildId);
        if (!bild) throw new Error("Das Bild der Seite fehlt im Zwischenspeicher.");
        const bmp = await createImageBitmap(bild);
        const c = document.createElement("canvas");
        c.width = bmp.height;
        c.height = bmp.width;
        const ctx = c.getContext("2d")!;
        ctx.translate(c.width / 2, c.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
        bmp.close();
        const neu = await new Promise<Blob>((ok, fehler) => c.toBlob((b) => (b ? ok(b) : fehler(new Error("Drehen fehlgeschlagen."))), "image/jpeg", 0.85));
        const bildId = neueKennung();
        await dateiSpeichern(bildId, neu);
        bilderMerken([[bildId, neu]]);
        aendern((s) => ({
          ...s,
          aufnahmen: s.aufnahmen.map((x) => (x.id !== aufnahmeId ? x : {
            ...x,
            ausgerichtet: true,
            seiten: x.seiten.map((y) => (y.id === seiteId ? { ...y, bildId, breite: y.hoehe, hoehe: y.breite } : y)),
          })),
        }));
        await dateiLoeschen(seite.bildId);
        bilderVergessen([seite.bildId]);
        await ocr.seiteNeu(seiteId);
      } catch (err) {
        setFehler(`Drehen ging nicht: ${err instanceof Error ? err.message : String(err)}`);
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
      const markdown = await textExport(s).then((t) => t.markdown).catch(() => undefined);
      setFertig({ name: stand.dateiName ?? s.weiche.titel, eingang: s.weiche.art === "eingang", markdown });
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

  const alleSeiten = sitzung ? seitenInReihenfolge(sitzung) : [];
  // Qualitätsprüfung über alle gelesenen Seiten, mit Seitenzahl und Aufnahme.
  const geprueft = sitzung
    ? sitzung.aufnahmen.flatMap((a) => a.seiten.map((x) => ({ aufnahmeId: a.id, pruefung: pruefungFuer(x.befund, ocr.stand[x.id]) })))
      .map((x, i) => ({ ...x, nummer: i + 1 }))
    : [];
  const zaehlung = pruefungZaehlen(geprueft.flatMap((x) => (x.pruefung ? [x.pruefung] : [])));
  const zuPruefen = geprueft.filter((x) => x.pruefung?.art === "pruefen");
  const seitenZahl = alleSeiten.length;
  const letzteSeite = alleSeiten.length ? bilder.get(alleSeiten[alleSeiten.length - 1].bildId) : undefined;

  return (
    <div className={`${SEITE} ohne-zoom`}>
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
              {fertig.markdown && (
                <a
                  href={`data:text/markdown;charset=utf-8,${encodeURIComponent(fertig.markdown)}`}
                  download={fertig.name.replace(/\.pdf$/i, "") + ".md"}
                  className="text-primary hover:underline"
                >
                  Text als Markdown
                </a>
              )}
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

          {istHandy && !vollbild && ersetzen && (
            <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary bg-primary/10 px-3 py-2 text-sm">
              <Camera size={16} className="text-primary" /> <span className="font-medium">Nächste Aufnahme ersetzt {ersetzen.text}</span>
              <button type="button" onClick={ersetzenBeenden} className="ml-auto text-muted-foreground hover:text-foreground underline">Abbrechen</button>
            </div>
          )}
          {istHandy && !vollbild ? (
            <button
              type="button"
              onClick={() => setVollbild(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-4 rounded-lg bg-primary text-primary-foreground text-base font-medium"
            >
              <Camera size={20} /> Kamera öffnen
            </button>
          ) : (
          <KameraAufnahme
            zuschnitt={sitzung.zuschnitt}
            onZuschnitt={zuschnittSetzen}
            onAufnahme={vonKamera}
            seitenZahl={seitenZahl}
            letzteSeite={letzteSeite}
            auftrag={ersetzen ? { text: `Nächste Aufnahme ersetzt ${ersetzen.text}`, onAbbrechen: ersetzenBeenden } : undefined}
            warnung={warnung && !ersetzen ? {
              text: warnung.text,
              onErsetzen: () => { const w = warnung; setWarnung(null); ersetzenStarten(w.aufnahmeId); },
              onSchliessen: () => setWarnung(null),
            } : undefined}
            vollbild={vollbild}
            onVollbild={setVollbild}
            handy={istHandy}
          />
          )}

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

          <OrdnerBeobachten onBild={(d) => bildVonAussen(d, false)} />

          {inArbeit > 0 && (
            <p className="text-sm text-muted-foreground"><Loader2 className="inline animate-spin mr-2" size={14} />{inArbeit} {inArbeit === 1 ? "Aufnahme wird" : "Aufnahmen werden"} verarbeitet …</p>
          )}

          {sitzung.aufnahmen.length > 1 && (
            <div className="flex justify-end -mb-3">
              <button
                type="button"
                onClick={alleDrehen}
                disabled={inArbeit > 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border hover:bg-muted disabled:opacity-50"
              >
                <RotateCw size={14} /> Alle Seiten um 180° drehen
              </button>
            </div>
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
              onSeiteDrehen={seiteDrehen}
              onNeuLesen={(id) => void ocr.seiteNeu(id)}
              onErsetzen={ersetzenStarten}
              ersetztWird={ersetzen?.aufnahmeId}
              ersetztSeite={ersetzen?.seiteId}
              markiert={markiert}
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
                  {zaehlung.gut + zaehlung.leer + zaehlung.pruefen > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm">
                        <span className="font-medium text-green-700 dark:text-green-400">{zaehlung.gut} {zaehlung.gut === 1 ? "Seite" : "Seiten"} gut</span>
                        {zaehlung.pruefen > 0 && <>, <span className="font-medium text-amber-700 dark:text-amber-400">{zaehlung.pruefen} prüfen</span></>}
                        {zaehlung.leer > 0 && <>, {zaehlung.leer} leer</>}
                      </p>
                      {zuPruefen.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {zuPruefen.map((x) => (
                            <button
                              key={x.nummer}
                              type="button"
                              onClick={() => setMarkiert(x.aufnahmeId)}
                              className="px-2 py-1 rounded border border-amber-500/60 bg-amber-500/10 text-xs hover:bg-amber-500/20"
                            >
                              S. {x.nummer}: {x.pruefung!.gruende.join(", ")}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  <details className="text-sm rounded-md border px-3 py-2">
                    <summary className="cursor-pointer select-none">
                      Angaben fürs PDF <span className="text-muted-foreground">(freiwillig: Autor, Jahr, Seitenzählung wie im Buch)</span>
                    </summary>
                    <div className="grid gap-3 sm:grid-cols-2 pt-3">
                      <label className="space-y-1">
                        <span className="text-xs text-muted-foreground">Autor</span>
                        <input
                          value={sitzung.angaben?.autor ?? ""}
                          onChange={(e) => aendern((x) => ({ ...x, angaben: { ...x.angaben, autor: e.target.value || undefined } }))}
                          className="w-full h-9 rounded-md border border-input bg-background px-2"
                        />
                      </label>
                      <label className="space-y-1">
                        <span className="text-xs text-muted-foreground">Jahr</span>
                        <input
                          value={sitzung.angaben?.jahr ?? ""}
                          onChange={(e) => aendern((x) => ({ ...x, angaben: { ...x.angaben, jahr: e.target.value || undefined } }))}
                          className="w-full h-9 rounded-md border border-input bg-background px-2"
                        />
                      </label>
                      <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                        <span>PDF-Seite</span>
                        <input
                          type="number" min={1} max={seitenZahl} inputMode="numeric"
                          value={sitzung.angaben?.zaehlung?.pdfSeite ?? ""}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            aendern((x) => ({ ...x, angaben: { ...x.angaben, zaehlung: n > 0 ? { pdfSeite: n, buchSeite: x.angaben?.zaehlung?.buchSeite ?? 1 } : undefined } }));
                          }}
                          className="w-20 h-9 rounded-md border border-input bg-background px-2"
                          aria-label="PDF-Seite"
                        />
                        <span>ist Seite</span>
                        <input
                          type="number" min={1} inputMode="numeric"
                          value={sitzung.angaben?.zaehlung?.buchSeite ?? ""}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            aendern((x) => ({ ...x, angaben: { ...x.angaben, zaehlung: n > 0 ? { pdfSeite: x.angaben?.zaehlung?.pdfSeite ?? 1, buchSeite: n } : x.angaben?.zaehlung } }));
                          }}
                          className="w-20 h-9 rounded-md border border-input bg-background px-2"
                          aria-label="Seite im Buch"
                        />
                        <span>im Buch.</span>
                        <span className="text-xs text-muted-foreground w-full">Die Seiten davor (Umschlag, Vorsatz) zählen römisch. Der PDF-Leser zeigt dann die Seitenzahlen des Buches.</span>
                      </div>
                    </div>
                  </details>
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
