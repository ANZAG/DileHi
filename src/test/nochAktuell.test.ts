import { describe, expect, it } from "vitest";
import { istNochAktuell } from "@/components/events/nochAktuell";

const ort = (j: number, m: number, t: number, h = 0, min = 0, s = 0) =>
  new Date(j, m - 1, t, h, min, s).toISOString();

describe("istNochAktuell", () => {
  // Nienover: öffentlich, 25.–27.09.2026 – verschwand bisher am ersten Tag.
  const lager = { start_date: ort(2026, 9, 25), end_date: ort(2026, 9, 27, 23, 59, 59) };

  it("zeigt einen laufenden mehrtägigen Termin bis zum letzten Tag", () => {
    expect(istNochAktuell(lager, new Date(2026, 8, 25, 12))).toBe(true);
    expect(istNochAktuell(lager, new Date(2026, 8, 27, 23, 59))).toBe(true);
    expect(istNochAktuell(lager, new Date(2026, 8, 28, 0, 1))).toBe(false);
  });

  it("hält einen Termin mit Uhrzeit bis Mitternacht seines letzten Tages", () => {
    const ev = { start_date: ort(2026, 9, 25, 15), end_date: ort(2026, 9, 27, 14) };
    expect(istNochAktuell(ev, new Date(2026, 8, 27, 20))).toBe(true);
    expect(istNochAktuell(ev, new Date(2026, 8, 28, 8))).toBe(false);
  });

  it("nimmt ohne Ende den Tag des Beginns", () => {
    const ev = { start_date: ort(2026, 9, 25, 19, 30), end_date: null };
    expect(istNochAktuell(ev, new Date(2026, 8, 25, 22))).toBe(true);
    expect(istNochAktuell(ev, new Date(2026, 8, 26, 0, 1))).toBe(false);
  });
});
