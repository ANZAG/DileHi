import {
  Anleitung, Geheimnis, Geheimnisse, Liste, MANDANT_HINWEIS, SecretsOrt, Schritt,
} from "./anleitung/Bausteine";

/**
 * Was jemand tun muss, damit der Mailversand läuft.
 *
 * Die Zugangsdaten gehören nicht in die Einstellungen – die Tabelle ist für
 * jedes Mitglied lesbar, und die tägliche Sicherung schreibt sie nach GitHub.
 * Sie stehen als Secrets bei Supabase. Nur weiss das niemand, der zum ersten
 * Mal hier sitzt, und ohne die Namen der Secrets sucht man sich dumm.
 *
 * Aufgebaut wie die Anleitung zur Dateiablage (SharePointAnleitung.tsx), mit
 * denselben Bausteinen: Wer das eine eingerichtet hat, erkennt beim anderen
 * jeden Schritt wieder, und die Verzeichnis-ID heisst in beiden gleich.
 */
export default function MailAnleitung({ weg }: { weg: string }) {
  return weg === "microsoft_graph" ? <Microsoft365 /> : <Smtp />;
}

function Microsoft365() {
  return (
    <Anleitung titel="Microsoft 365 einrichten – Schritt für Schritt">
      <p className="text-muted-foreground">
        Sinnvoll, wenn ihr ohnehin Microsoft 365 habt. Mails gehen dann aus einem echten Postfach
        heraus und landen seltener im Spam. Einmalig, etwa zwanzig Minuten, mit dem Konto, mit dem ihr
        Benutzer und Lizenzen verwaltet.
      </p>
      <p className="text-muted-foreground">
        Ist die Dateiablage schon über SharePoint eingerichtet, kennst du Schritt 2 und 3 bereits. Der
        Mailversand bekommt trotzdem einen eigenen Zugang mit eigenem Passwort: Ein verlorenes Passwort soll
        nicht beides öffnen.
      </p>

      <Schritt nummer={1} titel="Ein Postfach für den Versand bestimmen">
        <Liste>
          <li>
            Aus welchem Postfach sollen die Mails kommen, etwa <b>vorstand@verein.de</b>? Es muss ein echtes
            Postfach in eurem Microsoft 365 sein – ein eigenes oder ein freigegebenes. Eine blosse
            Weiterleitung reicht nicht.
          </li>
          <li>Trag diese Adresse unten als <b>Absenderadresse</b> ein.</li>
        </Liste>
      </Schritt>

      <Schritt nummer={2} titel="DING einen Zugang zum Mailen geben">
        <Liste>
          <li>Öffne <b>entra.microsoft.com</b> und melde dich an.</li>
          <li>Links <b>Anwendungen</b> → <b>App-Registrierungen</b> → oben <b>Neue Registrierung</b>.</li>
          <li>Name: „DING Mailversand". Alles andere so lassen und <b>Registrieren</b> klicken.</li>
          <li>
            Auf der Übersicht stehen die <b>Anwendungs-ID (Client)</b> und die <b>Verzeichnis-ID (Mandant)</b>.
            Beide brauchst du in Schritt 5.
          </li>
        </Liste>
      </Schritt>

      <Schritt nummer={3} titel="Ein Passwort für DING erzeugen">
        <Liste>
          <li>Links <b>Zertifikate &amp; Geheimnisse</b> → <b>Neuer geheimer Clientschlüssel</b>.</li>
          <li>Beschreibung „DING", Ablauf <b>24 Monate</b>, dann <b>Hinzufügen</b>.</li>
          <li>
            In der Spalte <b>Wert</b> steht jetzt ein langes Passwort. Sofort kopieren – Microsoft zeigt es nur
            dieses eine Mal. Nicht verwechseln mit der „Geheimnis-ID" daneben.
          </li>
          <li>Den Ablauftag in den Kalender eintragen. Danach gehen keine Mails mehr raus, bis ein neues Passwort da ist.</li>
        </Liste>
      </Schritt>

      <Schritt nummer={4} titel="DING erlauben, Mails zu verschicken">
        <Liste>
          <li>Links <b>API-Berechtigungen</b> → <b>Berechtigung hinzufügen</b> → <b>Microsoft Graph</b>.</li>
          <li>Wähle <b>Anwendungsberechtigungen</b> (nicht „Delegierte").</li>
          <li>Ins Suchfeld „Mail.Send" tippen, Häkchen setzen, <b>Berechtigungen hinzufügen</b>.</li>
          <li>
            Zurück in der Liste auf <b>Administratorzustimmung für … erteilen</b> und <b>Ja</b>. In der Spalte
            Status steht jetzt ein grüner Haken.
          </li>
        </Liste>
        <p className="text-xs text-muted-foreground">
          Gut zu wissen: Dieses Recht gilt zunächst für jedes Postfach eurer Organisation. Wer es auf das eine
          Postfach aus Schritt 1 begrenzen möchte, kann das in Exchange Online einstellen – das erledigt am
          besten jemand, der Exchange kennt. Nötig ist es nicht.
        </p>
      </Schritt>

      <Schritt nummer={5} titel="Die Zugangsdaten bei Supabase hinterlegen">
        <SecretsOrt />
        <Geheimnisse>
          <Geheimnis name="MS_TENANT_ID" wert={MANDANT_HINWEIS} />
          <Geheimnis name="MS_CLIENT_ID" wert="die Anwendungs-ID aus Schritt 2" />
          <Geheimnis name="MS_CLIENT_SECRET" wert="das Passwort aus Schritt 3" />
          <Geheimnis
            name="MS_SENDER_EMAIL"
            wert="freiwillig: das Postfach aus Schritt 1. Ohne diesen Eintrag gilt die Absenderadresse aus diesem Formular."
          />
        </Geheimnisse>
      </Schritt>

      <Schritt nummer={6} titel="Prüfen">
        <Liste>
          <li>Oben als Versandweg <b>Microsoft 365</b> wählen, die Absenderadresse eintragen und unten <b>Speichern</b>.</li>
          <li>Dann <b>Probeversand an mich</b>. Die Mail geht an die Adresse, mit der du angemeldet bist.</li>
        </Liste>
        <div className="rounded-md border bg-background p-3 space-y-1">
          <p><b className="text-green-700">Verschickt</b> – geschafft. Schau auch in den Spam-Ordner.</p>
          <p><b className="text-destructive">Access denied</b> – In Schritt 4 fehlt die Zustimmung (der grüne Haken).</p>
          <p><b className="text-destructive">Mailbox / ResourceNotFound</b> – Die Absenderadresse ist kein Postfach.</p>
          <p><b className="text-destructive">invalid_client</b> – Passwort oder Anwendungs-ID in Schritt 5 vertippt.</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Der Absendername ändert nur die Anzeige. Verschickt wird immer aus dem Postfach aus Schritt 1; eine
          fremde Absenderadresse verlangt in Microsoft 365 gesonderte Rechte.
        </p>
      </Schritt>
    </Anleitung>
  );
}

function Smtp() {
  return (
    <Anleitung titel="SMTP einrichten – Schritt für Schritt">
      <p className="text-muted-foreground">
        Der einfache Weg: Es reicht, was jeder Mailanbieter mitgibt. Einmalig, etwa zehn Minuten.
      </p>

      <Schritt nummer={1} titel="Ein Postfach für den Versand anlegen">
        <Liste>
          <li>
            Leg beim Mailanbieter ein eigenes Postfach an, etwa <b>noreply@verein.de</b>. Ein eigenes, damit ein
            geändertes Passwort nicht die halbe Website lahmlegt.
          </li>
          <li>Trag diese Adresse unten als <b>Absenderadresse</b> ein.</li>
        </Liste>
      </Schritt>

      <Schritt nummer={2} titel="Die Zugangsdaten beim Anbieter heraussuchen">
        <p className="text-muted-foreground">
          Sie stehen in der Hilfe des Anbieters, meist unter „SMTP", „Postausgangsserver" oder „E-Mail-Programm
          einrichten". Du brauchst vier Angaben:
        </p>
        <Liste>
          <li>die Serveradresse für ausgehende Mails, etwa <code>smtp.anbieter.de</code></li>
          <li>den Port – meist <b>587</b>, manchmal <b>465</b></li>
          <li>den Benutzernamen, oft die Mailadresse selbst</li>
          <li>das Passwort des Postfachs</li>
        </Liste>
      </Schritt>

      <Schritt nummer={3} titel="Die Zugangsdaten bei Supabase hinterlegen">
        <SecretsOrt />
        <Geheimnisse>
          <Geheimnis name="SMTP_HOST" wert="die Serveradresse" />
          <Geheimnis name="SMTP_PORT" wert="587 oder 465. Ohne Eintrag wird 587 benutzt." />
          <Geheimnis name="SMTP_USER" wert="der Benutzername" />
          <Geheimnis name="SMTP_PASSWORD" wert="das Passwort" />
        </Geheimnisse>
        <p className="text-xs text-muted-foreground">
          Das Passwort gehört dorthin und nicht in dieses Formular: Die tägliche Sicherung schreibt alle
          Einstellungen nach GitHub, und ein hier eingetragenes Passwort läge in jeder Sicherungsdatei.
        </p>
      </Schritt>

      <Schritt nummer={4} titel="Prüfen">
        <Liste>
          <li>Oben als Versandweg <b>SMTP</b> wählen, die Absenderadresse eintragen und unten <b>Speichern</b>.</li>
          <li>Dann <b>Probeversand an mich</b>. Die Meldung des Mailservers steht danach im Klartext da.</li>
        </Liste>
        <div className="rounded-md border bg-background p-3 space-y-1">
          <p><b className="text-green-700">Verschickt</b> – geschafft. Schau auch in den Spam-Ordner.</p>
          <p><b className="text-destructive">535 Authentication</b> – Benutzername oder Passwort stimmen nicht.</p>
          <p><b className="text-destructive">Zeitüberschreitung</b> – Serveradresse oder Port stimmen nicht.</p>
          <p><b className="text-destructive">Sender rejected</b> – Der Anbieter erlaubt nur die Adresse des eigenen Postfachs.</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Bleibt die Absenderadresse leer, wird der Benutzername als Absender genommen.
        </p>
      </Schritt>
    </Anleitung>
  );
}
