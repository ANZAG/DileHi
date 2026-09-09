/**
 * Erzeugt Impressum und Datenschutzerklärung als Editor-Seiten.
 *
 * Grundlage ist die Vorlage des kostenlosen Datenschutz-Generators von
 * Dr. Thomas Schwenke, ergänzt um die Abschnitte, die unsere Anwendung
 * tatsächlich braucht und die eine Vorlage nicht kennen kann: Forum,
 * Benachrichtigungen samt Push, Veranstaltungsanmeldungen, Beiträge mit
 * Beitragsstand, Abstimmungen, Darstellungen, Datensicherung.
 *
 * WICHTIG: Das ist ein Entwurf. Er beschreibt vollständig, was die Anwendung
 * verarbeitet – das ist der Teil, den nur wir wissen können. Die rechtliche
 * Bewertung und Freigabe gehört zu einem Anwalt oder zum Generator selbst.
 *
 * Die Namensnennung des Generators am Ende muss stehen bleiben: Die kostenlose
 * Fassung ist an diese Bedingung geknüpft.
 *
 *   node scripts/rechtstexte.mjs
 */
import { writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const baustein = (type, props) => ({ type, props: { id: `${type}-${randomUUID().slice(0, 8)}`, ...props } });

/** Ein Textabschnitt mit Überschrift und Absätzen. */
function text(inhalt, { oben = "klein", unten = "keiner" } = {}) {
  return baustein("Textabschnitt", {
    inhalt, breite: "schmal",
    abstandOben: oben, abstandUnten: unten,
    textfarbe: "standard", hintergrund: "keine",
  });
}

const p = (...absaetze) => absaetze.map((a) => `<p>${a}</p>`).join("");
const ul = (...punkte) => `<ul>${punkte.map((x) => `<li>${x}</li>`).join("")}</ul>`;
const h2 = (t) => `<h2>${t}</h2>`;
const h3 = (t) => `<h3>${t}</h3>`;

/**
 * Ein Verarbeitungs-Abschnitt in der Form, die der Generator benutzt.
 * Gleiche Struktur überall macht das Dokument lesbar und zeigt Lücken.
 */
function verarbeitung({ titel, einleitung, daten, personen, zwecke, grundlagen, weiteres }) {
  return (
    h2(titel) +
    p(...einleitung) +
    ul(
      `<strong>Verarbeitete Datenarten:</strong> ${daten}`,
      `<strong>Betroffene Personen:</strong> ${personen}`,
      `<strong>Zwecke der Verarbeitung:</strong> ${zwecke}`,
      `<strong>Aufbewahrung und Löschung:</strong> Löschung entsprechend den Angaben im Abschnitt „Allgemeine Informationen zur Datenspeicherung und Löschung“.`,
      `<strong>Rechtsgrundlagen:</strong> ${grundlagen}`
    ) +
    (weiteres ? `<p><strong>Weitere Hinweise:</strong></p>${ul(...weiteres)}` : "")
  );
}

// ── Impressum ───────────────────────────────────────────────────────────────

const impressum = [
  baustein("Ueberschrift", {
    text: "Impressum", groesse: "gross", ausrichtung: "links",
    breite: "schmal", abstandOben: "weit", abstandUnten: "keiner",
    textfarbe: "standard", hintergrund: "keine",
  }),

  // Die Pflichtangaben kommen aus den Vereinsdaten, nicht aus dem Text.
  baustein("Vereinsangaben", {
    zweck: "impressum", ueberschrift: "",
    breite: "schmal", abstandOben: "klein", abstandUnten: "keiner",
  }),

  text(
    h2("Verbraucherstreitbeilegung") +
    p(
      "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: " +
      '<a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noreferrer">https://ec.europa.eu/consumers/odr/</a>. ' +
      "Unsere E-Mail-Adresse finden Sie oben.",
      "Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen."
    ) +
    h2("Haftung für Inhalte") +
    p(
      "Als Diensteanbieter sind wir für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. " +
      "Wir sind als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen " +
      "oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen. Verpflichtungen zur Entfernung oder " +
      "Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche " +
      "Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von " +
      "entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen."
    ) +
    h2("Haftung für Links") +
    p(
      "Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können " +
      "wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der " +
      "jeweilige Anbieter oder Betreiber der Seiten verantwortlich. Bei Bekanntwerden von Rechtsverletzungen werden wir " +
      "derartige Links umgehend entfernen."
    ) +
    h2("Urheberrecht") +
    p(
      "Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. " +
      "Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet und " +
      "als solche gekennzeichnet. Die Bildnachweise finden sich bei den jeweiligen Darstellungen.",
      'Fragen zum Datenschutz beantwortet die <a href="/datenschutz">Datenschutzerklärung</a>.'
    ) +
    // Die Formulierungen zu Haftung und Urheberrecht stammen aus der Vorlage
    // von eRecht24 – die Quellenangabe stand auch bisher unter dem Impressum
    // und bleibt.
    p(
      '<small>Quelle: <a href="https://www.e-recht24.de" target="_blank" rel="noreferrer">eRecht24</a></small>'
    ),
    { unten: "weit" }
  ),
];

// ── Datenschutzerklärung ────────────────────────────────────────────────────

const datenschutz = [
  baustein("Ueberschrift", {
    text: "Datenschutzerklärung", groesse: "gross", ausrichtung: "links",
    breite: "schmal", abstandOben: "weit", abstandUnten: "keiner",
    textfarbe: "standard", hintergrund: "keine",
  }),

  text(
    h2("Datenschutz auf einen Blick") +
    p(
      "Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn " +
      "Sie diese Website besuchen. Ausführliche Informationen finden Sie in den Abschnitten darunter."
    ) +
    h3("Wer ist verantwortlich?") +
    p("Der Verein selbst. Die Kontaktdaten stehen im Abschnitt „Verantwortlicher“.") +
    h3("Wie erfassen wir Ihre Daten?") +
    p(
      "Zum einen dadurch, dass Sie sie uns mitteilen – etwa in einem Formular. Zum anderen automatisch beim Besuch der " +
      "Website durch unsere Systeme; das sind vor allem technische Daten wie Browser, Betriebssystem und Uhrzeit des " +
      "Seitenaufrufs."
    ) +
    h3("Wofür nutzen wir Ihre Daten?") +
    p(
      "Ein Teil dient dazu, die Website fehlerfrei bereitzustellen. Der grössere Teil betrifft die Vereinsarbeit: " +
      "Mitgliederverwaltung, Beiträge, Veranstaltungen, Abstimmungen und die Zusammenarbeit im Mitgliederbereich. " +
      "Eine Analyse Ihres Nutzerverhaltens findet nicht statt."
    ) +
    h3("Welche Rechte haben Sie?") +
    p(
      "Sie haben jederzeit das Recht auf unentgeltliche Auskunft über Herkunft, Empfänger und Zweck Ihrer gespeicherten " +
      "Daten, auf Berichtigung und auf Löschung. Erteilte Einwilligungen können Sie jederzeit widerrufen. Ausserdem steht " +
      "Ihnen ein Beschwerderecht bei der Aufsichtsbehörde zu. Wenden Sie sich dazu jederzeit an uns."
    ) +
    h3("Ein Hinweis vorab") +
    p(
      "Die Datenübertragung im Internet – etwa bei der Kommunikation per E-Mail – kann Sicherheitslücken aufweisen. Ein " +
      "lückenloser Schutz der Daten vor dem Zugriff durch Dritte ist nicht möglich."
    )
  ),

  text(
    h2("Präambel") +
    p(
      "Mit der folgenden Datenschutzerklärung möchten wir Sie darüber aufklären, welche Arten Ihrer personenbezogenen Daten " +
      "(nachfolgend auch kurz als „Daten“ bezeichnet) wir zu welchen Zwecken und in welchem Umfang verarbeiten. Die " +
      "Datenschutzerklärung gilt für alle von uns durchgeführten Verarbeitungen personenbezogener Daten, sowohl im Rahmen der " +
      "Erbringung unserer Leistungen als auch insbesondere auf unserer Website und in unserem Mitgliederbereich.",
      "Die verwendeten Begriffe sind nicht geschlechtsspezifisch."
    )
  ),

  baustein("Vereinsangaben", {
    zweck: "verantwortlich", ueberschrift: "Verantwortlicher",
    breite: "schmal", abstandOben: "klein", abstandUnten: "keiner",
  }),

  text(
    h2("Übersicht der Verarbeitungen") +
    p("Die nachfolgende Übersicht fasst die Arten der verarbeiteten Daten und die Zwecke ihrer Verarbeitung zusammen.") +
    h3("Arten der verarbeiteten Daten") +
    ul(
      "Bestandsdaten (Name, Anschrift, Geburtsdatum, Kontaktangaben).",
      "Kontaktdaten (E-Mail-Adressen, Telefonnummern).",
      "Inhaltsdaten (Beiträge im Forum, Nachrichten, hochgeladene Bilder und Dateien).",
      "Vertrags- und Mitgliederdaten (Eintritts- und Austrittsdatum, Mitgliedsart, Rolle im Verein).",
      "Zahlungsdaten (Zahlungsstand des Mitgliedsbeitrags, Datum und Betrag eingegangener Zahlungen).",
      "Nutzungsdaten (aufgerufene Seiten, Lesestand im Forum, Zu- und Absagen zu Veranstaltungen).",
      "Meta-, Kommunikations- und Verfahrensdaten (IP-Adressen, Zeitangaben, Kennungen).",
      "Protokolldaten (Anmeldungen, Änderungen an Beiträgen, Abstimmungsprotokoll)."
    ) +
    h3("Kategorien betroffener Personen") +
    ul(
      "Mitglieder des Vereins.",
      "Interessenten und Antragsteller.",
      "Kommunikationspartner (Anfragen über die Website).",
      "Nutzer der Website."
    ) +
    h3("Zwecke der Verarbeitung") +
    ul(
      "Erfüllung der Pflichten aus der Mitgliedschaft.",
      "Kommunikation innerhalb des Vereins und mit Dritten.",
      "Organisations- und Verwaltungsverfahren, einschließlich Veranstaltungen und Beiträgen.",
      "Durchführung satzungsgemäßer Abstimmungen.",
      "Öffentlichkeitsarbeit und Informationszwecke.",
      "Sicherheitsmaßnahmen und Datensicherung.",
      "Bereitstellung des Onlineangebots und Nutzerfreundlichkeit."
    )
  ),

  text(
    h2("Maßgebliche Rechtsgrundlagen") +
    p("Im Folgenden erhalten Sie eine Übersicht der Rechtsgrundlagen der DSGVO, auf deren Basis wir personenbezogene Daten verarbeiten.") +
    ul(
      "<strong>Einwilligung (Art. 6 Abs. 1 S. 1 lit. a) DSGVO)</strong> – die betroffene Person hat ihre Einwilligung für einen oder mehrere bestimmte Zwecke gegeben.",
      "<strong>Vertragserfüllung und vorvertragliche Anfragen (Art. 6 Abs. 1 S. 1 lit. b) DSGVO)</strong> – die Verarbeitung ist für die Erfüllung eines Vertrags oder für vorvertragliche Maßnahmen erforderlich.",
      "<strong>Rechtliche Verpflichtung (Art. 6 Abs. 1 S. 1 lit. c) DSGVO)</strong> – die Verarbeitung ist zur Erfüllung einer rechtlichen Verpflichtung erforderlich.",
      "<strong>Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO)</strong> – die Verarbeitung ist zur Wahrung berechtigter Interessen notwendig, sofern die Interessen der betroffenen Person nicht überwiegen.",
      "<strong>Vertrag über die Mitgliedschaft (Satzung) (Art. 6 Abs. 1 S. 1 lit. b) DSGVO).</strong>"
    ) +
    p(
      "<strong>Nationale Datenschutzregelungen in Deutschland:</strong> Zusätzlich zur DSGVO gilt insbesondere das " +
      "Bundesdatenschutzgesetz (BDSG). Ferner können Landesdatenschutzgesetze zur Anwendung gelangen."
    )
  ),

  text(
    h2("Sicherheitsmaßnahmen") +
    p(
      "Wir treffen nach Maßgabe der gesetzlichen Vorgaben unter Berücksichtigung des Stands der Technik geeignete technische " +
      "und organisatorische Maßnahmen, um ein dem Risiko angemessenes Schutzniveau zu gewährleisten.",
      "Zu den Maßnahmen gehören insbesondere: Übertragung ausschließlich über TLS-verschlüsselte Verbindungen (HTTPS); " +
      "ein Rechtesystem, das den Zugriff auf Mitgliederdaten auf die Personen beschränkt, die sie für ihre Aufgabe brauchen; " +
      "eine Zugriffskontrolle auf Ebene der Datenbank, die auch bei einem Fehler in der Anwendung greift; " +
      "verschlüsselte Datensicherungen; sowie die Trennung zwischen öffentlichem Bereich und Mitgliederbereich."
    )
  ),

  text(
    h2("Übermittlung von personenbezogenen Daten") +
    p(
      "Im Rahmen unserer Verarbeitung kommt es vor, dass Daten an andere Stellen übermittelt werden. Zu den Empfängern " +
      "gehören insbesondere die von uns eingesetzten IT-Dienstleister (siehe „Hosting“ und „E-Mail-Versand“). In solchen " +
      "Fällen schließen wir Verträge zur Auftragsverarbeitung nach Art. 28 DSGVO."
    ) +
    h2("Internationale Datentransfers") +
    p(
      "Sofern wir Daten in ein Drittland außerhalb der EU beziehungsweise des EWR übermitteln, erfolgt dies im Einklang mit " +
      "den gesetzlichen Vorgaben.",
      "Für Datenübermittlungen in die USA stützen wir uns vorrangig auf das Data Privacy Framework (DPF), das durch " +
      "Angemessenheitsbeschluss der EU-Kommission vom 10.07.2023 anerkannt wurde. Zusätzlich liegen mit den jeweiligen " +
      "Anbietern Standardvertragsklauseln vor. Weitere Informationen und die Liste der zertifizierten Unternehmen finden Sie " +
      'unter <a href="https://www.dataprivacyframework.gov/" target="_blank" rel="noreferrer">https://www.dataprivacyframework.gov/</a>.',
      "Betroffen sind: der Versand von E-Mails über Microsoft 365 sowie die Ablage der verschlüsselten Datensicherung bei " +
      "GitHub. Beide Anbieter gehören zur Microsoft Corporation."
    )
  ),

  text(
    h2("Allgemeine Informationen zur Datenspeicherung und Löschung") +
    p(
      "Wir löschen personenbezogene Daten gemäß den gesetzlichen Bestimmungen, sobald die zugrundeliegenden Einwilligungen " +
      "widerrufen werden oder keine weiteren Rechtsgrundlagen für die Verarbeitung bestehen.",
      "Ausnahmen bestehen, wenn gesetzliche Pflichten eine längere Aufbewahrung erfordern. Insbesondere müssen Daten, die aus " +
      "handels- oder steuerrechtlichen Gründen aufzubewahren sind, entsprechend archiviert werden; für Unterlagen zur " +
      "Beitragsverwaltung sind das in der Regel zehn Jahre.",
      "Bei mehreren Angaben zur Aufbewahrungsdauer ist stets die längste Frist maßgeblich. Beginnt eine Frist nicht " +
      "ausdrücklich zu einem bestimmten Datum und beträgt sie mindestens ein Jahr, startet sie am Ende des Kalenderjahres, in " +
      "dem das fristauslösende Ereignis eingetreten ist."
    )
  ),

  text(
    h2("Rechte der betroffenen Personen") +
    p("Ihnen stehen nach der DSGVO verschiedene Rechte zu, die sich insbesondere aus Art. 15 bis 21 DSGVO ergeben:") +
    ul(
      "<strong>Widerspruchsrecht:</strong> Sie haben das Recht, aus Gründen, die sich aus Ihrer besonderen Situation ergeben, jederzeit gegen die Verarbeitung der Sie betreffenden personenbezogenen Daten, die aufgrund von Art. 6 Abs. 1 lit. e oder f DSGVO erfolgt, Widerspruch einzulegen.",
      "<strong>Widerrufsrecht bei Einwilligungen:</strong> Sie haben das Recht, erteilte Einwilligungen jederzeit zu widerrufen.",
      "<strong>Auskunftsrecht:</strong> Sie haben das Recht, eine Bestätigung darüber zu verlangen, ob betreffende Daten verarbeitet werden, und auf Auskunft über diese Daten sowie auf eine Kopie.",
      "<strong>Recht auf Berichtigung:</strong> Sie haben das Recht, die Vervollständigung oder Berichtigung der Sie betreffenden Daten zu verlangen.",
      "<strong>Recht auf Löschung und Einschränkung der Verarbeitung:</strong> Sie haben das Recht zu verlangen, dass Sie betreffende Daten unverzüglich gelöscht werden, beziehungsweise die Verarbeitung eingeschränkt wird.",
      "<strong>Recht auf Datenübertragbarkeit:</strong> Sie haben das Recht, Sie betreffende Daten in einem strukturierten, gängigen und maschinenlesbaren Format zu erhalten.",
      "<strong>Beschwerde bei der Aufsichtsbehörde:</strong> Sie haben das Recht auf Beschwerde bei einer Aufsichtsbehörde, insbesondere in dem Mitgliedstaat Ihres gewöhnlichen Aufenthaltsorts."
    )
  ),

  // ── Vereinsarbeit ─────────────────────────────────────────────────────────
  text(verarbeitung({
    titel: "Wahrnehmung von Aufgaben nach Satzung",
    einleitung: [
      "Wir verarbeiten die Daten unserer Mitglieder, Interessenten und sonstiger Personen, wenn wir mit ihnen in einem " +
      "Mitgliedschaftsverhältnis stehen und unsere satzungsgemäßen Aufgaben wahrnehmen.",
      "Art, Umfang und Zweck der Verarbeitung bestimmen sich nach dem zugrundeliegenden Mitgliedschaftsverhältnis.",
    ],
    daten: "Bestandsdaten; Kontaktdaten; Vertragsdaten; Mitgliederdaten; Zahlungsdaten; Inhaltsdaten.",
    personen: "Mitglieder; Interessenten; Kommunikationspartner.",
    zwecke: "Kommunikation; Organisations- und Verwaltungsverfahren; Öffentlichkeitsarbeit.",
    grundlagen: "Vertrag über die Mitgliedschaft (Satzung) (Art. 6 Abs. 1 S. 1 lit. b) DSGVO); Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO); Rechtliche Verpflichtung (Art. 6 Abs. 1 S. 1 lit. c) DSGVO).",
    weiteres: [
      "<strong>Mitgliederverwaltung:</strong> Aufnahme neuer Mitglieder über einen Online-Aufnahmeantrag, Pflege der " +
      "Mitgliederdaten, Zuordnung von Rollen und Ämtern sowie Verwaltung der Ein- und Austritte. Zum Aufnahmeantrag " +
      "erzeugen wir ein PDF, das im Verein abgelegt wird.",

      "<strong>Beitragsverwaltung:</strong> Zur Abrechnung der Mitgliedsbeiträge halten wir je Jahr fest, welcher Betrag " +
      "fällig ist und ob er beglichen wurde. Ein Lastschrifteinzug findet nicht statt; die Beiträge werden überwiesen, " +
      "Bankverbindungen der Mitglieder speichern wir deshalb nicht. Der Zahlungsstand ist nur für die Kassenführung " +
      "einsehbar. Aufbewahrung nach den handels- und steuerrechtlichen Fristen.",

      "<strong>Veranstaltungen:</strong> Planung und Durchführung von Terminen, Zu- und Absagen, Anmeldeformulare mit " +
      "den dort erhobenen Angaben (etwa Anreise, Mitfahrgelegenheiten, Verpflegung, mitgebrachte Ausrüstung) sowie die " +
      "Auswertung für die Organisation vor Ort. Anmeldungen lassen sich über einen persönlichen Link auch ohne Anmeldung " +
      "bearbeiten; dieser Link ist deshalb wie ein Passwort zu behandeln.",

      "<strong>Abstimmungen:</strong> Für Beschlüsse und Wahlen der Mitgliederversammlung führen wir ein Prüfprotokoll, " +
      "das festhält, wer an einer Abstimmung teilgenommen hat. Die Stimmabgabe selbst wird davon getrennt gespeichert. " +
      "Das Protokoll dient dem Nachweis der ordnungsgemäßen Beschlussfassung.",

      "<strong>Darstellungen (Steckbriefe):</strong> Mitglieder können ihre historische Darstellung und ihre Kenntnisse " +
      "im Mitgliederbereich hinterlegen. Eine Veröffentlichung auf der Website erfolgt nur ohne Personenbezug und nur " +
      "nach ausdrücklicher Freigabe.",

      "<strong>Mitgliederkarte:</strong> Mitglieder können ihren Wohnort freiwillig auf einer Karte anzeigen lassen, um " +
      "Fahrgemeinschaften zu verabreden. Die Anzeige erfolgt nur nach eigener Aktivierung und lässt sich jederzeit " +
      "abschalten.",
    ],
  })),

  // ── Hosting ───────────────────────────────────────────────────────────────
  text(verarbeitung({
    titel: "Bereitstellung des Onlineangebots und Hosting",
    einleitung: [
      "Wir verarbeiten die Daten der Nutzer, um ihnen unsere Online-Dienste zur Verfügung stellen zu können. Dazu " +
      "verarbeiten wir die IP-Adresse, die notwendig ist, um die Inhalte an den Browser zu übermitteln.",
    ],
    daten: "Nutzungsdaten; Meta-, Kommunikations- und Verfahrensdaten; Protokolldaten; Inhaltsdaten.",
    personen: "Nutzer (Webseitenbesucher, Nutzer des Mitgliederbereichs).",
    zwecke: "Bereitstellung des Onlineangebotes; informationstechnische Infrastruktur; Sicherheitsmaßnahmen.",
    grundlagen: "Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO).",
    weiteres: [
      "<strong>Anwendungsplattform:</strong> Die Anwendung wird über die Plattform <strong>Lovable</strong> " +
      "(GPT Engineer, Inc.) bereitgestellt. Die Server stehen in der Europäischen Union.",

      "<strong>Datenbank, Anmeldung und Dateien:</strong> Für die Speicherung der Daten – Mitgliederdaten, " +
      "Kontaktanfragen, Forenbeiträge, hochgeladene Dateien – und für die Anmeldung setzen wir " +
      "<strong>Supabase</strong> (Supabase, Inc.) ein. Die Daten liegen auf Servern in der Europäischen Union " +
      "(Frankfurt am Main).",

      "<strong>Webserver für die ausgelieferten Dateien:</strong> Die Dateien der Website liegen bei unserem Webhoster " +
      "mit Standort in Deutschland.",

      "<strong>Server-Logfiles:</strong> Der Zugriff wird protokolliert. Erfasst werden Browsertyp und -version, " +
      "verwendetes Betriebssystem, Referrer-Adresse, Hostname des zugreifenden Rechners, Uhrzeit der Serveranfrage, " +
      "übertragene Datenmenge und die IP-Adresse. Eine Zusammenführung dieser Daten mit anderen Quellen findet nicht " +
      "statt. <strong>Löschung:</strong> spätestens nach 30 Tagen, sofern nicht zu Beweiszwecken erforderlich.",

      "<strong>Datensicherung:</strong> Von der Datenbank wird täglich eine vollständige Sicherung erstellt, " +
      "verschlüsselt und als Artefakt bei GitHub abgelegt (GitHub Inc., ein Unternehmen der Microsoft Corporation, USA). " +
      "Die Sicherung enthält alle Mitgliederdaten und ist ohne das nur uns bekannte Passwort nicht lesbar. Sie wird nach " +
      "90 Tagen automatisch gelöscht. Grundlage ist unser berechtigtes Interesse an einer belastbaren Wiederherstellung.",
    ],
  })),

  // ── Konto ─────────────────────────────────────────────────────────────────
  text(verarbeitung({
    titel: "Registrierung, Anmeldung und Nutzerkonto",
    einleitung: [
      "Für den Mitgliederbereich legen wir ein Nutzerkonto an. Zu den verarbeiteten Daten gehören die Anmeldedaten " +
      "(E-Mail-Adresse und Passwort). Das Passwort wird ausschließlich als nicht rückrechenbarer Prüfwert gespeichert.",
      "Der Zugang wird durch eine Einladung des Vorstands eingerichtet; eine offene Selbstregistrierung gibt es nicht.",
      "Für die Anmeldesitzung wird der lokale Speicher des Browsers genutzt. Das ist technisch notwendig, damit die " +
      "Anmeldung zwischen Seitenaufrufen erhalten bleibt. Analyse- oder Werbe-Cookies setzen wir nicht ein; ein " +
      "Cookie-Banner ist deshalb nicht erforderlich.",
    ],
    daten: "Bestandsdaten; Kontaktdaten; Nutzungsdaten; Protokolldaten.",
    personen: "Mitglieder.",
    zwecke: "Erfüllung der Pflichten aus der Mitgliedschaft; Sicherheitsmaßnahmen.",
    grundlagen: "Vertrag über die Mitgliedschaft (Satzung) (Art. 6 Abs. 1 S. 1 lit. b) DSGVO); Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO).",
    weiteres: [
      "<strong>Profile sind nicht öffentlich:</strong> Die Profile der Mitglieder sind ausschließlich innerhalb des " +
      "Mitgliederbereichs sichtbar.",
      "<strong>Löschung nach Austritt:</strong> Nach dem Austritt werden die Daten des Nutzerkontos gelöscht, soweit " +
      "keine gesetzliche Aufbewahrungspflicht entgegensteht.",

      "<strong>Was mit erstellten Inhalten geschieht:</strong> Wird ein Konto gelöscht, bleiben von diesem Mitglied " +
      "angelegte Veranstaltungen, Ankündigungen und Formulare erhalten und werden einem anderen Mitglied zugeordnet. " +
      "Andernfalls fielen mit einem Austritt Teile der Vereinsdokumentation weg – etwa die Anmeldungen zu einem Termin, " +
      "der noch bevorsteht. Der Personenbezug zum ausgetretenen Mitglied entfällt dabei.",
    ],
  })),

  // ── Forum ─────────────────────────────────────────────────────────────────
  text(verarbeitung({
    titel: "Forum und interne Zusammenarbeit",
    einleitung: [
      "Im Mitgliederbereich steht ein Forum zur Verfügung, in dem sich Mitglieder austauschen und Veranstaltungen " +
      "absprechen. Beiträge sind ausschließlich für angemeldete Mitglieder sichtbar, im Rahmen der für die jeweilige " +
      "Rubrik vergebenen Rechte.",
      "Wir bitten darum, dort nur Daten zu veröffentlichen, deren Weitergabe innerhalb des Vereins gewollt ist.",
    ],
    daten:
      "Inhaltsdaten (Beiträge, hochgeladene Bilder, Antworten in Umfragen und Mitbringlisten); Bestandsdaten (Anzeigename); " +
      "Nutzungsdaten (Lesestand, beobachtete Themen); Protokolldaten (Zeitpunkt der Erstellung, Bearbeitungsverlauf).",
    personen: "Mitglieder.",
    zwecke: "Kommunikation; Organisations- und Verwaltungsverfahren; Bereitstellung des Onlineangebotes.",
    grundlagen: "Vertrag über die Mitgliedschaft (Satzung) (Art. 6 Abs. 1 S. 1 lit. b) DSGVO); Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO).",
    weiteres: [
      "<strong>Erwähnungen:</strong> Wird ein Mitglied in einem Beitrag mit „@“ genannt, erhält es darüber eine " +
      "Benachrichtigung. Dafür wird die Kennung des genannten Mitglieds im Beitrag gespeichert.",

      "<strong>Bearbeitungsverlauf:</strong> Wird ein Beitrag nachträglich geändert, bewahren wir die vorherige Fassung " +
      "auf. Das dient der Nachvollziehbarkeit bei Absprachen mit verbindlichem Charakter.",

      "<strong>Moderation und Löschung:</strong> Die Moderation kann Beiträge entfernen. Entfernte Beiträge bleiben als " +
      "„entfernt“ sichtbar, ihr Inhalt jedoch nicht. Auf Verlangen einer betroffenen Person löschen wir Beiträge " +
      "vollständig.",

      "<strong>Bilder in Beiträgen:</strong> Hochgeladene Bilder liegen in einem nicht öffentlichen Speicher und sind nur " +
      "über zeitlich befristete Adressen für angemeldete Mitglieder abrufbar.",

      "<strong>Absprachen zu Veranstaltungen:</strong> Zu jedem Termin kann eine Absprache angelegt werden. Wird der " +
      "Termin gelöscht, wandert die Absprache in ein Archiv und bleibt für Mitglieder lesbar.",

      "<strong>Pinnwand (Ankündigungen):</strong> Der Vorstand veröffentlicht dort Einladungen, Protokolle und " +
      "Mitteilungen. Mitglieder können darauf antworten. Verarbeitet werden der Beitragstext, der Name des Verfassers, " +
      "der Zeitpunkt sowie angehängte Dateien.",

      "<strong>Dokumente und Mitgliedsunterlagen:</strong> Satzung, Ordnungen und Berichte stehen im Mitgliederbereich " +
      "zum Abruf. Zu einzelnen Mitgliedern können ausserdem Unterlagen hinterlegt sein – etwa der unterschriebene " +
      "Aufnahmeantrag. Diese sind nur für die dafür berechtigten Ämter einsehbar.",

      "<strong>Quellensammlung:</strong> Mitglieder können Literaturangaben und Fundstellen einstellen. Dabei werden " +
      "der Eintrag und der Name des Einstellenden gespeichert.",
    ],
  })),

  // ── Benachrichtigungen ────────────────────────────────────────────────────
  text(verarbeitung({
    titel: "Benachrichtigungen und Push-Nachrichten",
    einleitung: [
      "Damit Mitglieder mitbekommen, was im Mitgliederbereich passiert, versenden wir Benachrichtigungen. Diese sind " +
      "abgestuft und lassen sich einzeln abschalten.",
    ],
    daten: "Kontaktdaten (E-Mail-Adresse); Inhaltsdaten (Betreff und Kurztext der Benachrichtigung); Meta- und Verfahrensdaten (Gerätekennung des Push-Dienstes, Zeitpunkt).",
    personen: "Mitglieder.",
    zwecke: "Kommunikation; Bereitstellung des Onlineangebotes.",
    grundlagen: "Vertrag über die Mitgliedschaft (Satzung) (Art. 6 Abs. 1 S. 1 lit. b) DSGVO); Einwilligung (Art. 6 Abs. 1 S. 1 lit. a) DSGVO) für Push-Nachrichten.",
    weiteres: [
      "<strong>Hinweise in der Anwendung:</strong> Benachrichtigungen erscheinen zunächst nur innerhalb des " +
      "Mitgliederbereichs. Dabei verlassen keine Daten den Verein.",

      "<strong>Tägliche Zusammenfassung per E-Mail:</strong> Einmal täglich versenden wir eine Sammelmail über " +
      "ungelesene Benachrichtigungen. Sie enthält Betreff und Kurztext, nicht den vollständigen Inhalt. Der Versand " +
      "lässt sich im Profil abschalten.",

      "<strong>Push-Nachrichten auf das Gerät:</strong> Wer Push-Nachrichten aktiviert, erteilt dafür eine Einwilligung " +
      "im Browser. Technisch notwendig ist dabei, dass der Browser eine Kennung („Endpunkt“) beim Push-Dienst seines " +
      "Herstellers erzeugt – je nach Browser also bei Google (Chrome, Edge), Mozilla (Firefox) oder Apple (Safari). " +
      "Diese Kennung speichern wir, um Nachrichten zustellen zu können; der Inhalt der Nachricht ist dabei " +
      "Ende-zu-Ende-verschlüsselt und für den Push-Dienst nicht lesbar. Der Dienst erfährt jedoch, dass und wann eine " +
      "Nachricht an dieses Gerät zugestellt wird. Die Einwilligung kann jederzeit im Profil oder in den " +
      "Browsereinstellungen widerrufen werden; die Kennung wird dann gelöscht.",
    ],
  })),

  // ── Kontakt ───────────────────────────────────────────────────────────────
  text(verarbeitung({
    titel: "Kontakt- und Anfrageverwaltung",
    einleitung: [
      "Bei der Kontaktaufnahme mit uns – über das Kontaktformular, das Anfrageformular für Veranstalter, per E-Mail oder " +
      "telefonisch – verarbeiten wir die Angaben der anfragenden Person, soweit dies zur Beantwortung erforderlich ist.",
    ],
    daten: "Kontaktdaten; Inhaltsdaten; Meta-, Kommunikations- und Verfahrensdaten.",
    personen: "Kommunikationspartner; Interessenten.",
    zwecke: "Kommunikation; Organisations- und Verwaltungsverfahren.",
    grundlagen: "Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO); Vertragserfüllung und vorvertragliche Anfragen (Art. 6 Abs. 1 S. 1 lit. b) DSGVO).",
    weiteres: [
      "<strong>Anfrage per E-Mail oder Telefon:</strong> Kontaktieren Sie uns unmittelbar, wird Ihre Anfrage samt aller " +
      "daraus hervorgehenden personenbezogenen Daten zum Zweck der Bearbeitung gespeichert. Diese Daten geben wir nicht " +
      "ohne Ihre Einwilligung weiter. Sie verbleiben bei uns, bis Sie zur Löschung auffordern oder der Zweck entfällt.",

      "<strong>Schutz vor automatisierten Einsendungen:</strong> Die Formulare enthalten eine einfache Rechenaufgabe und " +
      "ein für Menschen unsichtbares Feld. Beides dient allein der Abwehr automatisierter Einsendungen; eine Auswertung " +
      "des Nutzerverhaltens findet nicht statt und es werden keine Daten an Dritte übermittelt.",

      "<strong>E-Mail-Versand:</strong> Für den Versand von E-Mails aus der Anwendung – Einladungen, Passwort-Zurück­" +
      "setzung, Antworten auf Anfragen, tägliche Zusammenfassung – nutzen wir das Postfach unseres Vereins bei " +
      "Microsoft 365 (Microsoft Ireland Operations Limited; Muttergesellschaft Microsoft Corporation, USA). Dabei werden " +
      "Absender, Empfänger und Inhalt der Nachricht verarbeitet. Es besteht ein Vertrag zur Auftragsverarbeitung; für " +
      "Übermittlungen in die USA gilt das oben Gesagte.",
    ],
  })),

  // ── Eingebundene Inhalte ──────────────────────────────────────────────────
  text(verarbeitung({
    titel: "Eingebundene Funktionen und Inhalte Dritter",
    einleitung: [
      "Wir binden Funktions- und Inhaltselemente in unser Onlineangebot ein. Deren Anbieter verarbeiten dabei " +
      "notwendigerweise die IP-Adresse der Nutzer, da sie die Inhalte ohne sie nicht ausliefern könnten. Wir bemühen uns, " +
      "nur solche Inhalte einzusetzen, deren Anbieter die IP-Adresse allein zur Auslieferung verwenden – oder sie ganz zu " +
      "vermeiden.",
    ],
    daten: "Nutzungsdaten; Meta-, Kommunikations- und Verfahrensdaten.",
    personen: "Nutzer.",
    zwecke: "Bereitstellung des Onlineangebotes und Nutzerfreundlichkeit.",
    grundlagen: "Berechtigte Interessen (Art. 6 Abs. 1 S. 1 lit. f) DSGVO).",
    weiteres: [
      "<strong>Schriftarten (Bereitstellung auf eigenem Server):</strong> Die verwendeten Schriftarten liegen auf unserem " +
      "eigenen Server. Es werden keine Daten an Google oder andere Anbieter übermittelt, und es wird beim Seitenaufruf " +
      "keine Verbindung zu deren Servern aufgebaut.",

      "<strong>OpenStreetMap:</strong> Im Mitgliederbereich binden wir für die Mitgliederkarte Kartenmaterial von " +
      "OpenStreetMap ein. Anbieter ist die OpenStreetMap Foundation, vertreten durch den FOSSGIS e.V., Bundesallee 23, " +
      "10717 Berlin. Beim Anzeigen der Karte wird die IP-Adresse an den Kartenserver übermittelt. Die Karte erscheint " +
      "nur im Mitgliederbereich, nicht auf den öffentlichen Seiten. " +
      '<strong>Datenschutzerklärung:</strong> <a href="https://osmfoundation.org/wiki/Privacy_Policy" target="_blank" rel="noreferrer">https://osmfoundation.org/wiki/Privacy_Policy</a>.',
    ],
  })),

  text(
    h2("Änderung und Aktualisierung") +
    p(
      "Wir bitten Sie, sich regelmäßig über den Inhalt unserer Datenschutzerklärung zu informieren. Wir passen sie an, " +
      "sobald die Änderungen der von uns durchgeführten Datenverarbeitungen dies erforderlich machen. Wir informieren Sie, " +
      "sobald durch die Änderungen eine Mitwirkung Ihrerseits – etwa eine Einwilligung – erforderlich wird."
    ) +
    p(
      '<a href="https://datenschutz-generator.de/" target="_blank" rel="noopener noreferrer nofollow">' +
      "Erstellt mit dem kostenlosen Datenschutz-Generator.de von Dr. Thomas Schwenke</a> – ergänzt um die Abschnitte zu " +
      "Forum, Benachrichtigungen, Veranstaltungen, Beiträgen und Datensicherung."
    ),
    { unten: "weit" }
  ),
];

// ── Schreiben ───────────────────────────────────────────────────────────────

function sqlSchreiben(datei, { slug, titel, beschreibung, inhalt, kopf, noindex = false }) {
  const js = JSON.stringify({ content: inhalt, root: { props: { title: titel } } });
  if (js.includes("'")) throw new Error(`Einfache Anfuehrungszeichen in ${slug} – muessten in SQL verdoppelt werden.`);
  writeFileSync(datei, `${kopf}
INSERT INTO public.site_pages (slug, title, content, draft_content, seo_description, noindex, is_published, published_at)
VALUES (
  '${slug}',
  '${titel}',
  '${js}'::jsonb,
  '${js}'::jsonb,
  '${beschreibung}',
  ${noindex},
  true,
  now()
)
ON CONFLICT (slug) DO UPDATE
SET title = EXCLUDED.title,
    content = EXCLUDED.content,
    draft_content = EXCLUDED.draft_content,
    seo_description = EXCLUDED.seo_description,
    noindex = EXCLUDED.noindex,
    is_published = true;
`, "utf-8");
}

const kopfHinweis = (was) => `-- ${was} als Editor-Seite
--
-- Die veraenderlichen Angaben (Name, Anschrift, Vorstand, Registernummer,
-- Mailadresse) stehen NICHT in diesem Text, sondern kommen ueber den Baustein
-- "Vereinsangaben" aus den Vereinsdaten. Ein anderer Verein traegt sie einmal
-- ein und hat beide Seiten richtig, statt sie abzuschreiben und dabei eine
-- Stelle zu uebersehen.
--
-- ENTWURF: Der Text beschreibt vollstaendig, was die Anwendung verarbeitet.
-- Die rechtliche Bewertung und Freigabe gehoert zu einem Anwalt.
`;

sqlSchreiben("supabase/migrations/20260908150000_seite_impressum.sql", {
  slug: "impressum-neu",
  titel: "Impressum",
  beschreibung: "Impressum und Kontaktdaten.",
  inhalt: impressum,
  noindex: true,
  kopf: kopfHinweis("Impressum"),
});

sqlSchreiben("supabase/migrations/20260908160000_seite_datenschutz.sql", {
  slug: "datenschutz-neu",
  titel: "Datenschutzerklärung",
  beschreibung: "Informationen zur Verarbeitung personenbezogener Daten auf dieser Website und im Mitgliederbereich.",
  inhalt: datenschutz,
  noindex: true,
  kopf: kopfHinweis("Datenschutzerklaerung"),
});

const zeichen = (bl) =>
  JSON.stringify(bl).replace(/<[^>]*>/g, "").length;
console.log(`Impressum       → ${impressum.length} Bausteine, ${zeichen(impressum)} Zeichen`);
console.log(`Datenschutz     → ${datenschutz.length} Bausteine, ${zeichen(datenschutz)} Zeichen`);
