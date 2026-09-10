import type { BeitragsstufeStatus } from "@/hooks/useBeitragsstufen";

/**
 * Die Texte rund um das Entfernen einer Beitragsstufe.
 *
 * Getrennt von der Anzeige, weil sie der eigentliche Inhalt sind: Ob jemand
 * versteht, warum eine Stufe stehen bleibt, entscheidet sich an diesen Sätzen
 * und nicht am Rahmen darum. So lassen sie sich auch prüfen.
 */

/** Was `beitragsstufe_entfernen` zurückgibt. */
export interface Ergebnis {
  ok: boolean;
  grund?: "mitglieder" | "letzte" | "unbekannt";
  aktion?: "geloescht" | "stillgelegt" | "vermerkt";
  mitglieder?: number;
  ehemalige?: number;
  geloescht_ab?: number;
  loeschbar_ab?: number;
  letztes_datenjahr?: number;
}

/** Die Zahlen unter dem Namen: was an dieser Stufe hängt. */
export function beschreibung(s: BeitragsstufeStatus): string {
  const teile: string[] = [];
  if (s.mitglieder > 0) {
    teile.push(`${s.mitglieder} ${s.mitglieder === 1 ? "Mitglied" : "Mitglieder"}`);
  }
  if (s.ehemalige > 0) teile.push(`${s.ehemalige} ehemalige`);
  if (s.letztes_datenjahr != null) teile.push(`Beitragssätze bis ${s.letztes_datenjahr}`);
  if (teile.length === 0) return "Noch nie benutzt";
  if (s.geloescht_ab != null && s.loeschbar_ab != null) {
    teile.push(`endgültig löschbar ab ${s.loeschbar_ab}`);
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
  if (s.mitglieder > 0 || s.ehemalige > 0) {
    return "An dieser Stufe hängen noch Profile. Solange das so ist, lässt sie sich nicht entfernen: In den Profilen stünde sonst ein Wort, das niemand mehr auflösen kann. Trage die Betroffenen erst in eine andere Stufe um.";
  }
  if (s.letztes_datenjahr == null) {
    return "Diese Stufe war nie in Gebrauch. Sie wird vollständig gelöscht.";
  }
  return "Es gibt Beitragssätze aus früheren Jahren. Die Stufe wird deshalb nicht sofort gelöscht, sondern nur nicht mehr angeboten. Die alten Sätze bleiben bis zum Ende der Aufbewahrungsfrist stehen; danach lässt sie sich hier endgültig entfernen.";
}

/** Was nach dem Entfernen im Hinweis steht. */
export function meldung(e: Ergebnis): { titel: string; text: string } {
  if (!e.ok) {
    if (e.grund === "mitglieder") {
      const teile = [
        e.mitglieder ? `${e.mitglieder} aktive` : null,
        e.ehemalige ? `${e.ehemalige} ehemalige` : null,
      ].filter(Boolean).join(" und ");
      return {
        titel: "Noch nicht möglich",
        text: `Es hängen noch ${teile} Profile an dieser Stufe. Trage sie erst in eine andere um.`,
      };
    }
    if (e.grund === "letzte") {
      return {
        titel: "Die letzte Stufe bleibt",
        text: "Ohne eine einzige Stufe stünde im Aufnahmeantrag keine Auswahl.",
      };
    }
    return { titel: "Nicht entfernt", text: "Diese Stufe gibt es nicht mehr." };
  }

  if (e.aktion === "geloescht") {
    return { titel: "Entfernt", text: "Die Stufe ist gelöscht." };
  }
  if (e.aktion === "vermerkt") {
    return {
      titel: `Läuft aus zum ${e.geloescht_ab}`,
      text: `Für dieses Jahr ist schon ein Beitragssatz hinterlegt, die Stufe gilt also noch bis Jahresende. Ab ${e.geloescht_ab} steht sie nicht mehr zur Auswahl. Endgültig löschbar ab ${e.loeschbar_ab}.`,
    };
  }
  return {
    titel: "Wird nicht mehr angeboten",
    text: `Die Beitragssätze bis ${e.letztes_datenjahr} bleiben wegen der Aufbewahrungsfrist stehen. Endgültig löschbar ab ${e.loeschbar_ab}.`,
  };
}
