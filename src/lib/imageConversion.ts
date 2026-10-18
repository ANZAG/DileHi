/**
 * Bilder vor dem Hochladen nach WebP wandeln.
 *
 * Auf einer Vereinsseite mit vielen Fotos ist das der Unterschied zwischen
 * einer Seite, die auf dem Handy im Funkloch lädt, und einer, die es nicht
 * tut. Ein Foto aus einer Kamera bringt gern 4 MB mit; als WebP sind daraus
 * ein paar Hundert Kilobyte.
 *
 * Stand vorher wortgleich in mehreren Verwaltungsmasken. Beim dritten
 * Aufrufer war es Zeit, sie herauszuziehen.
 *
 * Grösser als {@link MAX_KANTE} Pixel an der längeren Seite wird nichts
 * gespeichert – so wie WordPress grosse Fotos beim Hochladen verkleinert. Ein
 * Kamerafoto mit 6000 px bringt auf keinem Bildschirm mehr als 2560 px, kostet
 * aber das Fünffache an Ladezeit. Wer ein Bild vorher nicht zuschneidet, muss
 * sich darum also nicht kümmern.
 */
export const MAX_KANTE = 2560;

/** Die Masse nach dem Verkleinern: nie grösser als MAX_KANTE, nie vergrössert. */
export function zielmass(breite: number, hoehe: number, maxKante = MAX_KANTE): { breite: number; hoehe: number } {
  const faktor = Math.min(1, maxKante / Math.max(breite, hoehe));
  return { breite: Math.max(1, Math.round(breite * faktor)), hoehe: Math.max(1, Math.round(hoehe * faktor)) };
}

export function convertToWebP(file: File, qualitaet = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      const { breite, hoehe } = zielmass(img.naturalWidth, img.naturalHeight);
      canvas.width = breite;
      canvas.height = hoehe;
      const zeichnen = canvas.getContext("2d");
      if (zeichnen) {
        zeichnen.imageSmoothingQuality = "high";
        zeichnen.drawImage(img, 0, 0, breite, hoehe);
      }
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Konvertierung fehlgeschlagen"));
            return;
          }
          const basis = file.name.replace(/\.[^/.]+$/, "");
          resolve(new File([blob], `${basis}.webp`, { type: "image/webp" }));
        },
        "image/webp",
        qualitaet
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Bild konnte nicht geladen werden"));
    };

    img.src = objectUrl;
  });
}

/**
 * Die kleineren Fassungen eines Bildes, als WebP (src/lib/bildfassungen.mjs).
 *
 * Von der grössten zur kleinsten, jede aus der vorigen gezeichnet: Ein Schritt
 * von 1920 auf 400 px in einem Zug lässt feine Linien flimmern, mehrere
 * kleinere Schritte nicht.
 */
export function fassungenZeichnen(
  datei: Blob, breitenFuer: (breite: number) => number[], qualitaet = 0.8,
): Promise<{ breite: number; hoehe: number; fassungen: { breite: number; datei: Blob }[] }> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const objectUrl = URL.createObjectURL(datei);
    img.onload = async () => {
      URL.revokeObjectURL(objectUrl);
      const breite = img.naturalWidth;
      const hoehe = img.naturalHeight;
      const fassungen: { breite: number; datei: Blob }[] = [];
      let quelle: CanvasImageSource = img;
      for (const b of breitenFuer(breite).filter((w) => w < breite).sort((x, y) => y - x)) {
        const canvas = document.createElement("canvas");
        canvas.width = b;
        canvas.height = Math.max(1, Math.round((hoehe * b) / breite));
        const zeichnen = canvas.getContext("2d");
        if (!zeichnen) break;
        zeichnen.imageSmoothingQuality = "high";
        zeichnen.drawImage(quelle, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((fertig) => canvas.toBlob(fertig, "image/webp", qualitaet));
        if (blob) fassungen.push({ breite: b, datei: blob });
        quelle = canvas;
      }
      resolve({ breite, hoehe, fassungen });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Bild konnte nicht geladen werden"));
    };
    img.src = objectUrl;
  });
}
