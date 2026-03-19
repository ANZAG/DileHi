export interface FormField {
  id: string;
  form_id?: string;
  type: string;
  label: string;
  description: string | null;
  required: boolean;
  sort_order: number;
  options: string[];
  settings: Record<string, any>;
}

export interface EventForm {
  id: string;
  event_id: string;
  title: string;
  description: string | null;
  public_token: string;
  is_open: boolean;
  settings: {
    spacing_m?: number;
    club_tents?: string[];
  };
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface FormResponse {
  id: string;
  form_id: string;
  respondent_name: string;
  respondent_email: string | null;
  user_id: string | null;
  created_at: string;
  answers?: FormAnswer[];
}

export interface FormAnswer {
  id: string;
  response_id: string;
  field_id: string;
  value: any;
}

export const TENT_TYPES = [
  { value: "speichenrad", label: "Speichenrad", shape: "circle" as const, guyRope: 1, dimLabel: "Durchmesser (m)" },
  { value: "doppelspeichenrad", label: "Doppelspeichenrad", shape: "rect" as const, guyRope: 1, dimLabel: "Länge × Breite (m)" },
  { value: "kegelzelt", label: "Kegelzelt", shape: "circle" as const, guyRope: 0, dimLabel: "Durchmesser (m)" },
  { value: "a_tent", label: "A-Tent", shape: "rect" as const, guyRope: 0, dimLabel: "Länge × Breite (m)" },
] as const;

export const CLUB_TENTS = [
  { id: "kuechenzelt", label: "Küchenzelt", width: 3, length: 6, guyRope: 1, shape: "rect" as const },
  { id: "versorgung_klein", label: "Versorgungszelt klein (Kegelzelt Ø5m)", diameter: 5, guyRope: 0, shape: "circle" as const },
  { id: "versorgung_gross", label: "Versorgungszelt groß", width: 4, length: 6, guyRope: 0, shape: "rect" as const },
  { id: "scheune", label: "Scheune (8×8m)", width: 8, length: 8, guyRope: 1.5, shape: "rect" as const },
];

export const FIELD_TYPES = [
  { value: "text", label: "Textfeld", icon: "Type" },
  { value: "textarea", label: "Mehrzeiliger Text", icon: "AlignLeft" },
  { value: "number", label: "Zahl", icon: "Hash" },
  { value: "select", label: "Auswahl (einzeln)", icon: "List" },
  { value: "multi_select", label: "Auswahl (mehrfach)", icon: "CheckSquare" },
  { value: "checkbox", label: "Ja/Nein", icon: "ToggleLeft" },
  { value: "attendance_days", label: "Anwesenheitstage", icon: "Calendar" },
  { value: "tent", label: "Zelt-Details", icon: "Tent" },
] as const;

export function calcTentArea(
  tentType: string,
  diameter?: number,
  length?: number,
  width?: number,
  spacing: number = 0
): number {
  const type = TENT_TYPES.find((t) => t.value === tentType);
  if (!type) return 0;

  if (type.shape === "circle" && diameter) {
    const r = diameter / 2 + type.guyRope + spacing;
    return Math.PI * r * r;
  }
  if (type.shape === "rect" && length && width) {
    return (length + 2 * type.guyRope + 2 * spacing) * (width + 2 * type.guyRope + 2 * spacing);
  }
  return 0;
}

export function calcClubTentArea(tentId: string, spacing: number = 0): number {
  const tent = CLUB_TENTS.find((t) => t.id === tentId);
  if (!tent) return 0;

  if (tent.shape === "circle" && "diameter" in tent) {
    const r = tent.diameter / 2 + tent.guyRope + spacing;
    return Math.PI * r * r;
  }
  if (tent.shape === "rect" && "width" in tent && "length" in tent) {
    return (tent.length + 2 * tent.guyRope + 2 * spacing) * (tent.width + 2 * tent.guyRope + 2 * spacing);
  }
  return 0;
}

export function getClubTentDimensions(tentId: string, spacing: number = 0) {
  const tent = CLUB_TENTS.find((t) => t.id === tentId);
  if (!tent) return { w: 0, h: 0 };

  if (tent.shape === "circle" && "diameter" in tent) {
    const d = tent.diameter + 2 * tent.guyRope + 2 * spacing;
    return { w: d, h: d };
  }
  if (tent.shape === "rect" && "width" in tent && "length" in tent) {
    return {
      w: tent.width + 2 * tent.guyRope + 2 * spacing,
      h: tent.length + 2 * tent.guyRope + 2 * spacing,
    };
  }
  return { w: 0, h: 0 };
}
