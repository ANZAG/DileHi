import { describe, expect, it } from "vitest";
import { evaluateVisibility, describeVisibility, getVisibility } from "@/components/event-forms/conditions";
import type { FormField } from "@/components/event-forms/types";

// Die Bedingungs-Engine entscheidet, welche Formularfelder ein Mitglied bei der
// Anmeldung überhaupt zu sehen bekommt. Fehler hier fallen niemandem auf –
// das Feld ist dann einfach weg oder unerwartet da.

const field = (label: string, settings: Record<string, unknown> = {}): FormField =>
  ({ id: label.toLowerCase().replace(/\s+/g, "_"), label, type: "text", settings } as unknown as FormField);

describe("getVisibility – Altformat bleibt lesbar", () => {
  it("liest conditional_on ohne Wert als „angehakt“", () => {
    expect(getVisibility(field("Zelt", { conditional_on: "Übernachtung" }))).toEqual({
      logic: "and",
      rules: [{ field: "Übernachtung", op: "checked" }],
    });
  });

  it("liest conditional_value=false als „nicht angehakt“", () => {
    expect(getVisibility(field("Grund", { conditional_on: "Teilnahme", conditional_value: false }))).toEqual({
      logic: "and",
      rules: [{ field: "Teilnahme", op: "unchecked" }],
    });
  });

  it("liest einen konkreten Wert als Gleichheitsregel", () => {
    expect(getVisibility(field("Details", { conditional_on: "Rolle", conditional_value: "Küche" }))).toEqual({
      logic: "and",
      rules: [{ field: "Rolle", op: "equals", value: "Küche" }],
    });
  });

  it("gibt null zurück, wenn keine Bedingung gesetzt ist", () => {
    expect(getVisibility(field("Name"))).toBeNull();
  });
});

describe("evaluateVisibility", () => {
  const uebernachtung = field("Übernachtung");
  const rolle = field("Rolle");

  it("zeigt Felder ohne Bedingung immer", () => {
    expect(evaluateVisibility(field("Name"), [], {})).toBe(true);
  });

  it("wertet „angehakt“ aus", () => {
    const zelt = field("Zelt", { conditional_on: "Übernachtung" });
    const fields = [uebernachtung, zelt];
    expect(evaluateVisibility(zelt, fields, { [uebernachtung.id]: true })).toBe(true);
    expect(evaluateVisibility(zelt, fields, { [uebernachtung.id]: false })).toBe(false);
    expect(evaluateVisibility(zelt, fields, {})).toBe(false);
  });

  it("verknüpft mehrere Regeln mit UND", () => {
    const f = field("Sonderwunsch", {
      visibility: {
        logic: "and",
        rules: [
          { field: "Übernachtung", op: "checked" },
          { field: "Rolle", op: "equals", value: "Küche" },
        ],
      },
    });
    const fields = [uebernachtung, rolle, f];
    expect(evaluateVisibility(f, fields, { [uebernachtung.id]: true, [rolle.id]: "Küche" })).toBe(true);
    expect(evaluateVisibility(f, fields, { [uebernachtung.id]: true, [rolle.id]: "Aufbau" })).toBe(false);
  });

  it("verknüpft mehrere Regeln mit ODER", () => {
    const f = field("Hinweis", {
      visibility: {
        logic: "or",
        rules: [
          { field: "Übernachtung", op: "checked" },
          { field: "Rolle", op: "equals", value: "Küche" },
        ],
      },
    });
    const fields = [uebernachtung, rolle, f];
    expect(evaluateVisibility(f, fields, { [uebernachtung.id]: false, [rolle.id]: "Küche" })).toBe(true);
    expect(evaluateVisibility(f, fields, { [uebernachtung.id]: false, [rolle.id]: "Aufbau" })).toBe(false);
  });

  it("blockiert nicht, wenn das referenzierte Feld gelöscht wurde", () => {
    // Sonst verschwindet ein Feld unerklärlich, nachdem jemand ein anderes gelöscht hat.
    const f = field("Zelt", { conditional_on: "Gibt es nicht mehr" });
    expect(evaluateVisibility(f, [f], {})).toBe(true);
  });
});

describe("describeVisibility", () => {
  it("beschreibt wertfreie Operatoren ohne Wertangabe", () => {
    const text = describeVisibility(field("Zelt", { conditional_on: "Übernachtung" }));
    expect(text).toBe("Sichtbar wenn „Übernachtung\" ist angekreuzt (Ja)");
    // Kein Wert am Ende: "angekreuzt" ist ein wertfreier Operator.
    expect(text).not.toContain("„\"");
  });

  it("gibt null zurück, wenn keine Bedingung gesetzt ist", () => {
    expect(describeVisibility(field("Name"))).toBeNull();
  });
});
