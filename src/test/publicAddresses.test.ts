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
} from "@/lib/publicAddresses";

/**
 * Die Adressen, die das Programm nach draußen gibt, und die Weiterleitungen,
 * die sie auffangen, stehen an zwei Stellen: in publicAddresses.ts und in
 * public/.htaccess. Passen sie nicht zusammen, merkt es niemand, bis ein
 * Mitglied fragt, warum sein Kalender leer ist.
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

  it("schickt normale Seiten weiterhin an die Anwendung", () => {
    expect(rewrite("/intern/veranstaltungen")).toBe("index.html");
    expect(rewrite("/einbindung/irgendwas")).toBe("index.html");
  });

  it("setzt beim Bauen überall die Adresse ein", () => {
    const url = "https://abcdefghijklmnopqrst.supabase.co";
    for (const file of ["public/.htaccess", "public/robots.txt"]) {
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
