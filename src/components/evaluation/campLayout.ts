import type { TentItem } from "./TentVisualizer";

/**
 * Anordnung des Lagers.
 *
 * Vorher war das ein Packproblem: Alle Breiten in 0,5-m-Schritten durchprobieren
 * und je Breite komplett neu packen, um die kleinste Grundfläche zu finden. Für
 * ein normales Lager mit 20 Zelten waren das rund 25 Millionen Rechenschritte –
 * synchron im Render, bei jeder Änderung neu, auch beim Drücken der Plus-Taste
 * am Zelt-Abstand.
 *
 * Dabei ist es gar kein Packproblem, sondern ein Zonenproblem: Die Küche gehört
 * nach links, die Versorgung daneben, das Gruppenzelt vorne in die Mitte, die
 * Schlafzelte drumherum. Wer das direkt umsetzt, braucht keine Suche über alle
 * Breiten – und bekommt obendrein die Anordnung, die vorher nur behauptet war.
 * Die alte Fassung zentrierte das Gruppenzelt gegen die Höhe der Küchenspalte
 * statt gegen den Platz; es landete bei etwa einem Viertel der Breite.
 */

/** Wo eine Zeltart im Lager steht. */
export type ZonePlacement =
  | "left-front"    // linke Kante, vorne beginnend (Küche)
  | "left-follow"   // linke Kante, unter der vorherigen Zone (Versorgung)
  | "center-front"  // waagerecht mittig, vorne am Weg (Gruppenzelt)
  | "around";       // ringsum, so nah wie möglich an der Mitte

export interface LayoutProfile {
  /** Kategorie → Platzierung. Kategorien ohne Eintrag werden wie "around" behandelt. */
  zones: Record<string, ZonePlacement>;
  /** Verhältnis Breite zu Höhe des angestrebten Platzes. */
  aspect: number;
}

/**
 * Voreinstellung – entspricht der Aufstellung von Diu lebendec Histôrje.
 * Für die eigenständige Fassung kommt das aus den Vereinseinstellungen; die
 * Kategorien heißen deshalb bewusst allgemein und nicht nach unseren Zelten.
 */
export const DEFAULT_LAYOUT_PROFILE: LayoutProfile = {
  zones: {
    kitchen: "left-front",
    supply: "left-follow",
    group_tent: "center-front",
    member: "around",
  },
  aspect: 4 / 3,
};

interface Rect { x: number; y: number; w: number; h: number }

const overlaps = (a: Rect, b: Rect, eps = 0.001) =>
  a.x < b.x + b.w - eps && a.x + a.w > b.x + eps &&
  a.y < b.y + b.h - eps && a.y + a.h > b.y + eps;

const uniqueSorted = (values: number[]) => {
  const out: number[] = [];
  for (const v of [...values].sort((a, b) => a - b)) {
    if (out.length === 0 || Math.abs(out[out.length - 1] - v) > 0.001) out.push(v);
  }
  return out;
};

/**
 * Verteilt die Zelte auf dem Platz. Verändert die x/y-Werte der übergebenen
 * Objekte – so wie die bisherige Fassung auch.
 */
export function layoutCamp(
  items: TentItem[],
  profile: LayoutProfile = DEFAULT_LAYOUT_PROFILE
): void {
  if (items.length === 0) return;

  const placementOf = (item: TentItem): ZonePlacement =>
    profile.zones[item.category] ?? "around";

  const leftFront = items.filter((i) => placementOf(i) === "left-front");
  const leftFollow = items.filter((i) => placementOf(i) === "left-follow");
  const centerFront = items.filter((i) => placementOf(i) === "center-front");
  // Große Zelte zuerst: Sie finden später schlechter einen Platz.
  const around = items
    .filter((i) => placementOf(i) === "around")
    .sort((a, b) => b.w * b.h - a.w * a.h);

  // ── Angestrebte Platzbreite einmal abschätzen ────────────────────────────
  // Zelte stehen nie lückenlos; der Zuschlag bildet die Wege dazwischen ab.
  const totalArea = items.reduce((sum, t) => sum + t.w * t.h, 0) * 1.25;
  const widest = Math.max(...items.map((t) => t.w));
  const fieldWidth = Math.max(Math.sqrt(totalArea * profile.aspect), widest);

  const placed: Rect[] = [];

  // ── Linke Spalte: Küche, darunter die Versorgung ─────────────────────────
  let leftY = 0;
  let leftW = 0;
  for (const item of [...leftFront, ...leftFollow]) {
    item.x = 0;
    item.y = leftY;
    leftY += item.h;
    leftW = Math.max(leftW, item.w);
    placed.push({ x: item.x, y: item.y, w: item.w, h: item.h });
  }

  // ── Gruppenzelt: waagerecht mittig, vorne am Weg ─────────────────────────
  // Nur die X-Achse wird zentriert. In der Y-Achse steht es vorne, damit es
  // vom Weg aus erreichbar ist.
  for (const item of centerFront) {
    const centered = (fieldWidth - item.w) / 2;
    // Nicht in die Küchenspalte hineinragen.
    item.x = Math.max(centered, leftW);
    item.y = 0;
    placed.push({ x: item.x, y: item.y, w: item.w, h: item.h });
  }

  if (around.length === 0) return;

  // ── Alles Übrige ringsum, so nah wie möglich an der Mitte ────────────────
  // Bezugspunkt ist das Gruppenzelt, ersatzweise die Mitte des Platzes.
  const anchor = centerFront[0]
    ? { x: centerFront[0].x + centerFront[0].w / 2, y: centerFront[0].y + centerFront[0].h / 2 }
    : { x: fieldWidth / 2, y: 0 };

  for (const item of around) {
    // Mögliche Ecken: Kanten aller bereits gesetzten Zelte plus der Rand.
    const xs = uniqueSorted([0, ...placed.flatMap((r) => [r.x, r.x + r.w])]);
    const ys = uniqueSorted([0, ...placed.flatMap((r) => [r.y, r.y + r.h])]);

    let best: { x: number; y: number; score: number } | null = null;

    for (const x of xs) {
      // Über den angestrebten Rand hinaus nur, wenn es nicht anders geht.
      const overhang = Math.max(0, x + item.w - fieldWidth);
      for (const y of ys) {
        const candidate: Rect = { x, y, w: item.w, h: item.h };
        if (placed.some((r) => overlaps(candidate, r))) continue;

        const cx = x + item.w / 2;
        const cy = y + item.h / 2;
        const distance = Math.hypot(cx - anchor.x, cy - anchor.y);
        // Überhang wiegt schwer, damit der Platz nicht ausfranst.
        const score = distance + overhang * 10;

        if (!best || score < best.score - 0.001) best = { x, y, score };
      }
    }

    if (!best) {
      // Kann eigentlich nicht eintreten – die Kandidatenliste enthält immer
      // eine Stelle unterhalb von allem. Sicherheitshalber unten anhängen.
      const maxY = Math.max(0, ...placed.map((r) => r.y + r.h));
      best = { x: 0, y: maxY, score: 0 };
    }

    item.x = best.x;
    item.y = best.y;
    placed.push({ x: item.x, y: item.y, w: item.w, h: item.h });
  }
}
