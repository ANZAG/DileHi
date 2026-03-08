const Impressum = () => (
  <div className="container py-12 md:py-20 max-w-3xl">
    <h1 className="font-serif text-3xl md:text-4xl font-bold mb-8">Impressum</h1>
    <div className="prose prose-neutral max-w-none text-muted-foreground space-y-6">
      <section>
        <h2 className="font-serif text-xl font-semibold text-foreground">Angaben gemäß § 5 TMG</h2>
        <p>
          Diu lebendec Histôrje e.V.<br />
          Am Schloßpark 17<br />
          65203 Wiesbaden
        </p>
      </section>
      <section>
        <h2 className="font-serif text-xl font-semibold text-foreground">Vereinsregister</h2>
        <p>
          Registergericht: Amtsgericht Wiesbaden<br />
          Registernummer: VR 6783
        </p>
      </section>
      <section>
        <h2 className="font-serif text-xl font-semibold text-foreground">Vertreten durch</h2>
        <p>Maximilian Bachon<br />Eric Treisbach</p>
      </section>
      <section>
        <h2 className="font-serif text-xl font-semibold text-foreground">Kontakt</h2>
        <p>E-Mail: vorstand@dilehi.de</p>
      </section>
      <section>
        <h2 className="font-serif text-xl font-semibold text-foreground">Verbraucherstreitbeilegung / Universalschlichtungsstelle</h2>
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </section>
      <section className="pt-4 border-t text-xs">
        <p>Quelle: <a href="https://www.e-recht24.de" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">eRecht24</a></p>
      </section>
    </div>
  </div>
);

export default Impressum;
