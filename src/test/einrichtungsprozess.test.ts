// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  SCHRITTE,
  istErledigt,
  naechsterSchritt,
  zeigen,
  fortschritt,
} from "@/lib/einrichtungsprozess";
import type { Befund } from "@/lib/einrichtung";

/**
 * Der geführte Durchlauf.
 *
 * Geprüft wird, was er entscheidet: welcher Schritt dran ist, wann einer als
 * erledigt gilt, und dass er niemanden festhält — ein übersprungener Schritt
 * darf nicht beim nächsten Öffnen wieder vorne stehen.
 */

const leer: Befund = {
  datenbank: {
    rollen_vergeben: 1,
    mitglieder: 1,
    module: 19,
    verein: { org_form: "club" },
    durchlauf: { schritt: 0, fertig_am: null },
  },
  secrets: { mail: ["SMTP_HOST"] },
};

const fertig: Befund = {
  datenbank: {
    rollen_vergeben: 3,
    mitglieder: 8,
    module: 19,
    verein: {
      org_form: "registered_club",
      name: "Turnverein Beispiel e. V.",
      anschrift: true,
      email: "post@beispiel.org",
      vorstand: true,
      register: true,
      absender: "post@beispiel.org",
      logo: true,
      farbe_gesetzt: true,
    },
    durchlauf: { schritt: 0, fertig_am: null },
  },
  secrets: { mail: [] },
};

describe("Der geführte Einrichtungsprozess", () => {
  it("fragt zuerst nach der Form – alles andere hängt daran", () => {
    expect(SCHRITTE[0].id).toBe("form");
    expect(SCHRITTE[1].id).toBe("verein");
    // Das Erscheinungsbild früh, solange die Lust noch da ist.
    expect(SCHRITTE.findIndex((s) => s.id === "aussehen")).toBeLessThan(
      SCHRITTE.findIndex((s) => s.id === "module")
    );
    // Und die Rollen erst nach den Modulen: Abgeschaltete Module verstecken
    // Rechte.
    expect(SCHRITTE.findIndex((s) => s.id === "rollen")).toBeGreaterThan(
      SCHRITTE.findIndex((s) => s.id === "module")
    );
  });

  it("sagt zu jedem Schritt, warum er kommt", () => {
    for (const s of SCHRITTE) {
      expect(s.titel.length, s.id).toBeGreaterThan(5);
      expect(s.warum.length, s.id).toBeGreaterThan(20);
    }
  });

  it("erkennt eine frische Installation am zweiten Schritt", () => {
    // Die Form steht (Vorgabe), die Daten fehlen.
    expect(naechsterSchritt(leer, { schritt: 0 })).toBe(1);
  });

  it("hält niemanden fest, der einen Schritt überspringt", () => {
    // Schritt 1 (die Daten) übersprungen: Der Durchlauf geht weiter, statt
    // dieselbe Frage noch einmal zu stellen.
    expect(naechsterSchritt(leer, { schritt: 2 })).toBeGreaterThan(1);
  });

  it("ist bei einer eingerichteten Installation durch", () => {
    expect(naechsterSchritt(fertig, { schritt: 0 })).toBe(SCHRITTE.length);
    expect(fortschritt(fertig, { schritt: 0 }).fertig).toBe(SCHRITTE.length);
  });

  it("verlangt von einer Interessengemeinschaft keinen Vorstand", () => {
    const ig: Befund = {
      datenbank: {
        ...fertig.datenbank!,
        verein: {
          org_form: "interest_group",
          name: "IG Beispiel",
          anschrift: true,
          email: "post@beispiel.org",
          vorstand: false,
          register: false,
          absender: "post@beispiel.org",
          logo: true,
        },
      },
      secrets: { mail: [] },
    };
    expect(istErledigt("verein", ig)).toBe(true);

    // Derselbe Stand als eingetragener Verein: nicht erledigt.
    const ev: Befund = {
      datenbank: {
        ...ig.datenbank!,
        verein: { ...ig.datenbank!.verein!, org_form: "registered_club" },
      },
      secrets: { mail: [] },
    };
    expect(istErledigt("verein", ev)).toBe(false);
  });

  it("zählt den Mailversand erst als erledigt, wenn er wirklich steht", () => {
    expect(istErledigt("mail", leer)).toBe(false);
    expect(istErledigt("mail", fertig)).toBe(true);
  });

  it("öffnet sich nicht mehr, wenn der Durchlauf beendet wurde", () => {
    expect(zeigen({ schritt: 0, fertig_am: null })).toBe(true);
    expect(zeigen({ schritt: 7, fertig_am: "2026-09-16T20:00:00Z" })).toBe(false);
    expect(zeigen(null)).toBe(true);
  });

  it("schickt jeden Schritt an eine Stelle, die es in der Verwaltung gibt", () => {
    // Der Durchlauf baut die Masken nicht nach, er zeigt die echten. Was er
    // dabei nennt, muss es als Verwaltungsbereich geben – sonst führt er ins
    // Leere.
    const bereiche = ["erscheinungsbild", "module", "rollen", "members"];
    for (const s of SCHRITTE) {
      if (s.bereich) expect(bereiche, s.id).toContain(s.bereich);
    }
  });
});
