// @vitest-environment node
import { describe, expect, it } from "vitest";
import { zaehlungBereiche, zaehlungFinden, buchSeite, lesetext, markdownBauen, roemisch } from "@/lib/scan/text";
import { zeilenBilden, seitenFormat } from "@/lib/scan/pdf";

describe("Lesetext", () => {
  it("führt Trennungen zusammen und macht aus Zeilen Absätze", () => {
    const roh = "Nachdem die Husarenregimenter zunächst drei Schwadronen umfassten, wur-\nden sie bis 1815 erhöht.\n\nDas Braunschweig-\nLüneburgische Korps";
    expect(lesetext(roh)).toBe("Nachdem die Husarenregimenter zunächst drei Schwadronen umfassten, wurden sie bis 1815 erhöht.\n\nDas Braunschweig-Lüneburgische Korps");
  });

  it("zählt wie das Buch", () => {
    expect(roemisch(4)).toBe("iv");
    expect(buchSeite(2, { pdfSeite: 3, buchSeite: 1 })).toBe("ii");
    expect(buchSeite(30, { pdfSeite: 3, buchSeite: 1 })).toBe("28");
    expect(buchSeite(30)).toBe("30");
  });

  it("baut das Markdown mit Trennern und Markierung", () => {
    const md = markdownBauen({
      titel: "Uniformen", autor: "Stein", datum: "2026-11-20", zaehlung: { pdfSeite: 2, buchSeite: 1 },
      seiten: [{ text: "Umschlag", unsicher: false }, { text: "Erste Zei-\nle", unsicher: true }],
    });
    expect(md).toContain("# Uniformen\n\nAutor: Stein · 2 Seiten · aufgenommen am 2026-11-20");
    expect(md).toContain("--- Seite i (PDF-Seite 1) ---\n\nUmschlag");
    expect(md).toContain("--- Seite 1 (PDF-Seite 2) ---\n[OCR unsicher]\n\nErste Zeile");
  });
});

describe("PDF-Aufbau", () => {
  const w = (text: string, x0: number, y0: number, x1: number, y1: number) => ({ text, x0, y0, x1, y1 });

  it("fasst Wörter in Lesereihenfolge zu Zeilen", () => {
    const z = zeilenBilden([w("Allerdings", 10, 100, 80, 120), w("kam", 85, 102, 110, 120), w("es", 115, 104, 130, 120), w("Stunden", 10, 130, 70, 150), w("lang", 75, 131, 100, 154)]);
    expect(z.map((x) => x.woerter.map((y) => y.text).join(" "))).toEqual(["Allerdings kam es", "Stunden lang"]);
    expect(z[0].grund).toBe(120);
  });

  it("gibt allen Seiten dieselbe Grösse (Median), Querformat zählt nicht mit", () => {
    const f = seitenFormat([{ breite: 1200, hoehe: 1700 }, { breite: 1160, hoehe: 1690 }, { breite: 1250, hoehe: 1720 }, { breite: 3000, hoehe: 2000 }]);
    expect(f.breite).toBeCloseTo((1200 * 72) / 200, 5);
    expect(f.hoehe / f.breite).toBeCloseTo(1700 / 1200, 2);
  });
});

describe("Schrift und Sprache", () => {
  it("nimmt die sicherste Erkennung, Deutsch bei Gleichstand, Fraktur nur mit Vorsprung", async () => {
    const { besteSchrift } = await import("@/lib/scan/ocr");
    const e = (schrift: "antiqua" | "fraktur" | "latein" | "franzoesisch", sicherheit: number) => ({ schrift, sicherheit });
    expect(besteSchrift([e("antiqua", 90), e("franzoesisch", 95)]).schrift).toBe("franzoesisch");
    expect(besteSchrift([e("antiqua", 92), e("latein", 93)]).schrift).toBe("antiqua");
    expect(besteSchrift([e("antiqua", 80), e("fraktur", 84)]).schrift).toBe("antiqua");
    expect(besteSchrift([e("antiqua", 60), e("fraktur", 80)]).schrift).toBe("fraktur");
  });
});

describe("Sprache raten", () => {
  it("erkennt Deutsch, Latein, Französisch, Englisch und die Mischung einer Edition", async () => {
    const { spracheRaten } = await import("@/lib/scan/text");
    expect(spracheRaten("Allerdings kam es trotz der Überlegenheit der Franzosen nur zu Scharmützeln, und das Bataillon wurde mit den anderen von der Front abgelöst, die sich auf den Marsch machte.")).toBe("deu");
    expect(spracheRaten("Statuitur ut abbates qui ad Capitulum non venerint sint in levi culpa et in pane et aqua, et si eorum aliquis non venerit, ab officio suspendatur per annum.")).toBe("lat");
    expect(spracheRaten("Le chapitre général se réunissait chaque année à l'abbaye mère; les abbés de toutes les maisons étaient tenus d'y assister, sauf ceux qui sont des régions les plus éloignées.")).toBe("fra");
    expect(spracheRaten("The knives recovered from the excavations in London range in date from the twelfth to the fifteenth century, and most of the blades were forged with a steel edge.")).toBe("eng");
    expect(spracheRaten("Statuitur ut abbates qui ad Capitulum non venerint sint in levi culpa, et eorum quod in pane et aqua. (1) Le manuscrit de Dijon donne une leçon différente pour ce passage; nous suivons ici le texte de la plupart des témoins et la lettre de l'abbé.")).toBe("lat+fra");
    expect(spracheRaten("Karte 12")).toBeNull();
  });
});

describe("Zeichensalat", () => {
  it("erkennt Zeichensalat aus einer Handschrift, nicht aber Text oder Katalog", async () => {
    const { istZeichensalat } = await import("@/lib/scan/text");
    const salat = Array.from({ length: 1800 }, (_, i) => `ay${(i * 7919) % 9973}men`.replace(/\d/g, (d) => "abcdefghij"[+d])).join(" ");
    expect(istZeichensalat([salat])).toBe(true);
    const satz = "Die Regimenter der Legion standen bei Waterloo im Zentrum und hielten den Gutshof bis zum Abend, als die Munition ausging und der Feind von allen Seiten kam. ";
    expect(istZeichensalat([satz.repeat(80)])).toBe(false);
    const katalog = Array.from({ length: 300 }, (_, i) => `Fundort Haithabu Inv.Nr. ${i} Messer Eisen Griffangel Länge ${i % 20} cm`).join("\n");
    expect(istZeichensalat([katalog])).toBe(false);
    // So sah der Codex Manesse aus: viele Bruchstücke, die sich wiederholen.
    // Gemessen: 52 % wortartig, 6 % kleine Wörter, Vielfalt 0,79.
    const silben = ["sau", "te", "lan", "ee", "derr", "hen", "nu", "de", "leh", "alu", "ebe", "are", "cet", "dera", "mi", "ro"];
    let z = 7;
    const zufall = () => Math.floor((z = (z * 1103515245 + 12345) % 2147483648) / 65536) % 16;
    const manesse = Array.from({ length: 3600 }, (_, i) => i % 2
      ? ["e", "-e", "-i", "äs", "ü", "Ae", "i"][i % 7]
      : silben[zufall()] + silben[zufall()] + (i % 3 ? silben[zufall()] : "") + ",").join(" ");
    expect(istZeichensalat([manesse])).toBe(true);
    // Ruhmeshalle: Kriegsgliederung voller Abkürzungen, die sich wiederholen – Text.
    const gliederung = Array.from({ length: 300 }, (_, i) => `${i % 40}. bayr. Reſ.⸗Inf.⸗Brig. mit bayr. Reſ.⸗Inf.⸗R. ${i % 17} u. I${i % 9}. J.⸗D. Edw.⸗Inf.⸗Br. Div.⸗Machr.⸗Kdr.`).join("\n");
    expect(istZeichensalat([gliederung])).toBe(false);
    // Marmoriertes Vorsatzpapier vorne zählt nicht mit (Studien und Mitteilungen 1893).
    const marmor = Array.from({ length: 400 }, (_, i) => ["X", "*", "S", "e", "ö", "N", "——", "x"][i % 8]).join(" ");
    expect(istZeichensalat([marmor, marmor, satz.repeat(80)])).toBe(false);
    // Canivez: Statuten mit Anmerkungsapparat voller Kürzel und Zahlen – Text, kein Salat.
    const canivez = Array.from({ length: 120 }, (_, i) =>
      `${i % 9 + 1} In dioec. Cadurcen., OC, ${170 + i}. Cf. supra stat. ${40 + i}. Grandselve, in Vasconia, dioec. Tolosan., OC, 81. ` +
      `${i + 3}. Item, ut monasteriorum Ordinis officiales in temporalibus constituti salubrius gubernent, et ad monasterii bona fidelius dispensanda.`).join("\n");
    expect(istZeichensalat([canivez])).toBe(false);
    // Stempel des Digitalisats (Sachsenspiegel) fällt vor der Prüfung weg, der Rest bleibt.
    const { ohneWiederkehrendeZeilen } = await import("@/lib/scan/text");
    const stempel = (i: number) => `gefördert von der\nUNIVERSITÄTS-BIBLIOTHEK HEIDELBERG\nhttp://digi.ub.uni-heidelberg.de/diglit/cpg164/00${10 + i} © Universitätsbibliothek Heidelberg\nMANFRED LAUTENSCHLÄGER STIFTUNG\n`;
    const seiten = Array.from({ length: 20 }, (_, i) => stempel(i) + `vor Hüntaz${"abcdefghijklmnopqrst"[i]}ehulte zu hm te Kurt auters`);
    const sauber = ohneWiederkehrendeZeilen(seiten);
    expect(sauber.every((t) => !/HEIDELBERG|LAUTENSCHL|gefördert|http/i.test(t))).toBe(true);
    expect(sauber[3]).toContain("Hüntazdehulte");
    // Ein gedrucktes Buch mit Kolumnentitel auf jeder Seite bleibt Text.
    const buch = Array.from({ length: 40 }, (_, i) => `UNIFORMEN DER ARMEEN VON WATERLOO ${i + 10}\n` + satz.repeat(3));
    expect(istZeichensalat(buch)).toBe(false);
  });
});

describe("Zählung aus den Seitenzahlen", () => {
  it("findet den Versatz wie bei Stein (Buchseite 1 auf PDF-Seite 3)", () => {
    const texte = Array.from({ length: 30 }, (_, k) => {
      const pdf = k + 1, buch = pdf - 2;
      if (pdf <= 2 || pdf % 5 === 0) return "Eine Tafel ohne Zahl";
      return pdf % 2 ? `Text über das Jahr 1815 und die Schlacht, Absatz ${pdf} ${buch}` : `${buch} KAVALLERIE Organisation Diese Gattung bestand`;
    });
    expect(zaehlungFinden(texte)).toEqual({ pdfSeite: 3, buchSeite: 1 });
  });
  it("Zählung ab einer höheren Buchseite (Auszug)", () => {
    const texte = Array.from({ length: 10 }, (_, k) => `Seite mit Text und noch mehr Text ${k + 101}`);
    expect(zaehlungFinden(texte)).toEqual({ pdfSeite: 1, buchSeite: 101 });
  });
  it("ohne klare Zahlen keine Zählung", () => {
    expect(zaehlungFinden(["Im Jahr 1815 kam", "es 1813 zu", "Kämpfen 1806 bei Jena"])).toBeUndefined();
    expect(zaehlungFinden([])).toBeUndefined();
  });
});

describe("Zählung in Abschnitten", () => {
  it("Pivka: Titelei römisch, eingeschobene Farbtafeln, danach weiter", () => {
    // PDF 5 = Seite 1 (Versatz −4) bis PDF 28; Tafeln PDF 29–36; PDF 37 = Seite 25 (−12).
    const texte = Array.from({ length: 56 }, (_, k) => {
      const pdf = k + 1;
      if (pdf <= 4 || (pdf >= 29 && pdf <= 36) || pdf === 56) return "Tafel ohne Zahl mit Bildunterschrift";
      const buch = pdf <= 28 ? pdf - 4 : pdf - 12;
      return pdf % 2 ? `Text der Seite mit einigen Wörtern ${buch}` : "Seite ohne Zahl am Ende hier";
    });
    expect(zaehlungBereiche(texte)).toEqual([
      { pdfSeite: 1, art: "roemisch", start: 1 },
      { pdfSeite: 5, art: "zahl", start: 1 },
      { pdfSeite: 29, art: "tafel", start: 1 },
      { pdfSeite: 37, art: "zahl", start: 25 },
    ]);
  });
  it("ein Versatz wie Stein", () => {
    const texte = Array.from({ length: 30 }, (_, k) => (k > 3 ? `Text ${k - 1}` + " und mehr Worte" : "Titel"));
    expect(zaehlungBereiche(texte.map((t, k) => (k > 3 ? `${k - 1} Text und mehr Worte` : t)))).toEqual([
      { pdfSeite: 1, art: "roemisch", start: 1 },
      { pdfSeite: 3, art: "zahl", start: 1 },
    ]);
  });
});

describe("Seite mehrmals lesen", () => {
  it("liest eine volle Seite nicht wegen acht unsicherer Wörter dreimal", async () => {
    const { nochmalLesen } = await import("@/lib/scan/ocr");
    expect(nochmalLesen(8, 400)).toBe(false); // 2 % – der Normalfall
    expect(nochmalLesen(29, 400)).toBe(true); // Stein S. 26
    expect(nochmalLesen(8, 60)).toBe(true); // kurze Seite, viel unsicher
    expect(nochmalLesen(5, 60)).toBe(false);
  });

  it("zieht eine Lesung mit Lücken nicht vor, nur weil sie weniger unsichere Wörter hat", async () => {
    const { bessereLesung } = await import("@/lib/scan/ocr");
    const voll = { unsicher: 12, woerter: 400, sicherheit: 85 };
    const lueckig = { unsicher: 3, woerter: 330, sicherheit: 90 };
    expect(bessereLesung(voll, lueckig)).toBe(voll);
    expect(bessereLesung(lueckig, voll)).toBe(voll);
    const besser = { unsicher: 4, woerter: 398, sicherheit: 88 };
    expect(bessereLesung(voll, besser)).toBe(besser);
  });
});
