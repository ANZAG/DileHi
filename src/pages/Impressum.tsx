const Impressum = () => (
  <div className="container py-12 md:py-20 max-w-3xl">
    <h1 className="font-serif text-3xl md:text-4xl font-bold mb-8">Impressum</h1>
    <div className="prose prose-neutral max-w-none text-muted-foreground space-y-6">
      <section>
        <h2 className="font-serif text-xl font-semibold text-foreground">Angaben gemäß § 5 TMG</h2>
        <p>
          Diu lebendec Histôrje e.V.<br />
          [Straße und Hausnummer]<br />
          [PLZ] Wiesbaden
        </p>
      </section>
      <section>
        <h2 className="font-serif text-xl font-semibold text-foreground">Vertreten durch</h2>
        <p>[Vorstand / Vertretungsberechtigte Person(en)]</p>
      </section>
      <section>
        <h2 className="font-serif text-xl font-semibold text-foreground">Registereintrag</h2>
        <p>
          Eingetragen im Vereinsregister.<br />
          Registergericht: [Amtsgericht]<br />
          Registernummer: [VR-Nummer]
        </p>
      </section>
      <section>
        <h2 className="font-serif text-xl font-semibold text-foreground">Kontakt</h2>
        <p>E-Mail: [E-Mail-Adresse]</p>
      </section>
      <section>
        <h2 className="font-serif text-xl font-semibold text-foreground">Haftungsausschluss</h2>
        <p>
          Die Inhalte unserer Seiten wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.
        </p>
      </section>
    </div>
  </div>
);

export default Impressum;
