// @vitest-environment node
import { describe, expect, it } from "vitest";
// Bauwerkzeug, absichtlich kein Teil der Anwendung -- deshalb aus scripts/.
import { apr1 } from "../../scripts/apr1.mjs";

/**
 * Apaches Passwort-Hash, nachgebaut in `scripts/apr1.mjs`.
 *
 * `scripts/seite-bauen.mjs` baut damit den Verzeichnisschutz, wenn die Seite
 * ohne GitHub Actions gebaut wird. Stimmt der Hash nicht, nimmt Apache ihn
 * nicht an — und das merkt man erst am Webspace, an einem Anmeldefenster,
 * das jedes Passwort ablehnt.
 *
 * Die Vergleichswerte stammen aus `openssl passwd -apr1 -salt <salz> <pw>`.
 * Drei Fälle, die verschiedene Stellen des Verfahrens treffen: ein normales
 * Passwort, eines mit einem einzigen Zeichen (die Schleifen laufen dann fast
 * nicht) und ein langes mit Leerzeichen (mehr als ein MD5-Block).
 */
describe("apr1", () => {
  const faelle: [string, string, string][] = [
    ["geheim123", "abcdefgh", "$apr1$abcdefgh$q0UhLR3ts2RPgnlLwmzdt0"],
    ["k", "Xy1.zQ9w", "$apr1$Xy1.zQ9w$LzZ1MqU6pEjhf0OPl14kl/"],
    ["ein sehr langes Passwort mit Leerzeichen", "12345678",
     "$apr1$12345678$n4XSUu2lgkxuiOp3.ROfj."],
  ];

  for (const [passwort, salz, erwartet] of faelle) {
    it(`stimmt mit openssl überein: „${passwort.slice(0, 20)}"`, () => {
      expect(apr1(passwort, salz)).toBe(erwartet);
    });
  }

  it("liefert für dasselbe Passwort mit anderem Salz einen anderen Hash", () => {
    expect(apr1("geheim123", "abcdefgh")).not.toBe(apr1("geheim123", "hgfedcba"));
  });

  /** Umlaute gehen als UTF-8 hinein — wie bei openssl auch. */
  it("kommt mit Umlauten zurecht", () => {
    const h = apr1("Schlüssel", "abcdefgh");
    expect(h).toMatch(/^\$apr1\$abcdefgh\$[./0-9A-Za-z]{22}$/);
  });
});
