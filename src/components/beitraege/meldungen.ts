import type { BeitragsstufeStatus } from "@/hooks/useBeitragsstufen";

/**
 * Die Texte rund um das Entfernen einer Beitragsstufe.
 *
 * Getrennt von der Anzeige, weil sie der eigentliche Inhalt sind: Ob jemand
 * versteht, warum eine Stufe stehen bleibt, entscheidet sich an diesen Sätzen
 * und nicht am Rahmen darum. So lassen sie sich auch prüfen.
 */

/** Was `remove_contribution_category` zurückgibt. */
export interface Ergebnis {
  ok: boolean;
  reason?: "members" | "last" | "unknown";
  action?: "deleted" | "retired" | "scheduled";
  members?: number;
  former_members?: number;
  removed_from?: number;
  deletable_from?: number;
  last_data_year?: number;
}

/** Die Zahlen unter dem Namen: was an dieser Stufe hängt. */
export function beschreibung(s: BeitragsstufeStatus): string {
  const teile: string[] = [];
  if (s.members > 0) {
    teile.push(`${s.members} ${s.members === 1 ? "Mitglied" : "Mitglieder"}`);
  }
  if (s.former_members > 0) teile.push(`${s.former_members} ehemalige`);
  if (s.last_data_year != null) teile.push(`Beitragssätze bis ${s.last_data_year}`);
  if (teile.length === 0) return "Noch nie benutzt";
  if (s.removed_from != null && s.deletable_from != null) {
    teile.push(`endgültig löschbar ab ${s.deletable_from}`);
  }
  return teile.join(" · ");
}

/**
 * Was beim Entfernen zu erwarten ist.
 *
 * Bewusst keine Vorhersage der Entscheidung – die trifft die Datenbank. Hier
 * steht nur die eine Unterscheidung, die jemand vor dem Klick kennen muss:
 * Verschwindet die Stufe sofort, oder bleibt sie wegen der Unterlagen stehen?
 */
export function nachfrageText(s: BeitragsstufeStatus): string {
  if (s.members > 0 || s.former_members > 0) {
    return "An dieser Stufe hängen noch Profile. Solange das so ist, lässt sie sich nicht entfernen: In den Profilen stünde sonst ein Wort, das niemand mehr auflösen kann. Trage die Betroffenen erst in eine andere Stufe um.";
  }
  if (s.last_data_year == null) {
    return "Diese Stufe war nie in Gebrauch. Sie wird vollständig gelöscht.";
  }
  return "Es gibt Beitragssätze aus früheren Jahren. Die Stufe wird deshalb nicht sofort gelöscht, sondern nur nicht mehr angeboten. Die alten Sätze bleiben bis zum Ende der Aufbewahrungsfrist stehen; danach lässt sie sich hier endgültig entfernen.";
}

/** Was nach dem Entfernen im Hinweis steht. */
export function meldung(e: Ergebnis): { titel: string; text: string } {
  if (!e.ok) {
    if (e.reason === "members") {
      const teile = [
        e.members ? `${e.members} aktive` : null,
        e.former_members ? `${e.former_members} ehemalige` : null,
      ].filter(Boolean).join(" und ");
      return {
        titel: "Noch nicht möglich",
        text: `Es hängen noch ${teile} Profile an dieser Stufe. Trage sie erst in eine andere um.`,
      };
    }
    if (e.reason === "last") {
      return {
        titel: "Die letzte Stufe bleibt",
        text: "Ohne eine einzige Stufe stünde im Aufnahmeantrag keine Auswahl.",
      };
    }
    return { titel: "Nicht entfernt", text: "Diese Stufe gibt es nicht mehr." };
  }

  if (e.action === "deleted") {
    return { titel: "Entfernt", text: "Die Stufe ist gelöscht." };
  }
  if (e.action === "scheduled") {
    return {
      titel: `Läuft aus zum ${e.removed_from}`,
      text: `Für dieses Jahr ist schon ein Beitragssatz hinterlegt, die Stufe gilt also noch bis Jahresende. Ab ${e.removed_from} steht sie nicht mehr zur Auswahl. Endgültig löschbar ab ${e.deletable_from}.`,
    };
  }
  return {
    titel: "Wird nicht mehr angeboten",
    text: `Die Beitragssätze bis ${e.last_data_year} bleiben wegen der Aufbewahrungsfrist stehen. Endgültig löschbar ab ${e.deletable_from}.`,
  };
}
