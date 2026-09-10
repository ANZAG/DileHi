import type { FormField } from "./types";

/**
 * Feldrollen und Rückgabetypen.
 *
 * Bisher erkannte die Auswertung ihre Felder am Beschriftungstext:
 *
 *     if (lbl.includes("pkw") && !lbl.includes("anhänger")) carsCount++;
 *
 * Für uns funktionierte das, weil unsere Vorlage genau diese Wörter benutzt.
 * Ein Verein, der sein Feld "Auto" nennt, bekam eine Kachel mit 0 – ohne
 * Fehlermeldung, ohne Hinweis. Dieselbe Falle beim Umbenennen im eigenen
 * Formular.
 *
 * Stattdessen trägt ein Feld jetzt eine ROLLE (was die Antwort bedeutet) und
 * über sie einen RÜCKGABETYP (was sich daraus rechnen lässt). Die Beschriftung
 * ist damit frei.
 *
 * Der Rückgabetyp allein genügt für alles, was ein einzelnes Feld auswertet –
 * Anzahl, Summe, Verteilung. Die Rolle wird zusätzlich gebraucht, sobald zwei
 * Felder zusammen gerechnet werden: "Reichen die Schlafplätze für die Personen,
 * die am Samstag da sind?" verlangt zu wissen, welches Feld die Zelte sind und
 * welches die Tage.
 */

/** Was sich aus den Antworten eines Feldes rechnen lässt. */
export type ReturnType =
  | "boolean"       // Anzahl, Namensliste
  | "number"        // Summe, Durchschnitt
  | "choice"        // Verteilung über die Optionen
  | "multi_choice"  // Anzahl je Option
  | "days"          // Belegung je Tag
  | "tent"          // Anzahl, Schlafplätze, Fläche, Zeltplan
  | "text";         // nur auflistbar

export interface FieldRole {
  key: string;
  /** Anzeigename im Formular-Baukasten. */
  label: string;
  /** Was das System damit anstellt – wird im Baukasten unter dem Feld angezeigt. */
  feeds: string;
  returns: ReturnType;
  /** Feldtypen, die diese Rolle tragen dürfen. */
  fieldTypes: string[];
  /**
   * Rückfallweg für Formulare, die noch keine Rolle gespeichert haben.
   * Bildet exakt die bisherige Beschriftungserkennung ab, damit sich vor der
   * Migration nichts ändert. Kann entfallen, sobald alle Formulare verrollt sind.
   */
  legacyMatch?: (label: string) => boolean;
}

export const FIELD_ROLES: FieldRole[] = [
  {
    key: "attendance.days",
    label: "Anwesenheitstage",
    feeds: "Belegung je Tag, Verpflegungsplanung, Schlafplatz-Abgleich",
    returns: "days",
    fieldTypes: ["attendance_days"],
  },
  {
    key: "lodging.tent",
    label: "Zelt",
    feeds: "Zeltzahl, Schlafplätze, Flächenbedarf, Zeltplan",
    returns: "tent",
    fieldTypes: ["tent"],
  },

  // ── Transport ────────────────────────────────────────────────────────────
  {
    key: "transport.own_car",
    label: "Reist mit eigenem PKW an",
    feeds: "PKW-Zahl, Mitfahr-Abgleich",
    returns: "boolean",
    fieldTypes: ["checkbox"],
    legacyMatch: (l) => l.includes("pkw") && !l.includes("anhänger"),
  },
  {
    key: "transport.seats",
    label: "Freie Plätze im Fahrzeug",
    feeds: "Mitfahrgelegenheiten",
    returns: "number",
    fieldTypes: ["number"],
    legacyMatch: (l) => l.includes("mitnehmen") || l.includes("sitzplätze"),
  },
  {
    key: "transport.can_tow",
    label: "Kann einen Anhänger ziehen",
    feeds: "Materialtransport",
    returns: "boolean",
    fieldTypes: ["checkbox"],
    legacyMatch: (l) => l.includes("anhänger") && l.includes("ziehen"),
  },
  {
    key: "transport.trailer",
    label: "Stellt einen Anhänger",
    feeds: "Materialtransport",
    returns: "boolean",
    fieldTypes: ["checkbox"],
    legacyMatch: (l) => l.includes("anhänger zur verfügung"),
  },

  // ── Verpflegung ──────────────────────────────────────────────────────────
  {
    key: "catering.diet",
    label: "Ernährungsweise",
    feeds: "Verpflegung je Tag, Vorbefüllung aus dem Profil",
    returns: "choice",
    fieldTypes: ["select", "text"],
    legacyMatch: (l) => l.includes("ernährung"),
  },
  {
    key: "catering.allergies",
    label: "Allergien und Unverträglichkeiten",
    feeds: "Küchenplanung, Vorbefüllung aus dem Profil",
    returns: "text",
    fieldTypes: ["textarea", "text"],
    legacyMatch: (l) => l.includes("allergi"),
  },

  // ── Helfer ───────────────────────────────────────────────────────────────
  {
    key: "helper.tasks",
    label: "Hilft bei diesen Aufgaben",
    feeds: "Helferzahlen je Aufgabe, Abgleich gegen die Mindestanzahl",
    returns: "multi_choice",
    // multi_select bleibt zugelassen, damit Altformulare ihre Rolle behalten.
    fieldTypes: ["helper_tasks", "multi_select"],
    legacyMatch: (l) => l.includes("aufbau") || l.includes("abbau"),
  },
  {
    key: "helper.kitchen",
    label: "Hilft in der Küche",
    feeds: "Küchenteam",
    returns: "boolean",
    fieldTypes: ["checkbox"],
    legacyMatch: (l) => l.includes("küche"),
  },
  {
    key: "helper.shopping",
    label: "Hilft beim Einkauf",
    feeds: "Einkäufer",
    returns: "boolean",
    fieldTypes: ["checkbox"],
    legacyMatch: (l) =>
      l.includes("einkauf") || l.includes("einkaufen") || l.includes("einzukaufen"),
  },

  // ── Displays ─────────────────────────────────────────────────────────────
  // Bewusst schlank: Anzahl plus Beschreibung. Platzbedarf und Aufstellung
  // klärt die Orga im Gespräch, nicht das Formular.
  {
    key: "display.brings",
    label: "Bringt ein Display mit",
    feeds: "Displays: Anzahl und Namen",
    returns: "boolean",
    fieldTypes: ["checkbox"],
    legacyMatch: (l) => l.includes("display") && !l.includes("was für"),
  },
  {
    key: "display.description",
    label: "Beschreibung des Displays",
    feeds: "Displays: Liste für die Orga",
    returns: "text",
    fieldTypes: ["textarea", "text"],
    legacyMatch: (l) => l.includes("was für ein display"),
  },
];

const BY_KEY = new Map(FIELD_ROLES.map((r) => [r.key, r]));

export const getRole = (key: string | null | undefined): FieldRole | undefined =>
  key ? BY_KEY.get(key) : undefined;

/** Rollen, die für einen Feldtyp in Frage kommen – für die Auswahl im Baukasten. */
export const rolesForFieldType = (type: string): FieldRole[] =>
  FIELD_ROLES.filter((r) => r.fieldTypes.includes(type));

/** Die Rolle eines Feldes – gespeicherter Wert hat Vorrang. */
export const roleOf = (field: Pick<FormField, "settings">): string | null =>
  (field.settings?.role as string | undefined) ?? null;

/**
 * Findet das Feld zu einer Rolle.
 *
 * Zuerst über die gespeicherte Rolle. Nur wenn im ganzen Formular keine Rolle
 * vergeben ist, greift der Rückfallweg über die Beschriftung – so verhalten
 * sich Altformulare wie bisher, ohne dass ein halb verrolltes Formular
 * inkonsistent wird.
 */
export function findFieldByRole(
  fields: FormField[],
  roleKey: string
): FormField | undefined {
  const byRole = fields.find((f) => roleOf(f) === roleKey);
  if (byRole) return byRole;

  const anyRoleAssigned = fields.some((f) => roleOf(f) !== null);
  if (anyRoleAssigned) return undefined;

  const role = BY_KEY.get(roleKey);
  if (!role?.legacyMatch) return undefined;
  return fields.find(
    (f) => role.fieldTypes.includes(f.type) && role.legacyMatch!(f.label.toLowerCase())
  );
}

/**
 * Alle Felder zu einer Rolle. Für Rollen, die mehrfach vorkommen dürfen –
 * derzeit keine, aber der Rückfallweg über die Beschriftung kann mehrere
 * Treffer liefern (z. B. zwei Kästchen mit "Küche" im Namen), und genau so
 * hat die alte Auswertung gezählt.
 */
export function findFieldsByRole(fields: FormField[], roleKey: string): FormField[] {
  const byRole = fields.filter((f) => roleOf(f) === roleKey);
  if (byRole.length > 0) return byRole;

  const anyRoleAssigned = fields.some((f) => roleOf(f) !== null);
  if (anyRoleAssigned) return [];

  const role = BY_KEY.get(roleKey);
  if (!role?.legacyMatch) return [];
  return fields.filter(
    (f) => role.fieldTypes.includes(f.type) && role.legacyMatch!(f.label.toLowerCase())
  );
}
