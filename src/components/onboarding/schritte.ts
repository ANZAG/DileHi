import type { LucideIcon } from "lucide-react";
import {
  BookOpen, CalendarDays, ClipboardList, Coins, FileText, Image, MapPin,
  Megaphone, MessagesSquare, PackageOpen, Palette, ScrollText, Settings,
  Shield, Sparkles, Star, User, UserPlus, Users, Vote, MailPlus, Mail,
} from "lucide-react";

/**
 * Die Einführungstour, Schritt für Schritt.
 *
 * ── Warum eine einzige Liste ───────────────────────────────────────────────
 *
 * Vorher gab es vier Touren, fest an Rollenschlüssel gebunden: „vorstand“,
 * „officiatus_1“, „schatzmeister“, „herold“. Das hatte drei Haken.
 *
 * Ein Verein mit einer Rolle „Zeugwart“ bekam nichts. Wer Vorstand UND
 * Schatzmeister war, bekam zwei Touren nacheinander, mit denselben Schritten
 * doppelt (Kontaktanfragen, Galerie und Quellen standen in zwei Touren
 * wortgleich). Und ein Schritt zu einem abgeschalteten Modul wurde trotzdem
 * gezeigt.
 *
 * Jetzt gibt es eine Liste. Jeder Schritt sagt selbst, wann er gilt:
 *
 *   recht  Nur zeigen, wenn die Person dieses Recht hat.
 *   modul  Nur zeigen, wenn dieses Modul eingeschaltet ist.
 *
 * Die Tour einer Person ist das, was davon übrig bleibt, in dieser Reihenfolge.
 * Niemand sieht einen Schritt zu etwas, das er nicht aufrufen kann.
 *
 * ── Einen Schritt hinzufügen ───────────────────────────────────────────────
 *
 * Ein Objekt in diese Liste, fertig. Kein Eintrag an anderer Stelle, keine
 * neue Tour, keine Rollenabfrage. Wer den Schritt sehen soll, steht in `recht`
 * und `modul`.
 *
 * Der `key` ist der Merkzettel: Er steht in user_tours, sobald jemand den
 * Schritt gesehen hat. Deshalb bleibt er stabil, auch wenn der Text sich
 * ändert. Und deshalb bekommt jemand, der die Tour längst durchhatte, einen
 * NEU hinzugefügten Schritt beim nächsten Besuch einzeln gezeigt, statt die
 * ganze Tour noch einmal.
 */

export type Gruppe = "start" | "mitmachen" | "verwalten" | "einrichten";

export interface Schritt {
  /** Stabil. Steht in user_tours und darf sich nie ändern. */
  key: string;
  gruppe: Gruppe;
  icon: LucideIcon;
  titel: string;
  text: string;
  tipp?: string;
  /** Wohin die Tour währenddessen springt. */
  route?: string;
  /** Nur mit diesem Recht. Ohne Angabe: für alle. */
  recht?: string;
  /** Nur bei eingeschaltetem Modul. Ohne Angabe: immer. */
  modul?: string;
}

export const GRUPPEN: Record<Gruppe, string> = {
  start: "Zum Anfang",
  mitmachen: "Mitmachen",
  verwalten: "Verwalten",
  einrichten: "Einrichten",
};

export const SCHRITTE: Schritt[] = [
  // ── Zum Anfang ────────────────────────────────────────────────────────────
  {
    key: "willkommen",
    gruppe: "start",
    icon: Sparkles,
    titel: "Willkommen im Mitgliederbereich",
    text: "Schön, dass du da bist. Diese kurze Tour zeigt dir, was es hier gibt und was du am besten zuerst einrichtest. Du kannst sie jederzeit abbrechen und später in deinem Profil neu starten.",
  },
  {
    key: "profil",
    gruppe: "start",
    icon: User,
    titel: "Dein Profil",
    text: "Hinterlege deinen Namen und deine Anschrift. Was du dort einträgst, schlägt dir die Anwendung später bei Anmeldungen schon vor, damit du es nicht jedes Mal wiederholen musst.",
    tipp: "Am Ende der Seite stellst du ein, ob du Benachrichtigungen bekommen möchtest.",
    route: "/intern/profil",
  },

  // ── Mitmachen ─────────────────────────────────────────────────────────────
  {
    key: "veranstaltungen",
    gruppe: "mitmachen",
    icon: CalendarDays,
    titel: "Veranstaltungen",
    text: "Alle Vereinstermine an einer Stelle. Du kannst zusagen, wieder absagen und den Kalender abonnieren, damit die Termine auf deinem Handy stehen.",
    route: "/intern/veranstaltungen",
    modul: "events",
  },
  {
    key: "anmelden",
    gruppe: "mitmachen",
    icon: ClipboardList,
    titel: "Zu einer Veranstaltung anmelden",
    text: "Klicke auf einen Termin, um die Einzelheiten zu sehen. Gibt es ein Anmeldeformular, füllst du es einmal aus und kannst deine Angaben später jederzeit ändern. Ohne Formular genügt ein Klick auf „Teilnehmen“.",
    tipp: "Was in deinem Profil steht, ist im Formular schon eingetragen.",
    route: "/intern/veranstaltungen",
    modul: "event_forms",
  },
  {
    key: "forum",
    gruppe: "mitmachen",
    icon: MessagesSquare,
    titel: "Forum",
    text: "Absprachen, Fragen und alles dazwischen. Du kannst Themen eröffnen, antworten und Umfragen starten, wenn etwas abgestimmt werden soll.",
    route: "/intern/forum",
    modul: "forum",
  },
  {
    key: "versammlungen",
    gruppe: "mitmachen",
    icon: Megaphone,
    titel: "Versammlungen",
    text: "Ankündigungen, Einladungen zur Mitgliederversammlung und Protokolle. Auf Beiträge kannst du auch antworten.",
    route: "/intern/versammlungen",
    modul: "announcements",
  },
  {
    key: "abstimmungen",
    gruppe: "mitmachen",
    icon: Vote,
    titel: "Abstimmungen",
    text: "Wahlen und Beschlüsse laufen hier. Du bekommst eine Nachricht, sobald eine Abstimmung offen ist.",
    route: "/intern/abstimmungen",
    modul: "elections",
  },
  {
    key: "dokumente",
    gruppe: "mitmachen",
    icon: FileText,
    titel: "Dokumente",
    text: "Satzung, Ordnungen und Berichte zum Nachlesen und Herunterladen.",
    route: "/intern/dokumente",
    modul: "documents",
  },
  {
    key: "beitraege",
    gruppe: "mitmachen",
    icon: Coins,
    titel: "Beiträge",
    text: "Hier siehst du, ob dein Beitrag für dieses Jahr verbucht ist, und die Bankverbindung des Vereins.",
    route: "/intern/beitraege",
    modul: "contributions",
  },
  {
    key: "steckbrief",
    gruppe: "mitmachen",
    icon: ScrollText,
    titel: "Dein Darstellungssteckbrief",
    text: "Trage in deinem Profil ein, was du darstellst und was du kannst. Daraus entsteht die öffentliche Übersicht, mit der Museen sehen, was der Verein zeigen kann.",
    route: "/intern/profil",
    modul: "personas",
  },
  {
    key: "quellen",
    gruppe: "mitmachen",
    icon: BookOpen,
    titel: "Quellensammlung",
    text: "Die gemeinsame Bibliothek: Funde, Abbildungen und Literatur, nach Kategorie sortiert. Eigene Quellen kannst du selbst ergänzen.",
    route: "/intern/quellen",
    modul: "sources",
  },
  {
    key: "karte",
    gruppe: "mitmachen",
    icon: MapPin,
    titel: "Mitgliederkarte",
    text: "Zeigt, wo die anderen wohnen. Nützlich, um Fahrgemeinschaften zu finden.",
    tipp: "Du erscheinst dort nur, wenn du es in deinem Profil erlaubst.",
    route: "/intern/karte",
    modul: "member_map",
  },

  // ── Verwalten ─────────────────────────────────────────────────────────────
  {
    key: "verwaltung",
    gruppe: "verwalten",
    icon: Settings,
    titel: "Die Verwaltung",
    text: "Du hast mehr Rechte als die meisten. Alles dafür liegt hier, nach Bereichen sortiert. Was du nicht siehst, brauchst du auch nicht.",
    route: "/intern/verwaltung",
    recht: "admin.access",
  },
  {
    key: "mitglieder",
    gruppe: "verwalten",
    icon: Users,
    titel: "Mitglieder",
    text: "Das Register aller Mitglieder. Hier lädst du neue Leute ein, pflegst Stammdaten und setzt ein Mitglied auf inaktiv, wenn es austritt.",
    route: "/intern/verwaltung",
    recht: "members.manage",
  },
  {
    key: "antraege",
    gruppe: "verwalten",
    icon: UserPlus,
    titel: "Aufnahmeanträge",
    text: "Neue Anträge liegen hier zur Prüfung. Du siehst alle Angaben, kannst den Antrag als PDF öffnen und ihn annehmen oder ablehnen. Bei Annahme geht die Einladung automatisch raus.",
    route: "/intern/verwaltung",
    recht: "members.manage",
    modul: "applications",
  },
  {
    key: "kontaktanfragen",
    gruppe: "verwalten",
    icon: Mail,
    titel: "Kontaktanfragen",
    text: "Was über das Kontaktformular hereinkommt, steht hier. Antworten kannst du direkt aus der Anwendung, die Mail geht dann im Namen des Vereins raus.",
    route: "/intern/verwaltung",
    recht: "admin.access",
    modul: "contact",
  },
  {
    key: "seiten",
    gruppe: "verwalten",
    icon: FileText,
    titel: "Die öffentlichen Seiten",
    text: "Die Website stellst du aus Bausteinen zusammen: Text, Bilder, Kästen, Galerien. Was du siehst, ist auch das, was später dasteht.",
    tipp: "Änderungen sind erst öffentlich, wenn du sie veröffentlichst. Bis dahin kannst du in Ruhe probieren.",
    route: "/intern/verwaltung",
    recht: "site.content_edit",
  },
  {
    key: "galerie",
    gruppe: "verwalten",
    icon: Image,
    titel: "Galerie",
    text: "Bilder hochladen, kurz beschreiben und einer Kategorie zuordnen. Die Beschreibung ist wichtig: Sie wird vorgelesen, wenn jemand die Seite nicht sehen kann.",
    route: "/intern/verwaltung",
    recht: "gallery.manage",
    modul: "gallery",
  },
  {
    key: "quellen_pflege",
    gruppe: "verwalten",
    icon: BookOpen,
    titel: "Quellen der Themenseiten",
    text: "Die Belege unter den öffentlichen Themenseiten. Sie zeigen Gästen, worauf sich die Darstellung stützt.",
    route: "/intern/verwaltung",
    recht: "epoch_sources.manage",
    modul: "sources",
  },
  {
    key: "highlights",
    gruppe: "verwalten",
    icon: Star,
    titel: "Besucher-Highlights",
    text: "Die Stichpunkte „Das erwartet euch“ auf den Themenseiten. Kurz halten: Sie sollen im Vorbeigehen zu lesen sein.",
    route: "/intern/verwaltung",
    recht: "visitor_highlights.manage",
    modul: "besucher_highlights",
  },
  {
    key: "darstellungen_freigeben",
    gruppe: "verwalten",
    icon: ScrollText,
    titel: "Darstellungen freigeben",
    text: "Die Steckbriefe der Mitglieder werden nicht von selbst öffentlich. Du gibst frei, was auf der Website erscheint. Namen stehen dort nie, nur die Darstellung.",
    route: "/intern/verwaltung",
    recht: "personas.publish",
    modul: "personas",
  },
  {
    key: "abstimmungen_leiten",
    gruppe: "verwalten",
    icon: Vote,
    titel: "Abstimmungen leiten",
    text: "Du legst Abstimmungen an, verwaltest Stellvertretungen und schließt sie ab. Wer abgestimmt hat, steht getrennt von dem, was abgestimmt wurde.",
    route: "/intern/abstimmungen",
    recht: "elections.manage",
    modul: "elections",
  },
  {
    key: "auswertungen",
    gruppe: "verwalten",
    icon: ClipboardList,
    titel: "Anmeldungen auswerten",
    text: "Wer kommt, wer hilft, was gebraucht wird. Je nachdem, welche Module eingeschaltet sind, findest du hier auch Verpflegung, Fahrgemeinschaften und die Zeltplanung.",
    route: "/intern/auswertungen",
    recht: "events.moderate",
    modul: "event_forms",
  },
  {
    key: "beitraege_verwalten",
    gruppe: "verwalten",
    icon: Coins,
    titel: "Beiträge verwalten",
    text: "Für alle Mitglieder siehst du den Stand, buchst Zahlungen und erfasst Teilzahlungen. Die Beitragssätze pflegst du auf derselben Seite.",
    route: "/intern/beitraege",
    recht: "contributions.manage",
    modul: "contributions",
  },
  {
    key: "rollen",
    gruppe: "verwalten",
    icon: Shield,
    titel: "Rollen und Rechte",
    text: "Welche Rolle was darf, und wer welche Rolle hat. Geh damit sparsam um: Wer Rechte vergeben darf, kann sie auch sich selbst geben.",
    route: "/intern/verwaltung/berechtigungen",
    recht: "roles.manage",
  },
  {
    key: "protokoll",
    gruppe: "verwalten",
    icon: ScrollText,
    titel: "Protokoll",
    text: "Festgehalten ist, wer wichtige Dinge geändert hat, etwa eine gelöschte Abstimmung. Das schützt vor allem die, die nichts falsch gemacht haben.",
    route: "/intern/verwaltung/protokoll",
    recht: "audit.view",
  },

  // ── Einrichten ────────────────────────────────────────────────────────────
  {
    key: "module",
    gruppe: "einrichten",
    icon: PackageOpen,
    titel: "Module",
    text: "Was diese Installation überhaupt anbietet. Was der Verein nicht braucht, schaltest du ab: Der Bereich verschwindet samt Menüpunkt und Kachel. Die Daten bleiben und kommen beim Wiedereinschalten zurück.",
    tipp: "Fang hiermit an. Alles Weitere richtet sich danach, was eingeschaltet ist.",
    route: "/intern/verwaltung",
    recht: "system.modules",
  },
  {
    key: "erscheinungsbild",
    gruppe: "einrichten",
    icon: Palette,
    titel: "Erscheinungsbild",
    text: "Name, Anschrift, Logo, Farben und Schriften des Vereins. Diese Angaben stehen anschließend überall: auf der Website, im Impressum, in jeder Mail und auf dem Aufnahmeantrag.",
    route: "/intern/verwaltung",
    recht: "system.settings",
  },
  {
    key: "vorlagen",
    gruppe: "einrichten",
    icon: MailPlus,
    titel: "Texte und Formulare",
    text: "Die Texte der versendeten Mails, die Felder des Aufnahmeantrags und die Angaben im Mitgliederprofil lassen sich anpassen. Zu jeder Vorlage gibt es einen Knopf zurück auf den Auslieferungszustand.",
    tipp: "Unter Erscheinungsbild gibt es einen Probeversand, mit dem du den Mailweg prüfen kannst.",
    route: "/intern/verwaltung",
    recht: "system.settings",
  },

  // ── Schluss ───────────────────────────────────────────────────────────────
  {
    key: "abschluss",
    gruppe: "start",
    icon: Sparkles,
    titel: "Das war es",
    text: "Du kannst die Tour jederzeit in deinem Profil neu starten. Kommt später etwas Neues dazu, zeigen wir dir nur den neuen Schritt, nicht die ganze Tour noch einmal.",
  },
];

/**
 * Welche Schritte für jemanden gelten.
 *
 * `hatRecht` und `modulAktiv` kommen von aussen, damit diese Datei nichts über
 * Abfragen und Zustand wissen muss und sich testen lässt.
 */
export function passendeSchritte(
  hatRecht: (recht: string) => boolean,
  modulAktiv: (modul: string) => boolean
): Schritt[] {
  return SCHRITTE.filter(
    (s) => (!s.recht || hatRecht(s.recht)) && (!s.modul || modulAktiv(s.modul))
  );
}
