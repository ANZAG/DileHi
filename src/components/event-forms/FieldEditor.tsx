import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { FIELD_TYPES, type FormField, type HelperTask } from "./types";
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
  const tasks: HelperTask[] = Array.isArray(field.settings?.tasks) ? field.settings.tasks : [];
  const setTasks = (next: HelperTask[]) => patchSettings({ tasks: next });
  const patchTask = (i: number, patch: Partial<HelperTask>) =>
    setTasks(tasks.map((t, j) => (j === i ? { ...t, ...patch } : t)));

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
                  {r.label}{usedRoles.has(r.key) && r.key !== currentRole ? " (schon vergeben)" : ""}
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

      {field.type === "helper_tasks" && (
        <div>
          <Label className="text-sm">Aufgaben</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Der Termin steht später hinter der Aufgabe. Die Mindestanzahl ist die Zahl der
            Personen, die gleichzeitig gebraucht werden. Die Auswertung zeigt dann, ob genug
            zusammenkommen.
          </p>
          <div className="space-y-2">
            {tasks.map((task, i) => (
              <div key={task.key} className="rounded-md border p-2.5 space-y-2">
                <div className="flex gap-2">
                  <Input
                    className="flex-1"
                    value={task.label}
                    placeholder="z.B. Aufbau"
                    onChange={(e) => patchTask(i, { label: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={`Aufgabe „${task.label || "ohne Namen"}" entfernen`}
                    onClick={() => setTasks(tasks.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
                {/* Auf dem Handy untereinander: Ein Datums- und Zeitfeld
                    braucht rund 180 px, in zwei Spalten blieben davon 150 –
                    die Uhrzeit wurde abgeschnitten. */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-muted-foreground">Wann?</Label>
                    <Input
                      type="datetime-local"
                      value={task.when ?? ""}
                      onChange={(e) => patchTask(i, { when: e.target.value || null })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Mindestens … Personen</Label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="offen"
                      value={task.min ?? ""}
                      onChange={(e) =>
                        patchTask(i, { min: e.target.value ? Number(e.target.value) : null })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() =>
              setTasks([...tasks, { key: `t-${crypto.randomUUID()}`, label: "", when: null, min: null }])
            }
          >
            <Plus size={14} className="mr-1" /> Aufgabe hinzufügen
          </Button>
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
