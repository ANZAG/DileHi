/**
 * Mitgliederlisten einlesen – aus Excel, CSV und anderer Vereinssoftware.
 *
 * Kaum ein Verein fängt bei null an. Die Liste liegt als Excel-Tabelle beim
 * Kassenwart oder als Export aus dem alten Programm. Beides soll ohne
 * Umformatieren hineinpassen:
 *
 *   * CSV mit Semikolon, Komma oder Tabulator, in UTF-8 oder – wie Excel
 *     unter Windows speichert – in Windows-1252
 *   * Excel ab 2007 (.xlsx), gelesen ohne zusätzliche Bibliothek
 *   * Spaltennamen, wie andere Programme sie nennen („Name", „Str.",
 *     „Mitglied seit"), werden erkannt und lassen sich von Hand ändern
 *   * Datumsangaben als 01.02.1990, 1.2.90, 1990-02-01 oder Excel-Datum
 *
 * Alles hier ist ohne Netz und ohne Datenbank – die Prüfung sieht man, bevor
 * ein einziges Konto entsteht.
 */

export type Feld =
  | "email"
  | "salutation"
  | "first_name"
  | "last_name"
  | "full_name"
  | "street"
  | "house_number"
  | "zip"
  | "city"
  | "birthdate"
  | "phone"
  | "entry_date"
  | "membership_type";

export const FELDER: { key: Feld; label: string; synonyme: string[] }[] = [
  { key: "email", label: "E-Mail-Adresse", synonyme: ["email", "emailadresse", "mail", "emailaddress", "epost", "mailadresse"] },
  { key: "salutation", label: "Anrede", synonyme: ["anrede", "salutation"] },
  { key: "first_name", label: "Vorname", synonyme: ["vorname", "firstname", "rufname"] },
  { key: "last_name", label: "Nachname", synonyme: ["nachname", "familienname", "lastname", "surname", "zuname"] },
  { key: "full_name", label: "Vor- und Nachname in einer Spalte", synonyme: ["name", "vollername", "mitglied", "mitgliedsname", "vorundnachname"] },
  { key: "street", label: "Straße (mit Hausnummer)", synonyme: ["strasse", "str", "strassehausnummer", "strassehausnr", "strasseundhausnummer", "strassenr", "anschrift", "adresse", "street"] },
  { key: "house_number", label: "Hausnummer (eigene Spalte)", synonyme: ["hausnummer", "hausnr", "nr"] },
  { key: "zip", label: "PLZ", synonyme: ["plz", "postleitzahl", "zip"] },
  { key: "city", label: "Ort", synonyme: ["ort", "wohnort", "stadt", "city"] },
  { key: "birthdate", label: "Geburtsdatum", synonyme: ["geburtsdatum", "geboren", "geb", "gebdatum", "geburtstag", "birthday", "birthdate"] },
  { key: "phone", label: "Telefon", synonyme: ["telefon", "tel", "telefonnummer", "handy", "mobil", "mobilnummer", "mobiltelefon", "phone", "festnetz"] },
  { key: "entry_date", label: "Eintrittsdatum", synonyme: ["eintritt", "eintrittsdatum", "mitgliedseit", "beitritt", "beitrittsdatum", "eintrittam"] },
  { key: "membership_type", label: "Mitgliedsart", synonyme: ["mitgliedsart", "mitgliedschaft", "beitragsart", "beitragsgruppe", "art", "mitgliedstyp"] },
];

export const feldLabel = (f: Feld) => FELDER.find((x) => x.key === f)!.label;

/** Kleinbuchstaben, Umlaute ausgeschrieben, nur Buchstaben und Ziffern. */
export function normalisieren(text: string): string {
  return text
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]/g, "");
}

/** Welche Spalte welches Feld ist – geraten aus der Kopfzeile. Leer heisst: nicht übernehmen. */
export function zuordnungRaten(kopf: string[]): (Feld | "")[] {
  const vergeben = new Set<Feld>();
  const passend = (spalte: string, genau: boolean): Feld | "" => {
    const n = normalisieren(spalte);
    if (!n) return "";
    for (const f of FELDER) {
      if (vergeben.has(f.key)) continue;
      if (f.synonyme.some((s) => (genau ? n === s : s.length >= 5 && n.startsWith(s)))) return f.key;
    }
    return "";
  };
  const zuordnung = kopf.map((spalte) => {
    const f = passend(spalte, true);
    if (f) vergeben.add(f);
    return f;
  });
  // Zweiter Durchgang für Spalten wie „E-Mail privat" oder „Geburtsdatum (TT.MM.JJJJ)".
  kopf.forEach((spalte, i) => {
    if (zuordnung[i]) return;
    const f = passend(spalte, false);
    if (f) {
      vergeben.add(f);
      zuordnung[i] = f;
    }
  });
  // „Name" neben „Vorname" ist der Nachname.
  const volleSpalte = zuordnung.indexOf("full_name");
  if (volleSpalte >= 0 && zuordnung.includes("first_name") && !zuordnung.includes("last_name")) {
    zuordnung[volleSpalte] = "last_name";
  }
  return zuordnung;
}

// ── Dateien lesen ───────────────────────────────────────────────────────────

/** UTF-8, sonst Windows-1252 – so speichert Excel unter Windows „CSV (Trennzeichen-getrennt)". */
export function dekodieren(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes).replace(/^\uFEFF/, "");
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

/** Das Trennzeichen, das in der ersten Zeile am häufigsten ausserhalb von Anführungszeichen steht. */
export function trennzeichen(text: string): string {
  const zaehler: Record<string, number> = { ";": 0, ",": 0, "\t": 0 };
  let inAnfuehrung = false;
  for (const z of text) {
    if (z === '"') inAnfuehrung = !inAnfuehrung;
    else if (!inAnfuehrung && (z === "\n" || z === "\r")) break;
    else if (!inAnfuehrung && z in zaehler) zaehler[z]++;
  }
  const [best, anzahl] = Object.entries(zaehler).sort((a, b) => b[1] - a[1])[0];
  return anzahl > 0 ? best : ";";
}

export function csvLesen(eingabe: string): string[][] {
  const text = eingabe.replace(/^\uFEFF/, "");
  const t = trennzeichen(text);
  const zeilen: string[][] = [];
  let zeile: string[] = [];
  let feld = "";
  let inAnfuehrung = false;
  let feldBegonnen = false;

  for (let i = 0; i < text.length; i++) {
    const z = text[i];
    if (inAnfuehrung) {
      if (z === '"') {
        if (text[i + 1] === '"') {
          feld += '"';
          i++;
        } else {
          inAnfuehrung = false;
        }
      } else {
        feld += z;
      }
    } else if (z === '"' && !feldBegonnen) {
      inAnfuehrung = true;
      feldBegonnen = true;
    } else if (z === t) {
      zeile.push(feld);
      feld = "";
      feldBegonnen = false;
    } else if (z === "\n" || z === "\r") {
      if (z === "\r" && text[i + 1] === "\n") i++;
      zeile.push(feld);
      zeilen.push(zeile);
      zeile = [];
      feld = "";
      feldBegonnen = false;
    } else {
      feld += z;
      feldBegonnen = true;
    }
  }
  if (feld !== "" || zeile.length) {
    zeile.push(feld);
    zeilen.push(zeile);
  }
  return zeilen.map((r) => r.map((f) => f.trim())).filter((r) => r.some((f) => f !== ""));
}

const ENTITAETEN: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function xmlText(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi, (_, e: string) => {
    if (e[0] === "#") return String.fromCodePoint(e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10));
    return ENTITAETEN[e.toLowerCase()];
  });
}

function attribut(tag: string, name: string): string | null {
  const treffer = new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag);
  return treffer ? xmlText(treffer[1]) : null;
}

/** Alle Texte eines Elements, ohne Lautschrift-Zusätze (<rPh>). */
function textInhalt(xml: string): string {
  const ohne = xml.replace(/<rPh\b[\s\S]*?<\/rPh>/g, "").replace(/<t\b[^>]*\/>/g, "");
  const teile = [...ohne.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((m) => xmlText(m[1]));
  return teile.join("");
}

async function entpackeEintrag(roh: Uint8Array, methode: number): Promise<Uint8Array> {
  if (methode === 0) return roh;
  if (methode !== 8) throw new Error("Diese Excel-Datei ist ungewöhnlich gepackt und lässt sich nicht lesen.");
  const strom = new ReadableStream<Uint8Array>({
    start(c) {
      c.enqueue(roh);
      c.close();
    },
  }).pipeThrough(new DecompressionStream("deflate-raw") as unknown as ReadableWritablePair<Uint8Array, Uint8Array>);
  return new Uint8Array(await new Response(strom).arrayBuffer());
}

/** Die Dateien in einem ZIP-Archiv – eine .xlsx ist eins. */
async function entpacken(bytes: Uint8Array): Promise<Map<string, () => Promise<string>>> {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let ende = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      ende = i;
      break;
    }
  }
  if (ende < 0) throw new Error("Die Datei ist keine gültige Excel-Datei (.xlsx).");
  const anzahl = dv.getUint16(ende + 10, true);
  let pos = dv.getUint32(ende + 16, true);
  const utf8 = new TextDecoder();
  const dateien = new Map<string, () => Promise<string>>();
  for (let n = 0; n < anzahl; n++) {
    if (dv.getUint32(pos, true) !== 0x02014b50) break;
    const methode = dv.getUint16(pos + 10, true);
    const groesse = dv.getUint32(pos + 20, true);
    const nameLaenge = dv.getUint16(pos + 28, true);
    const extraLaenge = dv.getUint16(pos + 30, true);
    const kommentarLaenge = dv.getUint16(pos + 32, true);
    const lokal = dv.getUint32(pos + 42, true);
    const name = utf8.decode(bytes.subarray(pos + 46, pos + 46 + nameLaenge));
    pos += 46 + nameLaenge + extraLaenge + kommentarLaenge;
    const start = lokal + 30 + dv.getUint16(lokal + 26, true) + dv.getUint16(lokal + 28, true);
    const roh = bytes.subarray(start, start + groesse);
    dateien.set(name, async () => utf8.decode(await entpackeEintrag(roh, methode)));
  }
  return dateien;
}

const EINGEBAUTE_DATUMSFORMATE = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);

/** Excel zählt Tage seit dem 30.12.1899. */
export function excelDatum(seriell: number): string {
  return new Date(Math.round((seriell - 25569) * 86_400_000)).toISOString().slice(0, 10);
}

/** Wie jede Zellformatierung angezeigt werden soll: als Datum, mit führenden Nullen oder normal. */
function formatierungen(styles: string | null): ("datum" | number | null)[] {
  if (!styles) return [];
  const eigene = new Map<number, string>();
  for (const m of styles.matchAll(/<numFmt\b[^>]*>/g)) {
    const id = Number(attribut(m[0], "numFmtId"));
    eigene.set(id, attribut(m[0], "formatCode") ?? "");
  }
  const block = /<cellXfs\b[^>]*>([\s\S]*?)<\/cellXfs>/.exec(styles)?.[1] ?? "";
  return [...block.matchAll(/<xf\b[^>]*>/g)].map((m) => {
    const id = Number(attribut(m[0], "numFmtId") ?? 0);
    if (EINGEBAUTE_DATUMSFORMATE.has(id)) return "datum";
    const code = eigene.get(id);
    if (!code) return null;
    const bereinigt = code.replace(/"[^"]*"/g, "").replace(/\[[^\]]*\]/g, "");
    if (/^0+$/.test(bereinigt)) return bereinigt.length;
    return /[dmyj]/i.test(bereinigt) ? "datum" : null;
  });
}

function spaltenIndex(zelle: string): number {
  const buchstaben = /^[A-Z]+/.exec(zelle)?.[0] ?? "A";
  return [...buchstaben].reduce((s, b) => s * 26 + (b.charCodeAt(0) - 64), 0) - 1;
}

export async function xlsxLesen(bytes: Uint8Array): Promise<string[][]> {
  const dateien = await entpacken(bytes);
  const lies = async (name: string) => (dateien.has(name) ? dateien.get(name)!() : null);

  const workbook = await lies("xl/workbook.xml");
  const rels = await lies("xl/_rels/workbook.xml.rels");
  let blattPfad = "xl/worksheets/sheet1.xml";
  const erstesBlatt = workbook ? /<sheet\b[^>]*>/.exec(workbook)?.[0] : undefined;
  const relId = erstesBlatt ? attribut(erstesBlatt, "r:id") : null;
  if (relId && rels) {
    for (const m of rels.matchAll(/<Relationship\b[^>]*>/g)) {
      if (attribut(m[0], "Id") === relId) {
        const ziel = attribut(m[0], "Target") ?? "";
        blattPfad = ziel.startsWith("/") ? ziel.slice(1) : `xl/${ziel}`;
      }
    }
  }
  const blatt = await lies(blattPfad);
  if (!blatt) throw new Error("In der Excel-Datei wurde kein Tabellenblatt gefunden.");

  const geteilt = [...((await lies("xl/sharedStrings.xml")) ?? "").matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => textInhalt(m[1]));
  const formate = formatierungen(await lies("xl/styles.xml"));

  const zeilen: string[][] = [];
  for (const reihe of blatt.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const zeile: string[] = [];
    for (const zelle of reihe[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const kopf = zelle[1];
      const inhalt = zelle[2] ?? "";
      const typ = attribut(kopf, "t");
      const format = formate[Number(attribut(kopf, "s") ?? 0)] ?? null;
      const v = /<v>([\s\S]*?)<\/v>/.exec(inhalt)?.[1];
      let wert = "";
      if (typ === "s") wert = geteilt[Number(v)] ?? "";
      else if (typ === "inlineStr") wert = textInhalt(inhalt);
      else if (typ === "str") wert = xmlText(v ?? "");
      else if (typ === "b") wert = v === "1" ? "WAHR" : "FALSCH";
      else if (typ === "e") wert = "";
      else if (v !== undefined && v !== "") {
        const zahl = Number(v);
        if (format === "datum" && Number.isFinite(zahl)) wert = excelDatum(zahl);
        else if (typeof format === "number" && Number.isInteger(zahl)) wert = String(zahl).padStart(format, "0");
        else wert = v;
      }
      const index = attribut(kopf, "r") ? spaltenIndex(attribut(kopf, "r")!) : zeile.length;
      while (zeile.length < index) zeile.push("");
      zeile[index] = wert.trim();
    }
    if (zeile.some((f) => f !== "")) zeilen.push(zeile);
  }
  return zeilen;
}

/** Liest CSV oder Excel, je nachdem, was in der Datei steckt – nicht, wie sie heisst. */
export async function dateiLesen(datei: Blob): Promise<string[][]> {
  const bytes = new Uint8Array(await datei.arrayBuffer());
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return xlsxLesen(bytes);
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    throw new Error("Das alte Excel-Format (.xls) lässt sich nicht lesen. Bitte in Excel „Speichern unter“ als .xlsx oder CSV wählen.");
  }
  return csvLesen(dekodieren(bytes));
}

// ── Prüfen ──────────────────────────────────────────────────────────────────

/** Ein Datum als JJJJ-MM-TT – oder null, wenn es keins ist. */
export function datumLesen(wert: string, heute = new Date()): string | null {
  const w = wert.trim();
  let j: number, m: number, t: number;
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(w);
  if (r) {
    [j, m, t] = [Number(r[1]), Number(r[2]), Number(r[3])];
  } else if ((r = /^(\d{1,2})\.(\d{1,2})\.(\d{4}|\d{2})$/.exec(w))) {
    [t, m, j] = [Number(r[1]), Number(r[2]), Number(r[3])];
    if (r[3].length === 2) j += j > heute.getFullYear() % 100 ? 1900 : 2000;
  } else {
    return null;
  }
  const d = new Date(Date.UTC(j, m - 1, t));
  if (d.getUTCFullYear() !== j || d.getUTCMonth() !== m - 1 || d.getUTCDate() !== t) return null;
  return d.toISOString().slice(0, 10);
}

export interface ImportZeile {
  email: string;
  salutation: string | null;
  first_name: string | null;
  last_name: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  birthdate: string | null;
  phone: string | null;
  entry_date: string | null;
  membership_type: string | null;
}

export type ImportStatus = "neu" | "vorhanden" | "doppelt" | "fehler";

export interface Pruefung {
  /** Zeilennummer, wie sie in Excel zu sehen ist. */
  nummer: number;
  zeile: ImportZeile;
  status: ImportStatus;
  meldungen: string[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** „Muster, Ida" oder „Ida Muster" – was vorn steht, entscheidet das Komma. */
export function nameTeilen(voll: string): { first_name: string | null; last_name: string | null } {
  const v = voll.trim().replace(/\s+/g, " ");
  if (!v) return { first_name: null, last_name: null };
  if (v.includes(",")) {
    const [nach, ...vor] = v.split(",");
    return { first_name: vor.join(",").trim() || null, last_name: nach.trim() || null };
  }
  const teile = v.split(" ");
  if (teile.length === 1) return { first_name: null, last_name: teile[0] };
  return { first_name: teile.slice(0, -1).join(" "), last_name: teile[teile.length - 1] };
}

export function zeilenPruefen(
  daten: string[][],
  zuordnung: (Feld | "")[],
  optionen: { vorhanden: Set<string>; mitgliedsarten: { key: string; label: string }[]; ersteZeileNummer: number }
): Pruefung[] {
  const gesehen = new Set<string>();
  const wert = (zeile: string[], feld: Feld) => {
    const i = zuordnung.indexOf(feld);
    return i >= 0 ? (zeile[i] ?? "").trim() : "";
  };

  return daten.map((roh, index) => {
    const meldungen: string[] = [];
    let status: ImportStatus = "neu";

    const email = wert(roh, "email").toLowerCase();
    let first_name = wert(roh, "first_name") || null;
    let last_name = wert(roh, "last_name") || null;
    const voll = wert(roh, "full_name");
    if (voll && !first_name && !last_name) ({ first_name, last_name } = nameTeilen(voll));

    const strasse = [wert(roh, "street"), wert(roh, "house_number")].filter(Boolean).join(" ") || null;

    const datum = (feld: Feld, label: string) => {
      const w = wert(roh, feld);
      if (!w) return null;
      const iso = datumLesen(w);
      if (!iso) meldungen.push(`${label} „${w}“ nicht lesbar – bleibt leer`);
      return iso;
    };

    let membership_type: string | null = null;
    const art = wert(roh, "membership_type");
    if (art) {
      const n = normalisieren(art);
      const treffer = optionen.mitgliedsarten.find((a) => normalisieren(a.key) === n || normalisieren(a.label) === n);
      if (treffer) membership_type = treffer.key;
      else meldungen.push(`Mitgliedsart „${art}“ gibt es nicht – bleibt beim Standard`);
    }

    const zeile: ImportZeile = {
      email,
      salutation: wert(roh, "salutation") || null,
      first_name,
      last_name,
      street: strasse,
      zip: wert(roh, "zip") || null,
      city: wert(roh, "city") || null,
      birthdate: datum("birthdate", "Geburtsdatum"),
      phone: wert(roh, "phone") || null,
      entry_date: datum("entry_date", "Eintrittsdatum"),
      membership_type,
    };

    if (!email) {
      status = "fehler";
      meldungen.unshift("Keine E-Mail-Adresse – ohne sie gibt es keinen Zugang");
    } else if (!EMAIL.test(email)) {
      status = "fehler";
      meldungen.unshift(`„${email}“ ist keine gültige E-Mail-Adresse`);
    } else if (!first_name && !last_name) {
      status = "fehler";
      meldungen.unshift("Kein Name");
    } else if (optionen.vorhanden.has(email)) {
      status = "vorhanden";
      meldungen.unshift("Schon Mitglied – wird übersprungen");
    } else if (gesehen.has(email)) {
      status = "doppelt";
      meldungen.unshift("Diese Adresse steht weiter oben schon – wird übersprungen");
    }
    if (email) gesehen.add(email);

    return { nummer: optionen.ersteZeileNummer + index, zeile, status, meldungen };
  });
}

/** Leere Vorlage mit den Spalten, die DING von selbst erkennt. BOM, damit Excel die Umlaute richtig zeigt. */
export const VORLAGE_CSV =
  "\uFEFFAnrede;Vorname;Nachname;E-Mail;Straße;PLZ;Ort;Geburtsdatum;Telefon;Eintritt;Mitgliedsart\r\n" +
  "Frau;Ida;Muster;ida.muster@example.org;Marktplatz 1;12345;Musterstadt;01.02.1990;0123 456789;15.03.2020;\r\n";
