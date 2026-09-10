import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * Datenbankfunktionen: Gibt es sie, und darf sie der Richtige aufrufen?
 *
 * ── Der Fehler, der diese Datei ausgelöst hat ──────────────────────────────
 *
 * Die Migration, die Ausführungsrechte zurechtrückt, zählte die Funktionen
 * namentlich auf. Sie scheiterte an der ersten Zeile:
 * `create_forum_mention_notifications()` gibt es seit Mai nicht mehr.
 *
 * Die Liste war aus den CREATE-Anweisungen aller Migrationen entstanden – und
 * hatte die DROPs übersehen. Genau diese halbe Buchführung prüft der erste
 * Block hier: Ein Bestand, der nur Zugänge kennt, stimmt nie.
 *
 * ── Und der Grund für die Migration selbst ─────────────────────────────────
 *
 * In Postgres darf PUBLIC jede neue Funktion ausführen, solange niemand
 * widerspricht. Bei Supabase heisst das: jeder Besucher, denn der
 * anon-Schlüssel steht im ausgelieferten Programm. So war `pending_digests()`
 * – Namen und alle ungelesenen Benachrichtigungen jedes Mitglieds – für jeden
 * aufrufbar. Nicht durch einen Fehler, sondern weil eine Zeile fehlte.
 */

const ORDNER = "supabase/migrations";

const dateien = readdirSync(ORDNER)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const migrationen = dateien.map((f) =>
  readFileSync(`${ORDNER}/${f}`, "utf-8").replace(/\r\n/g, "\n")
);
const alles = migrationen.join("\n");

/**
 * Der Bestand: angelegt minus gelöscht, in der Reihenfolge der Migrationen.
 *
 * `CASCADE` bei einem DROP zieht abhängige Objekte mit, aber keine anderen
 * Funktionen – für die Buchführung hier ist das ohne Belang.
 */
const vorhanden = new Map<string, string>();
for (const inhalt of migrationen) {
  /*
   * In Lesereihenfolge, nicht erst alle CREATE und dann alle DROP.
   *
   * Der erste Anlauf machte zwei Durchgänge je Datei – und lag bei jedem
   * `DROP FUNCTION IF EXISTS x(); CREATE FUNCTION x()` falsch, weil der DROP
   * am Ende gewann. Sechs Funktionen galten so als gelöscht, obwohl sie
   * direkt darunter neu angelegt werden. Genau der Fehler, den dieser Test
   * finden soll, nur eine Ebene höher.
   */
  const schritte =
    /CREATE (?:OR REPLACE )?FUNCTION\s+public\.(\w+)\s*\([^)]*\)([\s\S]{0,4000}?)AS\s+\$|DROP FUNCTION\s+(?:IF EXISTS\s+)?public\.(\w+)\s*\(/g;
  for (const m of inhalt.matchAll(schritte)) {
    if (m[1]) vorhanden.set(m[1], m[2]);
    else if (m[3]) vorhanden.delete(m[3]);
  }
}

/** Funktionen, die eine Migration namentlich anspricht. */
const angesprochen = [...new Set(
  [...alles.matchAll(/(?:GRANT|REVOKE)\s+(?:EXECUTE|ALL)\s+ON\s+FUNCTION\s+public\.(\w+)\s*\(/g)]
    .map((m) => m[1])
)];

describe("Bestand der Datenbankfunktionen", () => {
  it("findet überhaupt welche", () => {
    // Schuetzt vor dem stillen Gegenteil: Passt das Muster einmal nicht mehr,
    // liefen die Pruefungen unten ueber leere Listen und waeren gruen.
    expect(vorhanden.size).toBeGreaterThan(40);
    expect(angesprochen.length).toBeGreaterThan(10);
  });

  /**
   * Funktionen, die benutzt, aber in keiner Migration angelegt werden.
   *
   * Fünf standen hier: get_member_directory, get_member_ids,
   * get_permission_catalog, get_role_catalog, touch_election_on_vote. Sie sind
   * mit ihren echten Definitionen aus der laufenden Datenbank nachgetragen
   * (20260909320000), deshalb ist die Liste leer.
   *
   * Leer soll sie bleiben. Wächst sie, ist wieder eine Funktion am
   * Migrationsweg vorbei entstanden – und eine zweite Installation bekäme sie
   * nicht.
   */
  const AUSSERHALB_DER_HISTORIE: string[] = [];

  it("spricht keine Funktion an, die es nicht mehr gibt", () => {
    // Der Fehler von heute: REVOKE auf eine Funktion, die im Mai geloescht
    // wurde. Postgres kennt kein „REVOKE IF EXISTS", die Migration bricht ab.
    const verschwunden = angesprochen
      .filter((f) => !vorhanden.has(f))
      .filter((f) => !AUSSERHALB_DER_HISTORIE.includes(f));
    expect(verschwunden).toEqual([]);
  });

  it("lässt die Lücke in der Historie nicht wachsen", () => {
    const luecke = angesprochen.filter((f) => !vorhanden.has(f));
    expect(luecke.sort()).toEqual([...AUSSERHALB_DER_HISTORIE].sort());
  });

  it("setzt bei jeder Funktion einen festen Suchpfad", () => {
    // Ohne SET search_path entscheidet der Aufrufer, wo Namen gesucht werden.
    // Aus einer SECURITY-DEFINER-Umgebung heraus laesst sich damit eigener
    // Code unterschieben.
    const ohnePfad = [...vorhanden.entries()]
      .filter(([, kopf]) => !kopf.includes("search_path"))
      .map(([name]) => name);
    expect(ohnePfad).toEqual([]);
  });
});

describe("Die Rechte-Migration", () => {
  const migration = readFileSync(
    `${ORDNER}/20260909310000_funktionsrechte.sql`,
    "utf-8"
  ).replace(/\r\n/g, "\n");

  it("nennt die Funktionen, die nur der Server braucht", () => {
    for (const fn of [
      "pending_digests",
      "push_targets_for_thread",
      "push_mark_failure",
      "backup_manifest",
      "backup_schema_ddl",
    ]) {
      expect(migration, fn).toContain(`'${fn}'`);
    }
    expect(migration).toContain("FROM PUBLIC, anon, authenticated");
    expect(migration).toContain("TO service_role");
  });

  it("leitet die Triggerfunktionen aus den Triggern ab", () => {
    // Eine abgeschriebene Liste von Triggerfunktionen veraltet genauso wie die
    // von heute. Was ein Trigger ruft, weiss die Datenbank besser.
    expect(migration).toContain("FROM pg_trigger t");
    expect(migration).toContain("NOT t.tgisinternal");
  });

  it("überspringt, was es nicht gibt", () => {
    // Der eigentliche Unterschied zur ersten Fassung: Die Schleife laeuft ueber
    // pg_proc, also ueber das, was wirklich da ist.
    expect(migration).toContain("FROM pg_proc p");
    expect(migration).toContain("p.proname = ANY(v_namen)");
  });
});

/**
 * Die Lücke, die bleibt: drei Tabellen.
 *
 * `role_catalog` und `permission_catalog` werden befüllt, verändert und
 * abgefragt – angelegt werden sie nirgends. Wer die Migrationen
 * der Reihe nach einspielt, bekommt eine Datenbank, in der die
 * Rechteverwaltung nicht lädt.
 *
 * Das ist kein Schönheitsfehler, sondern der Grund, warum es einen
 * Ausgangsstand aus der laufenden Datenbank braucht (siehe docs/standalone.md).
 * Der Test hält fest, dass die Liste nicht wächst.
 */
describe("Tabellen ohne CREATE in der Historie", () => {
  // role_permissions wird angelegt, die beiden Kataloge nicht.
  const BEKANNTE_LUECKE = ["permission_catalog", "role_catalog"];

  const angelegteTabellen = new Set(
    [...alles.matchAll(/CREATE TABLE (?:IF NOT EXISTS )?public\.(\w+)/g)].map((m) => m[1])
  );

  /** Tabellen, in die eine Migration schreibt oder die sie verändert. */
  const benutzteTabellen = new Set(
    [...alles.matchAll(/(?:INSERT INTO|ALTER TABLE|UPDATE|DELETE FROM)\s+public\.(\w+)/g)]
      .map((m) => m[1])
  );

  it("findet überhaupt Tabellen", () => {
    expect(angelegteTabellen.size).toBeGreaterThan(40);
    expect(benutzteTabellen.size).toBeGreaterThan(20);
  });

  it("lässt die Lücke nicht wachsen", () => {
    const fehlend = [...benutzteTabellen].filter((t) => !angelegteTabellen.has(t)).sort();
    expect(fehlend).toEqual(BEKANNTE_LUECKE);
  });
});
