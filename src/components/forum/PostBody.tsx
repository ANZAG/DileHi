import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { sanitizePostHtml } from "./sanitize";
import { signForumImages } from "./forumImages";
import "./forum-content.css";

/** Ablageorte der Bilder aus dem gesäuberten HTML – sie brauchen frische Adressen. */
function imagePaths(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/data-path="([^"]+)"/g)) found.add(m[1]);
  return [...found];
}

/**
 * Zeigt einen Beitrag an.
 *
 * Der Text kommt als HTML aus dem Editor und wird vor der Anzeige gesäubert
 * (siehe sanitize.ts). Hier wird danach nur noch nachgebessert, was sich nicht
 * über die Positivliste regeln lässt.
 */
export default function PostBody({ html, className = "" }: { html: string; className?: string }) {
  const clean = useMemo(() => sanitizePostHtml(html), [html]);

  const paths = useMemo(() => imagePaths(clean), [clean]);

  // Die Bildadressen laufen nach einer Stunde ab; deshalb werden sie beim
  // Anzeigen erzeugt und eine halbe Stunde lang wiederverwendet.
  const { data: signed } = useQuery({
    queryKey: ["forum-images", paths],
    queryFn: () => signForumImages(paths),
    enabled: paths.length > 0,
    staleTime: 30 * 60 * 1000,
  });

  const final = useMemo(() => {
    if (!clean) return "";
    // Nur anfassen, was auch angefasst werden muss.
    if (
      paths.length === 0 &&
      !clean.includes("<table") &&
      !clean.includes("<input") &&
      !clean.includes("<img") &&
      !clean.includes('data-type="mention"')
    ) {
      return clean;
    }

    const doc = new DOMParser().parseFromString(`<div>${clean}</div>`, "text/html");
    const root = doc.body.firstElementChild;
    if (!root) return clean;

    // `class` steht nicht auf der Positivliste – beliebige Klassen aus der
    // Datenbank sollen das Aussehen der Seite nicht bestimmen können. Die eine
    // Klasse, die wir brauchen, wird hier gesetzt.
    root.querySelectorAll('span[data-type="mention"]').forEach((el) => {
      el.className = "forum-mention";
    });

    root.querySelectorAll("img[data-path]").forEach((img) => {
      const url = signed?.[img.getAttribute("data-path") ?? ""];
      // Ohne frische Adresse lieber gar kein src – ein kaputtes Bildsymbol
      // irritiert mehr als eine kurze Lücke (siehe forum-content.css).
      if (url) img.setAttribute("src", url);
      else img.removeAttribute("src");
      img.setAttribute("loading", "lazy");
    });

    // Fremde Bilder aus dem Netz nicht mit der Herkunft versorgen.
    root.querySelectorAll("img:not([data-path])").forEach((img) => {
      // DOMPurify lässt `data:`-Adressen an <img> grundsätzlich durch, auch
      // gegen einen strengeren ALLOWED_URI_REGEXP. Ausführbar ist so ein Bild
      // zwar nicht – aber ein eingebettetes Bild bläht den Beitrag in der
      // Datenbank auf und umgeht die Größengrenze des Buckets.
      if ((img.getAttribute("src") ?? "").trim().toLowerCase().startsWith("data:")) {
        img.remove();
        return;
      }
      img.setAttribute("referrerpolicy", "no-referrer");
      img.setAttribute("loading", "lazy");
    });

    // Häkchen anzeigen, aber nicht anklickbar: Der Beitrag ist ein Beitrag,
    // keine gemeinsame Liste. Wer eine gemeinsame Liste will, nimmt die
    // Mitbringliste – die speichert auch, wer was übernommen hat.
    root.querySelectorAll("input").forEach((el) => {
      el.setAttribute("type", "checkbox");
      el.setAttribute("disabled", "disabled");
    });

    // Breite Tabellen sollen in sich scrollen statt die ganze Seite zu
    // verschieben.
    root.querySelectorAll("table").forEach((table) => {
      if ((table.parentElement as HTMLElement | null)?.classList.contains("forum-table-scroll")) return;
      const wrap = doc.createElement("div");
      wrap.className = "forum-table-scroll";
      table.replaceWith(wrap);
      wrap.append(table);
    });

    return root.innerHTML;
  }, [clean, paths, signed]);

  return (
    <div
      className={`forum-content prose prose-sm dark:prose-invert max-w-none break-words
        prose-p:my-1.5 prose-headings:font-serif prose-h1:text-lg prose-h2:text-base
        prose-a:text-primary
        prose-blockquote:border-l-primary/40 prose-blockquote:not-italic ${className}`}
      // Der Inhalt ist oben gesäubert; ohne diese Stelle liesse sich formatierter
      // Text nicht anzeigen.
      dangerouslySetInnerHTML={{ __html: final }}
    />
  );
}
