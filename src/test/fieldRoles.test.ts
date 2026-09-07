import { describe, expect, it } from "vitest";
import {
  FIELD_ROLES,
  findFieldByRole,
  findFieldsByRole,
  roleOf,
  rolesForFieldType,
} from "@/components/event-forms/fieldRoles";
import { DEFAULT_TEMPLATE_FIELDS } from "@/components/event-forms/defaultTemplate";
import type { FormField } from "@/components/event-forms/types";

// Kern dieser Tests: Die Auswertung darf nicht davon abhaengen, wie ein Feld
// beschriftet ist. Ein Verein, der sein Feld "Auto" statt "Reise mit eigenem
// PKW an" nennt, muss dieselben Kennzahlen bekommen.

const field = (
  id: string,
  type: string,
  label: string,
  settings: Record<string, unknown> = {}
): FormField =>
  ({ id, type, label, settings, options: [], required: false, sort_order: 0, description: null }) as FormField;

describe("Rollenkatalog", () => {
  it("hat eindeutige Schlüssel", () => {
    const keys = FIELD_ROLES.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("bietet für einen Feldtyp nur passende Rollen an", () => {
    for (const role of rolesForFieldType("checkbox")) {
      expect(role.fieldTypes).toContain("checkbox");
    }
    // Ein Abschnitt ist keine Frage und kann nichts speisen.
    expect(rolesForFieldType("section")).toEqual([]);
  });
});

describe("findFieldByRole – Rolle schlägt Beschriftung", () => {
  it("findet das Feld unabhängig von der Beschriftung", () => {
    const fields = [
      field("a", "checkbox", "Auto", { role: "transport.own_car" }),
      field("b", "checkbox", "Kommt mit dem PKW"), // Altwort, aber ohne Rolle
    ];
    expect(findFieldByRole(fields, "transport.own_car")?.id).toBe("a");
  });

  it("greift auf die Beschriftung zurück, solange kein Feld eine Rolle trägt", () => {
    // Formulare aus der Zeit vor der Migration muessen unveraendert funktionieren.
    const fields = [field("alt", "checkbox", "Reise mit eigenem PKW an")];
    expect(findFieldByRole(fields, "transport.own_car")?.id).toBe("alt");
  });

  it("nutzt die Beschriftung NICHT mehr, sobald das Formular verrollt ist", () => {
    // Sonst würde ein bewusst rollenlos gelassenes Feld doch wieder mitgezählt.
    const fields = [
      field("tage", "attendance_days", "Tage", { role: "attendance.days" }),
      field("frei", "checkbox", "Reise mit eigenem PKW an"),
    ];
    expect(findFieldByRole(fields, "transport.own_car")).toBeUndefined();
  });

  it("verwechselt Anhänger nicht mit PKW", () => {
    const fields = [
      field("pkw", "checkbox", "Reise mit eigenem PKW an"),
      field("zieh", "checkbox", "Kann einen Anhänger mit dem PKW ziehen"),
      field("stell", "checkbox", "Kann einen Anhänger zur Verfügung stellen"),
    ];
    expect(findFieldByRole(fields, "transport.own_car")?.id).toBe("pkw");
    expect(findFieldByRole(fields, "transport.can_tow")?.id).toBe("zieh");
    expect(findFieldByRole(fields, "transport.trailer")?.id).toBe("stell");
  });

  it("liefert nichts für eine Rolle, die im Formular nicht vorkommt", () => {
    // Der Auswertungsblock darf dann nicht leer angezeigt werden, sondern gar nicht.
    const fields = [field("x", "text", "Lieblingsfarbe", { role: undefined })];
    expect(findFieldByRole(fields, "helper.kitchen")).toBeUndefined();
  });
});

describe("findFieldsByRole", () => {
  it("gibt alle Felder einer Rolle zurück", () => {
    const fields = [
      field("a", "checkbox", "Küche Samstag", { role: "helper.kitchen" }),
      field("b", "checkbox", "Sonstiges"),
    ];
    expect(findFieldsByRole(fields, "helper.kitchen").map((f) => f.id)).toEqual(["a"]);
  });

  it("zählt im Rückfallweg mehrere Treffer, so wie die alte Auswertung", () => {
    const fields = [
      field("a", "checkbox", "Helfe im Orgateam Küche mit"),
      field("b", "checkbox", "Küchendienst Sonntag"),
    ];
    expect(findFieldsByRole(fields, "helper.kitchen")).toHaveLength(2);
  });
});

describe("Standardvorlage", () => {
  const fields = DEFAULT_TEMPLATE_FIELDS.map((f, i) =>
    field(`f${i}`, f.type, f.label, f.settings as Record<string, unknown>)
  );

  it("vergibt jede Rolle höchstens einmal", () => {
    const used = fields.map(roleOf).filter(Boolean);
    expect(new Set(used).size).toBe(used.length);
  });

  it("nutzt nur Rollen, die es im Katalog gibt, und passende Feldtypen", () => {
    for (const f of fields) {
      const key = roleOf(f);
      if (!key) continue;
      const role = FIELD_ROLES.find((r) => r.key === key);
      expect(role, `unbekannte Rolle ${key}`).toBeDefined();
      expect(role!.fieldTypes, `${key} passt nicht zu ${f.type}`).toContain(f.type);
    }
  });

  it("bündelt die Helferaufgaben in einem Feld statt in drei", () => {
    // Frueher: Mehrfachauswahl "Auf-/Abbau" plus zwei einzelne Kaestchen fuer
    // Kueche und Einkauf. Jetzt eine Frage mit Terminen je Aufgabe.
    const helper = findFieldByRole(fields, "helper.tasks");
    expect(helper?.type).toBe("helper_tasks");
    const tasks = (helper?.settings as { tasks?: { key: string; label: string }[] })?.tasks ?? [];
    expect(tasks.map((t) => t.key)).toEqual([
      "lager-beladen", "aufbau", "abbau", "lager-entladen", "einkauf", "kochen",
    ]);
    expect(new Set(tasks.map((t) => t.key)).size).toBe(tasks.length);
    expect(findFieldByRole(fields, "helper.kitchen")).toBeUndefined();
    expect(findFieldByRole(fields, "helper.shopping")).toBeUndefined();
  });

  it("deckt alle Kennzahlen der Auswertung ab", () => {
    // Wer die Vorlage nimmt, bekommt eine vollstaendige Auswertung - ohne
    // diesen Test faellt eine fehlende Rolle erst dem Verein auf.
    for (const key of [
      "attendance.days", "lodging.tent",
      "transport.own_car", "transport.seats", "transport.can_tow", "transport.trailer",
      "catering.diet", "catering.allergies",
      "helper.tasks",
      "display.brings", "display.description",
    ]) {
      expect(findFieldByRole(fields, key), `Vorlage hat kein Feld für ${key}`).toBeDefined();
    }
  });
});
