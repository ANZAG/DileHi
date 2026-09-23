import { useEffect, useState } from "react";
import { AutoField, FieldLabel } from "@puckeditor/core";
import { Code2, Eye } from "lucide-react";
import { FLIESSTEXT_FELD } from "./fliesstextFeld";

/**
 * Text bearbeiten – wahlweise sichtbar oder als Quelltext.
 *
 * Der normale Weg ist der Editor. Aber es gibt immer den Fall, in dem etwas
 * hängt: eine Tabelle, die aus einer alten Seite übernommen wurde, ein Absatz,
 * der sich nicht auflösen lässt, eine Formatierung, die durch das Einfügen aus
 * Word hereingeraten ist. Ohne Quelltextansicht läuft man dann gegen eine
 * Wand.
 *
 * Nutzen muss das niemand – der Schalter steht klein daneben und der Editor
 * ist die Vorgabe.
 */
export default function QuelltextFeld({
  value,
  onChange,
  readOnly,
}: {
  value: unknown;
  onChange: (v: unknown) => void;
  readOnly?: boolean;
}) {
  const [quelltext, setQuelltext] = useState(false);
  const [entwurf, setEntwurf] = useState("");

  // Beim Umschalten den aktuellen Stand übernehmen. Ohne das steht im
  // Quelltextfeld noch, was beim letzten Mal drinstand.
  useEffect(() => {
    if (quelltext) setEntwurf(typeof value === "string" ? value : "");
  }, [quelltext, value]);

  return (
    <div>
      {quelltext ? (
        <FieldLabel label="Text (Quelltext)">
          <textarea
            value={entwurf}
            readOnly={readOnly}
            rows={12}
            spellCheck={false}
            onChange={(e) => setEntwurf(e.target.value)}
            // Erst beim Verlassen übernehmen: Bei jedem Tastendruck zu
            // speichern würde den Editor bei halb geschriebenen Elementen
            // durcheinanderbringen.
            onBlur={() => onChange(entwurf)}
            className="w-full rounded-md border bg-background px-2 py-1.5 font-mono text-xs leading-relaxed"
          />
        </FieldLabel>
      ) : (
        <AutoField
          // AutoField zeichnet das normale Puck-Feld – hier das Rich-Text-Feld,
          // das der Editor sonst auch benutzt. So ist die eine Ansicht nicht
          // eine Nachbildung der anderen.
          // Mit den Erweiterungen für Bilder, Tabellen und Spalten – ohne sie
          // verwürfe der Editor diese Teile beim Öffnen.
          field={FLIESSTEXT_FELD as never}
          value={value}
          onChange={onChange as never}
          readOnly={readOnly}
        />
      )}

      <button
        type="button"
        onClick={() => {
          // Beim Zurückschalten den Quelltext sichern, falls noch nicht
          // geschehen.
          if (quelltext) onChange(entwurf);
          setQuelltext(!quelltext);
        }}
        className="mt-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {quelltext ? <Eye size={12} /> : <Code2 size={12} />}
        {quelltext ? "Zurück zum Editor" : "Quelltext bearbeiten"}
      </button>
    </div>
  );
}
