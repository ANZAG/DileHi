/**
 * Koordinaten zu einem Ort nachschlagen – über Nominatim (OpenStreetMap).
 *
 * Das Nachschlagen stand dreimal im Code, jedes Mal mit anderen Ausweichfragen:
 * Die Karte fragte für ein Mitglied nur „PLZ Ort", das Profil danach noch den
 * Ort und die PLZ allein, die Veranstaltungen hatten eine eigene Folge. Dasselbe
 * Mitglied bekam so im Profil einen Punkt und auf der Karte keinen.
 *
 * Hier gibt es eine Reihenfolge für alle: von der genauesten Frage zur gröbsten,
 * auf Wunsch zuerst nur in Deutschland und erst danach weltweit.
 *
 * Nominatim erlaubt höchstens eine Anfrage je Sekunde. Deshalb laufen alle
 * Anfragen dieser Datei durch eine gemeinsame Warteschlange – auch wenn zwei
 * Stellen gleichzeitig fragen (die Karte schlägt Mitglieder und Veranstaltungen
 * nebeneinander nach). Antworten merkt sich die Datei, solange die Seite offen
 * ist: Dieselbe Frage geht nicht zweimal hinaus.
 */

export type Koordinaten = { lat: number; lng: number };

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

/** Etwas mehr als die verlangte Sekunde, damit es auch bei ungenauen Uhren reicht. */
export const MINDESTABSTAND_MS = 1100;

/** Eine Frage an Nominatim: der Suchtext und ob nur in Deutschland gesucht wird. */
export type Suchschritt = { suche: string; nurDeutschland: boolean };

export function nominatimUrl({ suche, nurDeutschland }: Suchschritt): string {
  const parameter = new URLSearchParams({ format: "json", q: suche, limit: "1", addressdetails: "0" });
  if (nurDeutschland) parameter.set("countrycodes", "de");
  return `${NOMINATIM}?${parameter}`;
}

/** Der erste Treffer einer Antwort – oder null, wenn nichts Brauchbares darin steht. */
export function leseTreffer(antwort: unknown): Koordinaten | null {
  if (!Array.isArray(antwort) || antwort.length === 0) return null;
  const erster = antwort[0] as { lat?: unknown; lon?: unknown } | null;
  const lat = parseFloat(String(erster?.lat));
  const lng = parseFloat(String(erster?.lon));
  // Eine Antwort ohne Zahlen ergäbe NaN, und NaN als Koordinate reisst die Karte.
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

const ohneDoppelte = (texte: string[]) => [...new Set(texte.map((t) => t.trim()).filter(Boolean))];

/** Fragen für einen Wohnort: „68159 Mannheim", dann „Mannheim", dann „68159". */
export function ortKandidaten(plz: string | null | undefined, ort: string | null | undefined): string[] {
  const p = (plz ?? "").trim();
  const o = (ort ?? "").trim();
  return ohneDoppelte([[p, o].filter(Boolean).join(" "), o, p]);
}

// Wortgrenzen von Hand: `\b` kennt nur a–z, 0–9 und _. Vor „Österreich" sah es
// deshalb nie eine Grenze, und das Land wurde weder erkannt noch übersetzt.
// (Ohne Lookbehind, das kennen ältere Safari nicht.)
const VOR = "(^|[^\\p{L}\\p{N}])";
const NACH = "(?![\\p{L}\\p{N}])";
const wort = (muster: string, schalter: string) => new RegExp(`${VOR}(${muster})${NACH}`, schalter);

const AUSLAND = wort(
  "österreich|austria|schweiz|switzerland|frankreich|france|belgien|belgium|niederlande|netherlands|italien|italy|polen|poland|tschechien|czech|luxemburg|luxembourg|dänemark|denmark",
  "iu",
);

const ENGLISCH = { Deutschland: "Germany", Frankreich: "France", Österreich: "Austria", Schweiz: "Switzerland" };

/** Nennt der Text ausdrücklich ein anderes Land? Dann gleich weltweit suchen. */
export const nenntAusland = (text: string) => AUSLAND.test(text);

/**
 * Fragen für eine frei eingetippte Ortsangabe („Burg Reichenstein (Rittersaal),
 * 55413 Trechtingshausen, Deutschland"): erst der ganze Text ohne Klammern,
 * dann PLZ und Ort, zuletzt nur noch der Teil vor dem Land.
 */
export function adressKandidaten(roh: string): string[] {
  const normalisiert = roh.replace(/\s+/g, " ").trim();
  const ohneKlammern = normalisiert
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/\s+/g, " ")
    .trim();

  // Nominatim findet die englischen Ländernamen zuverlässiger.
  const mitLand = Object.entries(ENGLISCH).reduce(
    (text, [deutsch, englisch]) => text.replace(wort(deutsch, "giu"), `$1${englisch}`),
    ohneKlammern,
  );

  const teile = mitLand.split(",").map((teil) => teil.trim()).filter(Boolean);
  const ortOderPlz = teile.length >= 2 ? teile[teile.length - 2] : "";
  const ortMitLand = teile.length >= 2 ? teile.slice(-2).join(", ") : "";

  // Deutsche PLZ mit dem Ort dahinter („56305 Puderbach") – trifft sehr
  // zuverlässig, wenn der Text sonst zu viele Einzelheiten enthält.
  const plz = mitLand.match(/\b(\d{5})\b\s*([A-Za-zÄÖÜäöüß.\- ]+)?/);
  const plzUndOrt = plz ? `${plz[1]} ${(plz[2] || "").split(/[-(,]/)[0].trim()}` : "";

  return ohneDoppelte([mitLand, ohneKlammern, plzUndOrt, normalisiert, ortMitLand, ortOderPlz]);
}

/**
 * Die Reihenfolge der Anfragen. Mit `deutschlandZuerst` laufen erst alle Fragen
 * auf Deutschland beschränkt – „Burg Reichenstein" gibt es auch in Österreich –
 * und danach noch einmal weltweit.
 */
export function suchfolge(kandidaten: string[], deutschlandZuerst = false): Suchschritt[] {
  const fragen = ohneDoppelte(kandidaten);
  return [
    ...(deutschlandZuerst ? fragen.map((suche) => ({ suche, nurDeutschland: true })) : []),
    ...fragen.map((suche) => ({ suche, nurDeutschland: false })),
  ];
}

let schlange: Promise<void> = Promise.resolve();
let letzteAnfrage = 0;
const gemerkt = new Map<string, Koordinaten | null>();

/** Nur für Tests: Warteschlange und Gemerktes vergessen. */
export function geocodeZuruecksetzen() {
  schlange = Promise.resolve();
  letzteAnfrage = 0;
  gemerkt.clear();
}

/** Stellt sich hinten an und kommt zurück, wenn die nächste Anfrage hinaus darf. */
function warteBisFrei(): Promise<void> {
  const dran = schlange.then(async () => {
    const rest = letzteAnfrage + MINDESTABSTAND_MS - Date.now();
    if (rest > 0) await new Promise((weiter) => setTimeout(weiter, rest));
    letzteAnfrage = Date.now();
  });
  schlange = dran;
  return dran;
}

async function frage(schritt: Suchschritt, signal?: AbortSignal): Promise<Koordinaten | null> {
  const url = nominatimUrl(schritt);
  if (gemerkt.has(url)) return gemerkt.get(url)!;
  await warteBisFrei();
  // Bricht sofort ab, wenn die Seite inzwischen verlassen wurde.
  const antwort = await fetch(url, { signal });
  // Kein „nicht gefunden", sondern eine Störung (etwa 429, zu viele Anfragen):
  // Wer jetzt die nächste Frage hinterherschickt, macht es nur schlimmer.
  if (!antwort.ok) throw new Error(`Nominatim antwortet mit ${antwort.status}`);
  const treffer = leseTreffer(await antwort.json());
  gemerkt.set(url, treffer);
  return treffer;
}

/**
 * Geht die Fragen der Reihe nach durch und gibt den ersten Treffer zurück.
 *
 * `null` heisst: gefragt und nichts gefunden. Ist Nominatim nicht erreichbar
 * oder lehnt ab, wirft die Funktion – die Aufrufer müssen beides unterscheiden
 * können, damit eine Störung keine gespeicherten Koordinaten löscht.
 */
export async function geocode(
  kandidaten: string[],
  { deutschlandZuerst = false, signal }: { deutschlandZuerst?: boolean; signal?: AbortSignal } = {},
): Promise<Koordinaten | null> {
  for (const schritt of suchfolge(kandidaten, deutschlandZuerst)) {
    const treffer = await frage(schritt, signal);
    if (treffer) return treffer;
  }
  return null;
}

/** Wohnort eines Mitglieds. Ohne Land, damit es auch ausserhalb Deutschlands stimmt. */
export const geocodeOrt = (plz: string | null | undefined, ort: string | null | undefined, signal?: AbortSignal) =>
  geocode(ortKandidaten(plz, ort), { signal });

/** Frei eingetippter Ort einer Veranstaltung – erst in Deutschland, ausser der Text nennt ein anderes Land. */
export const geocodeAdresse = (text: string, signal?: AbortSignal) =>
  geocode(adressKandidaten(text), { deutschlandZuerst: !nenntAusland(text), signal });
