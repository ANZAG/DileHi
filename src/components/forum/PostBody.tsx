import DOMPurify from "dompurify";
import { useMemo } from "react";

/**
 * Zeigt einen Beitrag an.
 *
 * Der Text kommt als HTML aus dem Editor und wird vor der Anzeige gesäubert.
 * Das ist die entscheidende Stelle: Selbst wenn jemand über die API rohes HTML
 * in die Datenbank schreibt, landet hier nichts Ausführbares im Browser.
 * Erlaubt ist nur, was der Editor auch erzeugen kann.
 */
const ALLOWED_TAGS = [
  "p", "br", "strong", "em", "s", "code",
  "ul", "ol", "li", "blockquote", "h2", "h3", "a",
];

export default function PostBody({ html, className = "" }: { html: string; className?: string }) {
  const clean = useMemo(
    () =>
      DOMPurify.sanitize(html || "", {
        ALLOWED_TAGS,
        ALLOWED_ATTR: ["href", "target", "rel"],
        // javascript: und data: bleiben damit außen vor.
        ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
      }),
    [html]
  );

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none break-words
        prose-p:my-1.5 prose-headings:font-serif prose-a:text-primary
        prose-blockquote:border-l-primary/40 prose-blockquote:not-italic ${className}`}
      // Der Inhalt ist oben gesäubert; ohne diese Stelle liesse sich formatierter
      // Text nicht anzeigen.
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
