import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FormField, TENT_TYPES } from "./types";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Plus, Trash2 } from "lucide-react";

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
                <div key={opt} className="flex items-center gap-2">
                  <Checkbox
                    checked={selected.includes(opt)}
                    onCheckedChange={(checked) => {
                      if (checked) onChange([...selected, opt]);
                      else onChange(selected.filter((v: string) => v !== opt));
                    }}
                  />
                  <Label className="cursor-pointer font-normal">{opt}</Label>
                </div>
              );
            })}
          </div>
        );

      case "checkbox":
        return (
          <div className="flex items-center gap-2">
            <Checkbox
              checked={value === true}
              onCheckedChange={(checked) => onChange(checked === true)}
            />
            <Label className="cursor-pointer font-normal">{field.label}</Label>
          </div>
        );

      case "attendance_days":
        return <AttendanceDaysField value={value} onChange={onChange} startDate={eventStartDate} endDate={eventEndDate} />;

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

/** Check if a field should be visible based on conditional_on settings */
export function isFieldVisible(
  field: FormField,
  allFields: FormField[],
  allAnswers: Record<string, any>
): boolean {
  if (!field.settings?.conditional_on) return true;
  const condLabel = field.settings.conditional_on as string;
  const condField = allFields.find((f) => f.label === condLabel);
  if (!condField) return true;
  const condAnswer = allAnswers[condField.id];
  const expectedValue = field.settings.conditional_value !== undefined
    ? field.settings.conditional_value
    : true;
  if (expectedValue === false) {
    return condAnswer !== true;
  }
  return condAnswer === expectedValue;
}

function AttendanceDaysField({
  value,
  onChange,
  startDate,
  endDate,
}: {
  value: any;
  onChange: (v: any) => void;
  startDate?: string;
  endDate?: string | null;
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
      <div className="flex items-center gap-2">
        <Checkbox
          checked={current.all_days || (current.days?.length > 0)}
          onCheckedChange={(checked) => {
            if (checked && days[0]) {
              onChange({ all_days: true, days: [format(days[0], "yyyy-MM-dd")] });
            } else {
              onChange({ all_days: false, days: [] });
            }
          }}
        />
        <Label className="font-normal cursor-pointer">
          {days[0] ? format(days[0], "EEEE, d. MMMM yyyy", { locale: de }) : "Gesamte Veranstaltung"}
        </Label>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 pb-1 border-b">
        <Checkbox checked={current.all_days} onCheckedChange={toggleAll} />
        <Label className="font-medium cursor-pointer">Alle Tage</Label>
      </div>
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        return (
          <div key={key} className="flex items-center gap-2">
            <Checkbox
              checked={current.days?.includes(key) || current.all_days}
              onCheckedChange={() => toggleDay(key)}
            />
            <Label className="font-normal cursor-pointer">
              {format(day, "EEEE, d. MMMM", { locale: de })}
            </Label>
          </div>
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
  // value shape: { tents: TentEntry[] }
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
    // Don't add if already selected
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

  const hasMemberTents = memberTents && memberTents.length > 0;

  // Available profile tents (not yet selected)
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

      {/* Selected tents */}
      {current.tents.map((tent, index) => {
        const selectedType = TENT_TYPES.find((t) => t.value === tent.tent_type);
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

            {/* If from profile, show read-only info. If not, allow editing */}
            {!tent.member_tent_id && (
              <>
                <div>
                  <Label className="text-sm">Zelttyp</Label>
                  <Select value={tent.tent_type} onValueChange={(v) => updateTent(index, { tent_type: v, diameter: "", length: "", width: "" })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Zelttyp wählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {TENT_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedType?.shape === "circle" && (
                  <div>
                    <Label className="text-sm">{selectedType.dimLabel}</Label>
                    <Input
                      type="number"
                      step="0.1"
                      value={tent.diameter || ""}
                      onChange={(e) => updateTent(index, { diameter: e.target.value ? Number(e.target.value) : "" })}
                      placeholder="z.B. 5"
                    />
                  </div>
                )}

                {selectedType?.shape === "rect" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-sm">Länge (m)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={tent.length || ""}
                        onChange={(e) => updateTent(index, { length: e.target.value ? Number(e.target.value) : "" })}
                        placeholder="z.B. 4"
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Breite (m)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={tent.width || ""}
                        onChange={(e) => updateTent(index, { width: e.target.value ? Number(e.target.value) : "" })}
                        placeholder="z.B. 3"
                      />
                    </div>
                  </div>
                )}
              </>
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

      {/* Allow manual entry only if no profile tents exist */}
      {!hasMemberTents && (
        <Button variant="outline" size="sm" className="w-full" onClick={() => updateTents([...current.tents, { tent_type: "", diameter: "", length: "", width: "", capacity: 1 }])} type="button">
          <Plus size={14} className="mr-1" /> Zelt hinzufügen
        </Button>
      )}

      {current.tents.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {hasMemberTents
            ? "Kein Zelt ausgewählt – klicke oben, um eines aus deinem Profil hinzuzufügen."
            : "Kein Zelt hinzugefügt. Hinterlege Zelte in deinem Profil, um sie hier auszuwählen."
          }
        </p>
      )}
    </div>
  );
}
