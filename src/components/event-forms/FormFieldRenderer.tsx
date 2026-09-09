import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormField, TENT_TYPES, type HelperTask } from "./types";
import { evaluateVisibility } from "./conditions";

import { format, eachDayOfInterval, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Plus, Trash2 } from "lucide-react";

/**
 * Eine Zeile zum Ankreuzen.
 *
 * Überall dieselbe, weil sie überall dasselbe tut. Vorher gab es zwei Sorten:
 * Die Helferaufgaben hatten einen Rahmen und waren als Ganzes anklickbar, alle
 * anderen hatten keinen Rahmen – und ihre Beschriftung war gar nicht
 * anklickbar, weil das <Label> ohne Bezug zum Häkchen dastand. Man musste also
 * das kleine Kästchen treffen. Auf dem Handy ist das der Unterschied zwischen
 * „geht" und „geht nicht".
 *
 * Das <label> umschliesst das Häkchen; ein Button ist ein beschriftbares
 * Element, der Klick auf den Text landet also dort.
 */
function AuswahlZeile({
  checked,
  onCheckedChange,
  children,
  className = "",
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label
      className={`flex items-start gap-2.5 py-1 cursor-pointer rounded-md
        hover:bg-muted/40 transition-colors ${className}`}
    >
      <Checkbox className="mt-0.5 shrink-0" checked={checked} onCheckedChange={(c) => onCheckedChange(c === true)} />
      <span className="min-w-0 text-sm">{children}</span>
    </label>
  );
}

interface MemberTent {
  id: string;
  name: string;
  tent_type: string;
  shape: string;
  diameter: number | null;
  length: number | null;
  width: number | null;
  guy_rope: number;
}

interface Props {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  eventStartDate?: string;
  eventEndDate?: string | null;
  memberTents?: MemberTent[];
}

export default function FormFieldRenderer({ field, value, onChange, eventStartDate, eventEndDate, memberTents }: Props) {
  if (field.type === "section") {
    return (
      <div className="pt-6 pb-1 first:pt-0">
        <h3 className="font-serif text-lg font-semibold border-b pb-1">{field.label}</h3>
        {field.description && (
          <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
        )}
      </div>
    );
  }

  const renderField = () => {
    switch (field.type) {
      case "text":
        return (
          <Input
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.settings?.placeholder || ""}
          />
        );

      case "date":
        return (
          // Schmaler als die volle Zeile: Ein Datumsfeld, das sich ueber die
          // ganze Breite zieht, sieht aus, als erwarte es mehr als ein Datum.
          <Input
            type="date"
            className="max-w-[200px] appearance-none [&::-webkit-date-and-time-value]:text-left"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
          />
        );

      case "textarea":
        return (
          <Textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.settings?.placeholder || ""}
            rows={3}
          />
        );

      case "number":
        return (
          <Input
            type="number"
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
            placeholder={field.settings?.placeholder || ""}
            step={field.settings?.step || "any"}
          />
        );

      case "select":
        return (
          <Select value={value || ""} onValueChange={onChange}>
            <SelectTrigger>
              <SelectValue placeholder="Bitte wählen..." />
            </SelectTrigger>
            <SelectContent>
              {(field.options || []).map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case "multi_select":
        return (
          <div className="space-y-2">
            {(field.options || []).map((opt) => {
              const selected = Array.isArray(value) ? value : [];
              return (
                <AuswahlZeile
                  key={opt}
                  checked={selected.includes(opt)}
                  onCheckedChange={(checked) => {
                    if (checked) onChange([...selected, opt]);
                    else onChange(selected.filter((v: string) => v !== opt));
                  }}
                >
                  {opt}
                </AuswahlZeile>
              );
            })}
          </div>
        );

      case "helper_tasks":
        return <HelperTasksField field={field} value={value} onChange={onChange} />;

      case "checkbox":
        return (
          <AuswahlZeile checked={value === true} onCheckedChange={onChange}>
            {field.label}
          </AuswahlZeile>
        );

      case "attendance_days":
        return (
          <AttendanceDaysField
            value={value}
            onChange={onChange}
            startDate={eventStartDate}
            endDate={eventEndDate}
            mode={field.settings?.mode === "range" ? "range" : "days"}
          />
        );

      case "tent":
        return <TentListField value={value} onChange={onChange} memberTents={memberTents} />;

      default:
        return <Input value={value || ""} onChange={(e) => onChange(e.target.value)} />;
    }
  };

  return (
    <div className="space-y-1.5">
      {field.type !== "checkbox" && (
        <Label className="text-sm font-medium">
          {field.label}
          {field.required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      {field.description && field.type !== "checkbox" && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
      {renderField()}
    </div>
  );
}

/** Check if a field should be visible based on its visibility rules */
export function isFieldVisible(
  field: FormField,
  allFields: FormField[],
  allAnswers: Record<string, any>
): boolean {
  return evaluateVisibility(field, allFields, allAnswers);
}


function AttendanceDaysField({
  value,
  onChange,
  startDate,
  endDate,
  mode = "days",
}: {
  value: any;
  onChange: (v: any) => void;
  startDate?: string;
  endDate?: string | null;
  mode?: "days" | "range";
}) {
  const days = startDate && endDate
    ? eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) })
    : startDate
      ? [parseISO(startDate)]
      : [];

  const current = value || { all_days: false, days: [] as string[] };

  const toggleDay = (day: string) => {
    const selected = current.days || [];
    if (selected.includes(day)) {
      onChange({ all_days: false, days: selected.filter((d: string) => d !== day) });
    } else {
      const newDays = [...selected, day];
      onChange({ all_days: newDays.length === days.length, days: newDays });
    }
  };

  const toggleAll = () => {
    if (current.all_days) {
      onChange({ all_days: false, days: [] });
    } else {
      onChange({ all_days: true, days: days.map((d) => format(d, "yyyy-MM-dd")) });
    }
  };

  if (days.length <= 1) {
    return (
      <AuswahlZeile
        checked={current.all_days || (current.days?.length ?? 0) > 0}
        onCheckedChange={(checked) => {
          if (checked && days[0]) {
            onChange({ all_days: true, days: [format(days[0], "yyyy-MM-dd")] });
          } else {
            onChange({ all_days: false, days: [] });
          }
        }}
      >
        {days[0] ? format(days[0], "EEEE, d. MMMM yyyy", { locale: de }) : "Gesamte Veranstaltung"}
      </AuswahlZeile>
    );
  }

  // Zeitraum-Modus: von–bis auswählen, intern werden alle Tage dazwischen gespeichert
  if (mode === "range") {
    const dayKeys = days.map((d) => format(d, "yyyy-MM-dd"));
    const selected: string[] = current.all_days ? dayKeys : (current.days || []);
    const from = selected.length ? selected.slice().sort()[0] : "";
    const to = selected.length ? selected.slice().sort()[selected.length - 1] : "";

    const setRange = (newFrom: string, newTo: string) => {
      if (!newFrom || !newTo) {
        onChange({ all_days: false, days: newFrom ? [newFrom] : [] });
        return;
      }
      const a = newFrom <= newTo ? newFrom : newTo;
      const b = newFrom <= newTo ? newTo : newFrom;
      const range = dayKeys.filter((k) => k >= a && k <= b);
      onChange({ all_days: range.length === dayKeys.length, days: range });
    };

    const dayLabel = (key: string) => format(parseISO(key), "EEE, d. MMM", { locale: de });

    return (
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">Anreise am</Label>
            <Select value={from} onValueChange={(v) => setRange(v, to || v)}>
              <SelectTrigger><SelectValue placeholder="Tag wählen" /></SelectTrigger>
              <SelectContent>
                {dayKeys.map((k) => (
                  <SelectItem key={k} value={k}>{dayLabel(k)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Abreise am</Label>
            <Select value={to} onValueChange={(v) => setRange(from || v, v)}>
              <SelectTrigger><SelectValue placeholder="Tag wählen" /></SelectTrigger>
              <SelectContent>
                {dayKeys.filter((k) => !from || k >= from).map((k) => (
                  <SelectItem key={k} value={k}>{dayLabel(k)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {selected.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {selected.length} {selected.length === 1 ? "Tag" : "Tage"} ausgewählt
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="pb-1 border-b">
        <AuswahlZeile checked={current.all_days} onCheckedChange={toggleAll}>
          <span className="font-medium">Alle Tage</span>
        </AuswahlZeile>
      </div>

      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        return (
          <AuswahlZeile
            key={key}
            checked={current.days?.includes(key) || current.all_days}
            onCheckedChange={() => toggleDay(key)}
          >
            {format(day, "EEEE, d. MMMM", { locale: de })}
          </AuswahlZeile>
        );
      })}
    </div>
  );
}

/** Multi-tent field – allows adding multiple tents per person */
interface TentEntry {
  tent_type: string;
  diameter: number | string;
  length: number | string;
  width: number | string;
  capacity: number;
  member_tent_id?: string;
}

function TentListField({ value, onChange, memberTents }: { value: any; onChange: (v: any) => void; memberTents?: MemberTent[] }) {
  const current: { tents: TentEntry[] } = value && Array.isArray(value.tents) ? value : { tents: [] };

  const updateTents = (tents: TentEntry[]) => onChange({ tents });

  const removeTent = (index: number) => {
    updateTents(current.tents.filter((_, i) => i !== index));
  };

  const updateTent = (index: number, patch: Partial<TentEntry>) => {
    const updated = current.tents.map((t, i) => i === index ? { ...t, ...patch } : t);
    updateTents(updated);
  };

  const addFromProfile = (mt: MemberTent) => {
    if (current.tents.some((t) => t.member_tent_id === mt.id)) return;
    updateTents([...current.tents, {
      tent_type: mt.tent_type,
      diameter: mt.diameter || "",
      length: mt.length || "",
      width: mt.width || "",
      capacity: 1,
      member_tent_id: mt.id,
    }]);
  };

  const addManualTent = () => {
    updateTents([...current.tents, {
      tent_type: "kegelzelt",
      diameter: "",
      length: "",
      width: "",
      capacity: 1,
    }]);
  };

  const hasMemberTents = memberTents && memberTents.length > 0;

  const availableTents = memberTents?.filter(
    (mt) => !current.tents.some((t) => t.member_tent_id === mt.id)
  ) || [];

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      {/* Select from profile tents */}
      {hasMemberTents && availableTents.length > 0 && (
        <div>
          <Label className="text-sm text-muted-foreground">Zelt aus deinem Profil hinzufügen:</Label>
          <div className="flex flex-wrap gap-1 mt-1">
            {availableTents.map((mt) => {
              const typeLabel = TENT_TYPES.find((t) => t.value === mt.tent_type)?.label || mt.tent_type;
              const dimStr = mt.shape === "circle" && mt.diameter
                ? `Ø${mt.diameter}m`
                : mt.length && mt.width ? `${mt.length}×${mt.width}m` : "";
              return (
                <button
                  key={mt.id}
                  type="button"
                  onClick={() => addFromProfile(mt)}
                  className="text-xs px-2 py-1 rounded border bg-background hover:bg-accent transition-colors"
                >
                  {mt.name || typeLabel} {dimStr}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected / manually added tents */}
      {current.tents.map((tent, index) => {
        const selectedType = TENT_TYPES.find((t) => t.value === tent.tent_type);
        const isManual = !tent.member_tent_id;

        if (!isManual) {
          // Profile tent – compact view
          const dimStr = selectedType?.shape === "circle"
            ? tent.diameter ? `Ø${tent.diameter}m` : ""
            : tent.length && tent.width ? `${tent.length}×${tent.width}m` : "";
          return (
            <div key={index} className="border rounded-md p-3 bg-background space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedType?.label || tent.tent_type} {dimStr}
                </span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeTent(index)}>
                  <Trash2 size={14} className="text-destructive" />
                </Button>
              </div>
              <div>
                <Label className="text-sm">Schlafplätze (inkl. dir selbst)</Label>
                <Input
                  type="number"
                  min={1}
                  value={tent.capacity || 1}
                  onChange={(e) => updateTent(index, { capacity: e.target.value ? Number(e.target.value) : 1 })}
                />
              </div>
            </div>
          );
        }

        // Manual tent – full edit view for guests
        return (
          <div key={index} className="border rounded-md p-3 bg-background space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Zelt {index + 1}</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeTent(index)}>
                <Trash2 size={14} className="text-destructive" />
              </Button>
            </div>

            <div>
              <Label className="text-sm">Zelttyp</Label>
              <Select value={tent.tent_type} onValueChange={(v) => {
                const newType = TENT_TYPES.find((t) => t.value === v);
                const patch: Partial<TentEntry> = { tent_type: v };
                if (newType?.shape === "circle") { patch.length = ""; patch.width = ""; }
                else { patch.diameter = ""; }
                updateTent(index, patch);
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedType?.shape === "circle" ? (
              <div>
                <Label className="text-sm">Durchmesser (m)</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  value={tent.diameter}
                  onChange={(e) => updateTent(index, { diameter: e.target.value })}
                  placeholder="z.B. 4"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-sm">Länge (m)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={tent.length}
                    onChange={(e) => updateTent(index, { length: e.target.value })}
                    placeholder="z.B. 3"
                  />
                </div>
                <div>
                  <Label className="text-sm">Breite (m)</Label>
                  <Input
                    type="number"
                    min={0}
                    step={0.1}
                    value={tent.width}
                    onChange={(e) => updateTent(index, { width: e.target.value })}
                    placeholder="z.B. 2"
                  />
                </div>
              </div>
            )}

            <div>
              <Label className="text-sm">Schlafplätze (inkl. dir selbst)</Label>
              <Input
                type="number"
                min={1}
                value={tent.capacity || 1}
                onChange={(e) => updateTent(index, { capacity: e.target.value ? Number(e.target.value) : 1 })}
              />
            </div>
          </div>
        );
      })}

      {/* Add manual tent button */}
      <Button type="button" variant="outline" size="sm" className="w-full" onClick={addManualTent}>
        <Plus size={14} className="mr-1" /> Zelt hinzufügen
      </Button>

      {current.tents.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {hasMemberTents
            ? "Kein Zelt ausgewählt – wähle eines aus deinem Profil oder füge manuell hinzu."
            : "Noch kein Zelt hinzugefügt – klicke oben, um eines einzutragen."
          }
        </p>
      )}
    </div>
  );
}


/** Formatiert den Termin einer Helferaufgabe fuer die Anzeige. */
export function formatTaskWhen(when?: string | null): string | null {
  if (!when) return null;
  try {
    const hasTime = when.includes("T");
    const d = parseISO(when);
    return hasTime
      ? format(d, "EE d.MM., HH:mm 'Uhr'", { locale: de })
      : format(d, "EE d.MM.", { locale: de });
  } catch {
    return when;
  }
}

/**
 * Helferaufgaben zum Ankreuzen. Der Termin steht hinter der Aufgabe, damit man
 * beim Zusagen weiss, wann sie stattfindet - Aufbau Freitagnachmittag ist etwas
 * anderes als Aufbau Samstagfrueh.
 */
function HelperTasksField({
  field,
  value,
  onChange,
}: {
  field: FormField;
  value: any;
  onChange: (v: any) => void;
}) {
  const tasks: HelperTask[] = Array.isArray(field.settings?.tasks) ? field.settings.tasks : [];
  const selected: string[] = Array.isArray(value) ? value : [];

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">Für diese Frage sind noch keine Aufgaben hinterlegt.</p>;
  }

  return (
    <div className="space-y-2">
      {tasks.map((task) => {
        const when = formatTaskWhen(task.when);
        const checked = selected.includes(task.key);
        return (
          <AuswahlZeile
            key={task.key}
            checked={checked}
            onCheckedChange={(c) =>
              onChange(c ? [...selected, task.key] : selected.filter((k) => k !== task.key))
            }
          >
            {task.label}
            {when && <span className="text-muted-foreground"> ({when})</span>}
            {task.min ? (
              <span className="block text-xs text-muted-foreground mt-0.5">
                {task.min} Personen gleichzeitig nötig
              </span>
            ) : null}
          </AuswahlZeile>
        );
      })}
    </div>
  );
}
