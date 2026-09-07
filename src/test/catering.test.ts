import { describe, expect, it } from "vitest";
import { aggregateCatering, NO_DIET_ANSWER } from "@/components/evaluation/aggregateCatering";
import type { FormField } from "@/components/event-forms/types";

// Das ist die Zahl, nach der eingekauft wird. Ein Fehler darin faellt niemandem
// auf, bevor das Essen ausgeht.

const field = (id: string, type: string, options: string[] = []): FormField =>
  ({ id, type, label: id, options, settings: {}, required: false, sort_order: 0, description: null }) as FormField;

const tage = field("tage", "attendance_days");
const kost = field("kost", "select", ["normal", "vegetarisch", "vegan"]);
const allergien = field("allergien", "textarea");

const resp = (name: string, days: string[], diet?: string, allergy?: string) => ({
  respondent_name: name,
  answers: [
    { id: `${name}-1`, response_id: name, field_id: "tage", value: { all_days: false, days } },
    ...(diet !== undefined ? [{ id: `${name}-2`, response_id: name, field_id: "kost", value: diet }] : []),
    ...(allergy !== undefined ? [{ id: `${name}-3`, response_id: name, field_id: "allergien", value: allergy }] : []),
  ],
});

describe("aggregateCatering", () => {
  it("kreuzt Anwesenheitstage mit der Ernährungsweise", () => {
    const { days } = aggregateCatering(
      [
        resp("Anna", ["2026-08-15", "2026-08-16"], "vegetarisch"),
        resp("Bert", ["2026-08-15"], "normal"),
        resp("Cem", ["2026-08-16"], "vegetarisch"),
      ],
      tage, kost, allergien
    );

    expect(days).toEqual([
      { day: "2026-08-15", total: 2, byDiet: { vegetarisch: 1, normal: 1 } },
      { day: "2026-08-16", total: 2, byDiet: { vegetarisch: 2 } },
    ]);
  });

  it("sortiert die Tage chronologisch, unabhängig von der Antwortreihenfolge", () => {
    const { days } = aggregateCatering(
      [resp("Anna", ["2026-08-17", "2026-08-15", "2026-08-16"], "normal")],
      tage, kost
    );
    expect(days.map((d) => d.day)).toEqual(["2026-08-15", "2026-08-16", "2026-08-17"]);
  });

  it("führt fehlende Angaben als eigene Spalte, statt sie zu verschlucken", () => {
    // Wer nichts angibt, isst trotzdem – die Person darf in der Summe nicht fehlen.
    const { days } = aggregateCatering(
      [resp("Anna", ["2026-08-15"]), resp("Bert", ["2026-08-15"], "  ")],
      tage, kost
    );
    expect(days[0].total).toBe(2);
    expect(days[0].byDiet[NO_DIET_ANSWER]).toBe(2);
  });

  it("zählt einen doppelt eingetragenen Tag nur einmal", () => {
    const { days } = aggregateCatering(
      [resp("Anna", ["2026-08-15", "2026-08-15"], "vegan")],
      tage, kost
    );
    expect(days[0].total).toBe(1);
    expect(days[0].byDiet.vegan).toBe(1);
  });

  it("liefert nur die Tagesbelegung, wenn das Formular keine Ernährung erfragt", () => {
    const { days } = aggregateCatering([resp("Anna", ["2026-08-15"])], tage);
    expect(days[0].total).toBe(1);
    expect(days[0].byDiet).toEqual({ [NO_DIET_ANSWER]: 1 });
  });

  it("liefert nichts, wenn das Formular keine Anwesenheitstage erfragt", () => {
    // Dann darf der Block gar nicht erscheinen, statt leer dazustehen.
    const { days } = aggregateCatering([resp("Anna", ["2026-08-15"], "normal")], undefined, kost);
    expect(days).toEqual([]);
  });

  it("sammelt Allergien mit Namen und lässt leere Angaben weg", () => {
    const { allergies } = aggregateCatering(
      [
        resp("Anna", ["2026-08-15"], "normal", "Nussallergie"),
        resp("Bert", ["2026-08-15"], "normal", "   "),
        resp("Cem", ["2026-08-15"], "normal"),
      ],
      tage, kost, allergien
    );
    expect(allergies).toEqual([{ name: "Anna", text: "Nussallergie" }]);
  });
});
