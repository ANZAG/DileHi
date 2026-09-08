/**
 * Bilder vor dem Hochladen nach WebP wandeln.
 *
 * Auf einer Vereinsseite mit vielen Fotos ist das der Unterschied zwischen
 * einer Seite, die auf dem Handy im Funkloch lädt, und einer, die es nicht
 * tut. Ein Foto aus einer Kamera bringt gern 4 MB mit; als WebP sind daraus
 * ein paar Hundert Kilobyte.
 *
 * Stand vorher wortgleich in GalleryAdmin und SiteImagesAdmin. Beim dritten
 * Aufrufer (Bildauswahl im Seiteneditor) war es Zeit, sie herauszuziehen.
 */
export function convertToWebP(file: File, qualitaet = 0.85): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
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
