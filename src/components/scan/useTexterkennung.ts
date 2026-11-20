import { useEffect, useRef, useState } from "react";
import { ausrichtungFinden, erkennen, schriftErkennen, type Schrift } from "@/lib/scan/ocr";
import { dateiLaden, textLaden, textLoeschen, textSpeichern, type Sitzung } from "@/lib/scan/speicher";
import { seitenInReihenfolge } from "@/lib/scan/abschluss";

/**
 * Liest im Hintergrund eine Seite nach der anderen, während weiter gescannt
 * wird. Was schon gelesen ist, steht im Zwischenspeicher und wird nach einem
 * Neuladen nicht noch einmal gelesen.
 *
 * Bei „Schrift: automatisch" entscheidet die erste Seite für das ganze Buch.
 */

export type OcrZustand =
  | { zustand: "wartet" }
  | { zustand: "liest" }
  | { zustand: "fertig"; sicherheit: number; schrift: Schrift; woerter: number }
  | { zustand: "fehler"; fehler: string };

/**
 * `onKopfstand`: Eine Seite steht auf dem Kopf (oder quer) – die Aufnahme
 * soll um `grad` gedreht neu verarbeitet werden. Gefragt wird je Aufnahme
 * nur einmal (Aufnahme.ausgerichtet).
 */
export function useTexterkennung(
  sitzung: Sitzung | null,
  onSchrift: (s: Schrift) => void,
  onKopfstand?: (aufnahmeId: string, grad: 90 | 180 | 270) => void
) {
  const [stand, setStand] = useState<Record<string, OcrZustand>>({});
  const laeuft = useRef(false);
  const aktuell = useRef(sitzung);
  aktuell.current = sitzung;
  const [runde, setRunde] = useState(0);

  const seiten = sitzung ? seitenInReihenfolge(sitzung) : [];
  const schrift: Schrift | null =
    sitzung?.schriftWahl && sitzung.schriftWahl !== "auto" ? sitzung.schriftWahl : sitzung?.schrift ?? null;

  useEffect(() => {
    if (laeuft.current || !sitzung) return;
    const naechste = seiten.find((s) => !stand[s.id] || stand[s.id].zustand === "wartet");
    if (!naechste) return;
    laeuft.current = true;
    const setze = (z: OcrZustand) => setStand((alt) => ({ ...alt, [naechste.id]: z }));
    (async () => {
      try {
        const schon = await textLaden(naechste.id);
        if (schon && (!schrift || schon.schrift === schrift) && (!schon.bildId || schon.bildId === naechste.bildId)) {
          setze({ zustand: "fertig", sicherheit: schon.sicherheit, schrift: schon.schrift, woerter: schon.woerter?.length ?? 0 });
          return;
        }
        setze({ zustand: "liest" });
        const bild = await dateiLaden(naechste.bildId);
        if (!bild) throw new Error("Bild fehlt im Zwischenspeicher.");
        // Farbig gespeichert (Bildseite oder „Farbig“): zum Lesen grau und ausgeglichen.
        const b = naechste.befund;
        const lesen = { aufhellen: !!b && !!(b.farbig ?? b.bildseite) && !b.dunkel };
        const ergebnis = schrift
          ? await erkennen(bild, naechste.breite, schrift, lesen)
          : await schriftErkennen(bild, naechste.breite, lesen);
        // Wurde die Seite unterdessen gedreht oder ersetzt, gehört das
        // Ergebnis zum alten Bild – dann verwerfen und neu lesen.
        const jetzt = aktuell.current ? seitenInReihenfolge(aktuell.current).find((x) => x.id === naechste.id) : undefined;
        if (!jetzt || jetzt.bildId !== naechste.bildId) {
          setze({ zustand: "wartet" });
          return;
        }
        if (!schrift) onSchrift(ergebnis.schrift);
        await textSpeichern(naechste.id, { ...ergebnis, bildId: naechste.bildId });
        setze({ zustand: "fertig", sicherheit: ergebnis.sicherheit, schrift: ergebnis.schrift, woerter: ergebnis.woerter.length });
        const aufnahme = sitzung.aufnahmen.find((a) => a.seiten.some((x) => x.id === naechste.id));
        if (onKopfstand && aufnahme && !aufnahme.ausgerichtet) {
          const grad = await ausrichtungFinden(bild, naechste.breite, naechste.hoehe, ergebnis, lesen);
          if (grad) onKopfstand(aufnahme.id, grad);
        }
      } catch (err) {
        setze({ zustand: "fehler", fehler: err instanceof Error ? err.message : String(err) });
      } finally {
        laeuft.current = false;
        setRunde((r) => r + 1);
      }
    })();
    // seiten ergibt sich aus sitzung; runde stösst die nächste Seite an.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sitzung, stand, runde, schrift]);

  const offen = seiten.filter((s) => {
    const z = stand[s.id]?.zustand;
    return !z || z === "wartet" || z === "liest";
  }).length;

  /** Alle Seiten noch einmal lesen – etwa nach dem Wechsel der Schrift. */
  const alleNeu = async () => {
    for (const s of seiten) await textLoeschen(s.id);
    setStand(Object.fromEntries(seiten.map((s) => [s.id, { zustand: "wartet" } as OcrZustand])));
  };

  /** Eine Seite neu lesen, etwa nach neuem Zuschnitt oder nach einem Fehler. */
  const seiteNeu = async (seiteId: string) => {
    await textLoeschen(seiteId);
    setStand((alt) => ({ ...alt, [seiteId]: { zustand: "wartet" } }));
  };

  return { stand, offen, alleNeu, seiteNeu };
}
