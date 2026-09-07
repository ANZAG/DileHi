import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildIcal,
  escapeIcal,
  foldLine,
  localDate,
  localDatePlusDays,
  utcTimestamp,
} from "../../supabase/functions/_shared/ical";

// ical.ts läuft produktiv unter Deno. Für die Tests genügt ein Stub der
// Umgebungsvariablen, die das Modul liest.
const env: Record<string, string> = {};

beforeEach(() => {
  vi.stubGlobal("Deno", { env: { get: (k: string) => env[k] } });
});

afterEach(() => {
  vi.unstubAllGlobals();
  for (const k of Object.keys(env)) delete env[k];
});

const TZ = "Europe/Berlin";

describe("localDate – Datum in der Kalenderzeitzone", () => {
  // Der eigentliche Fehler: Ein ganztägiger Termin wird als lokale Mitternacht
  // angelegt und deshalb als UTC-Vortag gespeichert. Wer den ISO-String
  // abschneidet, exportiert systematisch den falschen Tag.
  it("gibt den Sommertag zurück, nicht den UTC-Vortag", () => {
    // Eingabe war der 07.08.2026, gespeichert wurde 06.08. 22:00 UTC (CEST).
    expect(localDate("2026-08-06T22:00:00.000Z", TZ)).toBe("20260807");
  });

  it("gibt den Wintertag zurück, nicht den UTC-Vortag", () => {
    // Eingabe war der 15.01.2026, gespeichert wurde 14.01. 23:00 UTC (CET).
    expect(localDate("2026-01-14T23:00:00.000Z", TZ)).toBe("20260115");
  });

  it("bleibt bei Zeitpunkten mitten am Tag stabil", () => {
    expect(localDate("2026-06-15T12:00:00.000Z", TZ)).toBe("20260615");
  });
});

describe("localDatePlusDays – exklusives DTEND", () => {
  it("schiebt den letzten Tag um einen Tag nach hinten", () => {
    // Ende war der 09.08.2026 23:59:59 lokal → DTEND muss der 10.08. sein.
    expect(localDatePlusDays("2026-08-09T21:59:59.000Z", TZ, 1)).toBe("20260810");
  });

  it("rechnet über Monatsgrenzen korrekt", () => {
    // 31.08.2026 lokal, +1 Tag → 01.09.
    expect(localDatePlusDays("2026-08-31T12:00:00.000Z", TZ, 1)).toBe("20260901");
  });

  it("rechnet über Jahresgrenzen korrekt", () => {
    expect(localDatePlusDays("2026-12-31T12:00:00.000Z", TZ, 1)).toBe("20270101");
  });
});

describe("utcTimestamp", () => {
  it("formatiert nach RFC 5545 mit Z-Suffix", () => {
    expect(utcTimestamp("2026-04-27T18:00:00.000Z")).toBe("20260427T180000Z");
  });
});

describe("escapeIcal", () => {
  it("maskiert Semikolon, Komma und Backslash", () => {
    expect(escapeIcal("Burg; Turm, Halle\\Keller")).toBe("Burg\\; Turm\\, Halle\\\\Keller");
  });

  it("wandelt CRLF in \\n um – ein rohes CR bricht strenge Parser", () => {
    expect(escapeIcal("Zeile 1\r\nZeile 2")).toBe("Zeile 1\\nZeile 2");
    expect(escapeIcal("Alt-Mac\rStil")).toBe("Alt-Mac\\nStil");
  });
});

describe("foldLine", () => {
  it("lässt kurze Zeilen unverändert", () => {
    expect(foldLine("SUMMARY:Kurz")).toBe("SUMMARY:Kurz");
  });

  it("faltet lange Zeilen mit CRLF und führendem Leerzeichen", () => {
    const long = "DESCRIPTION:" + "a".repeat(200);
    const folded = foldLine(long);
    expect(folded).toContain("\r\n ");
    for (const segment of folded.split("\r\n ")) {
      expect(new TextEncoder().encode(segment).length).toBeLessThanOrEqual(75);
    }
  });

  it("zählt Oktette, nicht Zeichen – Umlaute belegen zwei Bytes", () => {
    const folded = foldLine("LOCATION:" + "ä".repeat(60));
    for (const segment of folded.split("\r\n ")) {
      expect(new TextEncoder().encode(segment).length).toBeLessThanOrEqual(75);
    }
  });
});

describe("buildIcal", () => {
  const calendar = { name: "Testverein – Termine", filename: "test.ics" };

  it("erzeugt für einen ganztägigen Termin DTSTART und ein exklusives DTEND", () => {
    const ics = buildIcal(
      [{
        id: "abc",
        title: "Bachrittertage",
        start_date: "2026-08-06T22:00:00.000Z", // = 07.08. lokal
        end_date: "2026-08-09T21:59:59.000Z",   // = 09.08. lokal
        all_day: true,
        created_at: "2026-03-20T12:28:11.000Z",
      }],
      calendar
    );
    expect(ics).toContain("DTSTART;VALUE=DATE:20260807");
    expect(ics).toContain("DTEND;VALUE=DATE:20260810");
  });

  it("setzt bei eintägigen Terminen ohne Enddatum trotzdem ein DTEND", () => {
    // Ohne DTEND zeigt Outlook ganztägige Termine nicht zuverlässig an.
    const ics = buildIcal(
      [{ id: "x", title: "Messe", start_date: "2026-08-06T22:00:00.000Z", all_day: true }],
      calendar
    );
    expect(ics).toContain("DTSTART;VALUE=DATE:20260807");
    expect(ics).toContain("DTEND;VALUE=DATE:20260808");
  });

  it("gibt getakteten Terminen ohne Ende eine Dauer statt null Minuten", () => {
    const ics = buildIcal(
      [{ id: "y", title: "Stammtisch", start_date: "2026-04-27T18:00:00.000Z", all_day: false }],
      calendar
    );
    expect(ics).toContain("DTSTART:20260427T180000Z");
    expect(ics).toContain("DURATION:PT1H");
  });

  it("nutzt durchgehend CRLF als Zeilenende", () => {
    const ics = buildIcal(
      [{ id: "z", title: "Test", start_date: "2026-04-27T18:00:00.000Z" }],
      calendar
    );
    expect(ics.split("\n").length).toBe(ics.split("\r\n").length);
    expect(ics.endsWith("\r\n")).toBe(true);
  });

  it("sendet X-PUBLISHED-TTL, weil Outlook REFRESH-INTERVAL ignoriert", () => {
    const ics = buildIcal([], calendar);
    expect(ics).toContain("X-PUBLISHED-TTL:PT1H");
    expect(ics).toContain("REFRESH-INTERVAL;VALUE=DURATION:PT1H");
  });

  it("bildet die UID aus der konfigurierten Domain, nicht aus einem festen Wert", () => {
    env.SITE_URL = "https://verein.example";
    const ics = buildIcal(
      [{ id: "uid-1", title: "Test", start_date: "2026-04-27T18:00:00.000Z" }],
      calendar
    );
    expect(ics).toContain("UID:uid-1@verein.example");
  });
});
