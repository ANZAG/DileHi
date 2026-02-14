const Datenschutz = () => (
  <div className="container py-12 md:py-20 max-w-3xl">
    <h1 className="font-serif text-3xl md:text-4xl font-bold mb-8">Datenschutzerklärung</h1>
    <div className="prose prose-neutral max-w-none text-muted-foreground space-y-6">
      <section>
        <h2 className="font-serif text-xl font-semibold text-foreground">1. Datenschutz auf einen Blick</h2>
        <p>
          Die folgenden Hinweise geben einen einfachen Überblick darüber, was mit Ihren personenbezogenen Daten passiert, wenn Sie diese Website besuchen. Personenbezogene Daten sind alle Daten, mit denen Sie persönlich identifiziert werden können.
        </p>
      </section>
      <section>
        <h2 className="font-serif text-xl font-semibold text-foreground">2. Verantwortliche Stelle</h2>
        <p>
          Diu lebendec Histôrje e.V.<br />
          [Adresse]<br />
          [PLZ] Wiesbaden<br />
          E-Mail: [E-Mail-Adresse]
        </p>
      </section>
      <section>
        <h2 className="font-serif text-xl font-semibold text-foreground">3. Datenerfassung auf dieser Website</h2>
        <p>
          [Hier sollten die spezifischen Datenschutzhinweise zu Cookies, Server-Log-Dateien, Kontaktformularen etc. ergänzt werden.]
        </p>
      </section>
      <section>
        <h2 className="font-serif text-xl font-semibold text-foreground">4. Hosting</h2>
        <p>
          [Informationen zum Hosting-Anbieter und Datenverarbeitung ergänzen.]
        </p>
      </section>
      <section className="p-6 rounded-lg bg-card border">
        <p className="text-sm">
          <strong className="text-foreground">Hinweis:</strong> Diese Datenschutzerklärung ist ein Platzhalter und muss durch einen rechtlich geprüften Text ersetzt werden, der den Anforderungen der DSGVO entspricht.
        </p>
      </section>
    </div>
  </div>
);

export default Datenschutz;
