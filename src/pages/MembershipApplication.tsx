import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";

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
    <div className="flex flex-wrap gap-4 mt-1">
      {options.map((opt) => (
        <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name={name}
            value={opt.value}
            checked={value === opt.value}
            onChange={() => onChange(opt.value)}
            className="h-4 w-4 accent-primary"
          />
          <span className="text-sm">{opt.label}</span>
        </label>
      ))}
    </div>
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
    // SEPA – noch nicht aktiv; Felder im State für spätere Aktivierung reserviert
    iban: "",
    bic: "",
    account_holder: "",
    sepa_accepted: false,
    // ─────────────────────────────────────────────────────────────────────────
    statutes_accepted: false,
    data_processing_accepted: false,
  });

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

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
      const { error: err } = await supabase.from("membership_applications").insert({
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
        // SEPA-Felder bewusst leer – werden nach Aktivierung befüllt
        iban: null,
        bic: null,
        account_holder: null,
        statutes_accepted: form.statutes_accepted,
        data_processing_accepted: form.data_processing_accepted,
        sepa_accepted: false,
        status: "pending",
      });
      if (err) throw err;
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
            <div className="flex items-center justify-between gap-4">
              {/* Vereinsname + Adresse */}
              <div>
                <p className="text-xs text-muted-foreground leading-snug">
                  An: Eric Müller (2. Officiatus)
                  <br />
                  Am Schlosspark 17 · 65203 Wiesbaden
                </p>
              </div>
              {/* Logo */}
              <img
                src="/favicon.ico"
                alt="Diu lebendec Histôrje e.V. – Wappen"
                className="h-14 w-14 object-contain flex-shrink-0"
              />
            </div>

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

              <div className="space-y-1">
                <Label>Art der Mitgliedschaft *</Label>
                <RadioGroup
                  name="membership_type"
                  value={form.membership_type}
                  options={[
                    { value: "aktiv", label: "Aktives Mitglied" },
                    { value: "foerder", label: "Fördermitglied" },
                  ]}
                  onChange={(v) => set("membership_type", v)}
                />
              </div>

              <div className="p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
                Jahresbeitrag{" "}
                <strong className="text-foreground">36,00 €</strong>
              </div>

              <div className="space-y-1">
                <Label>Beitragseinzug *</Label>
                <RadioGroup
                  name="contribution_interval"
                  value={form.contribution_interval}
                  options={[
                    { value: "jaehrlich", label: "Jährlich (36,00 €)" },
                    { value: "halbjaehrlich", label: "Halbjährlich (2 × 18,00 €)" },
                  ]}
                  onChange={(v) => set("contribution_interval", v)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Nach Genehmigung deines Antrags teilen wir dir die Zahlungsmodalitäten
                  per E-Mail mit.
                </p>
              </div>
            </section>

            {/* ── Einverständnis ──────────────────────────────────────────────── */}
            <section className="p-6 rounded-lg border bg-card space-y-4">
              <h2 className="font-serif text-lg font-semibold border-b border-border pb-2">
                Einverständnis
              </h2>

              {(
                [
                  {
                    key: "statutes_accepted" as const,
                    label:
                      "Ich habe die Satzung von Diu lebendec Histôrje e.V. gelesen und erkenne sie an. *",
                  },
                  {
                    key: "data_processing_accepted" as const,
                    label:
                      "Ich stimme der Verarbeitung meiner personenbezogenen Daten gemäß Datenschutzerklärung zu. *",
                  },
                ] as const
              ).map(({ key, label }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(e) => set(key, e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-input shrink-0 accent-primary"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}

              <p className="text-xs text-muted-foreground">
                Mit Absenden bestätigst du die vorstehenden Erklärungen. Die
                Mitgliedschaft ist nach schriftlicher Bestätigung durch den Vorstand
                gültig. Das Eintrittsdatum ist das Datum der Unterschrift.
              </p>
            </section>

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
