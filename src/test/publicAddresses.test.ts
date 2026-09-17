// @vitest-environment node
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CALENDAR_PERSONAL_PATH,
  CALENDAR_PUBLIC_PATH,
  EMBED_PATH,
  FUNCTIONS_PLACEHOLDER,
  calendarUrls,
  embedUrl,
  fillFunctionsUrl,
  SITEMAP_PATH,
  LLMS_PATH,
} from "@/lib/publicAddresses";

/**
 * Die Adressen, die das Programm nach draußen gibt, und die Weiterleitungen,
 * die sie auffangen, stehen an drei Stellen: in publicAddresses.ts, in
 * public/.htaccess (Webspace mit Apache) und in public/_redirects (Netlify,
 * Cloudflare Pages). Passen sie nicht zusammen, merkt es niemand, bis ein
 * Mitglied fragt, warum sein Kalender leer ist.
 *
 * Die dritte Datei kam aus dem Probelauf: Die Anleitung empfiehlt Netlify,
 * ausgeliefert wurde aber nur eine .htaccess — dort hätte schon /einrichtung
 * einen 404 gegeben.
 */

const read = (p: string) => readFileSync(p, "utf-8").replace(/\r\n/g, "\n");
const HTACCESS = read("public/.htaccess");

/**
 * Die RewriteRules in der Reihenfolge, in der Apache sie prüft. Eine Regel
 * mit RewriteCond davor gilt hier als nicht erfüllt: Die einzigen
 * Bedingungen fragen, ob die Datei existiert, und die geprüften Adressen sind
 * keine Dateien.
 */
const rules: { pattern: RegExp; target: string; conditional: boolean }[] = [];
let pendingCondition = false;
for (const line of HTACCESS.split("\n")) {
  if (/^\s*RewriteCond\s/.test(line)) pendingCondition = true;
  const m = line.match(/^\s*RewriteRule\s+(\S+)\s+(\S+)/);
  if (m) {
    rules.push({ pattern: new RegExp(m[1]), target: m[2], conditional: pendingCondition });
    pendingCondition = false;
  }
}

/** Wohin Apache eine Adresse schickt, wie mod_rewrite im Verzeichnis: ohne führenden Schrägstrich. */
function rewrite(path: string): string | undefined {
  const local = path.replace(/^\//, "").replace(/\?.*$/, "");
  for (const r of rules) {
    if (r.conditional) continue;
    const m = local.match(r.pattern);
    if (m) return r.target.replace(/\$(\d)/g, (_, i) => m[Number(i)] ?? "");
  }
  return undefined;
}

const functionExists = (target: string) => {
  const name = target.replace(`${FUNCTIONS_PLACEHOLDER}/`, "").split("/")[0];
  return existsSync(`supabase/functions/${name}/index.ts`);
};

/**
 * Die Weiterleitungen in der Sprache von Netlify und Cloudflare Pages:
 * `von  nach  status`, Platzhalter `:name` für ein Wegstück, `*` für den Rest.
 */
const REDIRECTS = read("public/_redirects");

const netlifyRegeln = REDIRECTS.split("\n")
  .map((z) => z.trim())
  .filter((z) => z && !z.startsWith("#"))
  .map((z) => {
    const [von, nach, status] = z.split(/\s+/);
    return { von, nach, status };
  });

/** Wohin Netlify eine Adresse schickt – erste passende Regel gewinnt. */
function netlify(path: string): { ziel: string; status: string } | undefined {
  const ohneFrage = path.replace(/\?.*$/, "");
  for (const r of netlifyRegeln) {
    if (r.von.includes(":")) {
      const muster = new RegExp("^" + r.von.replace(/:[a-z]+/g, "([^/]+)") + "$");
      const m = ohneFrage.match(muster);
      if (m) return { ziel: r.nach.replace(/:[a-z]+/g, m[1]), status: r.status };
    } else if (r.von.endsWith("/*")) {
      if (ohneFrage.startsWith(r.von.slice(0, -1))) return { ziel: r.nach, status: r.status };
    } else if (r.von === ohneFrage) {
      return { ziel: r.nach, status: r.status };
    }
  }
  return undefined;
}

describe("Adressen nach draußen", () => {
  it("findet genug Regeln, um etwas zu prüfen", () => {
    expect(rules.length).toBeGreaterThanOrEqual(5);
  });

  it("leitet beide Kalender an ihre Funktion weiter, vor der Seitenweiterleitung", () => {
    for (const [path, fn] of [
      [CALENDAR_PUBLIC_PATH, "events-ical"],
      [CALENDAR_PERSONAL_PATH, "events-personal-ical"],
    ]) {
      const target = rewrite(path);
      expect(target, path).toMatch(new RegExp(`^${FUNCTIONS_PLACEHOLDER}/${fn}/.+\\.ics$`));
      expect(functionExists(target!)).toBe(true);
    }
  });

  it("leitet jede Einbindung aus der Verwaltung weiter, in allen drei Formen", () => {
    const admin = read("src/components/admin/EmbedAdmin.tsx");
    const resources = [...admin.matchAll(/\{\s*key:\s*"([a-z]+)"/g)].map((m) => m[1]);
    expect(resources.length).toBeGreaterThanOrEqual(3);
    for (const r of resources) {
      for (const suffix of ["", ".js", ".html"]) {
        const path = `${EMBED_PATH}/${r}${suffix}`;
        expect(rewrite(path), path).toBe(`${FUNCTIONS_PLACEHOLDER}/embed/${r}${suffix}`);
      }
    }
    expect(functionExists(`${FUNCTIONS_PLACEHOLDER}/embed`)).toBe(true);
  });

  it("leitet Sitemap und llms.txt an ihre Funktion weiter", () => {
    // Beide lagen einmal als feste Datei in public/ und beschrieben einen
    // einzelnen Verein. Jetzt kommen sie aus der Datenbank – die Adresse
    // draussen bleibt dieselbe.
    for (const [pfad, fn] of [[SITEMAP_PATH, "sitemap"], [LLMS_PATH, "llms"]]) {
      const ziel = rewrite(pfad);
      expect(ziel, pfad).toBe(`${FUNCTIONS_PLACEHOLDER}/${fn}`);
      expect(functionExists(ziel!), fn).toBe(true);
    }
    // Und sie liegen nicht mehr als Datei daneben – sonst gewinnt die Datei.
    expect(existsSync("public/llms.txt")).toBe(false);
    expect(existsSync("public/sitemap.xml")).toBe(false);
  });

  it("schickt normale Seiten weiterhin an die Anwendung", () => {
    expect(rewrite("/intern/veranstaltungen")).toBe("index.html");
    expect(rewrite("/einbindung/irgendwas")).toBe("index.html");
  });

  it("kennt dieselben Adressen auch für Netlify und Cloudflare Pages", () => {
    // Ohne diese Datei gibt auf Netlify jede Unteradresse einen 404 – auch
    // /einrichtung, also schon der erste Zugang.
    expect(netlifyRegeln.length).toBeGreaterThanOrEqual(5);

    for (const [path, fn] of [
      [CALENDAR_PUBLIC_PATH, "events-ical"],
      [CALENDAR_PERSONAL_PATH, "events-personal-ical"],
    ]) {
      const treffer = netlify(path);
      expect(treffer?.ziel, path).toMatch(new RegExp(`^${FUNCTIONS_PLACEHOLDER}/${fn}/.+\\.ics$`));
      expect(treffer?.status, path).toBe("302");
    }

    const admin = read("src/components/admin/EmbedAdmin.tsx");
    const resources = [...admin.matchAll(/\{\s*key:\s*"([a-z]+)"/g)].map((m) => m[1]);
    for (const r of resources) {
      for (const suffix of ["", ".js", ".html"]) {
        const path = `${EMBED_PATH}/${r}${suffix}`;
        expect(netlify(path)?.ziel, path).toBe(`${FUNCTIONS_PLACEHOLDER}/embed/${r}${suffix}`);
      }
    }

    expect(netlify(SITEMAP_PATH)?.ziel).toBe(`${FUNCTIONS_PLACEHOLDER}/sitemap`);
    // llms.txt sagt Sprachmodellen, worum es hier geht. Als feste Datei stand
    // darin der Name eines einzelnen Vereins – jetzt kommt sie aus der
    // Datenbank, wie die Sitemap.
    expect(netlify(LLMS_PATH)?.ziel).toBe(`${FUNCTIONS_PLACEHOLDER}/llms`);

    // Und alles andere ist die Anwendung, ohne dass sich die Adresse ändert.
    const app = netlify("/intern/veranstaltungen");
    expect(app?.ziel).toBe("/index.html");
    expect(app?.status).toBe("200");
    expect(netlify("/einrichtung")?.ziel).toBe("/index.html");
  });

  it("hält die Dateien auf dem Webspace frei von Umlauten", () => {
    // Sie werden dort gelesen, wo niemand die Kodierung einstellt: im
    // FTP-Programm, im Dateimanager des Hosters. Was dort als Zeichensalat
    // ankommt, sieht kaputt aus — auch wenn der Server damit klarkommt.
    // Aufgefallen im Probelauf, an der .htaccess auf dilehi.de.
    for (const datei of ["public/.htaccess", "public/_redirects", "public/_headers", "public/robots.txt"]) {
      const zeichen = [...read(datei)].filter((c) => c.charCodeAt(0) > 126);
      expect(zeichen, `${datei} enthält ${zeichen.join(" ")}`).toHaveLength(0);
    }
  });

  it("gibt die Einbindung auch auf Netlify für fremde Seiten frei", () => {
    const headers = read("public/_headers");
    expect(headers).toContain(`${EMBED_PATH}/*`);
    expect(headers).toMatch(/Access-Control-Allow-Origin:\s*\*/);
  });

  it("setzt beim Bauen überall die Adresse ein", () => {
    const url = "https://abcdefghijklmnopqrst.supabase.co";
    for (const file of ["public/.htaccess", "public/robots.txt", "public/_redirects"]) {
      const text = read(file);
      expect(text, file).toContain(FUNCTIONS_PLACEHOLDER);
      const filled = fillFunctionsUrl(text, url);
      expect(filled).not.toContain(FUNCTIONS_PLACEHOLDER);
      expect(filled).toContain(`${url}/functions/v1/`);
    }
  });

  it("baut die Kalenderadressen auf der eigenen Seite", () => {
    const c = calendarUrls("https://verein.example/", "abc-123");
    expect(c.public).toEqual({
      subscribe: "webcal://verein.example/kalender/veranstaltungen.ics",
      download: "https://verein.example/kalender/veranstaltungen.ics",
    });
    expect(c.personal?.download).toBe("https://verein.example/kalender/meine-termine.ics?token=abc-123");
    expect(calendarUrls("https://verein.example").personal).toBeNull();
    expect(embedUrl("https://verein.example", "gallery")).toBe("https://verein.example/einbindung/gallery");
  });
});
