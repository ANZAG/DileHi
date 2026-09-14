// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  csvLesen, dateiLesen, datumLesen, dekodieren, excelDatum, nameTeilen, trennzeichen,
  xlsxLesen, zeilenPruefen, zuordnungRaten, VORLAGE_CSV,
} from "@/lib/import";

/**
 * Import von Mitgliederlisten.
 *
 * Was eine Liste vom Kassenwart typischerweise mitbringt: Semikolon statt
 * Komma, Umlaute in Windows-1252, „Name" statt „Nachname", Datumsangaben in
 * drei Schreibweisen, und dieselbe Person zweimal.
 */

describe("CSV", () => {
  it("erkennt Semikolon, Komma und Tabulator", () => {
    expect(trennzeichen("a;b;c\n1;2;3")).toBe(";");
    expect(trennzeichen("a,b,c")).toBe(",");
    expect(trennzeichen("a\tb\tc")).toBe("\t");
    expect(trennzeichen('"Muster; Ida",b,c')).toBe(",");
  });

  it("liest Anführungszeichen, Zeilenumbrüche im Feld und leere Zeilen", () => {
    const text = '\uFEFFName;Notiz\r\n"Muster, Ida";"sagt ""hallo""\nund tschüss"\r\n\r\nBen;\r\n';
    expect(csvLesen(text)).toEqual([
      ["Name", "Notiz"],
      ["Muster, Ida", 'sagt "hallo"\nund tschüss'],
      ["Ben", ""],
    ]);
  });

  it("liest Umlaute aus Excel unter Windows", () => {
    const bytes = new Uint8Array([0x4d, 0xfc, 0x6c, 0x6c, 0x65, 0x72, 0x3b, 0x53, 0x74, 0x72, 0x61, 0xdf, 0x65]);
    expect(dekodieren(bytes)).toBe("Müller;Straße");
    expect(dekodieren(new TextEncoder().encode("Müller"))).toBe("Müller");
  });

  it("liest die eigene Vorlage mit allen Spalten erkannt", () => {
    const [kopf] = csvLesen(VORLAGE_CSV);
    expect(zuordnungRaten(kopf)).not.toContain("");
  });
});

describe("Spalten zuordnen", () => {
  it("erkennt, wie andere Programme die Spalten nennen", () => {
    const kopf = ["Mitgl.-Nr.", "Anrede", "Vorname", "Name", "Str.", "Hausnr.", "PLZ", "Wohnort", "Geb.-Datum", "E-Mail privat", "Mitglied seit", "Beitragsart"];
    expect(zuordnungRaten(kopf)).toEqual([
      "", "salutation", "first_name", "last_name", "street", "house_number", "zip", "city", "birthdate", "email", "entry_date", "membership_type",
    ]);
  });

  it("nimmt „Name“ allein als vollen Namen", () => {
    expect(zuordnungRaten(["Name", "E-Mail"])).toEqual(["full_name", "email"]);
  });

  it("vergibt jedes Feld nur einmal", () => {
    expect(zuordnungRaten(["Telefon", "Handy"])).toEqual(["phone", ""]);
  });
});

describe("Datum und Name", () => {
  const heute = new Date(2026, 8, 15);

  it("liest die üblichen Schreibweisen", () => {
    expect(datumLesen("01.02.1990", heute)).toBe("1990-02-01");
    expect(datumLesen("1.2.90", heute)).toBe("1990-02-01");
    expect(datumLesen("3.4.12", heute)).toBe("2012-04-03");
    expect(datumLesen("1990-02-01", heute)).toBe("1990-02-01");
    expect(datumLesen("1990-02-01T00:00:00", heute)).toBe("1990-02-01");
  });

  it("lehnt ab, was kein Datum ist", () => {
    expect(datumLesen("31.02.1990", heute)).toBeNull();
    expect(datumLesen("Februar 1990", heute)).toBeNull();
    expect(datumLesen("02/01/1990", heute)).toBeNull();
  });

  it("teilt den vollen Namen", () => {
    expect(nameTeilen("Muster, Ida Maria")).toEqual({ first_name: "Ida Maria", last_name: "Muster" });
    expect(nameTeilen("Ida Maria Muster")).toEqual({ first_name: "Ida Maria", last_name: "Muster" });
    expect(nameTeilen("Muster")).toEqual({ first_name: null, last_name: "Muster" });
  });
});

describe("Zeilen prüfen", () => {
  const kopf = ["Vorname", "Name", "E-Mail", "Straße", "Nr", "Geburtsdatum", "Mitgliedsart"];
  const daten = [
    ["Ida", "Muster", "Ida@Example.org", "Weg", "1", "01.02.1990", "Passiv"],
    ["Ben", "Beispiel", "", "", "", "", ""],
    ["Cem", "Test", "keine-adresse", "", "", "", ""],
    ["Dora", "Da", "dora@example.org", "", "", "", ""],
    ["Ida", "Doppelt", "ida@example.org", "", "", "gestern", "Ehrenmitglied"],
  ];
  const ergebnis = zeilenPruefen(daten, zuordnungRaten(kopf), {
    vorhanden: new Set(["dora@example.org"]),
    mitgliedsarten: [{ key: "aktiv", label: "Aktiv" }, { key: "passiv", label: "Passiv" }],
    ersteZeileNummer: 2,
  });

  it("nimmt eine vollständige Zeile an und setzt sie zusammen", () => {
    expect(ergebnis[0].status).toBe("neu");
    expect(ergebnis[0].nummer).toBe(2);
    expect(ergebnis[0].zeile).toMatchObject({
      email: "ida@example.org", street: "Weg 1", birthdate: "1990-02-01", membership_type: "passiv",
    });
  });

  it("weist Zeilen ohne gültige Adresse ab", () => {
    expect(ergebnis[1].status).toBe("fehler");
    expect(ergebnis[2].status).toBe("fehler");
  });

  it("überspringt vorhandene und doppelte", () => {
    expect(ergebnis[3].status).toBe("vorhanden");
    expect(ergebnis[4].status).toBe("doppelt");
  });

  it("sagt, was nicht übernommen wird", () => {
    expect(ergebnis[4].meldungen.join(" ")).toContain("Geburtsdatum „gestern“ nicht lesbar");
    expect(ergebnis[4].meldungen.join(" ")).toContain("Mitgliedsart „Ehrenmitglied“ gibt es nicht");
  });
});

// ── Excel ───────────────────────────────────────────────────────────────────

/** Ein minimales ZIP-Archiv – gespeichert oder mit deflate gepackt, wie Excel es tut. */
async function zipBauen(dateien: Record<string, string>, packen: string[] = []): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const lokal: Uint8Array[] = [];
  const zentral: Uint8Array[] = [];
  let versatz = 0;
  for (const [name, inhalt] of Object.entries(dateien)) {
    const n = enc.encode(name);
    let daten = enc.encode(inhalt);
    const methode = packen.includes(name) ? 8 : 0;
    if (methode === 8) {
      const strom = new Blob([daten]).stream().pipeThrough(new CompressionStream("deflate-raw"));
      daten = new Uint8Array(await new Response(strom).arrayBuffer());
    }
    const kopf = new DataView(new ArrayBuffer(30));
    kopf.setUint32(0, 0x04034b50, true);
    kopf.setUint16(8, methode, true);
    kopf.setUint32(18, daten.length, true);
    kopf.setUint16(26, n.length, true);
    lokal.push(new Uint8Array(kopf.buffer), n, daten);

    const z = new DataView(new ArrayBuffer(46));
    z.setUint32(0, 0x02014b50, true);
    z.setUint16(10, methode, true);
    z.setUint32(20, daten.length, true);
    z.setUint16(28, n.length, true);
    z.setUint32(42, versatz, true);
    zentral.push(new Uint8Array(z.buffer), n);
    versatz += 30 + n.length + daten.length;
  }
  const zentralGroesse = zentral.reduce((s, t) => s + t.length, 0);
  const ende = new DataView(new ArrayBuffer(22));
  ende.setUint32(0, 0x06054b50, true);
  ende.setUint16(10, Object.keys(dateien).length, true);
  ende.setUint32(12, zentralGroesse, true);
  ende.setUint32(16, versatz, true);
  const teile = [...lokal, ...zentral, new Uint8Array(ende.buffer)];
  const alles = new Uint8Array(teile.reduce((s, t) => s + t.length, 0));
  let p = 0;
  for (const t of teile) {
    alles.set(t, p);
    p += t.length;
  }
  return alles;
}

const MAPPE = {
  "xl/workbook.xml":
    '<workbook xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Mitglieder" sheetId="1" r:id="rId3"/></sheets></workbook>',
  "xl/_rels/workbook.xml.rels":
    '<Relationships><Relationship Id="rId1" Target="styles.xml"/><Relationship Target="worksheets/blatt.xml" Id="rId3"/></Relationships>',
  "xl/sharedStrings.xml":
    '<sst><si><t>Vorname</t></si><si><t>Geburtsdatum</t></si><si><r><t>Mül</t></r><r><t xml:space="preserve">ler &amp; Co</t></r><rPh><t>みゅ</t></rPh></si><si><t>PLZ</t></si></sst>',
  "xl/styles.xml":
    '<styleSheet><numFmts count="2"><numFmt numFmtId="164" formatCode="DD/MM/YYYY"/><numFmt numFmtId="165" formatCode="00000"/></numFmts>' +
    '<cellXfs count="4"><xf numFmtId="0"/><xf numFmtId="14"><alignment/></xf><xf numFmtId="164"/><xf numFmtId="165"/></cellXfs></styleSheet>',
  "xl/worksheets/blatt.xml":
    '<worksheet><sheetData>' +
    '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c><c r="C1" t="s"><v>3</v></c></row>' +
    '<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2" s="1"><v>32874</v></c><c r="C2" s="3"><v>1234</v></c></row>' +
    '<row r="3"/>' +
    '<row r="4"><c r="A4" t="inlineStr"><is><t>Ida</t></is></c><c r="C4" s="2"><v>45000</v></c></row>' +
    '</sheetData></worksheet>',
};

describe("Excel", () => {
  it("rechnet Excel-Datumswerte um", () => {
    expect(excelDatum(32874)).toBe("1990-01-01");
    expect(excelDatum(45000)).toBe("2023-03-15");
  });

  it("liest das erste Blatt mit Texten, Datum, führenden Nullen und Lücken", async () => {
    const bytes = await zipBauen(MAPPE, ["xl/worksheets/blatt.xml", "xl/sharedStrings.xml"]);
    expect(await xlsxLesen(bytes)).toEqual([
      ["Vorname", "Geburtsdatum", "PLZ"],
      ["Müller & Co", "1990-01-01", "01234"],
      ["Ida", "", "2023-03-15"],
    ]);
  });

  it("erkennt Excel am Inhalt, nicht am Namen", async () => {
    const bytes = await zipBauen(MAPPE);
    expect((await dateiLesen(new Blob([bytes])))[0]).toEqual(["Vorname", "Geburtsdatum", "PLZ"]);
    expect(await dateiLesen(new Blob(["a;b\n1;2"]))).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("sagt beim alten .xls-Format, was zu tun ist", async () => {
    const xls = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    await expect(dateiLesen(new Blob([xls]))).rejects.toThrow(/xlsx oder CSV/);
  });
});
