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
import { useAntragsfelder, type Antragsfeld } from "@/hooks/useAntragsfelder";
import FormFieldRenderer from "@/components/event-forms/FormFieldRenderer";

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
  const { data: alleFelder = [] } = useAntragsfelder();
  const felder = alleFelder.filter((f) => f.is_active !== false);

  /** Antworten auf die Zusatzfelder – nach Feld-Kennung abgelegt. */
  const [extra, setExtra] = useState<Record<string, unknown>>({});

  // Tragende Felder haben ihre eigene Spalte, alles Weitere landet in `extra`.
  const feldWert = (feld: Antragsfeld) =>
    feld.column_name ? (form as Record<string, unknown>)[feld.column_name] : extra[feld.id];

  const setzeFeld = (feld: Antragsfeld, wert: unknown) => {
    if (feld.column_name) setForm((p) => ({ ...p, [feld.column_name!]: wert as string }));
    else setExtra((p) => ({ ...p, [feld.id]: wert }));
  };


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

  /**
   * Pflichtfelder – aus der Verwaltung, nicht aus dieser Liste.
   *
   * Vorher standen hier sieben Feldnamen. Wer in der Verwaltung ein Feld auf
   * „verpflichtend" stellte, hätte einen Antrag ohne dieses Feld trotzdem
   * absenden können – und wer ein Pflichtfeld abschaltet, hätte das Formular
   * unabsendbar gemacht.
   */
  const fehlt = (feld: Antragsfeld) => {
    if (!feld.required || feld.type === "section") return false;
    const wert = feldWert(feld);
    if (Array.isArray(wert)) return wert.length === 0;
    if (typeof wert === "boolean") return !wert;
    return !String(wert ?? "").trim();
  };

  const isValid =
    felder.every((f) => !fehlt(f)) &&
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
          // Antworten auf die Zusatzfragen, mit Beschriftung – damit sie im
          // Antrag lesbar sind, auch wenn ein Feld spaeter umbenannt wird.
          extra: Object.fromEntries(
            felder
              .filter((f) => !f.column_name && f.type !== "section")
              .map((f) => [f.id, { label: f.label, wert: extra[f.id] ?? null }])
              .filter(([, e]) => (e as { wert: unknown }).wert !== null && (e as { wert: unknown }).wert !== "")
          ),
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
            {/* Die Felder kommen aus der Verwaltung, nicht aus dieser Datei.
                Tragende Felder (Vorname, E-Mail, Anschrift …) landen in ihrer
                eigenen Spalte, alles Weitere gesammelt in `extra`. */}
            <section className="p-6 rounded-lg border bg-card space-y-4">
              {felder.length === 0 ? (
                <p className="text-sm text-muted-foreground">Formular wird geladen …</p>
              ) : (
                felder.map((feld) =>
                  feld.type === "section" ? (
                    <h2
                      key={feld.id}
                      className="font-serif text-lg font-semibold border-b border-border pb-2 first:mt-0 mt-2"
                    >
                      {feld.label}
                    </h2>
                  ) : (
                    <div key={feld.id} className="space-y-1">
                      <Label htmlFor={feld.id}>
                        {feld.label}
                        {feld.required && " *"}
                      </Label>
                      <FormFieldRenderer
                        field={feld}
                        value={feldWert(feld)}
                        onChange={(v) => setzeFeld(feld, v)}
                      />
                      {feld.description && (
                        <p className="text-xs text-muted-foreground mt-1">{feld.description}</p>
                      )}
                    </div>
                  )
                )
              )}
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
