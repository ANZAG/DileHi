import { useState } from "react";
import {
  Anleitung, Eingabe, Geheimnis, Geheimnisse, Kopierfeld, Liste, MANDANT_HINWEIS, SecretsOrt, Schritt,
} from "./anleitung/Bausteine";

/**
 * Die Einrichtung von SharePoint, für Leute, die das einmal im Leben machen.
 *
 * Die erste Fassung war für Admins geschrieben: „App registrieren",
 * „Anwendungsberechtigung Sites.Selected", „im Graph Explorer freigeben".
 * Wer eine Vereinsseite betreut, kennt Microsoft 365 vom Benutzen, nicht vom
 * Einrichten. Deshalb hier jeder Klick in der Reihenfolge, in der er kommt,
 * und die Texte zum Einfügen fertig ausgefüllt – aus der Adresse, die oben
 * schon steht, und aus zwei Werten, die man unterwegs hier einträgt. Diese
 * beiden Werte werden nirgends gespeichert; sie füllen nur die Texte.
 *
 * Gleicher Aufbau wie die Anleitung zum Mailversand (MailAnleitung.tsx):
 * Beide verbinden DING mit derselben Organisation und teilen sich die
 * Verzeichnis-ID.
 */
export default function SharePointAnleitung({ siteUrl }: { siteUrl: string }) {
  const [appId, setAppId] = useState("");
  const [siteId, setSiteId] = useState("");

  let abfrage = "https://graph.microsoft.com/v1.0/sites/beispiel.sharepoint.com:/sites/Ablage";
  try {
    const adresse = new URL(siteUrl.trim());
    if (adresse.hostname.endsWith(".sharepoint.com")) {
      abfrage = `https://graph.microsoft.com/v1.0/sites/${adresse.hostname}:${adresse.pathname.replace(/\/+$/, "")}`;
    }
  } catch {
    // Noch keine gültige Adresse eingetragen – dann bleibt das Beispiel stehen.
  }

  const freigabeAdresse =
    `https://graph.microsoft.com/v1.0/sites/${siteId.trim() || "KENNUNG-DER-WEBSITE"}/permissions`;
  const freigabe = JSON.stringify(
    {
      roles: ["write"],
      grantedToIdentities: [
        { application: { id: appId.trim() || "ANWENDUNGS-ID", displayName: "DING Dateiablage" } },
      ],
    },
    null,
    2
  );

  return (
    <Anleitung titel="SharePoint einrichten – Schritt für Schritt">
      <p className="text-muted-foreground">
        Einmalig, etwa eine halbe Stunde. Du brauchst das Microsoft-365-Konto, mit dem ihr Benutzer und
        Lizenzen verwaltet. Geh die Schritte der Reihe nach durch – jeder baut auf dem vorigen auf.
      </p>
      <p className="text-muted-foreground">
        Läuft der Mailversand schon über Microsoft 365, kennst du Schritt 2 bis 4 bereits. Die Dateiablage
        bekommt trotzdem einen eigenen Zugang mit eigenem Passwort: Ein verlorenes Passwort soll nicht
        beides öffnen.
      </p>

      <Schritt nummer={1} titel="Eine Ablage in SharePoint anlegen">
        <Liste>
          <li>Öffne <b>office.com</b>, melde dich an und wähle im Menü links <b>SharePoint</b>.</li>
          <li>Klicke oben links auf <b>+ Website erstellen</b> und dann auf <b>Teamwebsite</b>.</li>
          <li>Name: „Ablage". Bei Datenschutz <b>Privat</b> wählen. Fertigstellen.</li>
          <li>
            Die neue Website öffnet sich. Kopiere die Adresse aus der Adresszeile des Browsers bis einschliesslich
            „Ablage" und füge sie oben ins Feld <b>Adresse der SharePoint-Website</b> ein.
          </li>
        </Liste>
      </Schritt>

      <Schritt nummer={2} titel="DING einen eigenen Zugang geben">
        <p className="text-muted-foreground">
          So wie jedes Mitglied ein Konto hat, bekommt auch DING eines. Bei Microsoft heisst das
          „App-Registrierung".
        </p>
        <Liste>
          <li>Öffne <b>entra.microsoft.com</b> und melde dich mit demselben Konto an.</li>
          <li>Links <b>Anwendungen</b> → <b>App-Registrierungen</b> → oben <b>Neue Registrierung</b>.</li>
          <li>Name: „DING Dateiablage". Alles andere so lassen und <b>Registrieren</b> klicken.</li>
          <li>
            Du landest auf einer Übersicht. Lass sie offen: Dort stehen die <b>Anwendungs-ID (Client)</b> und die{" "}
            <b>Verzeichnis-ID (Mandant)</b>. Beide brauchst du später.
          </li>
        </Liste>
        <Eingabe
          label="Die Anwendungs-ID hier einfügen – dann sind die Texte in Schritt 5 schon fertig ausgefüllt."
          wert={appId}
          setze={setAppId}
          beispiel="etwa 29a2fb67-433c-4328-…"
        />
      </Schritt>

      <Schritt nummer={3} titel="Ein Passwort für DING erzeugen">
        <Liste>
          <li>Links in der App-Registrierung: <b>Zertifikate &amp; Geheimnisse</b> → <b>Neuer geheimer Clientschlüssel</b>.</li>
          <li>Beschreibung „DING", Ablauf <b>24 Monate</b>, dann <b>Hinzufügen</b>.</li>
          <li>
            In der Spalte <b>Wert</b> steht jetzt ein langes Passwort. Kopiere es sofort und leg es sicher ab –
            Microsoft zeigt es nur dieses eine Mal. Nicht verwechseln mit der „Geheimnis-ID" daneben.
          </li>
          <li>
            Trag dir den Ablauftag in den Kalender. Danach braucht es ein neues Passwort, sonst funktioniert die
            Ablage nicht mehr.
          </li>
        </Liste>
      </Schritt>

      <Schritt nummer={4} titel="DING erlauben, eine Website zu benutzen">
        <p className="text-muted-foreground">
          Das Recht heisst „Sites.Selected" und bedeutet: DING darf zunächst gar nichts. Welche Website es
          benutzen darf, legst du im nächsten Schritt fest – nur diese eine, nicht euren übrigen SharePoint.
        </p>
        <Liste>
          <li>Links <b>API-Berechtigungen</b> → <b>Berechtigung hinzufügen</b> → <b>Microsoft Graph</b>.</li>
          <li>Wähle <b>Anwendungsberechtigungen</b> (nicht „Delegierte").</li>
          <li>Ins Suchfeld „Sites.Selected" tippen, Häkchen setzen, <b>Berechtigungen hinzufügen</b>.</li>
          <li>
            Zurück in der Liste auf <b>Administratorzustimmung für … erteilen</b> und <b>Ja</b>. In der Spalte
            Status steht jetzt ein grüner Haken.
          </li>
        </Liste>
      </Schritt>

      <Schritt nummer={5} titel="Die Website für DING freigeben">
        <p className="text-muted-foreground">
          Der einzige Schritt, der nach Programmieren aussieht. Du musst nichts selbst schreiben: Alles zum
          Einfügen steht hier, mit einem Knopf zum Kopieren.
        </p>
        <Liste>
          <li>
            Öffne <b>developer.microsoft.com/graph/graph-explorer</b> und melde dich oben rechts mit demselben
            Konto an.
          </li>
          <li>
            Über dem grossen Textfeld: <b>Berechtigungen ändern</b> (englisch „Modify permissions"). Such
            „Sites.FullControl.All" und klicke <b>Zustimmen</b>. Das erlaubt nur dir hier im Graph Explorer,
            Freigaben zu setzen – DING bekommt dadurch nichts.
          </li>
          <li>
            Links neben dem Adressfeld steht <b>GET</b>, das bleibt so. Ins Adressfeld kommt:
            <Kopierfeld text={abfrage} />
            Dann <b>Abfrage ausführen</b>.
          </li>
          <li>
            Unten erscheint die Antwort. Such die Zeile, die mit <code>"id":</code> beginnt, und kopiere den Text
            in den Anführungszeichen dahinter. Er fängt mit eurer SharePoint-Adresse an und enthält zwei Kommas.
            <Eingabe
              label="Diese Kennung hier einfügen:"
              wert={siteId}
              setze={setSiteId}
              beispiel="verein.sharepoint.com,79a8f311-…,f2598120-…"
            />
          </li>
          <li>
            Jetzt <b>zuerst</b> links GET auf <b>POST</b> umstellen und erst danach etwas einfügen – andersherum
            verschluckt der Graph Explorer den Text und meldet „Empty Payload". Ins Adressfeld:
            <Kopierfeld text={freigabeAdresse} />
          </li>
          <li>
            Darunter im Reiter <b>Anforderungstext</b> (englisch „Request body") einfügen:
            <Kopierfeld text={freigabe} mehrzeilig />
            Dann <b>Abfrage ausführen</b>.
          </li>
        </Liste>
        <div className="rounded-md border bg-background p-3 space-y-1">
          <p><b className="text-green-700">201 Created</b> – geschafft.</p>
          <p><b className="text-destructive">403</b> – In Schritt 4 fehlt die Zustimmung (der grüne Haken).</p>
          <p><b className="text-destructive">401</b> – Bei „Berechtigungen ändern" fehlt die Zustimmung.</p>
          <p><b className="text-destructive">400 Empty Payload</b> – Erst POST wählen, dann den Text einfügen.</p>
        </div>
      </Schritt>

      <Schritt nummer={6} titel="Die Zugangsdaten bei Supabase hinterlegen">
        <SecretsOrt />
        <Geheimnisse>
          <Geheimnis name="MS_TENANT_ID" wert={MANDANT_HINWEIS} />
          <Geheimnis name="SHAREPOINT_CLIENT_ID" wert="die Anwendungs-ID aus Schritt 2" />
          <Geheimnis name="SHAREPOINT_CLIENT_SECRET" wert="das Passwort aus Schritt 3" />
        </Geheimnisse>
      </Schritt>

      <Schritt nummer={7} titel="Prüfen und umschalten">
        <Liste>
          <li>Hier oben auf <b>Verbindung prüfen</b>.</li>
          <li>
            Grün: <b>SharePoint</b> auswählen und unten <b>Speichern</b>. Ab jetzt landen neue Dateien dort, und
            unter Mitgliederbereich erscheint der <b>Eingangskorb</b>.
          </li>
          <li>Rot: Die Meldung sagt, was fehlt. Meistens ist es Schritt 5 oder ein Tippfehler in Schritt 6.</li>
        </Liste>
      </Schritt>
    </Anleitung>
  );
}
