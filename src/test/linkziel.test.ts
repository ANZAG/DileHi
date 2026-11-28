import { describe, expect, it } from "vitest";
import { istFremdeAdresse, sicheresZiel } from "@/lib/linkziel";

/**
 * Ziele aus dem Seitenbaukasten und dem Menü (Sicherheitsprüfung 28.11.2026).
 *
 * Wer Seiten bearbeiten darf, konnte als Ziel eines Knopfs `javascript:…`
 * eintragen. Das lief dann beim Klick im Browser jedes Besuchers.
 */
describe("sicheresZiel", () => {
  it("lässt eigene Seiten, Anker und gewöhnliche Adressen durch", () => {
    for (const ziel of [
      "/kontakt",
      "/en/verein?x=1#a",
      "#termine",
      "https://example.org/a:b",
      "http://example.org",
      "HTTPS://EXAMPLE.ORG",
      "mailto:vorstand@example.org",
      "tel:+49611123456",
      "unterseite",
    ]) {
      expect(sicheresZiel(ziel), ziel).toBe(ziel);
    }
  });

  it("schneidet Leerraum ab und gibt bei leerem Ziel nichts", () => {
    expect(sicheresZiel("  /kontakt ")).toBe("/kontakt");
    expect(sicheresZiel("")).toBeNull();
    expect(sicheresZiel("   ")).toBeNull();
    expect(sicheresZiel(undefined)).toBeNull();
    expect(sicheresZiel(null)).toBeNull();
  });

  it("weist Skripte und fremde Schemata ab, auch verkleidet", () => {
    for (const ziel of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      "  javascript:alert(1)",
      "java\tscript:alert(1)",
      "java\nscript:alert(1)",
      "\u0001javascript:alert(1)",
      "vbscript:msgbox(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
    ]) {
      expect(sicheresZiel(ziel), JSON.stringify(ziel)).toBeNull();
    }
  });
});

describe("istFremdeAdresse", () => {
  it("erkennt http und https, sonst nichts", () => {
    expect(istFremdeAdresse("https://example.org")).toBe(true);
    expect(istFremdeAdresse("HTTP://example.org")).toBe(true);
    expect(istFremdeAdresse("/kontakt")).toBe(false);
    expect(istFremdeAdresse("mailto:a@b.de")).toBe(false);
  });
});
