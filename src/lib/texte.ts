import { SEITENTEXTE, type Sprache } from "@/lib/sprachen.mjs";

/**
 * Die festen Worte der öffentlichen Seite in allen drei Sprachen.
 *
 * Gemeint ist nur der Rahmen: Kopf, Fuss, Sprachwahl, Kontaktformular,
 * Fehlerseite. Was der Verein selbst schreibt – Seiten, Menüpunkte,
 * Untertitel –, steht in der Datenbank und wird dort übersetzt. Der
 * Mitgliederbereich bleibt deutsch und braucht diese Datei nicht.
 *
 * Deutsch ist das Original: Sein Aufbau ist der Typ, an dem sich die beiden
 * anderen messen. Fehlt in einer Sprache ein Wort, meldet es der Übersetzer
 * (tsc); ein Test vergleicht zusätzlich die Schlüssel, falls jemand den Typ
 * einmal aufweicht.
 *
 * Bewusst ohne Bibliothek: gut fünfzig kurze Texte, keine Mehrzahlformen,
 * keine nachgeladenen Dateien. Eine Bibliothek brächte mehr Programm mit, als
 * hier Worte stehen.
 */

const de = {
  ...SEITENTEXTE.de,

  // ── Kopf und Fuss ──
  menue: "Menü",
  mitgliederbereich: "Mitgliederbereich",
  navigation: "Navigation",
  alleRechte: "Alle Rechte vorbehalten.",
  startseite: "Startseite",
  impressum: "Impressum",
  datenschutz: "Datenschutz",

  // ── Sprachwahl ──
  sprachwahl: "Sprache wählen",
  /** Steht über einer Seite, die es in der gewählten Sprache nicht gibt. */
  nurAufDeutsch: "Diese Seite gibt es bisher nur auf Deutsch.",

  // ── Fehlerseite ──
  zurStartseite: "Zur Startseite",

  // ── Kontaktformular ──
  name: "Name",
  deinName: "Dein Name",
  email: "E-Mail",
  emailBeispiel: "deine@email.de",
  nachricht: "Nachricht",
  deineNachricht: "Deine Nachricht an uns …",
  rechenaufgabe: "Was ist {a} + {b}?",
  captchaFalsch: "Captcha falsch",
  captchaHinweis: "Bitte löse die Rechenaufgabe.",
  alleFelder: "Bitte alle Felder ausfüllen",
  fehler: "Fehler",
  nichtGesendet: "Nachricht konnte nicht gesendet werden.",
  gesendetTitel: "Nachricht gesendet!",
  gesendetText: "Vielen Dank für deine Nachricht. Wir melden uns so schnell wie möglich bei dir.",
  wirdGesendet: "Wird gesendet …",
  nachrichtSenden: "Nachricht senden",

  // ── Anfrage von Veranstaltern ──
  organisation: "Organisation / Institution",
  artDerVeranstaltung: "Art der Veranstaltung",
  datumZeitraum: "Datum / Zeitraum",
  ortDerVeranstaltung: "Ort der Veranstaltung",
  besucherzahl: "Erwartete Besucherzahl",
  zeitOderThema: "Gewünschte Zeit oder Thema",
  weitereInformationen: "Nachricht / Weitere Informationen",
  bitteWaehlen: "Bitte wählen",
  pflichtfelder: "Bitte alle Pflichtfelder ausfüllen.",
  fehlerBeimSenden: "Fehler beim Senden.",
  anfrageGesendet: "Anfrage gesendet!",
  wirMeldenUns: "Wir melden uns bei Ihnen.",
  anfrageSenden: "Anfrage senden",
  /**
   * Die festen Antworten in den Auswahllisten. Gespeichert und gemailt wird
   * die deutsche – die Anfrage liest der Vorstand –, gezeigt die übersetzte.
   */
  auswahl: {
    "bis 100": "bis 100",
    "100–500": "100–500",
    "500–1000": "500–1.000",
    "über 1000": "über 1.000",
    Mehrere: "Mehrere",
    Offen: "Offen",
  },
};

export type Texte = typeof de;

const en: Texte = {
  ...SEITENTEXTE.en,

  menue: "Menu",
  mitgliederbereich: "Members’ area",
  navigation: "Navigation",
  alleRechte: "All rights reserved.",
  startseite: "Home",
  impressum: "Legal notice",
  datenschutz: "Privacy policy",

  sprachwahl: "Choose language",
  nurAufDeutsch: "This page is only available in German so far.",

  zurStartseite: "Back to the home page",

  name: "Name",
  deinName: "Your name",
  email: "Email",
  emailBeispiel: "you@example.com",
  nachricht: "Message",
  deineNachricht: "Your message to us …",
  rechenaufgabe: "What is {a} + {b}?",
  captchaFalsch: "Wrong answer",
  captchaHinweis: "Please solve the sum.",
  alleFelder: "Please fill in all fields",
  fehler: "Error",
  nichtGesendet: "Your message could not be sent.",
  gesendetTitel: "Message sent!",
  gesendetText: "Thank you for your message. We will get back to you as soon as possible.",
  wirdGesendet: "Sending …",
  nachrichtSenden: "Send message",

  organisation: "Organisation / institution",
  artDerVeranstaltung: "Type of event",
  datumZeitraum: "Date / period",
  ortDerVeranstaltung: "Venue",
  besucherzahl: "Expected number of visitors",
  zeitOderThema: "Period or topic you are interested in",
  weitereInformationen: "Message / further information",
  bitteWaehlen: "Please choose",
  pflichtfelder: "Please fill in all required fields.",
  fehlerBeimSenden: "Your enquiry could not be sent.",
  anfrageGesendet: "Enquiry sent!",
  wirMeldenUns: "We will get back to you.",
  anfrageSenden: "Send enquiry",
  auswahl: {
    "bis 100": "up to 100",
    "100–500": "100–500",
    "500–1000": "500–1,000",
    "über 1000": "more than 1,000",
    Mehrere: "Several",
    Offen: "Open",
  },
};

const fr: Texte = {
  ...SEITENTEXTE.fr,

  menue: "Menu",
  mitgliederbereich: "Espace membres",
  navigation: "Navigation",
  alleRechte: "Tous droits réservés.",
  startseite: "Accueil",
  impressum: "Mentions légales",
  datenschutz: "Protection des données",

  sprachwahl: "Choisir la langue",
  nurAufDeutsch: "Cette page n’existe pour l’instant qu’en allemand.",

  zurStartseite: "Retour à l’accueil",

  name: "Nom",
  deinName: "Votre nom",
  email: "E-mail",
  emailBeispiel: "vous@exemple.fr",
  nachricht: "Message",
  deineNachricht: "Votre message …",
  rechenaufgabe: "Combien font {a} + {b} ?",
  captchaFalsch: "Réponse incorrecte",
  captchaHinweis: "Veuillez résoudre l’addition.",
  alleFelder: "Veuillez remplir tous les champs",
  fehler: "Erreur",
  nichtGesendet: "Votre message n’a pas pu être envoyé.",
  gesendetTitel: "Message envoyé !",
  gesendetText: "Merci pour votre message. Nous vous répondrons dès que possible.",
  wirdGesendet: "Envoi en cours …",
  nachrichtSenden: "Envoyer le message",

  organisation: "Organisation / institution",
  artDerVeranstaltung: "Type de manifestation",
  datumZeitraum: "Date / période",
  ortDerVeranstaltung: "Lieu de la manifestation",
  besucherzahl: "Nombre de visiteurs attendu",
  zeitOderThema: "Époque ou thème souhaité",
  weitereInformationen: "Message / informations complémentaires",
  bitteWaehlen: "Veuillez choisir",
  pflichtfelder: "Veuillez remplir tous les champs obligatoires.",
  fehlerBeimSenden: "Votre demande n’a pas pu être envoyée.",
  anfrageGesendet: "Demande envoyée !",
  wirMeldenUns: "Nous vous répondrons.",
  anfrageSenden: "Envoyer la demande",
  auswahl: {
    "bis 100": "jusqu’à 100",
    "100–500": "100–500",
    "500–1000": "500–1 000",
    "über 1000": "plus de 1 000",
    Mehrere: "Plusieurs",
    Offen: "Sans préférence",
  },
};

export const TEXTE: Record<Sprache, Texte> = { de, en, fr };

/** Setzt `{name}` in einem Text ein. */
export function mitWerten(text: string, werte: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (ganz, name: string) => (name in werte ? String(werte[name]) : ganz));
}
