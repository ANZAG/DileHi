import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";

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
    iban: "",
    bic: "",
    account_holder: "",
    statutes_accepted: false,
    data_processing_accepted: false,
    sepa_accepted: false,
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
    form.iban.trim() &&
    form.account_holder.trim() &&
    form.statutes_accepted &&
    form.data_processing_accepted &&
    form.sepa_accepted;

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
        iban: form.iban.replace(/\s/g, "").toUpperCase(),
        bic: form.bic.trim().toUpperCase() || null,
        account_holder: form.account_holder.trim(),
        statutes_accepted: form.statutes_accepted,
        data_processing_accepted: form.data_processing_accepted,
        sepa_accepted: form.sepa_accepted,
        status: "pending",
      });
      if (err) throw err;
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message ?? "Unbekannter Fehler. Bitte versuche es erneut.");
    }
    setSubmitting(false);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-4 p-8 rounded-xl border bg-card shadow"
        >
          <CheckCircle2 size={48} className="mx-auto text-green-500" />
          <h1 className="font-serif text-2xl font-bold">Antrag eingegangen!</h1>
          <p className="text-muted-foreground text-sm">
            Vielen Dank, <strong>{form.first_name}</strong>! Dein Mitgliedsantrag wird vom Vorstand geprüft.
            Du erhältst eine E-Mail sobald dein Antrag genehmigt wurde.
          </p>
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Zurück zur Startseite <ChevronRight size={14} />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <>
      <SEO title="Mitglied werden – DileHi" description="Jetzt Mitglied bei Diu lebendec Histôrje e.V. werden." />
      <div className="container py-10 max-w-xl px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-8">
            <h1 className="font-serif text-3xl font-bold">Mitglied werden</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Fülle das Formular vollständig aus. Der Vorstand prüft deinen Antrag und du erhältst anschließend eine Einladung per E-Mail.
            </p>
          </div>

          <div className="space-y-6">
            {/* Persönliche Daten */}
            <section className="p-6 rounded-lg border bg-card space-y-4">
              <h2 className="font-serif text-lg font-semibold">Persönliche Daten</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="salutation">Anrede</Label>
                  <select
                    id="salutation"
                    value={form.salutation}
                    onChange={(e) => set("salutation", e.target.value)}
                    className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">–</option>
                    <option value="Herr">Herr</option>
                    <option value="Frau">Frau</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="first_name">Vorname *</Label>
                  <Input id="first_name" className="mt-1" value={form.first_name} onChange={(e) => set("first_name", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="last_name">Nachname *</Label>
                  <Input id="last_name" className="mt-1" value={form.last_name} onChange={(e) => set("last_name", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="email">E-Mail *</Label>
                  <Input id="email" type="email" className="mt-1" value={form.email} onChange={(e) => set("email", e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="phone">Telefon / Handy</Label>
                  <Input id="phone" type="tel" className="mt-1" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
                </div>
              </div>

              <div>
                <Label htmlFor="birthdate">Geburtsdatum *</Label>
                <Input
                  id="birthdate"
                  type="date"
                  className="mt-1 max-w-[200px] appearance-none [&::-webkit-date-and-time-value]:text-left"
                  value={form.birthdate}
                  onChange={(e) => set("birthdate", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="street">Straße und Hausnummer *</Label>
                <Input id="street" className="mt-1" value={form.street} onChange={(e) => set("street", e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="zip">PLZ *</Label>
                  <Input id="zip" className="mt-1" value={form.zip} onChange={(e) => set("zip", e.target.value)} />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="city">Wohnort *</Label>
                  <Input id="city" className="mt-1" value={form.city} onChange={(e) => set("city", e.target.value)} />
                </div>
              </div>
            </section>

            {/* Mitgliedschaft */}
            <section className="p-6 rounded-lg border bg-card space-y-4">
              <h2 className="font-serif text-lg font-semibold">Mitgliedschaft</h2>
              <div className="p-3 rounded-md bg-muted/50 text-sm text-muted-foreground">
                Aktives Mitglied – Jahresbeitrag <strong className="text-foreground">36,00 €</strong>
              </div>
              <div>
                <Label htmlFor="contribution_interval">Beitragseinzug</Label>
                <select
                  id="contribution_interval"
                  value={form.contribution_interval}
                  onChange={(e) => set("contribution_interval", e.target.value)}
                  className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="jaehrlich">Jährlich (36,00 €)</option>
                  <option value="halbjaehrlich">Halbjährlich (2 × 18,00 €)</option>
                </select>
              </div>
            </section>

            {/* SEPA-Lastschrift */}
            <section className="p-6 rounded-lg border bg-card space-y-4">
              <div>
                <h2 className="font-serif text-lg font-semibold">SEPA-Lastschriftmandat</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Gläubiger-ID: DE... · Mandatsreferenz wird nach Aufnahme mitgeteilt
                </p>
              </div>
              <div>
                <Label htmlFor="account_holder">Kontoinhaber *</Label>
                <Input
                  id="account_holder"
                  className="mt-1"
                  value={form.account_holder}
                  onChange={(e) => set("account_holder", e.target.value)}
                  placeholder="Vor- und Nachname"
                />
              </div>
              <div>
                <Label htmlFor="iban">IBAN *</Label>
                <Input
                  id="iban"
                  className="mt-1 font-mono"
                  value={form.iban}
                  onChange={(e) => set("iban", e.target.value.toUpperCase())}
                  placeholder="DE12 3456 7890 1234 5678 90"
                />
              </div>
              <div>
                <Label htmlFor="bic">BIC</Label>
                <Input
                  id="bic"
                  className="mt-1 font-mono"
                  value={form.bic}
                  onChange={(e) => set("bic", e.target.value.toUpperCase())}
                  placeholder="DEUTDEDB"
                />
              </div>
            </section>

            {/* Einverständniserklärungen */}
            <section className="p-6 rounded-lg border bg-card space-y-4">
              <h2 className="font-serif text-lg font-semibold">Einverständnis</h2>

              {[
                {
                  key: "statutes_accepted" as const,
                  label: "Ich habe die Satzung von Diu lebendec Histôrje e.V. gelesen und erkenne sie an. *",
                },
                {
                  key: "data_processing_accepted" as const,
                  label: "Ich stimme der Verarbeitung meiner personenbezogenen Daten gemäß Datenschutzerklärung zu. *",
                },
                {
                  key: "sepa_accepted" as const,
                  label:
                    "Ich ermächtige Diu lebendec Histôrje e.V., den Mitgliedsbeitrag per SEPA-Lastschrift von meinem Konto einzuziehen. *",
                },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key] as boolean}
                    onChange={(e) => set(key, e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-input shrink-0"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </section>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-md">{error}</p>
            )}

            <Button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="w-full h-11"
            >
              {submitting ? <Loader2 size={16} className="animate-spin mr-2" /> : null}
              Antrag absenden
            </Button>

            <p className="text-xs text-muted-foreground text-center">* Pflichtfelder</p>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default MembershipApplication;
