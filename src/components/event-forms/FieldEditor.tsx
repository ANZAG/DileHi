import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_TYPES, type FormField } from "./types";
import ConditionEditor from "./ConditionEditor";

interface Props {
  field: FormField;
  allFields: FormField[];
  onChange: (field: FormField) => void;
}

/** Inline-Editor für ein einzelnes Feld – in Klartext, ohne technische Begriffe */
export default function FieldEditor({ field, allFields, onChange }: Props) {
  const meta = FIELD_TYPES.find((t) => t.value === field.type);
  const patchSettings = (patch: Record<string, any>) =>
    onChange({ ...field, settings: { ...(field.settings || {}), ...patch } });

  return (
    <div className="space-y-4 pt-3">
      {meta && (
        <p className="text-xs text-muted-foreground bg-muted/50 rounded-md px-2 py-1.5">{meta.hint}</p>
      )}

      <div>
        <Label className="text-sm">{field.type === "section" ? "Überschrift" : "Frage"}</Label>
        <Input
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          placeholder={field.type === "section" ? "z.B. Anreise" : "z.B. Hast du Allergien?"}
        />
      </div>

      <div>
        <Label className="text-sm">Hinweistext (optional)</Label>
        <Input
          value={field.description || ""}
          onChange={(e) => onChange({ ...field, description: e.target.value || null })}
          placeholder="Kurze Erklärung für die Teilnehmer"
        />
      </div>

      {["select", "multi_select"].includes(field.type) && (
        <div>
          <Label className="text-sm">Antwortmöglichkeiten (eine pro Zeile)</Label>
          <Textarea
            rows={4}
            value={(field.options || []).join("\n")}
            onChange={(e) =>
              onChange({ ...field, options: e.target.value.split("\n").map((s) => s.replace(/^\s+/, "")) })
            }
            placeholder={"Option 1\nOption 2"}
          />
        </div>
      )}

      {["text", "textarea", "number"].includes(field.type) && (
        <div>
          <Label className="text-sm">Platzhalter im Eingabefeld (optional)</Label>
          <Input
            value={field.settings?.placeholder || ""}
            onChange={(e) => patchSettings({ placeholder: e.target.value })}
            placeholder="z.B. 4"
          />
        </div>
      )}

      {field.type === "attendance_days" && (
        <div>
          <Label className="text-sm">Art der Auswahl</Label>
          <Select
            value={field.settings?.mode === "range" ? "range" : "days"}
            onValueChange={(v) => patchSettings({ mode: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="days">Einzelne Tage ankreuzen</SelectItem>
              <SelectItem value="range">Zeitraum von–bis wählen</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Die Tage werden automatisch aus dem Veranstaltungszeitraum erzeugt.
          </p>
        </div>
      )}

      {field.type !== "section" && (
        <div className="flex items-center gap-2">
          <Switch
            checked={field.required}
            onCheckedChange={(checked) => onChange({ ...field, required: checked })}
          />
          <Label className="text-sm">Antwort ist verpflichtend</Label>
        </div>
      )}

      <ConditionEditor
        field={field}
        allFields={allFields}
        onChange={(visibility) => {
          const settings = { ...(field.settings || {}) };
          delete settings.conditional_on;
          delete settings.conditional_value;
          if (visibility) settings.visibility = visibility;
          else delete settings.visibility;
          onChange({ ...field, settings });
        }}
      />
    </div>
  );
}
