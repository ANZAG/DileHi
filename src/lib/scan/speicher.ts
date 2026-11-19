import type { OcrErgebnis, Schrift, SchriftWahl } from "./ocr";
import type { Zuschnitt } from "./verarbeitungKern";
import type { AbschlussStand } from "./abschluss";

/**
 * Der Zwischenspeicher des Scanners im Browser (IndexedDB).
 *
 * Ein Buch zu scannen dauert. Stürzt der Browser ab, geht das Handy in den
 * Ruhezustand oder schliesst jemand aus Versehen den Reiter, soll nicht das
 * halbe Buch weg sein. Deshalb liegt jede Aufnahme sofort hier, bis das PDF
 * hochgeladen ist. Danach wird alles gelöscht.
 *
 * Drei Ablagen: `sitzung` (wo man steht, klein), `dateien` (Bilder) und
 * `text` (was die Texterkennung je Seite gefunden hat).
 */

/** Wohin der Scan gehört – die Weiche vor dem Scannen. */
export type Weiche =
  | { art: "quelle"; sourceId: string; titel: string; epoch: string }
  | { art: "neu"; titel: string; epoch: string; folderId: string | null }
  | { art: "eingang"; titel: string };

export interface ScanSeite {
  id: string;
  bildId: string;
  breite: number;
  hoehe: number;
}

export interface Aufnahme {
  id: string;
  rohId: string;
  zuschnitt: Zuschnitt;
  seiten: ScanSeite[];
}

export interface Sitzung {
  version: 1;
  weiche: Weiche | null;
  zuschnitt: Zuschnitt;
  schriftWahl: SchriftWahl;
  /** Was die Erkennung für dieses Buch gewählt hat, sobald die erste Seite gelesen ist. */
  schrift: Schrift | null;
  aufnahmen: Aufnahme[];
  /** Wie weit das Hochladen gekommen ist – für einen zweiten Versuch. */
  abschluss?: AbschlussStand;
}

const DB = "quellen-scannen";
const ABLAGEN = ["sitzung", "dateien", "text"] as const;
/**
 * `merker` bleibt über das Hochladen hinaus: der beobachtete Ordner, damit er
 * beim nächsten Buch nicht neu ausgesucht werden muss.
 */
type Ablage = (typeof ABLAGEN)[number] | "merker";

let offen: Promise<IDBDatabase> | null = null;

function oeffnen(): Promise<IDBDatabase> {
  offen ??= new Promise((ok, fehler) => {
    const anfrage = indexedDB.open(DB, 2);
    anfrage.onupgradeneeded = () => {
      for (const a of [...ABLAGEN, "merker"]) {
        if (!anfrage.result.objectStoreNames.contains(a)) anfrage.result.createObjectStore(a);
      }
    };
    anfrage.onsuccess = () => ok(anfrage.result);
    anfrage.onerror = () => fehler(anfrage.error ?? new Error("Der Zwischenspeicher lässt sich nicht öffnen."));
  });
  offen.catch(() => (offen = null));
  return offen;
}

async function auftrag<T>(ablage: Ablage, modus: IDBTransactionMode, tun: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await oeffnen();
  return new Promise((ok, fehler) => {
    const t = db.transaction(ablage, modus);
    const r = tun(t.objectStore(ablage));
    t.oncomplete = () => ok(r.result);
    t.onerror = () => fehler(t.error ?? new Error("Zwischenspeicher: Fehler beim Schreiben."));
    t.onabort = () => fehler(t.error ?? new Error("Zwischenspeicher: abgebrochen (Speicher voll?)."));
  });
}

/** Lesen ohne Ausnahme: Ohne Zwischenspeicher geht es auch, nur ohne Rettungsnetz. */
async function lesen<T>(ablage: Ablage, schluessel: string): Promise<T | undefined> {
  try {
    return (await auftrag(ablage, "readonly", (s) => s.get(schluessel))) as T | undefined;
  } catch {
    return undefined;
  }
}

export const sitzungLaden = () => lesen<Sitzung>("sitzung", "aktuell");
export const sitzungSpeichern = (s: Sitzung) => auftrag("sitzung", "readwrite", (a) => a.put(s, "aktuell"));

export const dateiLaden = (id: string) => lesen<Blob>("dateien", id);
export const dateiSpeichern = (id: string, b: Blob) => auftrag("dateien", "readwrite", (a) => a.put(b, id));
export const dateiLoeschen = (id: string) => auftrag("dateien", "readwrite", (a) => a.delete(id)).catch(() => undefined);

export const textLaden = (seiteId: string) => lesen<OcrErgebnis>("text", seiteId);
export const textSpeichern = (seiteId: string, t: OcrErgebnis) => auftrag("text", "readwrite", (a) => a.put(t, seiteId));
export const textLoeschen = (seiteId: string) => auftrag("text", "readwrite", (a) => a.delete(seiteId)).catch(() => undefined);

export const merkerLaden = <T>(schluessel: string) => lesen<T>("merker", schluessel);
export const merkerSpeichern = (schluessel: string, wert: unknown) =>
  auftrag("merker", "readwrite", (a) => a.put(wert, schluessel)).catch(() => undefined);
export const merkerLoeschen = (schluessel: string) =>
  auftrag("merker", "readwrite", (a) => a.delete(schluessel)).catch(() => undefined);

/** Alles weg – nach dem Hochladen oder wenn man neu anfängt. Der Merker bleibt. */
export async function allesLoeschen(): Promise<void> {
  for (const a of ABLAGEN) await auftrag(a, "readwrite", (s) => s.clear()).catch(() => undefined);
}

export const neueKennung = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
