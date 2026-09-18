/**
 * Der geführte Durchlauf: was in welcher Reihenfolge gefragt wird.
 *
 * Nach dem ersten Zugang steht jemand vor einem Mitgliederbereich, in dem
 * nichts steht, und weiss nicht, wo er anfangen soll. Eine Liste mit Ampeln
 * sagt ihm, was fehlt — sie führt ihn aber nicht. Der Durchlauf tut das: eine
 * Frage nach der anderen, jede mit einem Satz, warum sie kommt.
 *
 * Die Reihenfolge ist keine Geschmacksfrage, sondern eine Abhängigkeit:
 *
 *   1. Die Form entscheidet, was es überhaupt gibt (Aufnahmeantrag? Beiträge?)
 *      und wie die Oberfläche redet. Sie muss zuerst feststehen.
 *   2. Die Vereinsdaten stecken danach in Impressum, Mails und Anträgen.
 *   3. Das Erscheinungsbild, solange die Lust noch da ist: Farben und Logo
 *      sind das, was aus einer fremden Software „unsere Seite" macht.
 *   4. Die Module — vorausgewählt aus Schritt 1, jedes einzeln änderbar.
 *   5. Die Rollen, deren Rechte sich nach den Modulen richten.
 *   6. Der Mailversand, der für Einladungen gebraucht wird.
 *   7. Die ersten Leute einladen — und damit ist die Installation in Betrieb.
 *
 * Hier stehen nur die Entscheidungen, nicht die Oberfläche: Was ein Schritt
 * fragt, woran man erkennt, dass er erledigt ist, und ob man ihn überspringen
 * darf. So lässt sich der Durchlauf prüfen, ohne einen Browser zu starten.
 */

import { form, type OrgForm } from "@/lib/organisationsform";
import type { Findings } from "@/lib/einrichtung";

export interface Durchlaufschritt {
  id: string;
  /** Die Überschrift, als Frage oder Aufforderung. */
  titel: string;
  /** Warum dieser Schritt kommt – ein Satz, keine Anleitung. */
  warum: string;
  /**
   * Welcher Verwaltungsbereich die Arbeit macht. Der Durchlauf zeigt ihn
   * eingebettet, statt die Masken ein zweites Mal zu bauen: Was hier
   * eingestellt wird, muss später an derselben Stelle wieder auffindbar sein.
   */
  bereich?: string;
  /** Ohne diesen Schritt läuft die Installation nicht. */
  pflicht: boolean;
}

export const SCHRITTE: Durchlaufschritt[] = [
  {
    id: "form",
    titel: "Was seid ihr?",
    warum: "Danach richtet sich, was es bei euch gibt und wie DING darüber spricht.",
    pflicht: true,
  },
  {
    id: "verein",
    titel: "Eure Daten",
    warum: "Aus ihnen bauen sich Impressum, Mails und Anträge – einmal eintragen, überall richtig.",
    bereich: "erscheinungsbild",
    pflicht: true,
  },
  {
    id: "aussehen",
    titel: "Wie es aussehen soll",
    warum: "Farben, Logo und Schriften machen aus fremder Software eure Seite.",
    bereich: "erscheinungsbild",
    pflicht: false,
  },
  {
    id: "module",
    titel: "Was ihr braucht",
    warum: "Vorausgewählt nach eurer Form. Alles einzeln änderbar, jederzeit.",
    bereich: "module",
    pflicht: true,
  },
  {
    id: "rollen",
    titel: "Wer was darf",
    warum: "Die Ämter bei euch, und welche Rechte daran hängen.",
    bereich: "rollen",
    pflicht: false,
  },
  {
    id: "mail",
    titel: "Wie Post rausgeht",
    warum: "Ohne Mailversand gibt es Einladungen nur als Link zum Weitergeben.",
    bereich: "erscheinungsbild",
    pflicht: false,
  },
  {
    id: "leute",
    titel: "Die Ersten einladen",
    warum: "Damit aus der Installation eine Gemeinschaft wird, die miteinander arbeitet.",
    bereich: "members",
    pflicht: false,
  },
];

/** Der Stand des Durchlaufs, wie ihn `setup_status()` liefert. */
export interface Durchlaufstand {
  schritt?: number;
  fertig_am?: string | null;
}

/**
 * Woran man sieht, dass ein Schritt inhaltlich erledigt ist.
 *
 * Getrennt vom „durchgeklickt": Wer einen Schritt überspringt, hat ihn nicht
 * erledigt — der Durchlauf geht trotzdem weiter, und die Kachel „Einrichtung"
 * zeigt hinterher, was übrig blieb.
 */
export function isDone(id: string, befund: Findings): boolean {
  const db = befund.datenbank ?? {};
  const verein = db.verein ?? {};
  const art = form(verein.org_form);

  switch (id) {
    case "form":
      // Sobald jemand bewusst gewählt hat, steht dort etwas anderes als die
      // Vorgabe – oder er hat den Verein bestätigt, dann zählt der Schritt
      // über den Durchlaufstand.
      return Boolean(verein.org_form);
    case "verein":
      return Boolean(
        verein.name &&
          verein.anschrift &&
          verein.email &&
          (!art.vorstand || verein.vorstand) &&
          (!art.register || verein.register)
      );
    case "aussehen":
      return Boolean(verein.logo || verein.farbe_gesetzt);
    case "module":
      return (db.module ?? 0) > 0;
    case "rollen":
      return (db.rollen_vergeben ?? 0) > 0;
    case "mail":
      return (befund.secrets?.mail ?? []).length === 0 && Boolean(verein.absender);
    case "leute":
      return (db.mitglieder ?? 0) > 1;
    default:
      return false;
  }
}

/**
 * Welcher Schritt jetzt dran ist.
 *
 * Der erste, der weder erledigt noch schon abgehakt ist. Abgehakt heisst:
 * durchgeklickt, auch wenn er übersprungen wurde — sonst käme derselbe Schritt
 * bei jedem Öffnen wieder, und der Durchlauf würde zur Sackgasse.
 */
export function nextStep(befund: Findings, stand: Durchlaufstand): number {
  const abgehakt = stand.schritt ?? 0;
  for (let i = 0; i < SCHRITTE.length; i++) {
    if (i < abgehakt) continue;
    if (isDone(SCHRITTE[i].id, befund)) continue;
    return i;
  }
  return SCHRITTE.length;
}

/**
 * Öffnet sich der Durchlauf von selbst?
 *
 * Nur, solange er nicht abgeschlossen ist. Wer ihn beendet hat, bekommt ihn
 * nicht wieder vorgesetzt — er steht dann in der Verwaltung unter
 * „Einrichtung", wie alles andere auch.
 */
export function zeigen(stand: Durchlaufstand | null | undefined): boolean {
  return !stand?.fertig_am;
}

/** Was jemand ausdrücklich gesagt hat — oder eben noch nichts. */
export type Intent = "auf" | "zu" | null;

/**
 * Ob der Durchlauf gerade zu sehen ist.
 *
 * Getrennt von `zeigen()`, weil es zwei Fragen sind: „öffnet er sich von
 * selbst?" und „ist er zu sehen?". Vorher entschied dieselbe Bedingung beides
 * — und damit auch, ob der Knopf dorthin überhaupt dasteht. Wer den Durchlauf
 * beendet hatte (oder wessen Installation die Migration abgehakt hatte, bevor
 * er ihn das erste Mal sah), kam nie wieder hinein.
 */
export function setupRunVisible(
  wunsch: Intent,
  stand: Durchlaufstand | null | undefined
): boolean {
  if (wunsch === "auf") return true;
  if (wunsch === "zu") return false;
  return zeigen(stand);
}

/** Wie weit es ist – für den Balken oben im Durchlauf. */
export function progress(befund: Findings, stand: Durchlaufstand): { fertig: number; gesamt: number } {
  const fertig = SCHRITTE.filter((s, i) => isDone(s.id, befund) || i < (stand.schritt ?? 0)).length;
  return { fertig, gesamt: SCHRITTE.length };
}

/** Die Form, die im Durchlauf zur Auswahl steht – in der Reihenfolge der Häufigkeit. */
export const FORM_REIHENFOLGE: OrgForm[] = ["registered_club", "club", "interest_group"];
