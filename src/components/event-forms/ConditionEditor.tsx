import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import type { FormField } from "./types";
import {
  type ConditionOp,
  type ConditionRule,
  type Visibility,
  OPERATOR_LABELS,
  VALUE_FREE_OPS,
  conditionCandidates,
  getVisibility,
  operatorsForType,
} from "./conditions";

interface Props {
  field: FormField;
  allFields: FormField[];
  onChange: (visibility: Visibility | null) => void;
}

/** Regel-Editor: „Zeige diese Frage, wenn …" mit mehreren Regeln und UND/ODER */
export default function ConditionEditor({ field, allFields, onChange }: Props) {
  const vis = getVisibility(field);
  const rules = vis?.rules ?? [];
  const logic = vis?.logic ?? "and";
  const candidates = conditionCandidates(allFields, field.id);

  const update = (next: ConditionRule[], nextLogic: "and" | "or" = logic) => {
    onChange(next.length ? { logic: nextLogic, rules: next } : null);
  };

  const addRule = () => {
    const first = candidates[0];
    if (!first) return;
    const op = operatorsForType(first.type)[0];
    update([...rules, { field: first.label, op, value: "" }]);
  };

  const patchRule = (index: number, patch: Partial<ConditionRule>) => {
    update(rules.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
      <div>
        <Label className="text-sm font-semibold">Sichtbarkeit</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          {rules.length === 0
            ? "Diese Frage ist immer sichtbar."
            : "Diese Frage wird nur angezeigt, wenn folgende Bedingungen erfüllt sind:"}
        </p>
      </div>

      {rules.length > 1 && (
        <div className="flex items-center gap-2">
          <Label className="text-xs">Verknüpfung</Label>
          <Select value={logic} onValueChange={(v) => update(rules, v as "and" | "or")}>
            <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="and">Alle Bedingungen (UND)</SelectItem>
              <SelectItem value="or">Mindestens eine (ODER)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {rules.map((rule, index) => {
        const target = allFields.find((f) => f.label === rule.field);
        const ops = operatorsForType(target?.type || "text");
        const needsValue = !VALUE_FREE_OPS.includes(rule.op);
        return (
          <div key={index} className="rounded-md border bg-background p-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {index === 0 ? "Wenn" : logic === "or" ? "oder wenn" : "und wenn"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => update(rules.filter((_, i) => i !== index))}
              >
                <Trash2 size={13} className="text-destructive" />
              </Button>
            </div>

            <Select
              value={rule.field}
              onValueChange={(v) => {
                const t = allFields.find((f) => f.label === v);
                patchRule(index, { field: v, op: operatorsForType(t?.type || "text")[0], value: "" });
              }}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="Frage wählen" /></SelectTrigger>
              <SelectContent>
                {candidates.map((f) => (
                  <SelectItem key={f.id} value={f.label}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Select value={rule.op} onValueChange={(v) => patchRule(index, { op: v as ConditionOp })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ops.map((op) => (
                    <SelectItem key={op} value={op}>{OPERATOR_LABELS[op]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {needsValue && (
                target && ["select", "multi_select"].includes(target.type) && (target.options?.length ?? 0) > 0 ? (
                  <Select value={rule.value || ""} onValueChange={(v) => patchRule(index, { value: v })}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Wert wählen" /></SelectTrigger>
                    <SelectContent>
                      {(target.options || []).map((opt) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    className="h-9"
                    type={target?.type === "number" ? "number" : "text"}
                    value={rule.value || ""}
                    onChange={(e) => patchRule(index, { value: e.target.value })}
                    placeholder="Vergleichswert"
                  />
                )
              )}
            </div>
          </div>
        );
      })}

      {candidates.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Für Bedingungen braucht es zuerst andere Fragen (z.B. eine Ja/Nein-Frage) vor dieser Frage.
        </p>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={addRule}>
          <Plus size={13} className="mr-1" /> Bedingung hinzufügen
        </Button>
      )}
    </div>
  );
}
