// @vitest-environment node
import { readFileSync } from "node:fs";
import { seedRows } from "./hilfe/buehne";
import { describe, expect, it } from "vitest";
import { bereichAn, freieFelder, type Profilfeld } from "@/hooks/useProfilfelder";

const feld = (p: Partial<Profilfeld>): Profilfeld => ({
  id: p.id ?? "x",
  block_key: p.block_key ?? null,
  module: p.module ?? null,
  type: p.type ?? "text",
  label: p.label ?? "",
  description: null,
  required: false,
  sort_order: 0,
  options: [],
  settings: {},
  is_active: p.is_active ?? true,
});

describe("Bereiche des Mitgliederprofils", () => {
  it("zeigt einen eingeschalteten Bereich", () => {
    expect(bereichAn([feld({ block_key: "zelte", is_active: true })], "zelte")).toBe(true);
  });

  it("verbirgt einen abgeschalteten Bereich", () => {
    expect(bereichAn([feld({ block_key: "zelte", is_active: false })], "zelte")).toBe(false);
  });

  it("zeigt einen Bereich, den die Liste noch nicht kennt", () => {
    // Kommt vor, solange die Migration nicht eingespielt ist. Ein Block, der
    // dann stillschweigend fehlt, waere schwerer zu finden als einer, der da
    // ist und abgeschaltet werden kann.
    expect(bereichAn([], "zelte")).toBe(true);
  });

  it("zaehlt nur freie Felder zu den eigenen Angaben", () => {
    const liste = [
      feld({ id: "a", block_key: "zelte" }),
      feld({ id: "b", label: "Lieblingsepoche" }),
      feld({ id: "c", label: "Abgeschaltet", is_active: false }),
    ];
    expect(freieFelder(liste).map((f) => f.id)).toEqual(["b"]);
  });
});

const PROFILE_FIELDS = await seedRows<{ block_key: string | null }>("profile_fields");

describe("Startdaten der Profilfelder", () => {
  const felder = PROFILE_FIELDS;

  it("legt jeden Bereich an, den die Profilseite abfragt", () => {
    // Die Schluessel stehen in Profile.tsx. Ein Tippfehler hiesse: Der Bereich
    // gilt als unbekannt, ist damit immer sichtbar und laesst sich nicht
    // abschalten – ohne dass irgendwo etwas rot wird.
    const profil = readFileSync("src/pages/intern/Profile.tsx", "utf-8");
    for (const key of ["ernaehrung", "darstellung", "zelte", "karte", "antrag"]) {
      // Ohne die schliessende Klammer: Der Aufruf hat inzwischen ein drittes
      // Argument (die Module), und der Test soll die Verkabelung pruefen,
      // nicht die Anzahl der Parameter.
      expect(profil).toContain(`bereichAn(profilfelder, "${key}"`);
      expect(felder.map((f) => f.block_key)).toContain(key);
    }
  });

  it("legt jeden Bereich nur einmal an", () => {
    // Frueher haing das an einem WHERE NOT EXISTS in der Migration; im
    // Ausgangsstand zaehlt, dass kein Bereich doppelt vorkommt.
    const bereiche = felder.map((f) => f.block_key).filter(Boolean);
    expect(bereiche.length).toBe(new Set(bereiche).size);
  });
});
