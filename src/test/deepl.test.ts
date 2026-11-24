// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { SCHLUESSEL_FEHLT, deeplAdresse, inAnfragen, uebersetzen, type Uebersetzbar } from "../../supabase/functions/_shared/deepl";
// @ts-expect-error -- Skript ohne Typangaben
import { exportBauen, importZeilen } from "../../scripts/seiten-uebersetzen.mjs";
import { readFileSync } from "node:fs";

/**
 * Das Gespräch mit DeepL (supabase/functions/_shared/deepl.ts) – mit einer
 * Attrappe statt der Schnittstelle. Kein Test stellt eine echte Anfrage.
 */
type Anfrage = { adresse: string; kopf: Record<string, string>; rumpf: { text: string[]; target_lang: string; tag_handling?: string; source_lang: string } };

function attrappe(status = 200) {
  const anfragen: Anfrage[] = [];
  const holen = vi.fn(async (adresse: string, init: { headers: Record<string, string>; body: string }) => {
    const rumpf = JSON.parse(init.body) as Anfrage["rumpf"];
    anfragen.push({ adresse, kopf: init.headers, rumpf });
    return {
      ok: status === 200,
      status,
      json: async () => ({ translations: rumpf.text.map((t) => ({ text: `[${rumpf.target_lang}] ${t}` })) }),
    };
  });
  return { holen, anfragen };
}

const TEXTE: Uebersetzbar[] = [
  { schluessel: "@title", art: "text", text: "Der Verein" },
  { schluessel: "0.inhalt", art: "html", text: "<p>Wir zeigen <strong>Alltag</strong>.</p>" },
  { schluessel: "1.titel", art: "text", text: "Preise < 10 €" },
];

describe("DeepL", () => {
  it("wählt die Adresse nach dem Schlüssel: kostenlos endet auf :fx", () => {
    expect(deeplAdresse("abc-123:fx")).toBe("https://api-free.deepl.com/v2/translate");
    expect(deeplAdresse(" abc-123:fx \n")).toBe("https://api-free.deepl.com/v2/translate");
    expect(deeplAdresse("abc-123")).toBe("https://api.deepl.com/v2/translate");
  });

  it("schickt Text und HTML getrennt – nur HTML mit tag_handling", async () => {
    const { holen, anfragen } = attrappe();
    const ergebnis = await uebersetzen(TEXTE, "en", "geheim:fx", holen);
    expect(anfragen).toHaveLength(2);
    expect(anfragen[0].rumpf).toMatchObject({ text: ["Der Verein", "Preise < 10 €"], source_lang: "DE", target_lang: "EN-GB" });
    expect(anfragen[0].rumpf.tag_handling).toBeUndefined();
    expect(anfragen[1].rumpf).toMatchObject({ text: ["<p>Wir zeigen <strong>Alltag</strong>.</p>"], tag_handling: "html" });
    expect(anfragen[0].adresse).toBe("https://api-free.deepl.com/v2/translate");
    expect(anfragen[0].kopf.Authorization).toBe("DeepL-Auth-Key geheim:fx");
    expect(ergebnis).toEqual({
      "@title": "[EN-GB] Der Verein",
      "1.titel": "[EN-GB] Preise < 10 €",
      "0.inhalt": "[EN-GB] <p>Wir zeigen <strong>Alltag</strong>.</p>",
    });
  });

  it("teilt lange Seiten auf mehrere Anfragen auf, ohne etwas zu verlieren", () => {
    const viele: Uebersetzbar[] = Array.from({ length: 95 }, (_, i) => ({ schluessel: `${i}.text`, art: "text", text: `Satz ${i}` }));
    const lang: Uebersetzbar[] = Array.from({ length: 3 }, (_, i) => ({ schluessel: `l${i}`, art: "html", text: `<p>${"x".repeat(20_000)}</p>` }));
    const anfragen = inAnfragen([...viele, ...lang]);
    expect(anfragen.map((a) => a.length)).toEqual([40, 40, 15, 1, 1, 1]);
    expect(anfragen.flat().map((t) => t.schluessel).sort()).toEqual([...viele, ...lang].map((t) => t.schluessel).sort());
    expect(inAnfragen([])).toEqual([]);
  });

  it("ohne Schlüssel eine deutsche Meldung, ohne Anfrage", async () => {
    const { holen } = attrappe();
    await expect(uebersetzen(TEXTE, "fr", "  ", holen)).rejects.toThrow(SCHLUESSEL_FEHLT);
    expect(SCHLUESSEL_FEHLT).toContain("DEEPL_API_KEY");
    expect(holen).not.toHaveBeenCalled();
  });

  it("sagt bei einem Fehler von DeepL, woran es liegt", async () => {
    await expect(uebersetzen(TEXTE, "fr", "k", attrappe(403).holen)).rejects.toThrow(/lehnt den Schlüssel ab/);
    await expect(uebersetzen(TEXTE, "fr", "k", attrappe(456).holen)).rejects.toThrow(/Zeichenkontingent/);
    await expect(uebersetzen(TEXTE, "fr", "k", attrappe(500).holen)).rejects.toThrow(/500/);
    await expect(uebersetzen(TEXTE, "es", "k", attrappe().holen)).rejects.toThrow(/Zielsprache/);
  });

  it("speichert nichts Halbes: fehlt eine Übersetzung, scheitert das Ganze", async () => {
    const holen = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ translations: [{ text: "nur eine" }] }) }));
    await expect(uebersetzen(TEXTE, "en", "k", holen)).rejects.toThrow(/nicht zu jedem Text/);
  });

  it("die Funktion prüft Anmeldung und Recht, bevor sie den Schlüssel erwähnt", () => {
    const quelle = readFileSync("supabase/functions/translate-page/index.ts", "utf-8");
    expect(quelle.indexOf("has_permission")).toBeGreaterThan(0);
    expect(quelle.indexOf("await darf(")).toBeLessThan(quelle.indexOf('Deno.env.get("DEEPL_API_KEY")'));
    expect(quelle).toContain("is_machine: true");
  });
});

describe("Texte herausgeben und einlesen (scripts/seiten-uebersetzen.mjs)", () => {
  const stand = {
    seiten: [{
      id: "p1", slug: "verein", title: "Der Verein", seo_title: null, seo_description: "Wer wir sind.",
      content: { root: {}, content: [{ type: "Ueberschrift", props: { id: "u", text: "Über uns" } }, { type: "Knopf", props: { id: "k", beschriftung: "Kontakt", ziel: "/kontakt" } }] },
    }],
    menue: [{ id: "m1", label: "Verein" }, { id: "m2", label: "" }],
    marke: { org_tagline: "Gelebte Geschichte", footer_navigation_label: "Navigation", footer_legal_label: "Rechtliches", seo_description: null },
  };
  const datei = exportBauen(stand);

  it("gibt je Text das Deutsche und leere Felder je Sprache heraus", () => {
    expect(datei.seiten).toEqual([{
      slug: "verein",
      texte: [
        { schluessel: "@title", art: "text", de: "Der Verein", en: "", fr: "" },
        { schluessel: "@seo_description", art: "text", de: "Wer wir sind.", en: "", fr: "" },
        { schluessel: "0.text", art: "text", de: "Über uns", en: "", fr: "" },
        { schluessel: "1.beschriftung", art: "text", de: "Kontakt", en: "", fr: "" },
      ],
    }]);
    expect(datei.rahmen.map((r: { schluessel: string }) => r.schluessel)).toEqual([
      "menu:m1", "settings:org_tagline", "settings:footer_navigation_label", "settings:footer_legal_label",
    ]);
  });

  it("liest nur ein, was ausgefüllt ist, und nur in der Sprache, in der etwas steht", () => {
    const voll = structuredClone(datei);
    voll.seiten[0].texte[0].en = "The club";
    voll.seiten[0].texte[2].en = "About us";
    voll.rahmen[0].en = "Club";
    voll.rahmen[0].fr = "Association";
    const { seitenZeilen, textZeilen, meldungen } = importZeilen(voll, stand);
    expect(seitenZeilen).toHaveLength(1);
    expect(seitenZeilen[0]).toMatchObject({ page_id: "p1", lang: "en", title: "The club", seo_description: null, is_machine: true, is_stale: false });
    expect(seitenZeilen[0].content.content[0].props.text).toBe("About us");
    expect(seitenZeilen[0].content.content[1].props).toEqual({ id: "k", beschriftung: "Kontakt", ziel: "/kontakt" });
    expect(textZeilen).toEqual([
      { kind: "menu", ref: "m1", lang: "en", value: "Club", is_machine: true, is_stale: false, reviewed_at: null },
      { kind: "menu", ref: "m1", lang: "fr", value: "Association", is_machine: true, is_stale: false, reviewed_at: null },
    ]);
    expect(meldungen).toEqual(["Seite „verein“ (en): 1 Texte ohne Übersetzung bleiben deutsch."]);
    expect(importZeilen(voll, stand, { maschinell: false }).seitenZeilen[0].is_machine).toBe(false);
  });

  it("setzt nichts an die falsche Stelle, wenn sich das Deutsche seit dem Export geändert hat", () => {
    const voll = structuredClone(datei);
    for (const t of voll.seiten[0].texte) t.fr = `FR ${t.de}`;
    voll.rahmen[0].fr = "Association";
    const heute = structuredClone(stand);
    heute.seiten[0].title = "Unser Verein";
    heute.seiten[0].content.content[0].props.text = "Wer wir sind";
    heute.menue[0].label = "Der Verein";
    const { seitenZeilen, textZeilen, meldungen } = importZeilen(voll, heute);
    expect(seitenZeilen[0]).toMatchObject({ lang: "fr", title: "Unser Verein", seo_description: "FR Wer wir sind." });
    expect(seitenZeilen[0].content.content[0].props.text).toBe("Wer wir sind");
    expect(seitenZeilen[0].content.content[1].props.beschriftung).toBe("FR Kontakt");
    expect(textZeilen).toEqual([]);
    expect(meldungen.join("\n")).toMatch(/@title wurde seit dem Export geändert/);
    expect(meldungen.join("\n")).toMatch(/0\.text/);
    expect(meldungen.join("\n")).toMatch(/Rahmentext menu:m1/);
  });

  it("überspringt Seiten, die es nicht mehr gibt, und leere Dateien", () => {
    const fremd = { seiten: [{ slug: "weg", texte: [{ schluessel: "@title", de: "Weg", en: "Gone", fr: "" }] }] };
    expect(importZeilen(fremd, stand)).toMatchObject({ seitenZeilen: [], textZeilen: [] });
    expect(importZeilen({}, stand)).toEqual({ seitenZeilen: [], textZeilen: [], meldungen: [] });
  });

  it("läuft nicht beim Bauen mit", () => {
    const paket = JSON.parse(readFileSync("package.json", "utf-8")) as { scripts: Record<string, string> };
    expect(paket.scripts.build).not.toContain("seiten-uebersetzen");
  });
});
