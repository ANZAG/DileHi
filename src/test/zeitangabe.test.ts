import { describe, expect, it } from "vitest";
import { zeitangabe } from "@/components/events/zeitangabe";

// Uhrzeiten in Ortszeit gebaut, damit der Test in jeder Zeitzone dasselbe prüft.
const ort = (j: number, m: number, t: number, h = 0, min = 0) => new Date(j, m - 1, t, h, min).toISOString();

describe("zeitangabe", () => {
  it("nennt am selben Tag nur die Uhrzeiten", () => {
    expect(zeitangabe({ start_date: ort(2026, 10, 10, 14), end_date: ort(2026, 10, 10, 18), all_day: false })).toBe("14:00 – 18:00");
  });

  it("nennt ohne Ende nur den Beginn", () => {
    expect(zeitangabe({ start_date: ort(2026, 10, 21, 19, 30), end_date: null, all_day: false })).toBe("19:30");
  });

  it("nennt über mehrere Tage zu jeder Uhrzeit den Tag", () => {
    // Das Lager, das früher als „15:00 – 14:00" dastand.
    expect(zeitangabe({ start_date: ort(2026, 10, 2, 15), end_date: ort(2026, 10, 4, 14), all_day: false })).toBe(
      "Fr 2. Okt., 15:00 – So 4. Okt., 14:00"
    );
  });

  it("nennt einen ganztägigen Tag als ganztägig", () => {
    expect(zeitangabe({ start_date: ort(2026, 10, 17), end_date: ort(2026, 10, 17), all_day: true })).toBe("Ganztägig");
  });

  it("nennt mehrtägige ganztägige Termine wie bisher mit Tagen", () => {
    expect(zeitangabe({ start_date: ort(2026, 10, 17), end_date: ort(2026, 10, 18), all_day: true })).toBe("17. Okt. – 18. Okt.");
  });
});
