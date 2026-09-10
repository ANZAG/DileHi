import { startdaten } from "./hilfe/datenbank";
import { describe, expect, it } from "vitest";
import { ANTRAG_FELDTYPEN, istKernfeld } from "@/hooks/useAntragsfelder";
import { FIELD_TYPES } from "@/components/event-forms/types";

/**
 * Der Aufnahmeantrag wird aus der Verwaltung zusammengestellt – aber nicht
 * beliebig. Ein Teil der Felder ist tragend: Aus Vorname, Nachname und E-Mail
 * legt invite-member das Konto an, Anschrift und Geburtsdatum wandern ins
 * Profil. Fehlt eines davon, scheitert die Aufnahme erst beim naechsten
 * Antrag – lange nachdem jemand das Feld geloescht hat.
 */
describe("Felder des Aufnahmeantrags", () => {
  /** Die Felder, die eine neue Installation mitbekommt. */
  const felder = startdaten("application_fields");

  it("legt jedes tragende Feld an, das die Aufnahme braucht", () => {
    // Die Liste stammt aus invite-member (Konto und Profil) und aus
    // submit-application (Pflichtangaben beim Speichern).
    expect(felder.length).toBeGreaterThan(5);
    const schluessel = felder.map((f) => f.column_name);
    for (const spalte of [
      "salutation", "first_name", "last_name", "email",
      "phone", "birthdate", "street", "zip", "city",
    ]) {
      expect(schluessel, spalte).toContain(spalte);
    }
  });

  it("bietet nur Feldtypen an, die es auch gibt", () => {
    // Ein Tippfehler in der Liste hiesse: Der Typ taucht in der Auswahl nicht
    // auf, ohne dass irgendwo etwas rot wird.
    const vorhanden = FIELD_TYPES.map((t) => t.value);
    for (const typ of ANTRAG_FELDTYPEN) {
      expect(vorhanden).toContain(typ);
    }
  });

  it("bietet keine Felder an, die nur zu Veranstaltungen passen", () => {
    for (const typ of ["tent", "helper_tasks", "attendance_days"]) {
      expect(ANTRAG_FELDTYPEN).not.toContain(typ);
    }
  });

  it("unterscheidet tragende Felder an der Spalte", () => {
    expect(istKernfeld({ column_name: "first_name" })).toBe(true);
    expect(istKernfeld({ column_name: null })).toBe(false);
  });

  it("legt jedes Feld nur einmal an", () => {
    // Sonst fragte der Antrag beim zweiten Aufsetzen alles doppelt. Frueher
    // hing das an einem WHERE NOT EXISTS in der Migration; im Ausgangsstand
    // zaehlt, dass keine Spalte zweimal vorkommt.
    const namen = felder.map((f) => f.column_name).filter(Boolean);
    expect(namen.length).toBe(new Set(namen).size);
  });
});
