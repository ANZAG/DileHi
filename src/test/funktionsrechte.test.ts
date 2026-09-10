import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Wer darf welche Datenbankfunktion aufrufen?
 *
 * In Postgres darf PUBLIC jede neue Funktion ausführen, solange niemand
 * widerspricht. Bei Supabase ist das keine Kleinigkeit: Der anon-Schlüssel
 * steht im ausgelieferten Programm, jeder Besucher hat ihn.
 *
 * So ist `pending_digests()` – Namen und alle ungelesenen Benachrichtigungen
 * jedes Mitglieds – monatelang für jeden aufrufbar gewesen. Nicht durch einen
 * Fehler, sondern weil eine Zeile fehlte.
 *
 * Deshalb prüft dieser Test die Vollständigkeit, nicht die Richtigkeit: Zu
 * jeder Funktion muss eine Entscheidung im Quelltext stehen. Welche, entscheidet
 * der Mensch – dass überhaupt eine dasteht, entscheidet dieser Test.
 */

const ORDNER = "supabase/migrations";

const migrationen = readdirSync(ORDNER)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(`${ORDNER}/${f}`, "utf-8").replace(/\r\n/g, "\n"));

const alles = migrationen.join("\n");

/** Die zuletzt gültige Definition jeder Funktion. */
const funktionen = new Map<string, { definer: boolean }>();
for (const inhalt of migrationen) {
  const treffer = inhalt.matchAll(
    /CREATE (?:OR REPLACE )?FUNCTION\s+public\.(\w+)\s*\(([^)]*)\)([\s\S]{0,500}?)AS\s+\$/g
  );
  for (const m of treffer) {
    funktionen.set(m[1], { definer: m[3].includes("SECURITY DEFINER") });
  }
}

/** Funktionen mit mindestens einer GRANT- oder REVOKE-Zeile. */
const geregelt = new Set(
  [...alles.matchAll(/(?:GRANT|REVOKE)\s+(?:EXECUTE|ALL)\s+ON\s+FUNCTION\s+public\.(\w+)\s*\(/g)]
    .map((m) => m[1])
);

describe("Rechte an Datenbankfunktionen", () => {
  it("findet überhaupt Funktionen", () => {
    // Schuetzt vor dem stillen Gegenteil: Passt das Muster einmal nicht mehr,
    // liefe die Pruefung unten ueber eine leere Liste und waere gruen.
    expect(funktionen.size).toBeGreaterThan(40);
    expect(geregelt.size).toBeGreaterThan(20);
  });

  it("trifft für jede Funktion eine ausdrückliche Entscheidung", () => {
    const offen = [...funktionen.keys()].filter((f) => !geregelt.has(f));
    expect(offen).toEqual([]);
  });

  it("setzt bei jeder Funktion einen festen Suchpfad", () => {
    // Ohne SET search_path entscheidet der Aufrufer, wo Namen gesucht werden.
    // Aus einer SECURITY-DEFINER-Umgebung heraus laesst sich damit eigener
    // Code unterschieben.
    const ohnePfad: string[] = [];
    const zuletzt = new Map<string, string>();
    for (const inhalt of migrationen) {
      for (const m of inhalt.matchAll(
        /CREATE (?:OR REPLACE )?FUNCTION\s+public\.(\w+)\s*\([^)]*\)([\s\S]{0,500}?)AS\s+\$/g
      )) {
        zuletzt.set(m[1], m[2]);
      }
    }
    for (const [name, kopf] of zuletzt) {
      if (!kopf.includes("search_path")) ohnePfad.push(name);
    }
    expect(ohnePfad).toEqual([]);
  });
});

describe("Die Funktionen, die niemand von aussen braucht", () => {
  const nurServer = [
    "pending_digests",
    "push_targets_for_thread",
    "push_mark_failure",
    "backup_manifest",
    "backup_schema_ddl",
  ];

  it("entzieht sie PUBLIC, anon und authenticated", () => {
    for (const fn of nurServer) {
      const muster = new RegExp(
        `REVOKE ALL ON FUNCTION public\\.${fn}\\([^)]*\\) FROM PUBLIC, anon, authenticated;`
      );
      expect(muster.test(alles), fn).toBe(true);
    }
  });

  it("gibt sie dem Server ausdrücklich", () => {
    for (const fn of nurServer) {
      expect(alles, fn).toContain(`GRANT EXECUTE ON FUNCTION public.${fn}(`);
    }
  });
});
