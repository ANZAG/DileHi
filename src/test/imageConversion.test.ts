import { describe, expect, it } from "vitest";
import { MAX_KANTE, zielmass } from "@/lib/imageConversion";

describe("Bilder beim Hochladen verkleinern", () => {
  it("ein Kamerafoto kommt auf die Höchstkante, das Verhältnis bleibt", () => {
    expect(zielmass(6000, 4000)).toEqual({ breite: MAX_KANTE, hoehe: 1707 });
    expect(zielmass(3000, 4500)).toEqual({ breite: 1707, hoehe: MAX_KANTE });
  });

  it("kleine Bilder bleiben, wie sie sind – vergrössert wird nie", () => {
    expect(zielmass(800, 600)).toEqual({ breite: 800, hoehe: 600 });
    expect(zielmass(MAX_KANTE, 10)).toEqual({ breite: MAX_KANTE, hoehe: 10 });
  });
});
