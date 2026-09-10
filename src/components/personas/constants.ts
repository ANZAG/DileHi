/** Zeitperioden für Darstellungssteckbriefe (Dropdown). */
export const PERIOD_OPTIONS = [
  "Frühmittelalter (500–1050)",
  "Hochmittelalter (1050–1250)",
  "Spätmittelalter (1250–1500)",
  "Frühe Neuzeit (1500–1789)",
  "Napoleonische Zeit / 1815",
  "19. Jahrhundert (1815–1913)",
  "Erster Weltkrieg (1914–1918)",
  "Andere Epoche",
] as const;

export const MAX_PERSONA_IMAGES = 3;

export interface MemberPersona {
  id: string;
  user_id: string;
  period: string;
  portrayal: string;
  expertise: string;
  /** Darf der Name der Person oeffentlich dazu stehen? */
  show_name?: boolean;
  images: string[];
  sort_order: number;
}
