// @vitest-environment node
import { describe, expect, it } from "vitest";
import { RAHMENARTEN, istLiteraturangabe, rahmentexteSammeln, schluesselTeilen } from "@/lib/rahmentexte";
import { TEXTE, lizenzwort } from "@/lib/texte";
// @ts-expect-error -- Skripte ohne Typangaben
import { exportBauen, importZeilen } from "../../scripts/seiten-uebersetzen.mjs";
// @ts-expect-error -- Bauskript ohne Typangaben
import { sprachstand } from "../../scripts/vorabSeiten.mjs";
import { readFileSync } from "node:fs";

/**
 * Die kurzen öffentlichen Texte ausserhalb der Seiten
 * (supabase/functions/_shared/rahmentexte.mjs): was dazugehört und was davon
 * eine Maschine übersetzen darf.
 */
const STAND = {
  menue: [{ id: "m1", label: "Über uns" }, { id: "m2", label: "" }],
  marke: { org_tagline: "Gelebte Geschichte", footer_navigation_label: "Navigation", footer_legal_label: "Rechtliches", seo_description: null, org_name: "bleibt aussen vor" },
  bilder: [{ slot: "hero", label: "Kopfbild", alt_text: "Burg im Nebel" }, { slot: "leer", label: "Ohne Text", alt_text: "" }],
  galerie: [{ id: "g1", alt_text: "Lager am Abend", epoch: "mittelalter" }, { id: "g2", alt_text: "12", epoch: "mittelalter" }],
  besucher: [{ id: "b1", text: "Kochen am offenen Feuer", epoch: "mittelalter" }],
  quellen: [
    { id: "q1", text: "Kühnel, Harry: Alltag im Spätmittelalter, Graz 1984", epoch: "mittelalter" },
    { id: "q2", text: "Funde aus dem Rhein-Main-Gebiet (u. a. Landesmuseum Wiesbaden, Museum Wiesbaden)", epoch: "mittelalter" },
  ],
};

describe("Literaturangabe oder Beschreibung?", () => {
  it("lässt stehen, was man unter seinem Titel suchen muss", () => {
    for (const eintrag of [
      "Kühnel, Harry: Alltag im Spätmittelalter, Graz 1984",
      "Codex Manesse (Universitätsbibliothek Heidelberg, Cod. Pal. germ. 848)",
      "Vgl. *Die Nassauer Chronik*, Bd. 2",
      "Müller, Anna / Schmidt, Bernd (Hg.): Kleidung um 1400, Stuttgart 2003",
      "Bartels, Karl: Der Feldzug von 1815. Berlin 1913, S. 44–61",
      "Das Hausbuch der Mendelschen Zwölfbrüderstiftung (Nürnberg 1426)",
      "https://digi.ub.uni-heidelberg.de/diglit/cpg848",
    ]) expect(istLiteraturangabe(eintrag), eintrag).toBe(true);
  });

  it("gibt zum Übersetzen frei, was etwas beschreibt", () => {
    for (const eintrag of [
      "Funde aus dem Rhein-Main-Gebiet (u. a. Landesmuseum Wiesbaden, Museum Wiesbaden)",
      "Zeitgenössische Abbildungen aus Handschriften und Tafelbildern",
      "Eigene Versuche zur Rekonstruktion von Schuhen",
      "Gespräche mit Archäologinnen und Restauratoren",
      "",
    ]) expect(istLiteraturangabe(eintrag), eintrag).toBe(false);
  });
});

describe("rahmentexteSammeln", () => {
  const zeilen = rahmentexteSammeln(STAND);

  it("nimmt jede Art mit ihrem Schlüssel und lässt Leeres weg", () => {
    expect(zeilen.map((z: { schluessel: string }) => z.schluessel)).toEqual([
      "menu:m1", "settings:org_tagline", "settings:footer_navigation_label", "settings:footer_legal_label",
      "image:hero", "gallery:g1", "visitor:b1", "source:q1", "source:q2",
    ]);
    expect(zeilen.find((z: { schluessel: string }) => z.schluessel === "image:hero")).toMatchObject({ art: "image", ref: "hero", text: "Burg im Nebel", ort: "Kopfbild", maschinell: true });
  });

  it("gibt der Maschine alles ausser Literaturangaben", () => {
    expect(zeilen.filter((z: { maschinell: boolean }) => !z.maschinell).map((z: { schluessel: string }) => z.schluessel)).toEqual(["source:q1"]);
  });

  it("kommt mit einem halben Stand zurecht", () => {
    expect(rahmentexteSammeln({})).toEqual([]);
    expect(rahmentexteSammeln({ quellen: STAND.quellen })).toHaveLength(2);
  });

  it("kennt dieselben Arten wie die Datenbank", () => {
    const migration = readFileSync("supabase/migrations/20261125100000_mehrsprachig_weitere_texte.sql", "utf-8");
    const inDb = /check \(kind in \(([^)]+)\)\)/.exec(migration)![1].split(",").map((k) => k.trim().replace(/'/g, "")).sort();
    expect(RAHMENARTEN.map((a) => a.art).sort()).toEqual(inDb);
    // … und dieselben Rechte wie site_text_translation_editable.
    for (const a of RAHMENARTEN.filter((x) => x.recht)) {
      expect(migration, a.art).toContain(`_kind = '${a.art}' and public.has_permission(auth.uid(), '${a.recht}')`);
    }
  });

  it("teilt Schlüssel am ersten Doppelpunkt", () => {
    expect(schluesselTeilen("image:start:hero")).toEqual({ art: "image", ref: "start:hero" });
    expect(schluesselTeilen("kaputt")).toBeNull();
  });
});

describe("Herausgeben und Einlesen der kurzen Texte", () => {
  const stand = { seiten: [], ...STAND };
  const datei = exportBauen(stand);

  it("gibt alle Arten heraus und kennzeichnet Literaturangaben", () => {
    expect(datei.rahmen.map((r: { schluessel: string }) => r.schluessel)).toContain("gallery:g1");
    expect(datei.rahmen.find((r: { schluessel: string }) => r.schluessel === "source:q1")).toMatchObject({ literaturangabe: true, de: STAND.quellen[0].text, en: "", fr: "" });
    expect(datei.rahmen.find((r: { schluessel: string }) => r.schluessel === "source:q2")).not.toHaveProperty("literaturangabe");
  });

  it("liest ein, was ausgefüllt ist – auch eine Literaturangabe, wenn jemand sie übersetzt hat", () => {
    const voll = structuredClone(datei);
    const setze = (schluessel: string, sprache: string, wert: string) => { voll.rahmen.find((r: { schluessel: string }) => r.schluessel === schluessel)[sprache] = wert; };
    setze("source:q2", "en", "Finds from the Rhine-Main area");
    setze("source:q1", "fr", "Kühnel, Harry : Alltag im Spätmittelalter, Graz 1984");
    setze("image:hero", "en", "Castle in the fog");
    const { textZeilen, meldungen } = importZeilen(voll, stand);
    expect(textZeilen.map((z: { kind: string; ref: string; lang: string }) => `${z.kind}:${z.ref}:${z.lang}`)).toEqual(["image:hero:en", "source:q1:fr", "source:q2:en"]);
    expect(meldungen).toEqual([]);
  });

  it("überspringt, was sich seit dem Export geändert hat", () => {
    const voll = structuredClone(datei);
    voll.rahmen.find((r: { schluessel: string }) => r.schluessel === "visitor:b1").en = "Cooking over an open fire";
    const heute = structuredClone(stand);
    heute.besucher[0].text = "Kochen über dem Feuer";
    const { textZeilen, meldungen } = importZeilen(voll, heute);
    expect(textZeilen).toEqual([]);
    expect(meldungen.join("\n")).toMatch(/visitor:b1/);
  });
});

describe("Vorabstand", () => {
  it("trägt Menü, Rahmen und Bildbeschreibungen – nicht die ganze Galerie", () => {
    const seiten = [{ id: "p1" }];
    const uebersetzungen = [{ page_id: "p1", lang: "en", title: "Home", content: { content: [] } }];
    const texte = [
      { kind: "menu", ref: "m1", lang: "en", value: "About us" },
      { kind: "image", ref: "hero", lang: "en", value: "Castle in the fog" },
      { kind: "gallery", ref: "g1", lang: "en", value: "Camp in the evening" },
      { kind: "source", ref: "q2", lang: "en", value: "Finds" },
      { kind: "visitor", ref: "b1", lang: "en", value: "Cooking" },
    ];
    expect(sprachstand(seiten, uebersetzungen, texte).texte).toEqual({ en: { "menu:m1": "About us", "image:hero": "Castle in the fog" } });
  });
});

describe("Lizenzangaben", () => {
  it("übersetzt die gängigen deutschen Angaben und lässt Kennungen stehen", () => {
    expect(lizenzwort("gemeinfrei", TEXTE.en)).toBe("public domain");
    expect(lizenzwort(" Gemeinfrei ", TEXTE.fr)).toBe("domaine public");
    expect(lizenzwort("gemeinfrei", TEXTE.de)).toBe("gemeinfrei");
    expect(lizenzwort("Alle Rechte vorbehalten", TEXTE.en)).toBe("all rights reserved");
    for (const kennung of ["CC BY-SA 4.0", "CC0", "© Museum Wiesbaden", "gemeinfrei (PD-old)", ""]) {
      expect(lizenzwort(kennung, TEXTE.fr)).toBe(kennung);
    }
  });
});
