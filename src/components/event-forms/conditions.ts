import type { FormField } from "./types";

/**
 * Bedingungs-Engine für Formularfelder.
 * Unterstützt mehrere Regeln mit UND/ODER-Verknüpfung und verschiedene Operatoren.
 * Bleibt rückwärtskompatibel zum alten Format (settings.conditional_on / conditional_value).
 */

export type ConditionOp =
  | "checked"
  | "unchecked"
  | "equals"
  | "not_equals"
  | "contains"
  | "gt"
  | "lt"
  | "filled"
  | "empty";

export interface ConditionRule {
  /** Bezeichnung des Feldes, auf das sich die Regel bezieht */
  field: string;
  op: ConditionOp;
  value?: string;
}

export interface Visibility {
  logic: "and" | "or";
  rules: ConditionRule[];
}

export const OPERATOR_LABELS: Record<ConditionOp, string> = {
  checked: "ist angekreuzt (Ja)",
  unchecked: "ist nicht angekreuzt (Nein)",
  equals: "ist gleich",
  not_equals: "ist nicht gleich",
  contains: "enthält",
  gt: "ist größer als",
  lt: "ist kleiner als",
  filled: "ist ausgefüllt",
  empty: "ist leer",
};

/** Welche Operatoren passen zu welchem Feldtyp? */
export function operatorsForType(type: string): ConditionOp[] {
  switch (type) {
    case "checkbox":
      return ["checked", "unchecked"];
    case "select":
      return ["equals", "not_equals", "filled", "empty"];
    case "multi_select":
      return ["contains", "not_equals", "filled", "empty"];
    case "number":
      return ["equals", "not_equals", "gt", "lt", "filled", "empty"];
    case "text":
    case "textarea":
      return ["equals", "not_equals", "contains", "filled", "empty"];
    default:
      return ["filled", "empty"];
  }
}

/** Operatoren, die keinen Vergleichswert benötigen */
export const VALUE_FREE_OPS: ConditionOp[] = ["checked", "unchecked", "filled", "empty"];

/** Felder, auf die Bedingungen verweisen können */
export function conditionCandidates(fields: FormField[], excludeId?: string): FormField[] {
  return fields.filter(
    (f) =>
      f.id !== excludeId &&
      ["checkbox", "select", "multi_select", "number", "text", "textarea"].includes(f.type)
  );
}

/** Liest die Sichtbarkeitsregeln eines Feldes (inkl. Migration des alten Formats) */
export function getVisibility(field: Pick<FormField, "settings">): Visibility | null {
  const s = field.settings || {};
  const v = s.visibility as Visibility | undefined;
  if (v && Array.isArray(v.rules) && v.rules.length > 0) {
    return { logic: v.logic === "or" ? "or" : "and", rules: v.rules };
  }
  if (s.conditional_on) {
    const expected = s.conditional_value;
    if (expected === false) {
      return { logic: "and", rules: [{ field: s.conditional_on, op: "unchecked" }] };
    }
    if (expected === undefined || expected === true) {
      return { logic: "and", rules: [{ field: s.conditional_on, op: "checked" }] };
    }
    return { logic: "and", rules: [{ field: s.conditional_on, op: "equals", value: String(expected) }] };
  }
  return null;
}

function isEmptyValue(value: any): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") {
    if (Array.isArray(value.days)) return value.days.length === 0 && !value.all_days;
    if (Array.isArray(value.tents)) return value.tents.length === 0;
  }
  return false;
}

function evaluateRule(rule: ConditionRule, fields: FormField[], answers: Record<string, any>): boolean {
  const target = fields.find((f) => f.label === rule.field);
  if (!target) return true; // Referenz fehlt → nicht blockieren
  const value = answers[target.id];
  const expected = rule.value ?? "";

  switch (rule.op) {
    case "checked":
      return value === true;
    case "unchecked":
      return value !== true;
    case "filled":
      return !isEmptyValue(value);
    case "empty":
      return isEmptyValue(value);
    case "equals":
      if (Array.isArray(value)) return value.map(String).includes(expected);
      return String(value ?? "") === expected;
    case "not_equals":
      if (Array.isArray(value)) return !value.map(String).includes(expected);
      return String(value ?? "") !== expected;
    case "contains":
      if (Array.isArray(value)) return value.map(String).includes(expected);
      return String(value ?? "").toLowerCase().includes(expected.toLowerCase());
    case "gt":
      return Number(value) > Number(expected);
    case "lt":
      return Number(value) < Number(expected);
    default:
      return true;
  }
}

/** Ist ein Feld anhand seiner Bedingungen sichtbar? */
export function evaluateVisibility(
  field: FormField,
  fields: FormField[],
  answers: Record<string, any>
): boolean {
  const vis = getVisibility(field);
  if (!vis || vis.rules.length === 0) return true;
  const results = vis.rules.map((r) => evaluateRule(r, fields, answers));
  return vis.logic === "or" ? results.some(Boolean) : results.every(Boolean);
}

/** Lesbare Zusammenfassung für Badges/Tooltips */
export function describeVisibility(field: Pick<FormField, "settings">): string | null {
  const vis = getVisibility(field);
  if (!vis) return null;
  const parts = vis.rules.map((r) => {
    const op = OPERATOR_LABELS[r.op] || r.op;
    return VALUE_FREE_OPS.includes(r.op) ? `„${r.field}" ${op}` : `„${r.field}" ${op} „${r.value ?? ""}"`;
  });
  return `Sichtbar wenn ${parts.join(vis.logic === "or" ? " ODER " : " UND ")}`;
}
