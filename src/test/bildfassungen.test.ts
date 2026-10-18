import { describe, expect, it } from "vitest";
import { fassungPfad, noetigeBreiten, srcsetVon } from "@/lib/bildfassungen.mjs";

/**
 * Kleinere Fassungen der Bilder (src/lib/bildfassungen.mjs).
 */
const src = "https://abc.supabase.co/storage/v1/object/public/gallery/site/karte%20napoleonik.webp";

describe("noetigeBreiten", () => {
  it("nur deutlich kleinere Fassungen", () => {
    expect(noetigeBreiten(1920)).toEqual([400, 640, 960, 1280]);
    expect(noetigeBreiten(1000)).toEqual([400, 640]);
    expect(noetigeBreiten(400)).toEqual([]);
    expect(noetigeBreiten(0)).toEqual([]);
  });
});

describe("srcsetVon", () => {
  it("bietet die Fassungen und das Original an, kleinste zuerst", () => {
    expect(srcsetVon({ src, breite: 1920, fassungen: [960, 400] })).toBe(
      "https://abc.supabase.co/storage/v1/object/public/gallery/_fassungen/400/site/karte%20napoleonik.webp 400w, " +
      "https://abc.supabase.co/storage/v1/object/public/gallery/_fassungen/960/site/karte%20napoleonik.webp 960w, " +
      `${src} 1920w`,
    );
  });

  it("ohne Fassungen oder Breite nichts – dann gilt das Original allein", () => {
    expect(srcsetVon({ src, breite: 1920, fassungen: [] })).toBeUndefined();
    expect(srcsetVon({ src, breite: null, fassungen: [400] })).toBeUndefined();
    expect(srcsetVon({ src: "", breite: 1920, fassungen: [400] })).toBeUndefined();
  });

  it("nur für Bilder aus der Ablage", () => {
    expect(srcsetVon({ src: "https://example.org/bild.webp", breite: 1920, fassungen: [400] })).toBeUndefined();
  });

  it("keine Fassung, die grösser wäre als das Original", () => {
    expect(srcsetVon({ src, breite: 500, fassungen: [400, 640] })).toBe(
      `https://abc.supabase.co/storage/v1/object/public/gallery/_fassungen/400/site/karte%20napoleonik.webp 400w, ${src} 500w`,
    );
  });
});

describe("fassungPfad", () => {
  it("derselbe Name im Unterordner", () => {
    expect(fassungPfad("site/hero.webp", 640)).toBe("_fassungen/640/site/hero.webp");
  });
});
