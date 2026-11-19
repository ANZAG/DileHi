/**
 * Einen Ordner beobachten, in den die Software eines Buchscanners (CZUR,
 * ScanSnap, NAPS2 …) ihre Seiten legt. Jede neue Seite geht von selbst in
 * die Reihe des Scanners – mit Texterkennung, PDF und SharePoint wie jede
 * Aufnahme der Kamera.
 *
 * Möglich in Chrome und Edge am Rechner (File System Access). Der Browser
 * fragt einmal, ob die Seite den Ordner lesen darf; schreiben darf sie nicht.
 *
 * Hier steht nur die Regel, wann eine Datei fertig ist: Eine Scanner-Software
 * schreibt eine grosse Datei nicht auf einen Schlag. Übernommen wird erst,
 * wenn Grösse und Änderungszeit bei zwei Durchgängen gleich geblieben sind.
 */

export interface DateiStand {
  name: string;
  groesse: number;
  geaendert: number;
}

/** Was der Browser als Bild lesen kann. TIFF gehört nicht dazu. */
export const BILD_ENDUNGEN = ["jpg", "jpeg", "png", "webp", "bmp"];
const endung = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
export const istBild = (name: string) => BILD_ENDUNGEN.includes(endung(name));
export const istTiff = (name: string) => ["tif", "tiff"].includes(endung(name));

/** Reihenfolge wie im Explorer: „Seite 2" vor „Seite 10". */
export const nachName = (a: string, b: string) => a.localeCompare(b, "de", { numeric: true, sensitivity: "base" });

export class Ordnerwache {
  private stand = new Map<string, { groesse: number; geaendert: number; fertig: boolean }>();

  /** `schonDa`: Dateien, die beim Start im Ordner liegen und nicht übernommen werden sollen. */
  constructor(schonDa: DateiStand[] = []) {
    for (const d of schonDa) this.stand.set(d.name, { groesse: d.groesse, geaendert: d.geaendert, fertig: true });
  }

  /**
   * Ein Durchgang: Welche Dateien sind jetzt fertig und noch nicht übernommen?
   * Nach Namen sortiert. Jede Datei kommt genau einmal.
   */
  pruefen(liste: DateiStand[]): string[] {
    const bereit: string[] = [];
    for (const d of liste) {
      if (!istBild(d.name)) continue;
      const alt = this.stand.get(d.name);
      if (alt?.fertig) continue;
      if (alt && alt.groesse === d.groesse && alt.geaendert === d.geaendert && d.groesse > 0) {
        alt.fertig = true;
        bereit.push(d.name);
      } else {
        this.stand.set(d.name, { groesse: d.groesse, geaendert: d.geaendert, fertig: false });
      }
    }
    return bereit.sort(nachName);
  }
}
