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

/**
 * Eine Helferaufgabe innerhalb eines helper_tasks-Feldes.
 *
 * Der Termin steht bewusst an der Aufgabe und wird beim Erstellen der Frage
 * gesetzt: Wer ankreuzt, muss sehen, worauf er sich einlässt – Aufbau am
 * Freitagnachmittag ist etwas anderes als Aufbau am Samstagmorgen.
 *
 * `min` ist die Zahl der Personen, die gleichzeitig gebraucht werden. Manche
 * Zelte brauchen sechs Leute auf einmal; ohne diese Zahl sieht man in der
 * Auswertung zwar "4 Helfer", aber nicht, dass das nicht reicht.
 */
export interface HelperTask {
  /** Stabil – bleibt beim Umbenennen erhalten, damit Altantworten passen. */
  key: string;
  label: string;
  /** ISO-Zeitpunkt oder Datum, optional. */
  when?: string | null;
  /** Mindestanzahl gleichzeitig benötigter Personen, optional. */
  min?: number | null;
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
  { id: "versorgung_klein", label: "Versorgungszelt klein", diameter: 5, guyRope: 0, shape: "circle" as const },
  { id: "versorgung_gross", label: "Versorgungszelt groß", width: 4, length: 6, guyRope: 0, shape: "rect" as const },
  { id: "scheune", label: "Scheune", width: 8, length: 8, guyRope: 1.5, shape: "rect" as const },
];

export const FIELD_TYPES = [
  {
    value: "section",
    label: "Abschnitt / Überschrift",
    icon: "Heading",
    hint: "Gliedert das Formular. Keine Eingabe, nur eine Zwischenüberschrift.",
    example: "z.B. „Anreise\"",
  },
  {
    value: "text",
    label: "Kurzes Textfeld",
    icon: "Type",
    hint: "Eine Zeile für kurze Antworten.",
    example: "z.B. Telefonnummer",
  },
  {
    value: "textarea",
    label: "Langes Textfeld",
    icon: "AlignLeft",
    hint: "Mehrere Zeilen für längere Antworten.",
    example: "z.B. Anmerkungen",
  },
  {
    value: "number",
    label: "Zahl",
    icon: "Hash",
    hint: "Nur Zahlen erlaubt, mit Pfeiltasten änderbar.",
    example: "z.B. Anzahl freier Sitzplätze",
  },
  {
    value: "date",
    label: "Datum",
    icon: "CalendarDays",
    hint: "Ein einzelnes Datum, mit dem Kalender des Geräts.",
    example: "z.B. Geburtsdatum",
  },
  {
    value: "select",
    label: "Auswahl mit einer Antwort",
    icon: "List",
    hint: "Ausklappliste, genau eine Option wählbar.",
    example: "z.B. Frühstück: ja / nein / egal",
  },
  {
    value: "multi_select",
    label: "Auswahl mit mehreren Antworten",
    icon: "CheckSquare",
    hint: "Kästchen zum Ankreuzen, mehrere Optionen möglich.",
    example: "z.B. Aufbau / Abbau",
  },
  {
    // Gehoert zum Modul „Helferaufgaben" – ohne das taucht der Typ in der
    // Auswahl gar nicht erst auf.
    module: "helpers",
    value: "helper_tasks",
    label: "Helferaufgaben",
    icon: "HandHelping",
    hint: "Aufgaben zum Ankreuzen, jede mit Termin und wenn nötig einer Mindestanzahl. Die Auswertung zeigt, ob genug Leute zusammenkommen.",
    example: "z.B. Aufbau (Fr, ab 14 Uhr), mindestens 6",
  },
  {
    value: "checkbox",
    label: "Ja/Nein-Frage",
    icon: "ToggleLeft",
    hint: "Ein einzelnes Kästchen. Ideal als Auslöser für Folgefragen.",
    example: "z.B. „Ich reise mit eigenem PKW an\"",
  },
  {
    value: "attendance_days",
    label: "Anwesenheitstage",
    icon: "Calendar",
    hint: "Zeigt automatisch die Tage der Veranstaltung. Wahlweise einzelne Tage ankreuzen oder Zeitraum von–bis wählen.",
    example: "z.B. „An welchen Tagen bist du dabei?\"",
  },
  {
    module: "camp_logistics",
    value: "tent",
    label: "Zelt-Details",
    icon: "Tent",
    hint: "Zelte aus dem Profil übernehmen oder selbst eintragen (Typ, Maße, Schlafplätze). Das ist die Grundlage für die Lagerplanung.",
    example: "z.B. „Welche Zelte bringst du mit?\"",
  },
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
