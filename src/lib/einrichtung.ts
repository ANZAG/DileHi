/**
 * Der Einrichtungsassistent: aus dem Stand wird eine Liste mit Ampeln.
 *
 * Getrennt von der Oberfläche, weil hier die Entscheidungen fallen — „grün
 * oder gelb", „was fehlt genau" — und die will man prüfen können, ohne einen
 * Browser und eine Datenbank zu starten. Die Oberfläche zeichnet nur noch.
 *
 * Die Reihenfolge ist die der Installation ([`installation.md`](../../docs/installation.md)):
 * Wer von oben nach unten alles grün macht, hat eine fertige Installation.
 */

import { form } from "@/lib/organisationsform";

export type Ampel = "gut" | "teilweise" | "fehlt";

export interface Schritt {
  id: string;
  titel: string;
  ampel: Ampel;
  /** Was der Stand bedeutet, in einem Satz und ohne Fachwort. */
  text: string;
  /** Was zu tun ist, wenn es nicht grün ist. */
  todo?: string;
  /** Wohin in der Verwaltung, falls es dort erledigt wird. */
  ziel?: string;
  /** Namen fehlender Secrets — nie Werte. */
  fehlendeSecrets?: string[];
  /** Ohne diesen Schritt läuft nichts; gelb ist hier kein „später". */
  pflicht: boolean;
}

export interface Vereinsstand {
  /** Verein, e. V. oder Interessengemeinschaft – entscheidet, was hier fehlt. */
  org_form?: string | null;
  name?: string | null;
  anschrift?: boolean;
  email?: string | null;
  web?: string | null;
  vorstand?: boolean;
  register?: boolean;
  mail_weg?: string | null;
  absender?: string | null;
  ablage?: string | null;
  sharepoint_site?: string | null;
}

export interface Befund {
  datenbank?: {
    migrationen?: string[];
    rollen_vergeben?: number;
    mitglieder?: number;
    module?: number;
    verein?: Vereinsstand | null;
    seiten?: Record<string, boolean> | null;
    menue?: { kopf?: number; fuss?: number } | null;
  } | null;
  secrets?: {
    mail?: string[];
    sharepoint?: string[];
    push?: string[];
    sicherung?: string[];
    einrichtung?: string[];
  } | null;
  seitenadresse?: string | null;
}

/** Die Versionen, die dieser Stand des Programms mitbringt (aus den Dateinamen). */
export function erwarteteMigrationen(dateien: string[]): string[] {
  return dateien
    .map((pfad) => pfad.split("/").pop() ?? pfad)
    .map((name) => name.replace(/_.*$/, "").replace(/\.sql$/, ""))
    .filter((version) => /^\d+$/.test(version))
    // Der Ausgangsstand traegt lauter Nullen und steht in der Datenbank als
    // eigene Version; er zaehlt mit.
    .sort();
}

/** Welche Migrationen dieses Programm erwartet, die Datenbank aber nicht kennt. */
export function fehlendeMigrationen(erwartet: string[], eingespielt: string[]): string[] {
  const da = new Set(eingespielt.map((v) => v.replace(/^0+(?=\d)/, "")));
  return erwartet.filter((v) => !da.has(v.replace(/^0+(?=\d)/, "")));
}

const zahl = (wert: unknown): number => (typeof wert === "number" ? wert : 0);

/**
 * Der Stand als Liste.
 *
 * `erwartet` sind die Migrationen dieses Programmstands; sie kommen aus dem
 * Build, nicht aus der Datenbank — sonst verglichen wir die Datenbank mit sich
 * selbst.
 */
export function schritte(befund: Befund, erwartet: string[] = []): Schritt[] {
  const db = befund.datenbank ?? {};
  const verein = db.verein ?? {};
  const secrets = befund.secrets ?? {};
  const seiten = db.seiten ?? {};
  const eingespielt = db.migrationen ?? [];

  const fehlend = fehlendeMigrationen(erwartet, eingespielt);
  const liste: Schritt[] = [];

  liste.push({
    id: "datenbank",
    titel: "Datenbank eingerichtet",
    pflicht: true,
    ampel: zahl(db.module) > 0 ? (fehlend.length === 0 ? "gut" : "teilweise") : "fehlt",
    text:
      zahl(db.module) === 0
        ? "Die Datenbank antwortet, aber es steht noch nichts darin."
        : fehlend.length === 0
          ? `Alle ${eingespielt.length} Migrationen sind eingespielt.`
          : `${fehlend.length} von ${erwartet.length} Migrationen fehlen noch.`,
    todo:
      zahl(db.module) === 0
        ? `Actions → „Supabase ausrollen" starten: Der Ausgangsstand ist noch nicht eingespielt.`
        : fehlend.length > 0
          ? `Actions → „Supabase ausrollen" starten. Es fehlt: ${fehlend.slice(0, 3).join(", ")}${fehlend.length > 3 ? " und weitere" : ""}.`
          : undefined,
  });

  liste.push({
    id: "zugang",
    titel: "Erster Zugang",
    pflicht: true,
    ampel: zahl(db.rollen_vergeben) > 0 ? "gut" : "fehlt",
    text:
      zahl(db.rollen_vergeben) > 0
        ? `${zahl(db.mitglieder)} Konten, ${zahl(db.rollen_vergeben)} mit einer Rolle.`
        : "Es hat noch niemand eine Rolle — ohne die kommt niemand in die Verwaltung.",
    todo: zahl(db.rollen_vergeben) > 0 ? undefined : "Über /einrichtung den ersten Zugang anlegen.",
    fehlendeSecrets: zahl(db.rollen_vergeben) > 0 ? undefined : secrets.einrichtung,
  });

  // Was fehlt, hängt an der Organisationsform: Eine Interessengemeinschaft
  // hat keine Registernummer und keinen Vorstand im Rechtssinn. Sie danach zu
  // fragen, hiesse ihr zu sagen, sie sei die falsche Art von Gruppe.
  const art = form(verein.org_form);
  const vereinFehlt = [
    verein.name ? null : "Name",
    verein.anschrift ? null : "Anschrift",
    verein.email ? null : "E-Mail",
    art.vorstand && !verein.vorstand ? art.leitung : null,
    art.register && !verein.register ? "Registergericht und -nummer" : null,
  ].filter(Boolean) as string[];

  liste.push({
    id: "verein",
    titel: "Vereinsdaten",
    pflicht: true,
    ampel: vereinFehlt.length === 0 ? "gut" : vereinFehlt.length >= 3 ? "fehlt" : "teilweise",
    text:
      vereinFehlt.length === 0
        ? `Eingetragen als „${verein.name}" — ${art.label}.`
        : `Es fehlt: ${vereinFehlt.join(", ")}. Daraus bauen sich Impressum, Mails und der Aufnahmeantrag.`,
    todo: vereinFehlt.length === 0 ? undefined : "Verwaltung → Erscheinungsbild ausfüllen.",
    ziel: "erscheinungsbild",
  });

  const mailWeg = verein.mail_weg === "smtp" ? "SMTP" : "Microsoft 365";
  const mailFehlt = secrets.mail ?? [];
  liste.push({
    id: "mail",
    titel: "Mailversand",
    pflicht: true,
    ampel: mailFehlt.length === 0 ? (verein.absender ? "gut" : "teilweise") : "fehlt",
    text:
      mailFehlt.length > 0
        ? `Eingestellt ist ${mailWeg}, aber die Zugangsdaten fehlen. Solange steht bei jeder Einladung der Link zum Weitergeben.`
        : verein.absender
          ? `${mailWeg}, Absender ${verein.absender}. Der Probeversand zeigt, ob es wirklich rausgeht.`
          : `${mailWeg} ist eingerichtet, es fehlt nur die Absenderadresse.`,
    todo:
      mailFehlt.length > 0
        ? "Die Secrets in Supabase unter Edge Functions eintragen, dann hier den Probeversand starten."
        : "Probeversand unter Verwaltung → Erscheinungsbild.",
    fehlendeSecrets: mailFehlt,
    ziel: "erscheinungsbild",
  });

  liste.push({
    id: "seiten",
    titel: "Öffentliche Seiten",
    pflicht: true,
    ampel: seiten.impressum && seiten.datenschutz && seiten.startseite ? "gut" : "teilweise",
    text:
      seiten.impressum && seiten.datenschutz
        ? "Startseite, Impressum und Datenschutz sind veröffentlicht."
        : "Impressum oder Datenschutz fehlt — ohne die beiden ist die Seite abmahnfähig.",
    todo:
      seiten.impressum && seiten.datenschutz && seiten.startseite
        ? undefined
        : "Verwaltung → Seiten: die fehlende Seite anlegen und veröffentlichen.",
    ziel: "sitepages",
  });

  const ablageSharePoint = verein.ablage === "sharepoint";
  const ablageFehlt = secrets.sharepoint ?? [];
  liste.push({
    id: "ablage",
    titel: "Dateiablage",
    pflicht: false,
    ampel: !ablageSharePoint ? "gut" : ablageFehlt.length === 0 && verein.sharepoint_site ? "gut" : "teilweise",
    text: !ablageSharePoint
      ? "Dateien liegen bei Supabase. Das reicht, solange keine Datei grösser als 50 MB ist."
      : ablageFehlt.length === 0 && verein.sharepoint_site
        ? "Dateien liegen in SharePoint."
        : "SharePoint ist gewählt, die Einrichtung ist aber noch nicht fertig.",
    todo:
      ablageSharePoint && (ablageFehlt.length > 0 || !verein.sharepoint_site)
        ? "Verwaltung → Erscheinungsbild → Dateiablage: Anleitung Schritt für Schritt."
        : undefined,
    fehlendeSecrets: ablageFehlt,
    ziel: "erscheinungsbild",
  });

  const pushFehlt = secrets.push ?? [];
  liste.push({
    id: "push",
    titel: "Benachrichtigungen auf dem Handy",
    pflicht: false,
    ampel: pushFehlt.length === 0 ? "gut" : "teilweise",
    text:
      pushFehlt.length === 0
        ? "Die Schlüssel für Push-Nachrichten sind hinterlegt."
        : "Ohne Push-Schlüssel gibt es Benachrichtigungen nur per Mail. Das ist keine Bremse für den Start.",
    todo: pushFehlt.length === 0 ? undefined : "Schlüssel mit `node scripts/vapid-keys.mjs` erzeugen und als Secrets eintragen.",
    fehlendeSecrets: pushFehlt,
  });

  const sicherungFehlt = secrets.sicherung ?? [];
  liste.push({
    id: "sicherung",
    titel: "Tägliche Sicherung",
    pflicht: true,
    ampel: sicherungFehlt.length === 0 ? "gut" : "fehlt",
    text:
      sicherungFehlt.length === 0
        ? "Die Sicherung kann laufen — ob sie es tut, steht bei Actions."
        : "Ohne Token läuft keine Sicherung. Das merkt man erst, wenn man sie braucht.",
    todo: sicherungFehlt.length === 0 ? undefined : "BACKUP_TOKEN erzeugen und in Supabase und GitHub hinterlegen.",
    fehlendeSecrets: sicherungFehlt,
  });

  liste.push({
    id: "adresse",
    titel: "Web-Adresse",
    pflicht: true,
    ampel: befund.seitenadresse || verein.web ? "gut" : "fehlt",
    text:
      befund.seitenadresse || verein.web
        ? `Links in Mails zeigen auf ${befund.seitenadresse || verein.web}.`
        : "Es ist keine Adresse hinterlegt. Einladungslinks zeigen dann ins Leere.",
    todo:
      befund.seitenadresse || verein.web
        ? undefined
        : "Verwaltung → Erscheinungsbild: Website eintragen, oder SITE_URL setzen.",
    ziel: "erscheinungsbild",
  });

  return liste;
}

/** Wie weit die Installation ist: fertig, wenn alles Pflichtige grün ist. */
export function fortschritt(liste: Schritt[]): { fertig: number; gesamt: number; offen: Schritt[] } {
  const pflicht = liste.filter((s) => s.pflicht);
  const offen = pflicht.filter((s) => s.ampel !== "gut");
  return { fertig: pflicht.length - offen.length, gesamt: pflicht.length, offen };
}
