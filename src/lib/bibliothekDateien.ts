import { parse as yamlLesen } from "yaml";

/**
 * Den Ordner der Wissensbibliothek lesen, so wie er in SharePoint liegt.
 * Nur für die Pflegeseite – deshalb in einer eigenen Datei, sonst lüde jede
 * Bibliotheksseite den YAML-Leser mit.
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
 * relativ zum Bibliotheksordner (`karten/PI21/PI21-0001.md`) oder fängt mit
 * dessen Namen an – beides geht.
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

const BILDENDUNG = /\.(jpe?g|png|webp|gif)$/i;

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

// ── Abgleich mit dem Ordner in SharePoint ──────────────────────────────────

/** Eine Datei, wie die Edge Function `library-files` sie meldet. */
export interface OrdnerDatei {
  id: string;
  path: string;
  size: number;
  etag: string | null;
  modified: string | null;
  width: number | null;
  height: number | null;
  /** Nur bei Markdown. */
  text?: string;
}

/** Eine Zeile für library_images. */
export interface BildZeile {
  path: string;
  item_id: string;
  etag: string | null;
  size: number;
  width: number | null;
  height: number | null;
  modified_at: string | null;
}

export interface Meldung {
  datei: string;
  meldung: string;
}

/** Die Kennung eines Eintrags: `id`, bei Seiten ersatzweise `slug`. */
export const kennungVon = (e: Eintrag) => String(e.daten.id ?? e.daten.slug ?? "");

/**
 * Was im Ordner liegt, sortiert zum Einspielen: Einträge in der richtigen
 * Reihenfolge, Bilder als Zeilen für library_images, und was nicht lesbar
 * ist. Eine Kennung, die zweimal vorkommt, gilt als Fehler – sonst gewänne
 * zufällig die zuletzt gelesene Datei.
 */
export function ordnerLesen(dateien: OrdnerDatei[]): {
  eintraege: Eintrag[];
  bilder: BildZeile[];
  fehler: Meldung[];
  uebergangen: number;
} {
  const eintraege: Eintrag[] = [];
  const bilder: BildZeile[] = [];
  const fehler: Meldung[] = [];
  let uebergangen = 0;

  for (const d of dateien) {
    const art = artVon(d.path);
    const bild = art ? null : bildpfadVon(d.path);
    if (art) {
      if (d.text == null) {
        fehler.push({ datei: d.path, meldung: "Inhalt nicht lesbar." });
        continue;
      }
      try {
        const { daten, text } = dateiLesen(d.text);
        eintraege.push({ art, datei: d.path, daten, text });
      } catch (e) {
        fehler.push({ datei: d.path, meldung: (e as Error).message });
      }
    } else if (bild) {
      bilder.push({
        path: bild, item_id: d.id, etag: d.etag, size: d.size, width: d.width, height: d.height, modified_at: d.modified,
      });
    } else {
      uebergangen++;
    }
  }

  const gesehen = new Map<string, string>();
  const eindeutig = eintraege.filter((e) => {
    const schluessel = `${e.art}:${kennungVon(e)}`;
    const frueher = gesehen.get(schluessel);
    if (frueher) {
      fehler.push({ datei: e.datei, meldung: `Dieselbe Kennung „${kennungVon(e)}“ steht schon in ${frueher}.` });
      return false;
    }
    gesehen.set(schluessel, e.datei);
    return true;
  });

  eindeutig.sort((a, b) => REIHENFOLGE.indexOf(a.art) - REIHENFOLGE.indexOf(b.art) || a.datei.localeCompare(b.datei));
  return { eintraege: eindeutig, bilder, fehler, uebergangen };
}

/**
 * Was in der Bibliothek steht, aber im Ordner nicht mehr: gelöscht oder
 * umbenannt. Entfernt wird es erst auf Nachfrage – eine Datei, die gerade
 * nicht synchronisiert ist, soll keine Karte mitnehmen.
 */
export function nichtMehrImOrdner(
  eintraege: Eintrag[],
  bestand: Partial<Record<Art, string[]>>
): { art: Art; id: string }[] {
  const da = new Set(eintraege.map((e) => `${e.art}:${kennungVon(e)}`));
  return REIHENFOLGE.flatMap((art) =>
    (bestand[art] ?? []).filter((id) => !da.has(`${art}:${id}`)).map((id) => ({ art, id }))
  );
}
