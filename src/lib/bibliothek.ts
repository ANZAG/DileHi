/**
 * Wissensbibliothek: Begriffe, Beschriftungen und das Lesen der Quelldateien.
 *
 * In der Datenbank stehen englische Werte (`checked`, `internal`), in den
 * Kopfdaten der Dateien deutsche (`geprüft`, `intern`). Übersetzt wird beim
 * Einspielen in der Datenbank (library_import); hier stehen die
 * Beschriftungen. Das Lesen der Quelldateien steht in bibliothekDateien.ts,
 * damit nur die Pflegeseite den YAML-Leser lädt.
 *
 * Standard: docs/wissensbibliothek-standard.md.
 */

export type Stufe = "Q" | "F" | "A";
export type KartenStatus = "draft" | "checked" | "image_missing" | "image_replace";
export type Rechte = "free" | "internal" | "open";

export const STUFE: Record<Stufe, { kurz: string; farbe: string }> = {
  Q: { kurz: "Q", farbe: "bg-green-100 text-green-900 border-green-300" },
  F: { kurz: "F", farbe: "bg-sky-100 text-sky-900 border-sky-300" },
  A: { kurz: "A", farbe: "bg-amber-100 text-amber-900 border-amber-300" },
};

export const STATUS: Record<KartenStatus, { label: string; farbe: string }> = {
  draft: { label: "Entwurf", farbe: "bg-muted text-muted-foreground" },
  checked: { label: "Geprüft", farbe: "bg-green-100 text-green-800" },
  image_missing: { label: "Bild fehlt", farbe: "bg-amber-100 text-amber-800" },
  image_replace: { label: "Bild ersetzen", farbe: "bg-red-100 text-red-800" },
};

export const RECHTE: Record<Rechte, { label: string; farbe: string; erklaerung: string }> = {
  free: {
    label: "frei",
    farbe: "bg-green-100 text-green-800",
    erklaerung: "Darf vollständig in die Bibliothek und später in die PDF-Fassung.",
  },
  internal: {
    label: "intern",
    farbe: "bg-amber-100 text-amber-800",
    erklaerung: "Nur im Verein zeigen, nicht weitergeben und nicht veröffentlichen.",
  },
  open: {
    label: "offen",
    farbe: "bg-red-100 text-red-800",
    erklaerung: "Rechtslage nicht geklärt. Nur die zitierten Seiten, nur intern.",
  },
};

export const BEREICHE = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

/**
 * Kennungen im Text als Markdown-Links: Karten („PI21-0042") und Bildtafeln
 * („PI21-T27"). Bestehende Links und Code bleiben, wie sie sind.
 */
export function kartenVerlinken(text: string): string {
  return text.replace(/(\[[^\]]*\]\([^)]*\)|`[^`]*`)|\b([A-Z][A-Z0-9]{1,9}-(\d{4}|T\d+))\b/g, (ganz, geschuetzt, id, nummer) =>
    geschuetzt ? ganz : `[${id}](/intern/bibliothek/${nummer.startsWith("T") ? "tafel" : "karte"}/${id})`
  );
}
