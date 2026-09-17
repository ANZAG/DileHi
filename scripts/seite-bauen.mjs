/**
 * Die Seite ohne GitHub Actions bauen.
 *
 * Gedacht für den Fall, dass die Actions-Minuten des Kontos aufgebraucht sind
 * (2.000 im Monat auf privaten Repositories; auf öffentlichen sind sie
 * unbegrenzt — siehe docs/installation.md, „Wenn die Actions nicht laufen").
 * Das Ergebnis ist Datei für Datei dasselbe wie das von `deploy.yml`:
 * geprüft, gebaut, mit ausgefüllten Adressen und, wenn gewünscht, mit dem
 * Verzeichnisschutz davor.
 *
 *   node scripts/seite-bauen.mjs
 *
 * Danach liegt alles in `dist/` und will nur noch hochgeladen werden — mit
 * FileZilla, WinSCP oder was ihr sonst benutzt. Das Hochladen macht dieses
 * Skript mit Absicht NICHT: Ein Programm, das von selbst auf einen Webspace
 * schreibt, braucht das FTP-Passwort, und dann liegt es auf einem Rechner
 * statt in den Geheimnissen. Der letzte Handgriff bleibt bei euch.
 *
 * ── Was hineingehört ────────────────────────────────────────────────────────
 *
 * Zwei Angaben, dieselben wie bei Netlify oder Vercel (installation.md,
 * Schritt 5). Entweder als Umgebungsvariablen oder in einer Datei `.env`
 * neben der package.json — die steht in .gitignore und wird nicht eingecheckt:
 *
 *   VITE_SUPABASE_URL=https://abcdefgh.supabase.co
 *   VITE_SUPABASE_PUBLISHABLE_KEY=eyJ…
 *
 * Beide sind öffentlich: Der anon-Schlüssel steht ohnehin im ausgelieferten
 * Programm. Das Datenbank-Passwort und der service_role-Schlüssel werden hier
 * NICHT gebraucht und gehören auch nicht hierher.
 *
 * Für den Verzeichnisschutz zusätzlich (freiwillig):
 *
 *   SITE_PASSWORT=…            das Passwort im Klartext
 *   SITE_PASSWORT_BENUTZER=…   der Benutzername
 *   SITE_PASSWORT_DATEI=…      der ABSOLUTE Pfad der .htpasswd auf dem Server
 */

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { apr1 } from "./apr1.mjs";
import path from "node:path";

const wurzel = path.resolve(import.meta.dirname, "..");
const lauf = (befehl, args) =>
  execFileSync(befehl, args, { cwd: wurzel, stdio: "inherit", shell: process.platform === "win32" });

/** `.env` lesen, ohne eine Abhängigkeit dafür zu holen. */
function ausEnvDatei() {
  const p = path.join(wurzel, ".env");
  if (!existsSync(p)) return {};
  const aus = {};
  for (const zeile of readFileSync(p, "utf-8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(zeile);
    if (m) aus[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return aus;
}

const datei = ausEnvDatei();
const wert = (name) => process.env[name] ?? datei[name] ?? "";

const url = wert("VITE_SUPABASE_URL");
const schluessel = wert("VITE_SUPABASE_PUBLISHABLE_KEY");
if (!url || !schluessel) {
  console.error(
    "\nEs fehlen VITE_SUPABASE_URL und/oder VITE_SUPABASE_PUBLISHABLE_KEY.\n" +
      "Beide stehen in Supabase unter Settings → API (Project URL und anon public key).\n" +
      "Entweder als Umgebungsvariablen setzen oder in eine Datei .env neben die\n" +
      "package.json schreiben:\n\n" +
      "  VITE_SUPABASE_URL=https://abcdefgh.supabase.co\n" +
      "  VITE_SUPABASE_PUBLISHABLE_KEY=eyJ…\n"
  );
  process.exit(1);
}
process.env.VITE_SUPABASE_URL = url;
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = schluessel;
process.env.VITE_SUPABASE_PROJECT_ID = wert("VITE_SUPABASE_PROJECT_ID") ||
  new URL(url).hostname.split(".")[0];

/*
 * Dieselben Prüfungen wie in der Action, in derselben Reihenfolge. Wer ohne
 * sie hochlädt, hat den halben Zweck des Ausrollen-Knopfes weggelassen.
 */
console.log("\n── Prüfen ──────────────────────────────────────────────────\n");
lauf("npm", ["run", "lint"]);
lauf("npm", ["run", "seo:check"]);
lauf("npx", ["tsc", "--noEmit", "-p", "tsconfig.app.json"]);
lauf("npm", ["test"]);

console.log("\n── Bauen ───────────────────────────────────────────────────\n");
lauf("npm", ["run", "build"]);

/*
 * Der Verzeichnisschutz, wortgleich mit dem Schritt in deploy.yml.
 */
const passwort = wert("SITE_PASSWORT");
if (passwort) {
  const benutzer = wert("SITE_PASSWORT_BENUTZER");
  const pfad = wert("SITE_PASSWORT_DATEI");
  if (!benutzer || !pfad.startsWith("/")) {
    console.warn(
      "\nVerzeichnisschutz NICHT gesetzt: SITE_PASSWORT_BENUTZER fehlt oder\n" +
        "SITE_PASSWORT_DATEI ist kein absoluter Pfad. Gebaut ist trotzdem alles.\n"
    );
  } else {
    const name = path.posix.basename(pfad);
    const salz = randomBytes(6).toString("base64").replace(/[^./0-9A-Za-z]/g, "x").slice(0, 8);
    writeFileSync(path.join(wurzel, "dist", name), `${benutzer}:${apr1(passwort, salz)}\n`);
    const htaccess = path.join(wurzel, "dist", ".htaccess");
    const vorher = existsSync(htaccess) ? readFileSync(htaccess, "utf-8") : "";
    writeFileSync(htaccess, [
      "# Verzeichnisschutz. Gesetzt beim Bauen aus SITE_PASSWORT;",
      "# von Hand geaenderte Zeilen ueberschreibt der naechste Build.",
      "AuthType Basic",
      `AuthName "${wert("SITE_PASSWORT_BEREICH") || "Geschlossener Bereich"}"`,
      `AuthUserFile ${pfad}`,
      "Require valid-user",
      "",
      "# Die Passwortdatei selbst ist nicht abrufbar.",
      `<Files "${name}">`,
      "  <IfModule mod_authz_core.c>",
      "    Require all denied",
      "  </IfModule>",
      "  <IfModule !mod_authz_core.c>",
      "    Order allow,deny",
      "    Deny from all",
      "  </IfModule>",
      "</Files>",
      "",
      vorher,
    ].join("\n"));
    writeFileSync(path.join(wurzel, "dist", "robots.txt"), "User-agent: *\nDisallow: /\n");
    console.log(`\nVerzeichnisschutz eingebaut (Benutzer ${benutzer}, Datei ${pfad}).`);
  }
}

console.log(`
── Fertig ──────────────────────────────────────────────────

Alles liegt in  dist/

Jetzt den Inhalt von dist/ per FTP in das Verzeichnis eurer Domain laden.
Wichtig dabei:

  * Der INHALT von dist/ gehört hinein, nicht der Ordner selbst.
  * Die Dateien, die mit einem Punkt anfangen (.htaccess und, falls gesetzt,
    die Passwortdatei), müssen mit. Viele FTP-Programme blenden sie aus —
    in FileZilla: Server → Versteckte Dateien anzeigen.
  * Was auf dem Webspace übrig bleibt und nicht in dist/ steht, gehört dort
    nicht mehr hin. Die Action räumt das mit \`mirror --delete\` auf; von
    Hand heisst das: vorher leeren oder überschreiben und alte Dateien
    löschen.
`);
