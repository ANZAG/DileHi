import { datumDe, plusMonate } from "@/lib/datum";

/**
 * Zuwendungsbestätigung nach amtlichem Muster.
 *
 * Grundlage ist das Muster „Bestätigung über Geldzuwendungen/Mitgliedsbeitrag"
 * für Körperschaften nach § 5 Abs. 1 Nr. 9 KStG (BMF-Schreiben zu den
 * Mustern für Zuwendungsbestätigungen). Die Pflichttexte stehen hier wörtlich
 * – wer sie umformuliert, riskiert, dass das Finanzamt die Bestätigung nicht
 * anerkennt.
 *
 * Gedruckt wird über den Browser. „Als PDF speichern" im Druckdialog ergibt
 * die Datei; ohne zusätzliche Bibliothek und auf jedem Gerät gleich.
 */

export type BescheidArt = "exemption" | "assessment_60a";

export interface Position {
  received_on: string;
  kind: "money" | "membership_fee";
  waiver: boolean;
  amount: number;
}

export interface Momentaufnahme {
  org_name: string;
  org_street: string | null;
  org_zip: string | null;
  org_city: string | null;
  tax_office: string;
  tax_number: string;
  notice_kind: BescheidArt;
  notice_date: string;
  notice_period: string | null;
  purposes: string;
  fees_deductible: boolean;
  items: Position[];
}

export interface Bestaetigung {
  id: string;
  number: string;
  donor_user_id: string | null;
  donor_name: string;
  donor_address: string;
  kind: "single" | "collective";
  issued_on: string;
  total: number;
  snapshot: Momentaufnahme;
  cancelled_at: string | null;
  cancel_reason: string | null;
}

/** Bis zu welchem Tag der Bescheid für Bestätigungen reicht (§ 63 Abs. 5 AO). */
export function bescheidReichtBis(art: BescheidArt, datum: string): string {
  return plusMonate(datum, (art === "assessment_60a" ? 3 : 5) * 12);
}

const EINER = ["null", "eins", "zwei", "drei", "vier", "fünf", "sechs", "sieben", "acht", "neun",
  "zehn", "elf", "zwölf", "dreizehn", "vierzehn", "fünfzehn", "sechzehn", "siebzehn", "achtzehn", "neunzehn"];
const ZEHNER = ["", "", "zwanzig", "dreißig", "vierzig", "fünfzig", "sechzig", "siebzig", "achtzig", "neunzig"];

/** „eins" am Ende wird vor „tausend" oder in Zusammensetzungen zu „ein". */
const alsVorsilbe = (wort: string) => (wort.endsWith("eins") ? wort.slice(0, -1) : wort);

function unterHundert(n: number): string {
  if (n < 20) return EINER[n];
  const einer = n % 10;
  const zehner = ZEHNER[Math.floor(n / 10)];
  return einer ? `${einer === 1 ? "ein" : EINER[einer]}und${zehner}` : zehner;
}

function unterTausend(n: number): string {
  const hunderter = Math.floor(n / 100);
  const rest = n % 100;
  const vorne = hunderter ? `${alsVorsilbe(EINER[hunderter])}hundert` : "";
  return vorne + (rest ? unterHundert(rest) : "");
}

/** Eine ganze Zahl in Worten, wie sie auf Schecks und Bestätigungen steht. */
export function zahlInWorten(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n >= 1_000_000_000) throw new Error(`Nicht darstellbar: ${n}`);
  if (n === 0) return "null";
  const millionen = Math.floor(n / 1_000_000);
  const tausender = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  let text = "";
  if (millionen) text += millionen === 1 ? "eine Million " : `${alsVorsilbe(unterTausend(millionen))} Millionen `;
  if (tausender) text += `${alsVorsilbe(unterTausend(tausender))}tausend`;
  if (rest) text += unterTausend(rest);
  return text.trim();
}

/** Betrag in Buchstaben: „einhundertzwanzig Euro und fünfzig Cent". */
export function betragInWorten(betrag: number): string {
  const cent = Math.round(Number(betrag) * 100);
  const euro = Math.floor(cent / 100);
  const rest = cent % 100;
  const teil = `${alsVorsilbe(zahlInWorten(euro))} Euro`;
  return rest ? `${teil} und ${alsVorsilbe(zahlInWorten(rest))} Cent` : teil;
}

export function euro(betrag: number): string {
  return Number(betrag).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function esc(text: string | null | undefined): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const zeilen = (text: string) => esc(text).replace(/\r?\n/g, "<br>");
const box = (an: boolean) => (an ? "&#9746;" : "&#9744;");
const ART: Record<Position["kind"], string> = { money: "Geldzuwendung", membership_fee: "Mitgliedsbeitrag" };

/** Die Bestätigung als eigenständige HTML-Seite, bereit zum Drucken. */
export function bestaetigungHtml(b: Bestaetigung): string {
  const s = b.snapshot;
  const sammel = b.kind === "collective";
  const zweck = esc(s.purposes);
  const anschriftVerein = [s.org_street, [s.org_zip, s.org_city].filter(Boolean).join(" ")].filter(Boolean).join("\n");
  const erste = s.items[0];
  const letzte = s.items[s.items.length - 1];

  const bescheid =
    s.notice_kind === "assessment_60a"
      ? `<p>${box(true)} Die Einhaltung der satzungsmäßigen Voraussetzungen nach den §§ 51, 59, 60 und 61 AO wurde vom
         Finanzamt ${esc(s.tax_office)}, StNr. ${esc(s.tax_number)}, mit Bescheid vom ${datumDe(s.notice_date)} nach § 60a AO
         gesondert festgestellt. Wir fördern nach unserer Satzung ${zweck}.</p>`
      : `<p>${box(true)} Wir sind wegen Förderung ${zweck} nach dem Freistellungsbescheid bzw. nach der Anlage zum
         Körperschaftsteuerbescheid des Finanzamtes ${esc(s.tax_office)}, StNr. ${esc(s.tax_number)}, vom
         ${datumDe(s.notice_date)} für den letzten Veranlagungszeitraum ${esc(s.notice_period)} nach § 5 Abs. 1 Nr. 9 des
         Körperschaftsteuergesetzes von der Körperschaftsteuer und nach § 3 Nr. 6 des Gewerbesteuergesetzes von der
         Gewerbesteuer befreit.</p>`;

  const anlage = sammel
    ? `<section class="anlage">
        <h2>Anlage zur Sammelbestätigung Nr. ${esc(b.number)}</h2>
        <table>
          <thead><tr><th>Datum der Zuwendung</th><th>Art der Zuwendung (Geldzuwendung/Mitgliedsbeitrag)</th>
          <th>Verzicht auf die Erstattung von Aufwendungen (ja/nein)</th><th class="betrag">Betrag</th></tr></thead>
          <tbody>
            ${s.items.map((p) => `<tr><td>${datumDe(p.received_on)}</td><td>${ART[p.kind]}</td><td>${p.waiver ? "ja" : "nein"}</td><td class="betrag">${euro(p.amount)}</td></tr>`).join("")}
          </tbody>
          <tfoot><tr><td colspan="3">Gesamtsumme</td><td class="betrag">${euro(b.total)}</td></tr></tfoot>
        </table>
      </section>`
    : "";

  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8">
<title>Zuwendungsbestätigung ${esc(b.number)}</title>
<style>
  @page { size: A4; margin: 18mm 18mm 16mm; }
  * { box-sizing: border-box; }
  body { font: 10.5pt/1.45 Arial, Helvetica, sans-serif; color: #000; margin: 0; }
  .kopf { display: flex; justify-content: space-between; gap: 12mm; font-size: 9pt; }
  .feld { border: 1px solid #000; padding: 2.5mm 3mm; margin: 0 0 3mm; min-height: 9mm; }
  .feld small { display: block; font-size: 8pt; margin-bottom: 1mm; }
  .reihe { display: grid; grid-template-columns: 1fr 2fr 1fr; gap: 3mm; }
  h1 { font-size: 13pt; margin: 6mm 0 1mm; }
  h2 { font-size: 11.5pt; margin: 0 0 3mm; }
  .unter { font-size: 9pt; margin: 0 0 5mm; }
  p { margin: 0 0 3mm; }
  .unterschrift { margin-top: 14mm; border-top: 1px solid #000; padding-top: 1mm; font-size: 8.5pt; width: 70%; }
  .hinweis { margin-top: 8mm; font-size: 8pt; }
  .hinweis strong { display: block; }
  .anlage { break-before: page; }
  table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
  th, td { border: 1px solid #000; padding: 1.5mm 2mm; text-align: left; vertical-align: top; }
  th { font-size: 8.5pt; }
  .betrag { text-align: right; white-space: nowrap; }
  tfoot td { font-weight: bold; }
  .storniert { border: 2px solid #b00; color: #b00; padding: 2mm 3mm; margin-bottom: 4mm; font-weight: bold; }
</style></head>
<body>
  ${b.cancelled_at ? `<div class="storniert">Zurückgenommen – ungültig. Grund: ${esc(b.cancel_reason)}</div>` : ""}
  <div class="kopf">
    <div><small>Aussteller (Bezeichnung und Anschrift der steuerbegünstigten Einrichtung)</small><br>
      <strong>${esc(s.org_name)}</strong><br>${zeilen(anschriftVerein)}</div>
    <div style="text-align:right">Nr. ${esc(b.number)}</div>
  </div>

  <h1>${sammel ? "Sammelbestätigung über Geldzuwendungen/Mitgliedsbeiträge" : "Bestätigung über Geldzuwendungen/Mitgliedsbeitrag"}</h1>
  <p class="unter">im Sinne des § 10b des Einkommensteuergesetzes an eine der in § 5 Abs. 1 Nr. 9 des
    Körperschaftsteuergesetzes bezeichneten Körperschaften, Personenvereinigungen oder Vermögensmassen</p>

  <div class="feld"><small>Name und Anschrift des Zuwendenden:</small>${esc(b.donor_name)}<br>${zeilen(b.donor_address)}</div>

  <div class="reihe">
    <div class="feld"><small>${sammel ? "Gesamtbetrag der Zuwendung" : "Betrag der Zuwendung"} – in Ziffern –</small>${euro(b.total)}</div>
    <div class="feld"><small>– in Buchstaben –</small>${betragInWorten(b.total)}</div>
    <div class="feld"><small>${sammel ? "Zeitraum der Sammelbestätigung:" : "Tag der Zuwendung:"}</small>${
      sammel ? `${datumDe(erste.received_on)} – ${datumDe(letzte.received_on)}` : datumDe(erste.received_on)
    }</div>
  </div>

  ${sammel
    ? "<p>Ob es sich um den Verzicht auf Erstattung von Aufwendungen handelt, ist der Anlage zur Sammelbestätigung zu entnehmen.</p>"
    : `<p>Es handelt sich um den Verzicht auf Erstattung von Aufwendungen: Ja ${box(erste.waiver)} Nein ${box(!erste.waiver)}</p>`}

  ${bescheid}

  <p>Es wird bestätigt, dass die ${sammel ? "Zuwendungen" : "Zuwendung"} nur zur Förderung ${zweck} verwendet ${sammel ? "werden" : "wird"}.</p>

  ${!s.fees_deductible
    ? `<p>${box(true)} Es wird bestätigt, dass es sich nicht um ${sammel ? "Mitgliedsbeiträge handelt, deren" : "einen Mitgliedsbeitrag handelt, dessen"} Abzug nach § 10b Abs. 1 des Einkommensteuergesetzes ausgeschlossen ist.</p>`
    : ""}

  ${sammel
    ? "<p>Es wird bestätigt, dass über die in der Gesamtsumme enthaltenen Zuwendungen keine weiteren Bestätigungen, weder formelle Zuwendungsbestätigungen noch Beitragsquittungen oder ähnliches ausgestellt wurden und werden.</p>"
    : ""}

  <p style="margin-top:8mm">${esc(s.org_city)}, ${datumDe(b.issued_on)}</p>
  <div class="unterschrift">(Ort, Datum und Unterschrift des Zuwendungsempfängers)</div>

  <div class="hinweis">
    <strong>Hinweis:</strong>
    Wer vorsätzlich oder grob fahrlässig eine unrichtige Zuwendungsbestätigung erstellt oder veranlasst, dass
    Zuwendungen nicht zu den in der Zuwendungsbestätigung angegebenen steuerbegünstigten Zwecken verwendet werden,
    haftet für die entgangene Steuer (§ 10b Abs. 4 EStG, § 9 Abs. 3 KStG, § 9 Nr. 5 GewStG).<br>
    Diese Bestätigung wird nicht als Nachweis für die steuerliche Berücksichtigung der Zuwendung anerkannt, wenn das
    Datum des Freistellungsbescheides länger als 5 Jahre bzw. das Datum der Feststellung der Einhaltung der
    satzungsmäßigen Voraussetzungen nach § 60a Abs. 1 AO länger als 3 Jahre seit Ausstellung des Bescheides
    zurückliegt (§ 63 Abs. 5 AO).
  </div>

  ${anlage}
</body></html>`;
}

/** Druckdialog für die Bestätigung – dort auch „Als PDF speichern". */
export function drucken(html: string): void {
  const rahmen = document.createElement("iframe");
  rahmen.setAttribute("aria-hidden", "true");
  Object.assign(rahmen.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0" });
  rahmen.addEventListener(
    "load",
    () => {
      const fenster = rahmen.contentWindow;
      if (!fenster) return;
      fenster.focus();
      fenster.print();
      setTimeout(() => rahmen.remove(), 60_000);
    },
    { once: true }
  );
  // Alle Angaben darin sind über esc() maskiert.
  rahmen.srcdoc = html;
  document.body.appendChild(rahmen);
}
