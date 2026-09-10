export const DEFAULT_TEMPLATE_FIELDS = [
  // --- Sektion: Teilnahme ---
  {
    type: "section",
    label: "Teilnahme",
    required: false,
    options: [] as string[],
    settings: {},
    description: null,
  },
  {
    type: "attendance_days",
    label: "An welchen Tagen bist du dabei?",
    required: true,
    options: [] as string[],
    settings: { role: "attendance.days" },
    description: null,
  },
  {
    // Eine Frage statt dreier verstreuter Felder. Der Termin gehoert an die
    // Aufgabe, damit beim Ankreuzen klar ist, worauf man sich einlaesst –
    // Aufbau am Freitagnachmittag ist etwas anderes als Aufbau am Samstag.
    // Die Termine traegt die Orga beim Anlegen des Formulars ein.
    type: "helper_tasks",
    label: "Wobei kannst du helfen?",
    required: false,
    options: [] as string[],
    settings: {
      role: "helper.tasks",
      tasks: [
        { key: "lager-beladen", label: "Beladen im Vereinslager", when: null, min: null },
        { key: "aufbau", label: "Aufbau vor Ort", when: null, min: null },
        { key: "abbau", label: "Abbau vor Ort", when: null, min: null },
        { key: "lager-entladen", label: "Auspacken im Vereinslager", when: null, min: null },
        { key: "einkauf", label: "Einkaufen", when: null, min: null },
        { key: "kochen", label: "Kochen", when: null, min: null },
      ],
    },
    description: "Die Zeiten stehen hinter der jeweiligen Aufgabe.",
  },

  // --- Sektion: Transport ---
  {
    type: "section",
    label: "Transport",
    required: false,
    options: [] as string[],
    settings: {},
    description: null,
  },
  {
    type: "checkbox",
    label: "Reise mit eigenem PKW an",
    required: false,
    options: [] as string[],
    settings: { role: "transport.own_car" },
    description: null,
  },
  {
    type: "number",
    label: "Kann Personen mitnehmen (inkl. sich selbst)",
    required: false,
    options: [] as string[],
    settings: { role: "transport.seats", conditional_on: "Reise mit eigenem PKW an", placeholder: "z.B. 4" },
    description: "Anzahl freier Sitzplätze im PKW",
  },
  {
    type: "checkbox",
    label: "Kann einen Anhänger mit dem PKW ziehen",
    required: false,
    options: [] as string[],
    settings: { role: "transport.can_tow", conditional_on: "Reise mit eigenem PKW an" },
    description: null,
  },
  {
    type: "checkbox",
    label: "Kann einen Anhänger zur Verfügung stellen",
    required: false,
    options: [] as string[],
    settings: { role: "transport.trailer" },
    description: null,
  },

  // --- Sektion: Ernährung ---
  {
    type: "section",
    label: "Ernährung",
    required: false,
    options: [] as string[],
    settings: {},
    description: null,
  },
  {
    type: "select",
    label: "Ernährungspräferenz",
    required: false,
    options: ["Keine Einschränkung", "Vegetarisch", "Vegan"],
    settings: { role: "catering.diet" },
    description: null,
  },
  {
    type: "textarea",
    label: "Allergien / Unverträglichkeiten",
    required: false,
    options: [] as string[],
    settings: { role: "catering.allergies", placeholder: "Bitte angeben, falls vorhanden" },
    description: null,
  },

  // --- Sektion: Zelt-Details ---
  {
    type: "section",
    label: "Zelt-Details",
    required: false,
    options: [] as string[],
    settings: {},
    description: null,
  },
  {
    type: "tent",
    label: "Zelt-Details",
    required: false,
    options: [] as string[],
    settings: { role: "lodging.tent" },
    description: "Angaben zu deinem Zelt für die Lagerplanung",
  },

  // --- Sektion: Display ---
  {
    type: "section",
    label: "Display",
    required: false,
    options: [] as string[],
    settings: {},
    description: null,
  },
  {
    type: "checkbox",
    label: "Ich stelle ein Display aus",
    required: false,
    options: [] as string[],
    settings: { role: "display.brings" },
    description: null,
  },
  {
    type: "textarea",
    label: "Was für ein Display möchtest du ausstellen?",
    required: false,
    options: [] as string[],
    settings: {
      role: "display.description",
      conditional_on: "Ich stelle ein Display aus",
      placeholder: "Kurze Beschreibung, Details klärt die Orga mit dir",
    },
    description: null,
  },

  // --- Sektion: Sonstiges ---
  {
    type: "section",
    label: "Sonstiges",
    required: false,
    options: [] as string[],
    settings: {},
    description: null,
  },
  {
    type: "checkbox",
    label: "Ich benötige noch Ausrüstung",
    required: false,
    options: [] as string[],
    settings: {},
    description: "Bitte ankreuzen, falls dir noch etwas fehlt.",
  },
  {
    type: "textarea",
    label: "Was fehlt?",
    required: false,
    options: [] as string[],
    settings: { conditional_on: "Ich benötige noch Ausrüstung", conditional_value: true, placeholder: "Was benötigst du noch?" },
    description: null,
  },
  {
    type: "textarea",
    label: "Anmerkungen",
    required: false,
    options: [] as string[],
    settings: { placeholder: "Sonstige Hinweise..." },
    description: null,
  },
];
