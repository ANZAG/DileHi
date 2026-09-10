import { useState } from "react";
import FormFieldRenderer, { isFieldVisible } from "./FormFieldRenderer";
import type { FormField } from "./types";
import { Button } from "@/components/ui/button";
import { RotateCcw, Eye } from "lucide-react";

interface Props {
  title: string;
  description?: string | null;
  fields: FormField[];
  eventStartDate?: string;
  eventEndDate?: string | null;
  highlightFieldId?: string | null;
}

/** Live-Vorschau: zeigt das Formular genau so, wie Teilnehmer es sehen. */
export default function FormPreview({
  title,
  description,
  fields,
  eventStartDate,
  eventEndDate,
  highlightFieldId,
}: Props) {
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const visible = fields.filter((f) => f.type === "section" || isFieldVisible(f, fields, answers));

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-2.5 border-b bg-muted/40">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Eye size={15} className="text-primary" /> Vorschau
        </div>
        <Button variant="ghost" size="sm" className="h-7" onClick={() => setAnswers({})}>
          <RotateCcw size={13} className="mr-1" /> Zurücksetzen
        </Button>
      </div>

      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        <div>
          <h2 className="font-serif text-xl font-bold">{title || "Anmeldung"}</h2>
          {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">
            Testeingaben hier zeigen dir sofort, welche Folgefragen erscheinen.
          </p>
        </div>

        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Noch keine Fragen. Füge links die erste Frage hinzu.
          </p>
        )}

        {visible.map((field) => (
          <div
            key={field.id}
            className={`rounded-md transition-colors ${
              highlightFieldId === field.id ? "ring-2 ring-primary/60 ring-offset-2 ring-offset-card" : ""
            }`}
          >
            <FormFieldRenderer
              field={field}
              value={answers[field.id]}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [field.id]: v }))}
              eventStartDate={eventStartDate}
              eventEndDate={eventEndDate}
              memberTents={[]}
            />
          </div>
        ))}

        {fields.length > 0 && (
          <Button className="w-full" disabled>Anmeldung absenden</Button>
        )}
      </div>
    </div>
  );
}
