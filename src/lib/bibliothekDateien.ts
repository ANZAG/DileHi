import { parse as yamlLesen } from "yaml";

/**
 * Den Ordner der Wissensbibliothek lesen, so wie er im Dateiordner des
 * Vereins liegt. Nur für die Pflegeseite – deshalb in einer eigenen Datei,
 * sonst lüde jede Bibliotheksseite den YAML-Leser mit.
 *
 * Standard: docs/wissensbibliothek-standard.md, Abschnitt 3 und 4.
 */

export type Art = "darstellung" | "seite" | "quelle" | "bild" | "karte";

/** In dieser Reihenfolge einspielen: Karten verweisen auf Quellen, Tafeln und Darstellungen. */
export const REIHENFOLGE: Art[] = ["darstellung", "seite", "quelle", "bild", "karte"];

export interface Eintrag {
  art: Art;
  datei: string;
  daten: Record<string, unknown>;
  text: string | null;
}

/** Kopfdaten und Text einer Markdown-Datei. */
export function dateiLesen(inhalt: string): { daten: Record<string, unknown>; text: string | null } {
  const roh = inhalt.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const m = roh.match(/^---\n([\s\S]*?)\n---[ \t]*(?:\n|$)([\s\S]*)$/);
  if (!m) throw new Error("Keine Kopfdaten (Block zwischen --- und ---) am Anfang der Datei.");
  const daten = yamlLesen(m[1]) as unknown;
  if (!daten || typeof daten !== "object" || Array.isArray(daten)) {
    throw new Error("Die Kopfdaten sind keine Liste von Feldern.");
  }
  const text = m[2].trim();
  return { daten: daten as Record<string, unknown>, text: text || null };
}

/**
 * Welche Art von Eintrag eine Datei ist, nach ihrem Ordner. Der Pfad ist
 * relativ zum Bibliotheksordner oder fängt mit dessen Namen an – beides geht.
 * Was nicht hineingehört (README, Arbeitsordner), ergibt null.
 */
export function artVon(pfad: string): Art | null {
  const teile = pfad.replace(/\\/g, "/").split("/").filter(Boolean);
  if (!teile.length || !/\.md$/i.test(teile[teile.length - 1])) return null;
  const ordner = teile.slice(0, -1);
  const i = ordner.findIndex((o) => ["darstellungen", "seiten", "quellen", "karten", "bilder"].includes(o));
  if (i < 0 || ordner.slice(i).some((o) => o.startsWith("_"))) return null;
  return ({ darstellungen: "darstellung", seiten: "seite", quellen: "quelle", karten: "karte", bilder: "bild" } as const)[
    ordner[i] as "darstellungen"
  ];
}

const BILDENDUNG = /\.(jpe?g|png|webp)$/i;

/**
 * Wie ein Bild in den Kopfdaten heisst: `bilder/becher-2018/s29.jpg` wird
 * `becher-2018/s29.jpg`. Was nicht unter bilder/<ordner>/ liegt, ergibt null.
 */
export function bildpfadVon(pfad: string): string | null {
  const teile = pfad.replace(/\\/g, "/").split("/").filter(Boolean);
  const i = teile.lastIndexOf("bilder");
  if (i < 0 || teile.length !== i + 3 || !BILDENDUNG.test(teile[i + 2])) return null;
  if (teile[i + 1].startsWith("_")) return null;
  return `${teile[i + 1]}/${teile[i + 2]}`;
}

/** Wo die Webfassung eines Bildes im Speicher liegt, und wo seine Vorschau. */
export function speicherorte(bildpfad: string): { objekt: string; vorschau: string } {
  const ohneEndung = bildpfad.replace(BILDENDUNG, "");
  return { objekt: `${ohneEndung}.webp`, vorschau: `_vorschau/${ohneEndung}.webp` };
}

/** Lange Kante der Webfassung. Kleinere Bilder bleiben, wie sie sind. */
export const WEB_KANTE = 2000;
/** Lange Kante der Vorschau in Listen. */
export const VORSCHAU_KANTE = 600;
