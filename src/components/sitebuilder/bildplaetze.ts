/**
 * Bildplätze in gespeichertem Fliesstext auflösen.
 *
 * Im Text steht statt einer Bildadresse ein Platz: `<img data-bild="…">`.
 * Ist dafür ein Bild hinterlegt, bekommt das <img> seine Adresse; sonst ein
 * gestrichelter Platzhalter in derselben Grösse. So kann ein Bild mitten in
 * einer Tabellenzelle oder vom Text umflossen stehen, ohne dass der Text in
 * Stücke zerlegt werden muss.
 *
 * Eigene Datei statt in den Bausteinen: Dort sollen nur Komponenten stehen,
 * sonst lädt die Entwicklungsumgebung bei jeder Änderung die ganze Seite neu.
 */
export function bildplaetzeAufloesen(
  html: string, bilder: Record<string, { src: string; alt: string }>,
): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  doc.querySelectorAll("img[data-bild]").forEach((img) => {
    const platz = img.getAttribute("data-bild") ?? "";
    const bild = bilder[platz];
    if (bild?.src) {
      img.setAttribute("src", bild.src);
      if (!img.getAttribute("alt")) img.setAttribute("alt", bild.alt);
      return;
    }
    // Der Platzhalter ist selbst ein Bild, kein Kasten. Das ist wichtig: Ein
    // Bild darf in einer Tabelle schmaler werden als seine angegebene Breite
    // (`max-width: 100%`), ein Kasten nicht. Die Vorlage zeigt Bilder mit
    // 150 px Breite in schmalen Spalten mit 41 px – ein Kasten hätte die
    // Spalte auf 150 px aufgedrückt und die Tabelle auseinandergezogen.
    const was = img.getAttribute("alt") || platz;
    img.setAttribute("src", platzhalterBild(
      Number(img.getAttribute("width")) || 0, Number(img.getAttribute("height")) || 0, was,
    ));
    img.setAttribute("alt", `Platzhalter für ein Bild: ${was}`);
    img.classList.add("bildplatz");
  });
  return doc.body.innerHTML;
}

/** Ein gestrichelter Rahmen mit Beschriftung, als SVG in der Grösse des Bildes. */
function platzhalterBild(breite: number, hoehe: number, text: string): string {
  const b = breite || 300;
  const h = hoehe || Math.round(b * 2 / 3);
  const sicher = text.replace(/[&<>"']/g, (z) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" } as Record<string, string>
  )[z]);
  const groesse = Math.max(9, Math.min(13, Math.round(b / 12)));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${b}" height="${h}" viewBox="0 0 ${b} ${h}">` +
    `<rect x="0.5" y="0.5" width="${b - 1}" height="${h - 1}" fill="#f3ebe1" stroke="#b9ad9e" stroke-dasharray="4 3"/>` +
    `<text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle" font-family="Arial, sans-serif" ` +
    `font-size="${groesse}" fill="#7d7266">${sicher}</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
