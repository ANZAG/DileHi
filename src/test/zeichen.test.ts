// @vitest-environment node
import { readFileSync, readdirSync, statSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MITGELIEFERT, bildTyp, zeichenLinks } from "@/lib/zeichen";

/**
 * Das Zeichen einer Installation, die noch keines hat.
 *
 * Aus dem Probelauf, dreimal gemeldet: „Das Favicon ist immer noch unseres."
 * Es lag nicht am Programm, sondern an den Dateien daneben. index.html zeigte
 * zwar auf ein neutrales SVG — im Verzeichnis lagen aber weiter DileHis
 * favicon.ico (die jeder Browser von sich aus holt), das
 * apple-touch-icon.png, die drei Symbole des Manifests und der Name des
 * Vereins im Manifest selbst.
 *
 * Diese Prüfung hält das Verzeichnis frei davon. Sie kann nicht sehen, was
 * auf einem Bild zu sehen ist — aber sie kann sehen, ob die Dateien die sind,
 * die scripts/zeichen.mjs erzeugt, und ob im Text noch ein Vereinsname steht.
 */

/** Was DileHis Dateien waren – Groesse in Bytes, wie sie im Abzug lagen. */
const UNSERE = {
  "favicon.ico": 4286,
  "apple-touch-icon.png": 24992,
  "icon-192.png": 33608,
  "icon-512.png": 162684,
  "icon-maskable-512.png": 82839,
};

describe("Das mitgelieferte Zeichen", () => {
  it("ist nicht mehr das von DileHi", () => {
    for (const [datei, groesse] of Object.entries(UNSERE)) {
      expect(statSync(`public/${datei}`).size, `public/${datei} ist unverändert`).not.toBe(groesse);
    }
  });

  it("liegt für jeden Platz da, den ein Browser abfragt", () => {
    // /favicon.ico holt jeder Browser von sich aus, apple-touch-icon.png
    // nimmt iOS, die beiden Symbole stehen im Manifest.
    for (const datei of ["favicon.svg", "favicon.ico", "apple-touch-icon.png",
                         "icon-192.png", "icon-512.png", "icon-maskable-512.png"]) {
      expect(statSync(`public/${datei}`).size, `public/${datei} fehlt`).toBeGreaterThan(300);
    }
  });

  it("trägt im Manifest keinen fremden Vereinsnamen", () => {
    const manifest = readFileSync("public/manifest.webmanifest", "utf-8");
    for (const wort of ["Histôrje", "Diu lebendec", "Wiesbaden"]) {
      expect(manifest, `Das Manifest nennt ${wort}`).not.toContain(wort);
    }
  });

  it("lässt nichts von uns im öffentlichen Verzeichnis liegen", () => {
    // hero-medieval.webp lag hier als Kopie unseres Titelbilds und wurde von
    // nichts mehr gebraucht.
    const dateien = readdirSync("public");
    expect(dateien).not.toContain("hero-medieval.webp");
    for (const datei of dateien) {
      if (!/\.(js|json|webmanifest|txt|svg|htaccess|_headers|_redirects)$/.test(datei)) continue;
      const text = readFileSync(`public/${datei}`, "utf-8");
      for (const wort of ["Diu lebendec", "Histôrje"]) {
        expect(text, `public/${datei} nennt ${wort}`).not.toContain(wort);
      }
    }
  });
});

describe("Welches Zeichen gilt", () => {
  it("nimmt die mitgelieferten, solange niemand ein eigenes hat", () => {
    expect(zeichenLinks(null)).toEqual(MITGELIEFERT);
    expect(zeichenLinks("")).toEqual(MITGELIEFERT);
  });

  it("lässt neben dem eigenen keines der mitgelieferten stehen", () => {
    // Der eigentliche Fehler: Vorher wurde nur die Adresse des ersten Links
    // umgebogen – die .ico blieb daneben stehen, und der Browser entschied.
    const links = zeichenLinks("https://beispiel.supabase.co/storage/wappen.png");
    expect(links).toHaveLength(1);
    expect(links[0].type).toBe("image/png");
    expect(links.some((l) => l.href.startsWith("/favicon"))).toBe(false);
  });

  it("nennt den Typ nach der Datei, nicht nach dem, was vorher dastand", () => {
    // Ein PNG mit type="image/svg+xml" weisen Browser zurueck.
    expect(bildTyp("/x/wappen.png")).toBe("image/png");
    expect(bildTyp("/x/wappen.svg")).toBe("image/svg+xml");
    expect(bildTyp("/x/wappen.ico")).toBe("image/x-icon");
    expect(bildTyp("/x/wappen.png?v=2")).toBe("image/png");
    expect(bildTyp("/x/wappen")).toBe("");
  });
});
