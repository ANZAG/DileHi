import { describe, it, expect } from "vitest";
import { aufgeklappt, type MenuEintrag } from "@/hooks/useSiteMenu";

/**
 * Was unter einem Menüpunkt aufklappt.
 *
 * Der Punkt selbst steht mit in der Liste, damit seine Seite erreichbar
 * bleibt – aber nicht, wenn ein Unterpunkt schon dorthin führt. Sonst stünde
 * dieselbe Seite zweimal darin, einmal unter dem Namen der Gruppe.
 */
describe("aufgeklappt", () => {
  const kind = (path: string, label = path): MenuEintrag => ({ path, label });

  it("nimmt den Punkt selbst dazu, wenn er eine eigene Seite hat", () => {
    const e: MenuEintrag = { path: "/ueber-uns", label: "Über uns", children: [kind("/team"), kind("/geschichte")] };
    expect(aufgeklappt(e).map((p) => p.path)).toEqual(["/ueber-uns", "/team", "/geschichte"]);
  });

  it("lässt ihn weg, wenn ein Unterpunkt auf dieselbe Seite führt", () => {
    const e: MenuEintrag = { path: "/historie", label: "Info", children: [kind("/ernaehrung"), kind("/historie", "Historie")] };
    expect(aufgeklappt(e).map((p) => p.label)).toEqual(["/ernaehrung", "Historie"]);
  });

  it("kommt ohne Unterpunkte aus", () => {
    expect(aufgeklappt({ path: "/", label: "Start" })).toEqual([{ path: "/", label: "Start" }]);
  });
});
