import { readFileSync } from "node:fs";
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
  const migration = readFileSync(
    "supabase/migrations/20260909140000_antragsfelder.sql",
    "utf-8"
  );

  it("legt jedes tragende Feld an, das die Aufnahme braucht", () => {
    // Die Liste stammt aus invite-member (Konto und Profil) und aus
    // submit-application (Pflichtangaben beim Speichern).
    for (const spalte of [
      "salutation", "first_name", "last_name", "email",
      "phone", "birthdate", "street", "zip", "city",
    ]) {
      expect(migration).toContain(`'${spalte}'`);
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

  it("legt die Felder nur an, wenn noch keine da sind", () => {
    // Sonst kaeme bei jedem erneuten Lauf der Migration die ganze Liste ein
    // zweites Mal dazu – und der Antrag fragte alles doppelt.
    expect(migration).toContain("WHERE NOT EXISTS (SELECT 1 FROM public.application_fields)");
  });
});
