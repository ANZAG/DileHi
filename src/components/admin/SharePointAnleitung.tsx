import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Input } from "@/components/ui/input";

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
 */
export default function SharePointAnleitung({ siteUrl }: { siteUrl: string }) {
  const [appId, setAppId] = useState("");
  const [siteId, setSiteId] = useState("");

  let abfrage = "https://graph.microsoft.com/v1.0/sites/verein.sharepoint.com:/sites/Vereinsablage";
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
    <details className="rounded-lg border bg-muted/30 text-sm">
      <summary className="cursor-pointer font-medium p-3">SharePoint einrichten – Schritt für Schritt</summary>

      <div className="px-3 pb-4 space-y-5">
        <p className="text-muted-foreground">
          Einmalig, etwa eine halbe Stunde. Du brauchst das Microsoft-365-Konto, mit dem ihr Benutzer und
          Lizenzen verwaltet. Geh die Schritte der Reihe nach durch – jeder baut auf dem vorigen auf.
        </p>

        <Schritt nummer={1} titel="Eine Ablage in SharePoint anlegen">
          <Liste>
            <li>Öffne <b>office.com</b>, melde dich an und wähle im Menü links <b>SharePoint</b>.</li>
            <li>Klicke oben links auf <b>+ Website erstellen</b> und dann auf <b>Teamwebsite</b>.</li>
            <li>Name: „Vereinsablage". Bei Datenschutz <b>Privat</b> wählen. Fertigstellen.</li>
            <li>
              Die neue Website öffnet sich. Kopiere die Adresse aus der Adresszeile des Browsers bis einschliesslich
              „Vereinsablage" und füge sie oben ins Feld <b>Adresse der SharePoint-Website</b> ein.
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
          <Liste>
            <li>Öffne <b>supabase.com</b>, wähle euer Projekt und links <b>Edge Functions</b> → <b>Secrets</b>.</li>
            <li>Leg die folgenden Einträge an – links der Name, rechts der Wert:</li>
          </Liste>
          <div className="rounded-md border bg-background divide-y">
            <Geheimnis name="SHAREPOINT_CLIENT_ID" wert="die Anwendungs-ID aus Schritt 2" />
            <Geheimnis name="SHAREPOINT_CLIENT_SECRET" wert="das Passwort aus Schritt 3" />
            <Geheimnis
              name="SHAREPOINT_TENANT_ID"
              wert="die Verzeichnis-ID aus Schritt 2 – nur nötig, wenn eure E-Mails noch nicht über Microsoft 365 verschickt werden"
            />
          </div>
        </Schritt>

        <Schritt nummer={7} titel="Prüfen und umschalten">
          <Liste>
            <li>Hier oben auf <b>Verbindung prüfen</b>.</li>
            <li>Grün: <b>SharePoint</b> auswählen und <b>Speichern</b>. Ab jetzt landen neue Dateien dort.</li>
            <li>Rot: Die Meldung sagt, was fehlt. Meistens ist es Schritt 5 oder ein Tippfehler in Schritt 6.</li>
          </Liste>
        </Schritt>
      </div>
    </details>
  );
}

function Schritt({ nummer, titel, children }: { nummer: number; titel: string; children: React.ReactNode }) {
  return (
    <section className="flex gap-3">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
        {nummer}
      </span>
      <div className="min-w-0 flex-1 space-y-2">
        <h4 className="font-medium">{titel}</h4>
        {children}
      </div>
    </section>
  );
}

function Liste({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc pl-5 space-y-1.5">{children}</ul>;
}

function Eingabe({ label, wert, setze, beispiel }: {
  label: string;
  wert: string;
  setze: (v: string) => void;
  beispiel: string;
}) {
  return (
    <label className="block mt-2 space-y-1">
      <span className="block text-xs text-muted-foreground">{label}</span>
      <Input value={wert} onChange={(e) => setze(e.target.value)} placeholder={beispiel} className="h-9 bg-background" />
    </label>
  );
}

/** Ein Text zum Einfügen, mit einem Knopf, der ihn in die Zwischenablage legt. */
function Kopierfeld({ text, mehrzeilig = false }: { text: string; mehrzeilig?: boolean }) {
  const [kopiert, setKopiert] = useState(false);

  const kopieren = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setKopiert(true);
      window.setTimeout(() => setKopiert(false), 1500);
    } catch {
      // Ohne Zugriff auf die Zwischenablage bleibt der Text markierbar stehen.
    }
  };

  return (
    <div className="my-2 flex items-start gap-2 rounded-md border bg-background p-2">
      <pre className={`flex-1 min-w-0 text-xs font-mono ${mehrzeilig ? "whitespace-pre" : "whitespace-pre-wrap break-all"} overflow-x-auto`}>
        {text}
      </pre>
      <button
        type="button"
        onClick={kopieren}
        className="shrink-0 inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="In die Zwischenablage kopieren"
      >
        {kopiert ? <Check size={13} className="text-green-700" /> : <Copy size={13} />}
        {kopiert ? "Kopiert" : "Kopieren"}
      </button>
    </div>
  );
}

function Geheimnis({ name, wert }: { name: string; wert: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 p-2">
      <div className="sm:w-64 shrink-0">
        <Kopierfeld text={name} />
      </div>
      <span className="text-xs text-muted-foreground">{wert}</span>
    </div>
  );
}
