/**
 * Baut aus einem Beitrag ein Zitat für die Antwort.
 *
 * Bewusst nicht der ganze Beitrag: Verschachtelte Zitate lassen einen Thread
 * nach drei Antworten wie ein Treppenhaus aussehen, und Bilder ein zweites Mal
 * zu zeigen hilft niemandem. Zitiert wird der Text – und wer ihn geschrieben
 * hat, steht als Eigenschaft daran, nicht als mitlöschbarer Vorspann.
 */
export function buildQuote(author: string, html: string): string {
  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";

  root.querySelectorAll("blockquote, img, table").forEach((el) => el.remove());

  let text = root.innerHTML.trim();
  if (text === "") text = "<p></p>";

  // Sehr lange Beiträge gekürzt zitieren – sonst steht die halbe Seite doppelt.
  const plain = root.textContent ?? "";
  if (plain.length > 600) {
    const short = plain.slice(0, 600).replace(/\s\S*$/, "");
    text = `<p>${escapeHtml(short)} …</p>`;
  }

  const quote = doc.createElement("blockquote");
  quote.setAttribute("data-quote-author", author);
  quote.innerHTML = text;

  // Der leere Absatz dahinter ist die Stelle, an der weitergeschrieben wird.
  return `${quote.outerHTML}<p></p>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
