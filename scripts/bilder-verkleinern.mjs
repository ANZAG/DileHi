// Verkleinert die Bilder im Speicher (Ablage „gallery") auf ein Mass, das
// eine Webseite braucht – unter demselben Namen.
//
// Vor der Umstellung auf WebP beim Hochladen (src/lib/imageConversion.ts)
// landeten Fotos so im Speicher, wie sie aus der Kamera kamen: 3248 px breite
// Karten, die auf dem Handy 609 px gross erscheinen, ein Wappen mit 4864 px
// als PNG. PageSpeed zählte auf der Startseite rund 1 MB, die niemand sieht.
//
// Warum derselbe Name und dasselbe Format: Die Bilder sind an vielen Stellen
// über ihren Pfad verknüpft – Bildplätze, Galerien, Logo, Bilder im
// Fliesstext. Ändert sich der Name, müsste jede dieser Stellen mit. Bleibt er,
// muss keine. Der Gewinn steckt ohnehin fast ganz in den Pixeln, nicht im
// Format: Ein JPEG auf 1920 px ist nur wenig grösser als dasselbe als WebP.
//
// Das Original wird vorher unter _original/<pfad> abgelegt (nur beim ersten
// Mal) und nicht wieder angefasst. Zurück geht es, indem man es von dort an
// seinen alten Platz kopiert.
//
// Aufruf: .github/workflows/bilder.yml (von Hand, erst als Probelauf).

import sharp from "sharp";

/** Längste Kante. Logos und Zeichen erscheinen klein, Fotos bis Bildschirmbreite. */
export function hoechstmass(pfad) {
  return /^branding\//.test(pfad) ? 1024 : 1920;
}

const FORMATE = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

/** Unter dem Mass, in dem ein Neuschreiben sich lohnt. */
const MINDESTGEWINN = 0.9;

/**
 * Ein Bild verkleinern, im selben Format.
 * Gibt `null` zurück, wenn es nichts zu gewinnen gibt.
 */
export async function verkleinern(eingabe, pfad) {
  const bild = sharp(eingabe, { failOn: "none" });
  const info = await bild.metadata();
  const typ = FORMATE[info.format];
  if (!typ || (info.pages ?? 1) > 1) return null; // GIF, SVG, Animationen: nicht anfassen

  const kante = hoechstmass(pfad);
  // rotate(): Handyfotos stehen oft nur laut EXIF aufrecht. Die Angabe geht
  // beim Neuschreiben verloren, also wird das Bild vorher richtig gedreht.
  let neu = sharp(eingabe, { failOn: "none" }).rotate()
    .resize({ width: kante, height: kante, fit: "inside", withoutEnlargement: true });
  if (info.format === "jpeg") neu = neu.jpeg({ quality: 80, mozjpeg: true });
  if (info.format === "webp") neu = neu.webp({ quality: 80, effort: 6 });
  if (info.format === "png") neu = neu.png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 });

  const { data, info: aus } = await neu.toBuffer({ resolveWithObject: true });
  if (data.length > eingabe.length * MINDESTGEWINN) return null;
  return {
    daten: data,
    typ,
    vorher: { bytes: eingabe.length, breite: info.width, hoehe: info.height },
    nachher: { bytes: data.length, breite: aus.width, hoehe: aus.height },
  };
}

// ── Gegen den Speicher ──────────────────────────────────────────────────────

const ABLAGE = "gallery";
const SICHERUNG = "_original";

async function alleDateien(speicher, ordner = "") {
  const dateien = [];
  for (let ab = 0; ; ab += 1000) {
    const { data, error } = await speicher.list(ordner, { limit: 1000, offset: ab, sortBy: { column: "name", order: "asc" } });
    if (error) throw new Error(`${ordner || "/"}: ${error.message}`);
    for (const e of data) {
      const pfad = ordner ? `${ordner}/${e.name}` : e.name;
      if (e.id === null) {
        if (pfad !== SICHERUNG) dateien.push(...await alleDateien(speicher, pfad));
      } else if (/\.(jpe?g|png|webp)$/i.test(e.name)) {
        dateien.push(pfad);
      }
    }
    if (data.length < 1000) break;
  }
  return dateien;
}

async function main() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.SUPABASE_URL;
  const schluessel = process.env.SUPABASE_SERVICE_KEY;
  const probelauf = process.env.PROBELAUF !== "false";
  if (!url || !schluessel) throw new Error("SUPABASE_URL und SUPABASE_SERVICE_KEY fehlen.");

  const speicher = createClient(url, schluessel, { auth: { persistSession: false } }).storage.from(ABLAGE);
  const dateien = await alleDateien(speicher);
  const kb = (b) => `${Math.round(b / 1024)} KB`;
  const zeilen = [];
  let vorher = 0, nachher = 0, fehler = 0;

  for (const pfad of dateien) {
    try {
      const { data: blob, error } = await speicher.download(pfad);
      if (error) throw new Error(error.message);
      const eingabe = Buffer.from(await blob.arrayBuffer());
      const ergebnis = await verkleinern(eingabe, pfad);
      if (!ergebnis) continue;

      vorher += ergebnis.vorher.bytes;
      nachher += ergebnis.nachher.bytes;
      zeilen.push(`| ${pfad} | ${ergebnis.vorher.breite}×${ergebnis.vorher.hoehe}, ${kb(ergebnis.vorher.bytes)} | ${ergebnis.nachher.breite}×${ergebnis.nachher.hoehe}, ${kb(ergebnis.nachher.bytes)} |`);
      if (probelauf) continue;

      // Erst sichern, dann ersetzen. upsert: false, damit eine schon
      // vorhandene Sicherung – das echte Original – nie überschrieben wird.
      const sicherung = await speicher.upload(`${SICHERUNG}/${pfad}`, eingabe, {
        contentType: blob.type || ergebnis.typ, upsert: false,
      });
      if (sicherung.error && !/exists|Duplicate/i.test(sicherung.error.message)) {
        throw new Error(`Sicherung: ${sicherung.error.message}`);
      }
      const neu = await speicher.upload(pfad, ergebnis.daten, { contentType: ergebnis.typ, upsert: true });
      if (neu.error) throw new Error(`Ersetzen: ${neu.error.message}`);
    } catch (e) {
      fehler += 1;
      zeilen.push(`| ${pfad} | Fehler: ${e.message} | |`);
    }
  }

  const bericht = [
    `### Bilder ${probelauf ? "– Probelauf, nichts geändert" : "verkleinert"}`,
    "",
    `${dateien.length} Bilder geprüft, ${zeilen.length - fehler} ${probelauf ? "würden" : "wurden"} verkleinert: ${kb(vorher)} → ${kb(nachher)}.${fehler ? ` ${fehler} Fehler.` : ""}`,
    probelauf ? "Zum Ausführen erneut starten und „Probelauf“ abwählen." : `Die Originale liegen unter \`${SICHERUNG}/\`.`,
    "",
    "| Datei | vorher | nachher |",
    "| --- | --- | --- |",
    ...zeilen,
    "",
  ].join("\n");
  console.log(bericht);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, bericht);
  }
  if (fehler) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
