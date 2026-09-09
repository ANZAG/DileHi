import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { useBranding } from "@/hooks/useBranding";
import { useAntragstexte, fuelleText } from "@/hooks/useAntragstexte";
import { useBeitragsmodell, beitragsTextSchluessel } from "@/hooks/useBeitragsmodell";

const SATZUNG_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-satzung-link`;
const FALLBACK_RATE = 36;

// ─── Typ-Hilfen ───────────────────────────────────────────────────────────────
type RadioOption = { value: string; label: string };

function RadioGroup({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: string;
  options: RadioOption[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-1.5" role="radiogroup">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm transition-all ${
              selected
                ? "border-primary bg-primary/10 text-foreground shadow-sm ring-1 ring-primary/30"
                : "border-input bg-background text-muted-foreground hover:border-primary/50 hover:bg-muted/50"
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                selected ? "border-primary" : "border-muted-foreground/40"
              }`}
            >
              {selected && <span className="h-2 w-2 rounded-full bg-primary" />}
            </span>
            <span className={selected ? "font-medium" : ""}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Setzt {{satzung}} als Verweis auf die Satzung ein.
 *
 * Im gedruckten Antrag steht an derselben Stelle schlicht das Wort – Papier
 * kennt keine Verweise. Der Satz drumherum ist in beiden Fällen derselbe.
 */
function MitSatzungslink({ text }: { text: string }) {
  const marke = "{{satzung}}";
  const teile = text.split(marke);
  if (teile.length === 1) return <>{text}</>;
  return (
    <>
      {teile[0]}
      <a
        href={SATZUNG_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline inline-flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <FileText size={12} /> Satzung
      </a>
      {teile.slice(1).join(marke)}
    </>
  );
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
const MembershipApplication = () => {
  const [form, setForm] = useState({
    salutation: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    birthdate: "",
    street: "",
    zip: "",
    city: "",
    membership_type: "aktiv",
    contribution_interval: "jaehrlich",
    statutes_accepted: false,
    data_processing_accepted: false,
  });

  // Honeypot field (hidden from real users) – bots tend to fill it in.
  const [website, setWebsite] = useState("");
  // Timestamp when the form was rendered, used for a bot timing check server-side.
  const renderedAtRef = useRef<number>(Date.now());

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [rate, setRate] = useState<number>(FALLBACK_RATE);
  const { org_name } = useBranding();
  const texte = useAntragstexte();
  const { modell, arten } = useBeitragsmodell();


  // „aktiv" ist die mitgelieferte Vorgabe. Benennt ein Verein seine
  // Mitgliedsarten um oder schaltet sie ab, zeigt das Formular sonst eine
  // Auswahl an, in der nichts markiert ist – und schickt einen Schlüssel mit,
  // den es nicht mehr gibt.
  useEffect(() => {
    if (arten.length === 0) return;
    if (!arten.some((a) => a.key === form.membership_type)) {
      set("membership_type", arten[0].key);
    }
  }, [arten, form.membership_type]);

  useEffect(() => {
    supabase.rpc("get_current_contribution_rate").then(({ data }) => {
      const n = typeof data === "number" ? data : Number(data);
      if (Number.isFinite(n) && n > 0) setRate(n);
    });
  }, []);

  const fmt = (n: number) => n.toFixed(2).replace(".", ",") + " \u20AC";
  // Die Textbausteine des Antrags mit den aktuellen Werten. Sie stehen
  // wortgleich auf dem PDF, das daraus entsteht. Fehlen sie, bleibt der
  // Abschnitt leer statt kaputt.
  // Der Betrag richtet sich nach der gewählten Mitgliedsart. Ohne eigenen Satz
  // gilt der Rückfall aus der Datenbank – derselbe, der auch im PDF steht.
  const gewaehlteArt = arten.find((a) => a.key === form.membership_type);
  const betrag = gewaehlteArt?.amount ?? rate;
  const werte = { verein: org_name, beitrag: betrag.toFixed(2).replace(".", ",") };
  const zeilen = (key: string) =>
    fuelleText(texte[key]?.inhalt ?? "", werte)
      .split("\n")
      .map((z) => z.trim())
      .filter(Boolean);
  // Der Satz zum Beitrag haengt am Modell und steht deshalb in einer eigenen
  // Vorlage: „Derzeit betraegt der jaehrliche Beitragssatz …" ist falsch, wenn
  // es gar keinen gibt.
  const erklaerung = [...zeilen("erklaerung"), ...zeilen(beitragsTextSchluessel(modell))];
  const zustimmungen = zeilen("zustimmungen");
  const datenschutz = zeilen("datenschutz").join(" ");

  const halfFmt = (n: number) =>
    (Math.round((n / 2) * 100) / 100).toFixed(2).replace(".", ",") + " \u20AC";

  const isValid =
    form.first_name.trim() &&
    form.last_name.trim() &&
    form.email.trim() &&
    form.street.trim() &&
    form.zip.trim() &&
    form.city.trim() &&
    form.birthdate &&
    form.statutes_accepted &&
    form.data_processing_accepted;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    setError("");
    try {
      const { data, error: err } = await supabase.functions.invoke("submit-application", {
        body: {
          website, // honeypot
          rendered_at: renderedAtRef.current,
          salutation: form.salutation || null,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || null,
          birthdate: form.birthdate || null,
          street: form.street.trim(),
          zip: form.zip.trim(),
          city: form.city.trim(),
          membership_type: form.membership_type,
          contribution_interval: form.contribution_interval,
          statutes_accepted: form.statutes_accepted,
          data_processing_accepted: form.data_processing_accepted,
        },
      });
      if (err) throw err;
      if (data && (data as any).error) throw new Error((data as any).error);
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message ?? "Unbekannter Fehler. Bitte versuche es erneut.");
    }
    setSubmitting(false);
  };


  // ─── Erfolgsstatus ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-4 p-8 rounded-xl border bg-card shadow"
        >
          <CheckCircle2 size={48} className="mx-auto text-green-600" />
          <h1 className="font-serif text-2xl font-bold">Antrag eingegangen!</h1>
          <p className="text-muted-foreground text-sm">
            Vielen Dank, <strong>{form.first_name}</strong>! Dein Mitgliedsantrag wird
            vom Vorstand geprüft. Du erhältst eine E-Mail, sobald dein Antrag genehmigt
            wurde.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            Zurück zur Startseite <ChevronRight size={14} />
          </Link>
        </motion.div>
      </div>
    );
  }

  // ─── Formular ───────────────────────────────────────────────────────────────
  return (
    <>
      <SEO
        title="Mitglied werden – DileHi"
        description="Jetzt Mitglied bei Diu lebendec Histôrje e.V. werden."
      />

      <div className="container py-10 max-w-xl px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>

          {/* ── CI-Header (angelehnt ans Briefpapier) ── */}
          <div className="mb-8 pb-6 border-b border-border">

            {/* Seitenüberschrift */}
            <h1 className="font-serif text-3xl font-bold text-primary mt-5">
              Mitglied werden
            </h1>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Fülle das Formular vollständig aus. Der Vorstand prüft deinen Antrag und
              schickt dir anschließend eine Einladung per E-Mail.
            </p>
          </div>

          <div className="space-y-6">

            {/* ── Persönliche Daten ───────────────────────────────────────────── */}
            <section className="p-6 rounded-lg border bg-card space-y-4">
              <h2 className="font-serif text-lg font-semibold border-b border-border pb-2">
                Persönliche Daten
              </h2>

              {/* Anrede */}
              <div className="space-y-1">
                <Label>Anrede</Label>
                <RadioGroup
                  name="salutation"
                  value={form.salutation}
                  options={[
                    { value: "Herr", label: "Herr" },
                    { value: "Frau", label: "Frau" },
                  ]}
                  onChange={(v) => set("salutation", v)}
                />
              </div>

              {/* Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="first_name">Vorname *</Label>
                  <Input
                    id="first_name"
                    className="mt-1"
                    value={form.first_name}
                    onChange={(e) => set("first_name", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Nachname *</Label>
                  <Input
                    id="last_name"
                    className="mt-1"
                    value={form.last_name}
                    onChange={(e) => set("last_name", e.target.value)}
                  />
                </div>
              </div>

              {/* Kontakt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="email">E-Mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    className="mt-1"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Telefon / Handy</Label>
                  <Input
                    id="phone"
                    type="tel"
                    className="mt-1"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </div>
              </div>

              {/* Geburtsdatum */}
              <div>
                <Label htmlFor="birthdate">Geburtsdatum *</Label>
                <Input
                  id="birthdate"
                  type="date"
                  className="mt-1 max-w-[200px] appearance-none [&::-webkit-date-and-time-value]:text-left"
                  value={form.birthdate}
                  onChange={(e) => set("birthdate", e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Die Mitgliedschaft ist ab 16 Jahren möglich. Bei unter 18-Jährigen
                  muss der Antrag von einem Erziehungsberechtigten mitunterschrieben
                  werden – wir kommen in diesem Fall per E-Mail auf dich zu.
                </p>
              </div>

              {/* Adresse */}
              <div>
                <Label htmlFor="street">Straße und Hausnummer *</Label>
                <Input
                  id="street"
                  className="mt-1"
                  value={form.street}
                  onChange={(e) => set("street", e.target.value)}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="zip">PLZ *</Label>
                  <Input
                    id="zip"
                    className="mt-1"
                    value={form.zip}
                    onChange={(e) => set("zip", e.target.value)}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="city">Wohnort *</Label>
                  <Input
                    id="city"
                    className="mt-1"
                    value={form.city}
                    onChange={(e) => set("city", e.target.value)}
                  />
                </div>
              </div>
            </section>

            {/* ── Mitgliedschaft ──────────────────────────────────────────────── */}
            <section className="p-6 rounded-lg border bg-card space-y-4">
              <h2 className="font-serif text-lg font-semibold border-b border-border pb-2">
                Mitgliedschaft
              </h2>

              {/* Die Mitgliedsarten kommen aus der Verwaltung. „Student" und
                  „Rentner" sind dort einfach zwei weitere Einträge; die
                  Beträge stehen nur beim festen Beitrag dabei. Ankreuzen darf
                  der Antragstellende selbst – ob die Kategorie noch passt,
                  prüft der Verein ohnehin regelmäßig. */}
              {arten.length > 1 && (
                <div className="space-y-1">
                  <Label>Art der Mitgliedschaft *</Label>
                  <RadioGroup
                    name="membership_type"
                    value={form.membership_type}
                    options={arten.map((a) => ({
                      value: a.key,
                      label: modell === "fest" && a.amount !== null
                        ? `${a.label} (${fmt(a.amount)})`
                        : a.label,
                    }))}
                    onChange={(v) => set("membership_type", v)}
                  />
                  {gewaehlteArt?.hinweis && (
                    <p className="text-xs text-muted-foreground mt-1">{gewaehlteArt.hinweis}</p>
                  )}
                </div>
              )}

              {modell === "fest" && (
                <>
                  <div className="p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
                    Jahresbeitrag <strong className="text-foreground">{fmt(betrag)}</strong>
                  </div>

                  <div className="space-y-1">
                    <Label>Beitragseinzug *</Label>
                    <RadioGroup
                      name="contribution_interval"
                      value={form.contribution_interval}
                      options={[
                        { value: "jaehrlich", label: `Jährlich (${fmt(betrag)})` },
                        { value: "halbjaehrlich", label: `Halbjährlich (2 × ${halfFmt(betrag)})` },
                      ]}
                      onChange={(v) => set("contribution_interval", v)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Nach Genehmigung deines Antrags teilen wir dir die Zahlungsmodalitäten
                      per E-Mail mit.
                    </p>
                  </div>
                </>
              )}

              {/* Bei der Umlage gibt es keinen Betrag zu nennen – nur die
                  Verpflichtung, und die steht in der Erklärung weiter unten.
                  Ein leerer Kasten „Jahresbeitrag 0,00 €" wäre irreführend. */}
              {modell === "umlage" && (
                <p className="text-sm text-muted-foreground">
                  Ein fester Beitrag wird nicht erhoben. Die Mitglieder beteiligen sich
                  anteilig an den Unkosten des Jahres.
                </p>
              )}

              {modell === "keiner" && (
                <p className="text-sm text-muted-foreground">
                  Ein Mitgliedsbeitrag wird nicht erhoben.
                </p>
              )}
            </section>

            {/* ── Einverständnis ──────────────────────────────────────────────── */}
            <section className="p-6 rounded-lg border bg-card space-y-4">
              <h2 className="font-serif text-lg font-semibold border-b border-border pb-2">
                Einverständnis
              </h2>

              {/* Erklärung und Zustimmungen stehen wortgleich auf dem Antrag,
                  der daraus entsteht. Vorher hatte jede Seite ihren eigenen
                  Wortlaut: Wer zustimmte, las den einen Text, protokolliert
                  wurde der andere. */}
              {erklaerung.length > 0 && (
                <div className="space-y-2 text-sm text-muted-foreground">
                  {erklaerung.map((zeile, i) => (
                    <p key={i} className={i === 0 ? "font-medium text-foreground" : undefined}>
                      {zeile}
                    </p>
                  ))}
                </div>
              )}

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.statutes_accepted}
                  onChange={(e) => set("statutes_accepted", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input shrink-0 accent-primary"
                />
                <span className="text-sm">
                  <MitSatzungslink text={zustimmungen[0] ?? ""} /> *
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.data_processing_accepted}
                  onChange={(e) => set("data_processing_accepted", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input shrink-0 accent-primary"
                />
                <span className="text-sm">
                  <MitSatzungslink text={zustimmungen[1] ?? ""} /> *
                </span>
              </label>

              {datenschutz && <p className="text-xs text-muted-foreground">{datenschutz}</p>}

              <p className="text-xs text-muted-foreground">
                Mit Absenden bestätigst du die vorstehenden Erklärungen. Das
                Eintrittsdatum ist das Datum der Unterschrift.
              </p>
            </section>

            {/* Honeypot – visually hidden, ignored by humans, filled by bots */}
            <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden" tabIndex={-1}>
              <label htmlFor="website">Website (bitte freilassen)</label>
              <input
                id="website"
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-md">
                {error}
              </p>
            )}


            <Button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="w-full h-11"
            >
              {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Antrag absenden
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              * Pflichtfelder
            </p>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default MembershipApplication;
