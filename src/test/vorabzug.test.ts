import { describe, it, expect, afterEach } from "vitest";
import { vorabzug } from "@/lib/vorabzug";

/**
 * Der Stand vom Bauen (`window.__VORAB`), mit dem die Seite beginnt, statt
 * erst die Vorgaben zu zeigen. Fehlt er oder ist er kaputt, gilt er als
 * nicht da – die Seite fragt dann wie früher.
 */
describe("vorabzug", () => {
  const w = window as unknown as { __VORAB?: unknown };
  afterEach(() => { delete w.__VORAB; });

  it("liefert den Stand vom Bauen", () => {
    w.__VORAB = { branding: { org_name: "Beispielverein" }, menue: { zeilen: [], seiten: {} } };
    expect(vorabzug()?.branding?.org_name).toBe("Beispielverein");
  });

  it("gibt ohne oder mit unbrauchbarem Stand nichts zurück", () => {
    expect(vorabzug()).toBeNull();
    w.__VORAB = "kaputt";
    expect(vorabzug()).toBeNull();
  });
});
