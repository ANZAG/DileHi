import { attachFile, registerSource, uploadToSharePoint, type DriveItem } from "@/lib/sharePointFiles";
import { pdfBauen, type PdfSeite } from "./pdf";
import { textAblegen } from "./quelltext";
import { dateiLaden, textLaden, type Sitzung } from "./speicher";

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

  const texte: string[] = [];
  if (!st.driveItemId) {
    const pdfSeiten: PdfSeite[] = [];
    for (const [i, s] of seiten.entries()) {
      const bild = await dateiLaden(s.bildId);
      if (!bild) throw new Error(`Das Bild von Seite ${i + 1} fehlt im Zwischenspeicher.`);
      const ocr = await textLaden(s.id);
      texte.push(ocr?.text ?? "");
      pdfSeiten.push({ jpeg: new Uint8Array(await bild.arrayBuffer()), breite: s.breite, hoehe: s.hoehe, woerter: ocr?.woerter });
      melden("pdf", (i + 1) / seiten.length / 2, st);
    }
    const bytes = await pdfBauen(pdfSeiten, weiche.titel);
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
  } else {
    for (const s of seiten) texte.push((await textLaden(s.id))?.text ?? "");
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
    if (texte.some((t) => t.trim())) await textAblegen(st.driveItemId!, texte);
    st.textAbgelegt = true;
  }
  melden("fertig", 1, st);
  return st;
}
