import { useBranding } from "@/hooks/useBranding";
import { abstandKlasse, breitenKlasse, type Abstand, type Breite } from "./gestaltung";

/**
 * Die Pflichtangaben aus den Vereinsdaten.
 *
 * Impressum und Datenschutzerklärung bestehen zum grössten Teil aus
 * Standardtext – und aus einer Handvoll Angaben, die bei jedem Verein andere
 * sind: Name, Anschrift, Vorstand, Registernummer, Mailadresse.
 *
 * Diesen Teil abzuschreiben ist die gefährlichste Stelle der ganzen
 * Umstellung. Wer unser Impressum als Vorlage nimmt, findet vier von fünf
 * Stellen – und ein Impressum mit einer vergessenen Stelle ist abmahnfähig.
 * Deshalb setzt die Anwendung diese Angaben ein, statt sie irgendwo im Text
 * stehen zu lassen.
 *
 * Der Standardtext drumherum bleibt gewöhnlicher Text im Editor. Was nicht
 * eingetragen ist, wird weggelassen statt leer angezeigt.
 */
export function Vereinsangaben({
  zweck, ueberschrift, breite, abstandOben, abstandUnten, abstand,
}: {
  zweck: "impressum" | "verantwortlich" | "hosting";
  ueberschrift?: string;
  breite?: Breite;
  abstandOben?: Abstand;
  abstandUnten?: Abstand;
  abstand?: Abstand;
}) {
  const b = useBranding();

  const anschrift = [
    b.org_name,
    b.org_street,
    [b.org_zip, b.org_city].filter(Boolean).join(" "),
    b.org_country && b.org_country !== "Deutschland" ? b.org_country : null,
  ].filter(Boolean);

  const zeilen: { titel?: string; werte: (string | null | undefined)[] }[] =
    zweck === "impressum"
      ? [
          { titel: "Angaben gemäß § 5 DDG", werte: anschrift },
          {
            titel: "Vereinsregister",
            werte: [b.register_court, b.register_number].filter(Boolean).length
              ? [b.register_court, b.register_number && `Registernummer: ${b.register_number}`]
              : [],
          },
          { titel: "Vertreten durch", werte: (b.board_members ?? "").split("\n").filter(Boolean) },
          {
            titel: "Kontakt",
            werte: [
              b.org_phone && `Telefon: ${b.org_phone}`,
              b.org_email && `E-Mail: ${b.org_email}`,
            ],
          },
          { titel: "Umsatzsteuer-Identifikationsnummer", werte: [b.vat_id] },
        ]
      : zweck === "verantwortlich"
        ? [
            {
              titel: "Verantwortliche Stelle im Sinne der DSGVO",
              werte: [
                ...anschrift,
                b.org_phone && `Telefon: ${b.org_phone}`,
                b.privacy_contact ?? b.org_email,
              ],
            },
            { titel: "Datenschutzbeauftragter", werte: [b.privacy_officer] },
          ]
        : [
            {
              titel: "Hosting",
              werte: [b.hosting_provider, b.hosting_address].filter(Boolean),
            },
          ];

  const sichtbar = zeilen.filter((z) => z.werte.filter(Boolean).length > 0);
  if (sichtbar.length === 0) {
    return (
      <section className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand ?? "klein")}`}>
        <p className="text-sm text-muted-foreground">
          Diese Angaben stehen noch nicht in den Vereinsdaten. Die Systemverwaltung trägt sie unter
          Verwaltung → Erscheinungsbild ein.
        </p>
      </section>
    );
  }

  return (
    <section className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand ?? "klein")}`}>
      {ueberschrift && <h2 className="font-serif text-2xl font-semibold mb-4">{ueberschrift}</h2>}
      <div className="space-y-4 text-muted-foreground leading-relaxed">
        {sichtbar.map((z, i) => (
          <div key={i}>
            {z.titel && <p className="font-semibold text-foreground">{z.titel}</p>}
            {z.werte.filter(Boolean).map((w, j) => (
              <p key={j}>{w}</p>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
