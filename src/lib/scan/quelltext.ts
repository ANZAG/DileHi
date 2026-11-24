import type { TextTreffer } from "@/daten/quellen";

/**
 * Der Text der Quellen (Migration 20261119100000_quelltext): Hier steht nur,
 * wie ein Fundausschnitt zerlegt wird. Ablegen und Suchen stehen in
 * `daten/quellen.ts`.
 */

export type { TextTreffer };

/** Einen Ausschnitt in Stücke zerlegen: [Text, ist Treffer]. */
export function ausschnittTeile(snippet: string): [string, boolean][] {
  const teile: [string, boolean][] = [];
  for (const stueck of snippet.split("⟦")) {
    const [treffer, rest] = stueck.includes("⟧") ? stueck.split("⟧", 2) : [null, stueck];
    if (treffer !== null) teile.push([treffer, true]);
    if (rest) teile.push([rest, false]);
  }
  return teile;
}
