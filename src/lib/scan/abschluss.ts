import { attachFile, registerSource, uploadToSharePoint, type DriveItem } from "@/lib/sharePointFiles";
import { pdfBauen, type PdfSeite, type Wort } from "./pdf";
import { seitePruefen } from "./pruefung";
import { textAblegen } from "./quelltext";
import { dateiLaden, textLaden, type Sitzung } from "./speicher";
import { lesetext, markdownBauen } from "./text";

/**
 * Aus den Aufnahmen wird eine Quelle: PDF bauen, nach SharePoint laden,
 * der Weiche folgen (an eine Quelle hängen, neue Quelle, Posteingang) und
 * den erkannten Text für die Suche ablegen.
 *
 * Die Schritte merken sich, wie weit sie gekommen sind (`stand`): Scheitert
 * das Anlegen der Quelle nach dem Hochladen, wird beim nächsten Versuch
 * nicht ein zweites Mal hochgeladen.
 */

export interface AbschlussStand {
  driveItemId?: string;
  dateiName?: string;
  quelleId?: string;
  zugeordnet?: boolean;
  textAbgelegt?: boolean;
  /** Der Text als Markdown liegt neben dem PDF (oder ging nicht – dann nicht noch einmal). */
  markdownErledigt?: boolean;
}

/** Längste Seite eines Bildes im PDF: gut 300 ppi bei einer A5-Seite. */
const PDF_MAX = 2400;
const PDF_QUALITAET = 0.75;

/** Die Schrift der Textebene (Noto Sans) – ohne sie gilt Helvetica. */
async function schriftLaden(): Promise<Uint8Array | undefined> {
  try {
    const r = await fetch(`${window.location.origin}/ocr/NotoSans-Regular.ttf`);
    if (!r.ok) return undefined;
    return new Uint8Array(await r.arrayBuffer());
  } catch {
    return undefined;
  }
}

/** Sehr grosse Seiten (Fotos aus der Kamera-App) fürs PDF verkleinern. */
async function fuersPdf(bild: Blob, breite: number, hoehe: number, woerter: Wort[] | undefined) {
  const f = PDF_MAX / Math.max(breite, hoehe);
  if (f >= 1 || typeof createImageBitmap === "undefined") return { jpeg: new Uint8Array(await bild.arrayBuffer()), breite, hoehe, woerter };
  const b = Math.round(breite * f), h = Math.round(hoehe * f);
  const bmp = await createImageBitmap(bild);
  const c = document.createElement("canvas");
  c.width = b;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, 0, 0, b, h);
  bmp.close();
  const klein = await new Promise<Blob>((ok, fehler) => c.toBlob((x) => (x ? ok(x) : fehler(new Error("Seite nicht verkleinert."))), "image/jpeg", PDF_QUALITAET));
  return {
    jpeg: new Uint8Array(await klein.arrayBuffer()),
    breite: b,
    hoehe: h,
    woerter: woerter?.map((w) => ({ ...w, x0: w.x0 * f, y0: w.y0 * f, x1: w.x1 * f, y1: w.y1 * f })),
  };
}

export type Schritt = "pdf" | "hochladen" | "zuordnen" | "text" | "fertig";

/** Der Name der Datei: Titel, Datum. Was SharePoint nicht mag, ersetzt der Server. */
export function dateiname(titel: string, heute = new Date()): string {
  const datum = heute.toISOString().slice(0, 10);
  const sauber = titel.replace(/\s+/g, " ").trim().slice(0, 120) || "Scan";
  return `${sauber} (Scan ${datum}).pdf`;
}

export function seitenInReihenfolge(s: Sitzung) {
  return s.aufnahmen.flatMap((a) => a.seiten);
}

/** Die Texte der Seiten und das Buch als Markdown (auch zum Herunterladen). */
export async function textExport(sitzung: Sitzung): Promise<{ texte: string[]; markdown: string }> {
  const a = sitzung.angaben ?? {};
  const texte: string[] = [];
  const unsicher: boolean[] = [];
  for (const s of seitenInReihenfolge(sitzung)) {
    const ocr = await textLaden(s.id);
    texte.push(ocr?.text ?? "");
    unsicher.push(!!ocr && seitePruefen(s.befund, { sicherheit: ocr.sicherheit, woerter: ocr.woerter.length }).art === "pruefen");
  }
  const markdown = markdownBauen({
    titel: a.titel ?? sitzung.weiche?.titel ?? "Scan", autor: a.autor, jahr: a.jahr, zaehlung: a.zaehlung,
    datum: new Date().toISOString().slice(0, 10),
    seiten: texte.map((text, i) => ({ text, unsicher: unsicher[i] })),
  });
  return { texte, markdown };
}

export async function abschliessen(
  sitzung: Sitzung,
  stand: AbschlussStand,
  melden: (schritt: Schritt, anteil: number, stand: AbschlussStand) => void
): Promise<AbschlussStand> {
  const weiche = sitzung.weiche;
  if (!weiche) throw new Error("Es ist nicht festgelegt, wohin der Scan gehört.");
  const seiten = seitenInReihenfolge(sitzung);
  if (seiten.length === 0) throw new Error("Es gibt noch keine Seiten.");
  const st: AbschlussStand = { ...stand };

  const a = sitzung.angaben ?? {};
  const { texte, markdown } = await textExport(sitzung);
  if (!st.driveItemId) {
    const pdfSeiten: PdfSeite[] = [];
    for (const [i, s] of seiten.entries()) {
      const bild = await dateiLaden(s.bildId);
      if (!bild) throw new Error(`Das Bild von Seite ${i + 1} fehlt im Zwischenspeicher.`);
      const ocr = await textLaden(s.id);
      pdfSeiten.push(await fuersPdf(bild, s.breite, s.hoehe, ocr?.woerter));
      melden("pdf", (i + 1) / seiten.length / 2, st);
    }
    const bytes = await pdfBauen(pdfSeiten, {
      titel: a.titel ?? weiche.titel,
      autor: a.autor,
      thema: [a.autor, a.titel ?? weiche.titel, a.jahr].filter(Boolean).join(", "),
      stichwoerter: ["DileHi", "Quellensammlung", ...(weiche.art !== "eingang" ? [weiche.epoch] : []), ...(a.jahr ? [a.jahr] : [])],
      schrift: await schriftLaden(),
      zaehlung: a.zaehlung,
    });
    melden("pdf", 1, st);

    const datei = new File([bytes as BlobPart], dateiname(weiche.titel), { type: "application/pdf" });
    const item: DriveItem = await uploadToSharePoint(
      datei,
      weiche.art === "eingang" ? "" : weiche.epoch,
      (anteil) => melden("hochladen", anteil, st),
      fetch,
      weiche.art === "eingang"
    );
    st.driveItemId = item.id;
    st.dateiName = item.name;
    melden("hochladen", 1, st);
  }

  // Der Text als Markdown neben dem PDF – für die Auswertung, auch mit
  // KI-Werkzeugen. Geht das nicht, ist das kein Grund, den Scan scheitern
  // zu lassen.
  // Nicht im Posteingang: Dort erschiene sie als weitere Datei ohne Quelle.
  if (!st.markdownErledigt && weiche.art !== "eingang") {
    try {
      const name = (st.dateiName ?? dateiname(weiche.titel)).replace(/\.pdf$/i, "") + ".md";
      await uploadToSharePoint(new File([markdown], name, { type: "text/markdown" }), weiche.epoch, () => undefined, fetch, false);
    } catch { /* ohne Markdown */ }
    st.markdownErledigt = true;
  }

  if (!st.zugeordnet) {
    melden("zuordnen", 0, st);
    if (weiche.art === "neu") {
      const { id } = await registerSource({
        driveItemId: st.driveItemId!, title: weiche.titel, epoch: weiche.epoch, folderId: weiche.folderId,
      });
      st.quelleId = id;
    } else if (weiche.art === "quelle") {
      await attachFile(weiche.sourceId, st.driveItemId!);
      st.quelleId = weiche.sourceId;
    }
    st.zugeordnet = true;
    melden("zuordnen", 1, st);
  }

  if (!st.textAbgelegt) {
    melden("text", 0, st);
    // Für die Suche: Trennungen zusammengeführt, Absätze am Stück – so
    // findet „wurde“ auch das gedruckte „wur-⏎de“.
    if (texte.some((t) => t.trim())) await textAblegen(st.driveItemId!, texte.map(lesetext));
    st.textAbgelegt = true;
  }
  melden("fertig", 1, st);
  return st;
}
