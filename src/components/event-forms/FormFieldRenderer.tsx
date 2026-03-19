import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FormField, TENT_TYPES } from "./types";
import { format, eachDayOfInterval, parseISO } from "date-fns";
import { de } from "date-fns/locale";

interface Props {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  eventStartDate?: string;
  eventEndDate?: string | null;
  allAnswers?: Record<string, any>;
}

export default function FormFieldRenderer({ field, value, onChange, eventStartDate, eventEndDate, allAnswers = {} }: Props) {
  // Handle conditional visibility
  if (field.settings?.conditional_on) {
    const condLabel = field.settings.conditional_on;
    const condValue = Object.values(allAnswers).find((_, i) => {
      // Find by matching label in parent context - simplified: check if the conditional field's value is truthy
      return false;
    });
    // Check allAnswers by finding the field with matching label
    const condMet = Object.entries(allAnswers).some(([, v]) => {
      // This is a simplification - in practice we'd match by field ID
      return v === true;
    });
    // Simple approach: check if any checkbox-type answer with similar label is true
    // We'll pass a more structured approach from the parent
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
        return <TentField value={value} onChange={onChange} />;

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

function TentField({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const current = value || { has_tent: false, tent_type: "", diameter: "", length: "", width: "", capacity: 1 };

  const update = (patch: Record<string, any>) => onChange({ ...current, ...patch });

  const selectedType = TENT_TYPES.find((t) => t.value === current.tent_type);

  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={current.has_tent}
          onCheckedChange={(checked) => update({ has_tent: checked === true })}
        />
        <Label className="font-normal cursor-pointer">Ich bringe ein Zelt mit</Label>
      </div>

      {current.has_tent && (
        <>
          <div>
            <Label className="text-sm">Zelttyp</Label>
            <Select value={current.tent_type} onValueChange={(v) => update({ tent_type: v, diameter: "", length: "", width: "" })}>
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
                value={current.diameter || ""}
                onChange={(e) => update({ diameter: e.target.value ? Number(e.target.value) : "" })}
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
                  value={current.length || ""}
                  onChange={(e) => update({ length: e.target.value ? Number(e.target.value) : "" })}
                  placeholder="z.B. 4"
                />
              </div>
              <div>
                <Label className="text-sm">Breite (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={current.width || ""}
                  onChange={(e) => update({ width: e.target.value ? Number(e.target.value) : "" })}
                  placeholder="z.B. 3"
                />
              </div>
            </div>
          )}

          <div>
            <Label className="text-sm">Schlafplätze (inkl. dir selbst)</Label>
            <Input
              type="number"
              min={1}
              value={current.capacity || 1}
              onChange={(e) => update({ capacity: e.target.value ? Number(e.target.value) : 1 })}
            />
          </div>
        </>
      )}
    </div>
  );
}
