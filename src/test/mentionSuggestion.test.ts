import { describe, it, expect, afterEach } from "vitest";
import { createMentionSuggestion, type MentionMember } from "@/components/forum/mentionSuggestion";

/**
 * Die Namensliste hinter dem „@".
 *
 * Sie hat einmal den Browser blockiert: Beim Überfahren mit der Maus wurde die
 * Liste neu gezeichnet, dabei der Knopf unter dem Zeiger zerstört und neu
 * angelegt – was sofort wieder ein mouseenter auslöste. Danach ging weder
 * Enter noch Maus, und die Liste liess sich nicht mehr schliessen. Diese
 * Tests halten die Stelle fest.
 */

const MITGLIEDER: MentionMember[] = [
  { id: "1", display_name: "Anna Beispiel" },
  { id: "2", display_name: "Bernd Muster" },
  { id: "3", display_name: "Clara Probe" },
];

type Renderer = ReturnType<NonNullable<ReturnType<typeof createMentionSuggestion>["render"]>>;

let renderer: Renderer | null = null;

afterEach(() => {
  renderer?.onExit?.({} as never);
  renderer = null;
  document.body.replaceChildren();
});

function starte(items = MITGLIEDER, onCommand: (a: unknown) => void = () => undefined) {
  const options = createMentionSuggestion(() => MITGLIEDER);
  renderer = options.render!();
  renderer.onStart!({
    items,
    command: onCommand,
    clientRect: () => ({ left: 100, top: 100, bottom: 120, right: 200 }) as DOMRect,
  } as never);
  return renderer;
}

const box = () => document.body.querySelector("div.fixed") as HTMLDivElement | null;
const rows = () => Array.from(box()?.querySelectorAll("button") ?? []);

describe("Namensliste: Anzeige", () => {
  it("zeigt die Namen an", () => {
    starte();
    expect(rows().map((r) => r.textContent)).toEqual([
      "Anna Beispiel",
      "Bernd Muster",
      "Clara Probe",
    ]);
  });

  it("sagt Bescheid, wenn niemand passt", () => {
    starte([]);
    expect(box()?.textContent).toContain("Niemand gefunden");
  });

  it("filtert nach dem Eingetippten", () => {
    const options = createMentionSuggestion(() => MITGLIEDER);
    const treffer = options.items!({ query: "bern" } as never);
    expect(treffer).toHaveLength(1);
    expect((treffer as MentionMember[])[0].display_name).toBe("Bernd Muster");
  });
});

describe("Namensliste: Maus", () => {
  it("legt die Knöpfe beim Überfahren NICHT neu an", () => {
    // Der eigentliche Fehler. Wird der Knopf unter dem Zeiger ersetzt, feuert
    // sofort wieder ein mouseenter – eine Schleife ohne Ende.
    starte();
    const vorher = rows();
    vorher[1].dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
    const nachher = rows();
    expect(nachher[0]).toBe(vorher[0]);
    expect(nachher[1]).toBe(vorher[1]);
    expect(nachher[2]).toBe(vorher[2]);
  });

  it("hebt beim Überfahren die richtige Zeile hervor", () => {
    starte();
    rows()[2].dispatchEvent(new MouseEvent("mouseenter", { bubbles: false }));
    expect(rows()[2].className).toContain("bg-primary/10");
    expect(rows()[0].className).not.toContain("bg-primary/10");
  });

  it("übernimmt den Namen beim Klick", () => {
    const gewaehlt: unknown[] = [];
    starte(MITGLIEDER, (a) => gewaehlt.push(a));
    rows()[1].dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    expect(gewaehlt).toEqual([{ id: "2", label: "Bernd Muster" }]);
  });

  it("nimmt dem Editor beim Klick nicht den Schreibcursor", () => {
    starte();
    const ev = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
    rows()[0].dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it("schliesst sich beim Klick daneben", () => {
    starte();
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    expect(box()).toBeNull();
  });

  it("taucht nach dem Schliessen nicht von selbst wieder auf", () => {
    const r = starte();
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
    r.onUpdate?.({
      items: MITGLIEDER,
      command: () => undefined,
      clientRect: () => ({ left: 10, top: 10, bottom: 30 }) as DOMRect,
    } as never);
    expect(box()).toBeNull();
  });
});

describe("Namensliste: Tastatur", () => {
  it("wandert mit den Pfeiltasten und wählt mit Enter", () => {
    const gewaehlt: unknown[] = [];
    const r = starte(MITGLIEDER, (a) => gewaehlt.push(a));
    r.onKeyDown!({ event: new KeyboardEvent("keydown", { key: "ArrowDown" }) } as never);
    r.onKeyDown!({ event: new KeyboardEvent("keydown", { key: "Enter" }) } as never);
    expect(gewaehlt).toEqual([{ id: "2", label: "Bernd Muster" }]);
  });

  it("läuft am Ende wieder auf den Anfang", () => {
    const gewaehlt: unknown[] = [];
    const r = starte(MITGLIEDER, (a) => gewaehlt.push(a));
    for (let i = 0; i < 3; i++) {
      r.onKeyDown!({ event: new KeyboardEvent("keydown", { key: "ArrowDown" }) } as never);
    }
    r.onKeyDown!({ event: new KeyboardEvent("keydown", { key: "Enter" }) } as never);
    expect(gewaehlt).toEqual([{ id: "1", label: "Anna Beispiel" }]);
  });

  it("schliesst mit Escape", () => {
    const r = starte();
    const behandelt = r.onKeyDown!({
      event: new KeyboardEvent("keydown", { key: "Escape" }),
    } as never);
    expect(behandelt).toBe(true);
    expect(box()).toBeNull();
  });

  it("lässt andere Tasten durch", () => {
    const r = starte();
    expect(r.onKeyDown!({ event: new KeyboardEvent("keydown", { key: "a" }) } as never)).toBe(false);
  });

  it("räumt die Liste beim Beenden weg", () => {
    const r = starte();
    expect(box()).not.toBeNull();
    r.onExit?.({} as never);
    expect(box()).toBeNull();
  });
});
