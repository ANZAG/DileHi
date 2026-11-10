import { parse as yamlLesen } from "yaml";
import { KERNSATZ_HINWEIS, abschnitt, abschnitte, hintergrundOhneBeleg, kennungenImText } from "@/lib/bibliothek";

/**
 * Den Ordner der Wissensbibliothek lesen, so wie er in SharePoint liegt.
 * Nur für die Pflegeseite – deshalb in einer eigenen Datei, sonst lüde jede
 * Bibliotheksseite den YAML-Leser mit.
 *
 * Standard: docs/wissensbibliothek-standard.md, Abschnitt 3 und 4.
 */

export type Art = "darstellung" | "seite" | "quelle" | "bild" | "thema" | "karte";

/**
 * In dieser Reihenfolge einspielen: Karten verweisen auf Quellen, Tafeln und
 * Darstellungen, Themenseiten auf die Darstellung (Kapitel). Dass Karten auf
 * Themenseiten zeigen und umgekehrt, prüft erst die Warnliste – dafür ist die
 * Reihenfolge gleich.
 */
export const REIHENFOLGE: Art[] = ["darstellung", "seite", "quelle", "bild", "thema", "karte"];

/** Der Ordner mit Entwürfen von Themenseiten. Nur auf ausdrücklichen Wunsch eingelesen. */
export const ENTWURFSORDNER = "_themen_entwurf";

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
  const i = ordner.findIndex((o) => ["darstellungen", "seiten", "quellen", "karten", "bilder", "themen"].includes(o));
  if (i < 0 || ordner.slice(i).some((o) => o.startsWith("_"))) return null;
  return ({
    darstellungen: "darstellung", seiten: "seite", quellen: "quelle", karten: "karte", bilder: "bild", themen: "thema",
  } as const)[ordner[i] as "darstellungen"];
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
export function ordnerLesen(dateien: OrdnerDatei[], { entwuerfe = false }: { entwuerfe?: boolean } = {}): {
  eintraege: Eintrag[];
  bilder: BildZeile[];
  fehler: Meldung[];
  uebergangen: number;
} {
  const eintraege: Eintrag[] = [];
  const bilder: BildZeile[] = [];
  const fehler: Meldung[] = [];
  let uebergangen = 0;

  for (const roh of dateien) {
    // Entwürfe von Themenseiten zählen wie themen/, wenn sie ausdrücklich
    // mit eingelesen werden; sonst bleiben sie wie jeder _-Ordner draussen.
    const d = entwuerfe && roh.path.startsWith(`${ENTWURFSORDNER}/`)
      ? { ...roh, path: `themen/${roh.path.slice(ENTWURFSORDNER.length + 1)}` }
      : roh;
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

// ── Warnungen ───────────────────────────────────────────────────────────────

/** Was es in der Bibliothek schon gibt – zusammen mit dem Ordner der Massstab für Verweise. */
export interface Bestand {
  karten: string[];
  tafeln: string[];
  themen: string[];
  darstellungen: { id: string; levels: string[]; roles: { id: string }[] }[];
  /** Bildpfade im Ordner oder in der Bibliothek – für `bild` der Darstellung. */
  bilder?: string[];
}

const liste = (v: unknown): string[] =>
  Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : v == null || v === "" ? [] : [String(v).trim()];

interface Knoten { id?: unknown; ebene?: unknown; stufe?: unknown; belege?: unknown; kinder?: unknown }
const knotenListe = (v: unknown): Knoten[] => (Array.isArray(v) ? (v as Knoten[]) : []);

/**
 * Verweise, die ins Leere zeigen. Keine Fehler: Eine Themenseite darf auf eine
 * Karte zeigen, die erst noch geschrieben wird, und eine Elternseite darf
 * fehlen. Aber wer pflegt, soll es sehen.
 */
export function warnungen(eintraege: Eintrag[], bestand: Bestand): Meldung[] {
  const ids = (art: Art) => eintraege.filter((e) => e.art === art).map(kennungVon);
  const karten = new Set([...bestand.karten, ...ids("karte")]);
  const tafeln = new Set([...bestand.tafeln, ...ids("bild")]);
  const themen = new Set([...bestand.themen, ...ids("thema")]);
  const darstellungen = new Map(bestand.darstellungen.map((d) => [d.id, { levels: d.levels, rollen: d.roles.map((r) => r.id) }]));
  const bilder = bestand.bilder ? new Set(bestand.bilder) : null;
  for (const e of eintraege.filter((x) => x.art === "darstellung")) {
    darstellungen.set(kennungVon(e), {
      levels: liste(e.daten.ebenen),
      rollen: (Array.isArray(e.daten.rollen) ? e.daten.rollen : []).map((r: { id?: unknown }) => String(r?.id ?? "")),
    });
  }

  const meldungen: Meldung[] = [];
  const melden = (e: Eintrag, text: string) => meldungen.push({ datei: e.datei, meldung: text });
  const fehlend = (art: string, wo: string, alle: string[], bekannt: Set<string>, e: Eintrag) => {
    const weg = [...new Set(alle)].filter((id) => !bekannt.has(id));
    if (weg.length) melden(e, `${wo}: ${art} ${weg.join(", ")} gibt es nicht.`);
  };
  const rollenPruefen = (e: Eintrag) => {
    const d = darstellungen.get(String(e.daten.darstellung ?? ""));
    const weg = liste(e.daten.rollen).filter((r) => !d?.rollen.includes(r));
    if (weg.length) melden(e, `rollen: ${weg.join(", ")} steht nicht bei den Rollen der Darstellung.`);
  };
  const imText = (e: Eintrag) => {
    const funde = kennungenImText(e.text);
    fehlend("Karte", "Text", funde.karte, karten, e);
    fehlend("Tafel", "Text", funde.tafel, tafeln, e);
    fehlend("Themenseite", "Text", funde.thema, themen, e);
  };

  for (const e of eintraege) {
    if (e.art === "darstellung") {
      const bild = e.daten.bild == null ? "" : String(e.daten.bild).trim();
      if (bild && bilder && !bilder.has(bild)) melden(e, `bild: ${bild} liegt nicht im Ordner bilder/.`);
    } else if (e.art === "thema") {
      const eltern = e.daten.eltern == null ? "" : String(e.daten.eltern).trim();
      if (eltern && !themen.has(eltern)) {
        melden(e, `eltern: Die Themenseite ${eltern} gibt es nicht; die Seite steht so lange oben im Kapitel.`);
      }
      fehlend("Karte", "karten", liste(e.daten.karten), karten, e);
      fehlend("Tafel", "tafeln", liste(e.daten.tafeln), tafeln, e);
      rollenPruefen(e);
      imText(e);
      if (!abschnitt(e.text, "Kurzantwort")) melden(e, "Ohne „## Kurzantwort“.");
      const fremde = abschnitte(e.text).filter((a) => a.titel && !a.name).map((a) => a.titel);
      if (fremde.length) melden(e, `Abschnitte ausserhalb des Standards: ${fremde.join(", ")}.`);
      const ohneBeleg = hintergrundOhneBeleg(abschnitt(e.text, "Historischer Hintergrund"));
      if (ohneBeleg.length) {
        const anfang = ohneBeleg[0].length > 70 ? `${ohneBeleg[0].slice(0, 70)} …` : ohneBeleg[0];
        melden(e, `Historischer Hintergrund: ${ohneBeleg.length} ${ohneBeleg.length === 1 ? "Satz" : "Sätze"} ohne Karte und ohne „(Einordnung)“, etwa „${anfang}“.`);
      }
      const rahmen = Array.isArray(e.daten.rahmen) ? (e.daten.rahmen as { karten?: unknown; rollen?: unknown }[]) : [];
      fehlend("Karte", "rahmen.karten", rahmen.flatMap((z) => liste(z?.karten)), karten, e);
      const dRollen = darstellungen.get(String(e.daten.darstellung ?? ""))?.rollen ?? [];
      const fremdeRollen = [...new Set(rahmen.flatMap((z) => liste(z?.rollen)))].filter((r) => !dRollen.includes(r));
      if (fremdeRollen.length) melden(e, `rahmen.rollen: ${fremdeRollen.join(", ")} steht nicht bei den Rollen der Darstellung.`);

      const levels = darstellungen.get(String(e.daten.darstellung ?? ""))?.levels ?? [];
      const belege: string[] = [];
      const besuchen = (knoten: Knoten[]) => {
        for (const k of knoten) {
          belege.push(...liste(k.belege));
          if (k.ebene != null && levels.length && !levels.includes(String(k.ebene))) {
            melden(e, `baum ${String(k.id ?? "?")}: Ebene „${String(k.ebene)}“ steht nicht im Vokabular.`);
          }
          if (k.stufe != null && !["Q", "F", "A", "offen"].includes(String(k.stufe))) {
            melden(e, `baum ${String(k.id ?? "?")}: stufe „${String(k.stufe)}“ ist nicht Q, F, A oder offen.`);
          }
          besuchen(knotenListe(k.kinder));
        }
      };
      besuchen(knotenListe(e.daten.baum));
      fehlend("Karte", "baum.belege", belege, karten, e);
    } else if (e.art === "karte") {
      fehlend("Themenseite", "thema", liste(e.daten.thema), themen, e);
      const kernsatz = String(e.daten.kernsatz ?? "");
      if (kernsatz.length > KERNSATZ_HINWEIS) {
        melden(e, `Kernsatz mit ${kernsatz.length} Zeichen – eine Aussage je Karte, Faustregel 120–180.`);
      }
      rollenPruefen(e);
      imText(e);
    } else if (e.art === "bild") {
      const zeigt = Array.isArray(e.daten.zeigt) ? (e.daten.zeigt as { thema?: unknown }[]) : [];
      fehlend("Themenseite", "zeigt.thema", zeigt.map((z) => String(z?.thema ?? "")).filter(Boolean), themen, e);
    }
  }
  return meldungen;
}
