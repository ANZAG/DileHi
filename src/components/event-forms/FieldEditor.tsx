import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FIELD_TYPES, type FormField } from "./types";
import { getRole, roleOf, rolesForFieldType } from "./fieldRoles";
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

  // Die Rolle sagt, wofür die Antwort steht. Ohne sie landet die Antwort nur in
  // der Anmeldeliste – die Kennzahlen der Auswertung speisen sich aus Rollen,
  // nicht mehr aus dem Beschriftungstext.
  const currentRole = roleOf(field);
  const activeRole = getRole(currentRole);
  const availableRoles = rolesForFieldType(field.type);
  // Eine Rolle darf je Formular nur einmal vergeben werden, sonst wäre die
  // Zuordnung mehrdeutig.
  const usedRoles = new Set(
    allFields.filter((f) => f.id !== field.id).map((f) => roleOf(f)).filter(Boolean) as string[]
  );

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

      {availableRoles.length > 0 && (
        <div>
          <Label className="text-sm">Wofür steht die Antwort?</Label>
          <Select
            value={currentRole ?? "none"}
            onValueChange={(v) => patchSettings({ role: v === "none" ? undefined : v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Nur sammeln, nicht auswerten</SelectItem>
              {availableRoles.map((r) => (
                <SelectItem key={r.key} value={r.key} disabled={usedRoles.has(r.key) && r.key !== currentRole}>
                  {r.label}{usedRoles.has(r.key) && r.key !== currentRole ? " – schon vergeben" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {activeRole
              ? `Speist: ${activeRole.feeds}`
              : "Die Antwort erscheint in der Anmeldeliste, fließt aber in keine Kennzahl ein. Das ist für Freitextfragen völlig in Ordnung."}
          </p>
        </div>
      )}

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
