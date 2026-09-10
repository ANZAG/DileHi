import { describe, expect, it } from "vitest";
import { AUSGANGSSTAND } from "./hilfe/datenbank";

/**
 * Wer darf welche Datenbankfunktion aufrufen — und ist der Aufbau vollständig?
 *
 * ── Warum das geprüft wird ─────────────────────────────────────────────────
 *
 * In Postgres darf PUBLIC jede neue Funktion ausführen, solange niemand
 * widerspricht. Bei Supabase heisst das: jeder Besucher, denn der
 * anon-Schlüssel steht im ausgelieferten Programm. So war `pending_digests()`
 * — Namen und alle ungelesenen Benachrichtigungen jedes Mitglieds — monatelang
 * für jeden aufrufbar. Nicht durch einen Fehler, sondern weil eine Zeile
 * fehlte.
 *
 * ── Was sich gegenüber der ersten Fassung geändert hat ─────────────────────
 *
 * Sie prüfte den Wortlaut einer Migration: Steht dort ein DO-Block? Wird
 * pg_trigger abgefragt? Das war eine Prüfung des Weges, nicht des Ziels.
 *
 * Jetzt wird der Ausgangsstand geprüft, also das, was eine neue Installation
 * wirklich bekommt. Und dort ist die Frage einfach: Ist zu jeder Funktion eine
 * Entscheidung getroffen?
 */

const funktionen = [...new Set(
  [...AUSGANGSSTAND.matchAll(/CREATE OR REPLACE FUNCTION public\.(\w+)/g)].map((m) => m[1])
)];

const entzogen = new Set(
  [...AUSGANGSSTAND.matchAll(/REVOKE ALL ON FUNCTION public\.(\w+)\(/g)].map((m) => m[1])
);

describe("Rechte an Datenbankfunktionen", () => {
  it("findet überhaupt Funktionen", () => {
    // Schuetzt vor dem stillen Gegenteil: Passt das Muster einmal nicht mehr,
    // liefen die Pruefungen unten ueber leere Listen und waeren gruen.
    expect(funktionen.length).toBeGreaterThan(40);
    expect(entzogen.size).toBeGreaterThan(40);
  });

  it("entzieht jeder Funktion zuerst PUBLIC", () => {
    // PUBLIC schliesst jede kuenftige Datenbankrolle mit ein. Wer etwas darf,
    // soll es ausdruecklich duerfen.
    expect(funktionen.filter((f) => !entzogen.has(f))).toEqual([]);
  });

  it("setzt bei jeder Funktion einen festen Suchpfad", () => {
    // Ohne SET search_path entscheidet der Aufrufer, wo Namen gesucht werden.
    // Aus einer SECURITY-DEFINER-Umgebung heraus laesst sich damit eigener
    // Code unterschieben.
    const ohnePfad = [...AUSGANGSSTAND.matchAll(
      /CREATE OR REPLACE FUNCTION public\.(\w+)\s*\([^)]*\)([\s\S]{0,900}?)AS \$/g
    )]
      .filter((m) => !m[2].includes("search_path"))
      .map((m) => m[1]);
    expect([...new Set(ohnePfad)]).toEqual([]);
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

  it("gibt sie ausschliesslich dem Server", () => {
    for (const fn of nurServer) {
      const zeile = AUSGANGSSTAND.match(
        new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${fn}\\([^)]*\\) TO ([^;]+);`)
      );
      expect(zeile, `${fn}: keine GRANT-Zeile`).toBeTruthy();
      expect(zeile![1].trim(), fn).toBe("service_role");
    }
  });
});

/**
 * Der Aufbau muss vollständig sein.
 *
 * Die abgelösten Migrationen konnten das nicht: `role_catalog` und
 * `permission_catalog` wurden dort befüllt und abgefragt, aber nirgends
 * angelegt. Wer sie der Reihe nach einspielte, bekam eine Datenbank, in der die
 * Rechteverwaltung nicht lud.
 *
 * Genau das soll der Ausgangsstand geraderücken, also wird es hier geprüft.
 */
describe("Vollständigkeit des Ausgangsstands", () => {
  const angelegt = new Set(
    [...AUSGANGSSTAND.matchAll(/CREATE TABLE public\.(\w+)/g)].map((m) => m[1])
  );
  const befuellt = new Set(
    [...AUSGANGSSTAND.matchAll(/INSERT INTO public\.(\w+)/g)].map((m) => m[1])
  );

  it("findet Tabellen und Startdaten", () => {
    expect(angelegt.size).toBeGreaterThan(40);
    expect(befuellt.size).toBeGreaterThan(8);
  });

  it("legt jede Tabelle an, in die er schreibt", () => {
    expect([...befuellt].filter((t) => !angelegt.has(t))).toEqual([]);
  });

  it("bringt die Rolle mit, die Rechte vergeben darf", () => {
    // Ohne sie gaebe es keinen Weg in die Verwaltung – auch nicht ueber die
    // Einrichtungsseite, die genau diese Rolle sucht.
    expect(AUSGANGSSTAND).toContain("'roles.manage'");
    expect(AUSGANGSSTAND).toContain("INSERT INTO public.role_catalog");
    expect(AUSGANGSSTAND).toContain("INSERT INTO public.role_permissions");
  });

  it("kann den ersten Zugang anlegen", () => {
    expect(AUSGANGSSTAND).toContain("FUNCTION public.setup_needed");
  });
});
