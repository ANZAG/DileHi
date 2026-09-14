import type { Election, ElectionResult } from "@/components/elections/types";

/**
 * Ergebnisse von Abstimmungen als Bild – fürs Protokoll.
 *
 * Gezeichnet wird auf ein Canvas, nicht ein Stück der Seite abfotografiert.
 * Ein Bildschirmfoto hinge an Fensterbreite, dunklem Modus, aufgeklappten
 * Karten und daran, ob die Schrift schon geladen ist; im Protokoll soll das
 * Ergebnis aber immer gleich aussehen. Hier bestimmt nur, was abgestimmt
 * wurde, wie das Bild aussieht – dazu Vereinsname, Vereinsfarbe und
 * Schriften aus dem Erscheinungsbild.
 *
 * Aufgeteilt in die Daten (ergebnisVon, dateiname – ohne Browser prüfbar) und
 * das Zeichnen.
 */

export interface Zeile {
  name: string;
  stimmen: number;
  prozent: number;
}

export interface Ergebnis {
  titel: string;
  beschreibung: string | null;
  geschlossenAm: string | null;
  abgegeben: number;
  /** null, wenn die Zahl der möglichen Stimmen nicht bekannt ist. */
  moeglich: number | null;
  zeilen: Zeile[];
}

export interface Ergebnisbild {
  verein: string;
  /** Das Thema, etwa „JHV 2026". Bei einer einzelnen Abstimmung ohne Thema null. */
  thema: string | null;
  ergebnisse: Ergebnis[];
}

export interface Stil {
  farbe: string;
  schriftTitel: string;
  schriftText: string;
}

/**
 * Das Ergebnis einer Abstimmung, so wie es ins Protokoll gehört.
 *
 * Nur für geschlossene Abstimmungen: Solange abgestimmt wird, darf kein
 * Zwischenstand den Raum verlassen. Optionen ohne Stimme stehen mit null
 * Stimmen darin – „Nein: 0" ist ein Ergebnis, eine fehlende Zeile nicht.
 */
export function ergebnisVon(
  wahl: Election,
  ergebnisse: ElectionResult[],
  moeglicheStimmen: number | null
): Ergebnis | null {
  if (wahl.status !== "closed") return null;

  const eigene = ergebnisse.filter((r) => r.election_id === wahl.id);
  const stimmenVon = new Map(eigene.map((r) => [r.candidate_id, r.vote_count]));

  const zeilen = [
    ...(wahl.candidates ?? []).map((k) => ({ name: k.name, stimmen: stimmenVon.get(k.id) ?? 0 })),
    // Stimmen für eine Option, die es in der Liste nicht mehr gibt, fallen
    // nicht unter den Tisch.
    ...eigene
      .filter((r) => !(wahl.candidates ?? []).some((k) => k.id === r.candidate_id))
      .map((r) => ({ name: r.candidate_name, stimmen: r.vote_count })),
  ];

  const abgegeben = zeilen.reduce((summe, z) => summe + z.stimmen, 0);

  return {
    titel: wahl.title,
    beschreibung: wahl.description,
    geschlossenAm: wahl.closed_at ? datumUndZeit(wahl.closed_at) : null,
    abgegeben,
    // Ältere Abstimmungen ohne Thema kennen keine Zahl möglicher Stimmen –
    // „11 von 1 möglichen Stimmen" wäre schlicht falsch.
    moeglich: moeglicheStimmen != null && moeglicheStimmen >= abgegeben ? moeglicheStimmen : null,
    zeilen: zeilen
      .map((z) => ({ ...z, prozent: abgegeben > 0 ? Math.round((z.stimmen / abgegeben) * 100) : 0 }))
      .sort((a, b) => b.stimmen - a.stimmen || a.name.localeCompare(b.name, "de")),
  };
}

/** Ein Dateiname, den jedes Betriebssystem annimmt. */
export function dateiname(bild: Ergebnisbild): string {
  const grundlage = bild.thema ?? bild.ergebnisse[0]?.titel ?? "Abstimmung";
  const sauber = grundlage
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80)
    .trim();
  return `Ergebnis ${sauber || "Abstimmung"}.png`;
}

/** „1 Stimme", „0 Stimmen", „11 Stimmen" – im Protokoll fällt ein falsches Plural auf. */
export function stimmen(anzahl: number): string {
  return anzahl === 1 ? "1 Stimme" : `${anzahl} Stimmen`;
}

function datumUndZeit(iso: string): string {
  const d = new Date(iso);
  const datum = d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  const zeit = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${datum}, ${zeit} Uhr`;
}

// ── Zeichnen ────────────────────────────────────────────────────────────────

const BREITE = 1200;
const RAND = 64;
const FARBEN = {
  grund: "#ffffff",
  text: "#1c1917",
  leise: "#6b645c",
  balkenGrund: "#ece7df",
  linie: "#e5e0d8",
};

function schrift(gewicht: number, groesse: number, familie: string, serif: boolean): string {
  return `${gewicht} ${groesse}px "${familie}", ${serif ? "Georgia, serif" : "system-ui, sans-serif"}`;
}

/** Zeilen umbrechen, damit lange Fragen nicht aus dem Bild laufen. */
function umbrechen(ctx: CanvasRenderingContext2D, text: string, breite: number): string[] {
  const zeilen: string[] = [];
  let zeile = "";
  for (const wort of text.split(/\s+/).filter(Boolean)) {
    const probe = zeile ? `${zeile} ${wort}` : wort;
    if (ctx.measureText(probe).width <= breite) {
      zeile = probe;
      continue;
    }
    if (zeile) zeilen.push(zeile);
    // Ein einzelnes Wort, das allein zu lang ist, wird hart geteilt.
    let rest = wort;
    while (ctx.measureText(rest).width > breite && rest.length > 1) {
      let n = rest.length - 1;
      while (n > 1 && ctx.measureText(rest.slice(0, n)).width > breite) n--;
      zeilen.push(rest.slice(0, n));
      rest = rest.slice(n);
    }
    zeile = rest;
  }
  if (zeile) zeilen.push(zeile);
  return zeilen.length > 0 ? zeilen : [""];
}

function abgerundet(ctx: CanvasRenderingContext2D, x: number, y: number, b: number, h: number, r: number) {
  const radius = Math.min(r, b / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + b, y, x + b, y + h, radius);
  ctx.arcTo(x + b, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + b, y, radius);
  ctx.closePath();
  ctx.fill();
}

/**
 * Einmal zum Messen, einmal zum Zeichnen – dieselbe Rechnung, damit die Höhe
 * des Bildes genau zum Inhalt passt. Gibt die Höhe zurück.
 */
function ablauf(ctx: CanvasRenderingContext2D, bild: Ergebnisbild, stil: Stil, zeichnen: boolean): number {
  const innen = BREITE - 2 * RAND;
  const farbe = /^#[0-9a-f]{6}$/i.test(stil.farbe) ? stil.farbe : "#dd9933";
  let y = RAND;

  const text = (inhalt: string, x: number, font: string, fuellung: string, ausrichtung: CanvasTextAlign = "left") => {
    if (!zeichnen) return;
    ctx.font = font;
    ctx.fillStyle = fuellung;
    ctx.textAlign = ausrichtung;
    ctx.fillText(inhalt, x, y);
  };
  const absatz = (inhalt: string, font: string, fuellung: string, zeilenhoehe: number, breite = innen) => {
    ctx.font = font;
    for (const zeile of umbrechen(ctx, inhalt, breite)) {
      text(zeile, RAND, font, fuellung);
      y += zeilenhoehe;
    }
  };
  const linie = () => {
    if (!zeichnen) return;
    ctx.fillStyle = FARBEN.linie;
    ctx.fillRect(RAND, y, innen, 2);
  };

  ctx.textBaseline = "top";

  // Kopf: Verein, Farbstrich, Thema
  absatz(bild.verein, schrift(600, 20, stil.schriftText, false), FARBEN.leise, 28);
  y += 8;
  if (zeichnen) {
    ctx.fillStyle = farbe;
    ctx.fillRect(RAND, y, 64, 5);
  }
  y += 29;
  if (bild.thema) {
    absatz(bild.thema, schrift(700, 44, stil.schriftTitel, true), FARBEN.text, 54);
    y += 12;
  }

  bild.ergebnisse.forEach((e, i) => {
    if (i > 0 || bild.thema) {
      y += i > 0 ? 20 : 0;
      linie();
      y += 30;
    }

    const titelGross = !bild.thema;
    absatz(
      e.titel,
      schrift(700, titelGross ? 44 : 30, stil.schriftTitel, true),
      FARBEN.text,
      titelGross ? 54 : 40
    );
    if (e.beschreibung) {
      y += 2;
      absatz(e.beschreibung, schrift(400, 20, stil.schriftText, false), FARBEN.leise, 28);
    }

    const teile = [
      e.geschlossenAm ? `Geschlossen am ${e.geschlossenAm}` : null,
      e.moeglich != null ? `${e.abgegeben} von ${e.moeglich} möglichen Stimmen` : `${stimmen(e.abgegeben)} abgegeben`,
    ].filter(Boolean);
    y += 4;
    absatz(teile.join(" · "), schrift(400, 18, stil.schriftText, false), FARBEN.leise, 26);
    y += 18;

    if (e.zeilen.length === 0) {
      absatz("Keine Optionen hinterlegt.", schrift(400, 20, stil.schriftText, false), FARBEN.leise, 28);
    }

    for (const z of e.zeilen) {
      const zahl = `${stimmen(z.stimmen)} · ${z.prozent} %`;
      const zahlFont = schrift(600, 22, stil.schriftText, false);
      ctx.font = zahlFont;
      const zahlBreite = ctx.measureText(zahl).width;
      text(zahl, RAND + innen, zahlFont, FARBEN.text, "right");
      absatz(z.name, schrift(400, 22, stil.schriftText, false), FARBEN.text, 30, innen - zahlBreite - 24);
      y += 6;
      if (zeichnen) {
        ctx.fillStyle = FARBEN.balkenGrund;
        abgerundet(ctx, RAND, y, innen, 18, 9);
        if (z.prozent > 0) {
          ctx.fillStyle = farbe;
          abgerundet(ctx, RAND, y, Math.max(18, (innen * z.prozent) / 100), 18, 9);
        }
      }
      y += 18 + 22;
    }
  });

  // Fuss: wann das Bild entstand – ein Ausdruck ohne Datum taugt im Protokoll nichts.
  y += 10;
  linie();
  y += 22;
  const heute = new Date().toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  absatz(`Stand ${heute}`, schrift(400, 16, stil.schriftText, false), FARBEN.leise, 22);

  return y + RAND - 22;
}

/** Das Bild als PNG. */
export async function alsPng(bild: Ergebnisbild, stil: Stil): Promise<Blob> {
  // Ohne das zeichnet das Canvas mit der Ersatzschrift, falls die Vereinsschrift
  // noch nicht geladen ist – und das Bild sähe beim zweiten Mal anders aus.
  try {
    await Promise.all([
      document.fonts.load(schrift(700, 44, stil.schriftTitel, true)),
      document.fonts.load(schrift(400, 22, stil.schriftText, false)),
      document.fonts.load(schrift(600, 22, stil.schriftText, false)),
    ]);
  } catch {
    // Dann eben mit der Ersatzschrift.
  }

  const messen = document.createElement("canvas").getContext("2d");
  if (!messen) throw new Error("Dieser Browser kann keine Bilder erzeugen.");
  const hoehe = Math.ceil(ablauf(messen, bild, stil, false));

  // Doppelte Auflösung für einen scharfen Ausdruck; bei sehr vielen
  // Abstimmungen einfache, sonst überschreitet das Bild die Grenze der Browser.
  const skala = hoehe * 2 > 16000 ? 1 : 2;
  const leinwand = document.createElement("canvas");
  leinwand.width = BREITE * skala;
  leinwand.height = hoehe * skala;
  const ctx = leinwand.getContext("2d");
  if (!ctx) throw new Error("Dieser Browser kann keine Bilder erzeugen.");
  ctx.scale(skala, skala);
  ctx.fillStyle = FARBEN.grund;
  ctx.fillRect(0, 0, BREITE, hoehe);
  ablauf(ctx, bild, stil, true);

  return await new Promise<Blob>((fertig, fehler) =>
    leinwand.toBlob((b) => (b ? fertig(b) : fehler(new Error("Das Bild ließ sich nicht erzeugen."))), "image/png")
  );
}

/** Bild erzeugen und herunterladen. */
export async function herunterladen(bild: Ergebnisbild, stil: Stil): Promise<void> {
  const blob = await alsPng(bild, stil);
  const adresse = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = adresse;
  a.download = dateiname(bild);
  document.body.append(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(adresse), 2000);
}
