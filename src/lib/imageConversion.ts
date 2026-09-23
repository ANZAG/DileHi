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
