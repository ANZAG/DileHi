import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MINDESTABSTAND_MS,
  adressKandidaten,
  geocode,
  geocodeAdresse,
  geocodeOrt,
  geocodeZuruecksetzen,
  leseTreffer,
  nenntAusland,
  nominatimUrl,
  ortKandidaten,
  suchfolge,
} from "@/lib/geocode";

/**
 * Koordinaten nachschlagen: eine Reihenfolge für Profil, Mitgliederkarte und
 * Veranstaltungen – und nie mehr als eine Anfrage je Sekunde an Nominatim.
 *
 * Nominatim selbst wird nicht gefragt; `fetch` ist nachgebaut.
 */

const antwort = (rumpf: unknown, status = 200) =>
  new Response(JSON.stringify(rumpf), { status, headers: { "Content-Type": "application/json" } });

const MANNHEIM = [{ lat: "49.4875", lon: "8.4660" }];

/** Die Suchtexte der Anfragen, die hinausgegangen sind – mit „|de" für die auf Deutschland beschränkten. */
const gefragt = (nachbau: ReturnType<typeof vi.fn>) =>
  nachbau.mock.calls.map(([url]) => {
    const p = new URL(String(url)).searchParams;
    return p.get("countrycodes") ? `${p.get("q")}|${p.get("countrycodes")}` : p.get("q");
  });

describe("Die Anfrage an Nominatim", () => {
  it("kodiert den Suchtext und fragt nur einen Treffer ab", () => {
    const url = new URL(nominatimUrl({ suche: "68159 Mannheim & Umgebung", nurDeutschland: false }));
    expect(url.origin + url.pathname).toBe("https://nominatim.openstreetmap.org/search");
    expect(url.searchParams.get("q")).toBe("68159 Mannheim & Umgebung");
    expect(url.searchParams.get("format")).toBe("json");
    expect(url.searchParams.get("limit")).toBe("1");
    expect(url.searchParams.has("countrycodes")).toBe(false);
  });

  it("beschränkt nur auf Wunsch auf Deutschland", () => {
    expect(new URL(nominatimUrl({ suche: "Burg Reichenstein", nurDeutschland: true })).searchParams.get("countrycodes")).toBe("de");
  });
});

describe("Die Antwort lesen", () => {
  it("nimmt den ersten Treffer und macht Zahlen daraus", () => {
    expect(leseTreffer([...MANNHEIM, { lat: "1", lon: "2" }])).toEqual({ lat: 49.4875, lng: 8.466 });
  });

  it("gibt null zurück, wenn nichts oder nichts Brauchbares darin steht", () => {
    expect(leseTreffer([])).toBeNull();
    expect(leseTreffer({ error: "Unable to geocode" })).toBeNull();
    expect(leseTreffer(null)).toBeNull();
    // Ohne diese Prüfung landete NaN als Koordinate auf der Karte.
    expect(leseTreffer([{ lat: "abc", lon: "8.4" }])).toBeNull();
    expect(leseTreffer([{}])).toBeNull();
  });
});

describe("Die Reihenfolge der Fragen", () => {
  it("fragt für einen Wohnort erst genau, dann grob", () => {
    expect(ortKandidaten("68159", "Mannheim")).toEqual(["68159 Mannheim", "Mannheim", "68159"]);
  });

  it("lässt Leeres und Doppeltes weg", () => {
    expect(ortKandidaten("", " Mannheim ")).toEqual(["Mannheim"]);
    expect(ortKandidaten("68159", null)).toEqual(["68159"]);
    expect(ortKandidaten(null, undefined)).toEqual([]);
  });

  it("zerlegt eine frei eingetippte Ortsangabe", () => {
    const fragen = adressKandidaten("Burg Reichenstein  (Rittersaal), 55413 Trechtingshausen, Deutschland");
    // Zuerst der ganze Text, ohne Klammern und mit englischem Ländernamen.
    expect(fragen[0]).toBe("Burg Reichenstein, 55413 Trechtingshausen, Germany");
    expect(fragen).toContain("55413 Trechtingshausen");
    expect(fragen).toContain("55413 Trechtingshausen, Germany");
    expect(new Set(fragen).size).toBe(fragen.length);
  });

  it("sucht erst in Deutschland und danach weltweit – in beiden Runden von genau nach grob", () => {
    expect(suchfolge(["a", "b"], true)).toEqual([
      { suche: "a", nurDeutschland: true },
      { suche: "b", nurDeutschland: true },
      { suche: "a", nurDeutschland: false },
      { suche: "b", nurDeutschland: false },
    ]);
    expect(suchfolge(["a", "b", "a", ""])).toEqual([
      { suche: "a", nurDeutschland: false },
      { suche: "b", nurDeutschland: false },
    ]);
  });

  it("erkennt, wenn der Text ein anderes Land nennt", () => {
    // Mit `\b` blieb das unerkannt: Vor einem Umlaut sieht es keine Wortgrenze.
    expect(nenntAusland("Salzburg, Österreich")).toBe(true);
    expect(nenntAusland("Österreich")).toBe(true);
    expect(nenntAusland("Festung Hohensalzburg, Salzburg, österreich")).toBe(true);
    expect(adressKandidaten("Salzburg, Österreich")[0]).toBe("Salzburg, Austria");
    // Kein Treffer mitten im Wort.
    expect(nenntAusland("Polenzer Hof, Schweizerstrasse 3, Mainz")).toBe(false);
    expect(nenntAusland("Burg Reichenstein, Trechtingshausen")).toBe(false);
  });
});

describe("Nachschlagen", () => {
  let nachbau: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    geocodeZuruecksetzen();
    nachbau = vi.fn();
    vi.stubGlobal("fetch", nachbau);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  /** Lässt die Wartezeiten ablaufen und gibt das Ergebnis zurück. */
  const fertig = async <T,>(versprechen: Promise<T>) => {
    // Sonst gälte eine Ablehnung als unbehandelt, bis die Uhr durchgelaufen ist.
    versprechen.catch(() => undefined);
    await vi.runAllTimersAsync();
    return versprechen;
  };

  it("hört beim ersten Treffer auf", async () => {
    nachbau.mockResolvedValueOnce(antwort([])).mockResolvedValueOnce(antwort(MANNHEIM));
    expect(await fertig(geocodeOrt("68159", "Mannheim"))).toEqual({ lat: 49.4875, lng: 8.466 });
    expect(gefragt(nachbau)).toEqual(["68159 Mannheim", "Mannheim"]);
  });

  it("gibt null zurück, wenn keine Frage etwas findet", async () => {
    nachbau.mockImplementation(async () => antwort([]));
    expect(await fertig(geocodeOrt("00000", "Nirgendwo"))).toBeNull();
    expect(gefragt(nachbau)).toEqual(["00000 Nirgendwo", "Nirgendwo", "00000"]);
  });

  it("fragt eine Veranstaltung erst in Deutschland, ein genanntes Ausland gleich weltweit", async () => {
    nachbau.mockImplementation(async () => antwort([]));
    await fertig(geocodeAdresse("Burg Reichenstein"));
    expect(gefragt(nachbau)).toEqual(["Burg Reichenstein|de", "Burg Reichenstein"]);

    nachbau.mockClear();
    await fertig(geocodeAdresse("Salzburg, Austria"));
    expect(gefragt(nachbau).some((frage) => frage?.endsWith("|de"))).toBe(false);
  });

  it("lässt zwischen zwei Anfragen mindestens den verlangten Abstand – auch bei gleichzeitigen Aufrufen", async () => {
    const zeiten: number[] = [];
    nachbau.mockImplementation(async () => {
      zeiten.push(Date.now());
      return antwort([]);
    });
    // Zwei Stellen fragen gleichzeitig, wie Mitglieder und Veranstaltungen auf der Karte.
    await fertig(Promise.all([geocode(["a", "b"]), geocode(["c", "d"])]));
    expect(zeiten).toHaveLength(4);
    for (let i = 1; i < zeiten.length; i++) {
      expect(zeiten[i] - zeiten[i - 1]).toBeGreaterThanOrEqual(MINDESTABSTAND_MS);
    }
    expect(MINDESTABSTAND_MS).toBeGreaterThanOrEqual(1100);
  });

  it("stellt dieselbe Frage kein zweites Mal", async () => {
    nachbau.mockImplementation(async () => antwort(MANNHEIM));
    await fertig(geocodeOrt("68159", "Mannheim"));
    expect(await fertig(geocodeOrt("68159", "Mannheim"))).toEqual({ lat: 49.4875, lng: 8.466 });
    expect(nachbau).toHaveBeenCalledTimes(1);
  });

  it("wirft bei einer Störung, statt die nächste Frage hinterherzuschicken", async () => {
    nachbau.mockImplementation(async () => antwort("Too Many Requests", 429));
    await expect(fertig(geocodeOrt("68159", "Mannheim"))).rejects.toThrow("429");
    expect(nachbau).toHaveBeenCalledTimes(1);

    // Eine Störung wird nicht als „nicht gefunden" gemerkt.
    nachbau.mockImplementation(async () => antwort(MANNHEIM));
    expect(await fertig(geocodeOrt("68159", "Mannheim"))).not.toBeNull();
  });

  it("reicht einen Netzfehler weiter", async () => {
    nachbau.mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(fertig(geocodeOrt("68159", "Mannheim"))).rejects.toThrow("Failed to fetch");
  });
});
