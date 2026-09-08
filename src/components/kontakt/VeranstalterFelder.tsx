import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Das Anfrageformular für Veranstalter.
 *
 * Stand vorher fest in der Seite „Für Veranstalter". Herausgezogen aus
 * demselben Grund wie seinerzeit das Kontaktformular: Die Seite zieht in den
 * Editor um, und dort braucht es den Baustein. Die Seite selbst benutzt
 * weiterhin diese Komponente – sonst gäbe es zwei Formulare, die sich
 * auseinanderentwickeln.
 *
 * Die Anfrage landet in derselben Tabelle wie eine gewöhnliche
 * Kontaktnachricht. Das ist Absicht: Für den Vorstand ist beides Post, die im
 * Verwaltungsbereich beantwortet werden will, und eine zweite Tabelle hätte
 * eine zweite Oberfläche gebraucht.
 */

const BESUCHERZAHLEN = ["bis 100", "100–500", "500–1000", "über 1000"];
const EPOCHEN = ["Spätmittelalter", "Napoleonik", "Erster Weltkrieg", "Mehrere", "Offen"];

/** Was in der Auswahl steht und was in der Mail landet, ist nicht dasselbe. */
const BESUCHER_BESCHRIFTUNG: Record<string, string> = {
  "500–1000": "500–1.000",
  "über 1000": "über 1.000",
};

const LEER = {
  name: "", organisation: "", email: "", eventType: "",
  date: "", location: "", visitors: "", epoch: "", message: "",
};

export default function VeranstalterFelder() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(LEER);

  const handleChange = (field: keyof typeof LEER, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.organisation || !form.email) {
      toast({ title: "Bitte alle Pflichtfelder ausfüllen.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const messageText = [
      `Name: ${form.name}`,
      `Organisation: ${form.organisation}`,
      `Art: ${form.eventType}`,
      `Datum: ${form.date}`,
      `Ort: ${form.location}`,
      form.visitors ? `Besucherzahl: ${form.visitors}` : null,
      form.epoch ? `Epoche: ${form.epoch}` : null,
      form.message ? `Nachricht: ${form.message}` : null,
    ].filter(Boolean).join("\n");

    const { error } = await supabase.from("contact_messages").insert({
      name: form.name.trim().slice(0, 100),
      email: form.email.trim().slice(0, 255),
      message: messageText.slice(0, 5000),
    });
    // Ohne Warten: Die Anfrage steht bereits in der Datenbank und ist in der
    // Verwaltung sichtbar, auch wenn die Mail scheitert.
    supabase.functions.invoke("notify-contact", {
      body: { name: form.name.trim(), email: form.email.trim(), message: messageText },
    }).catch(() => undefined);

    setLoading(false);
    if (error) {
      toast({ title: "Fehler beim Senden.", variant: "destructive" });
    } else {
      toast({ title: "Anfrage gesendet!", description: "Wir melden uns bei Ihnen." });
      setForm(LEER);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <Feld id="name" label="Name *">
          <Input id="name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} required maxLength={100} />
        </Feld>
        <Feld id="organisation" label="Organisation / Institution *">
          <Input id="organisation" value={form.organisation} onChange={(e) => handleChange("organisation", e.target.value)} required maxLength={200} />
        </Feld>
        <Feld id="email" label="E-Mail *">
          <Input id="email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} required maxLength={255} />
        </Feld>
        <Feld id="eventType" label="Art der Veranstaltung">
          <Input id="eventType" value={form.eventType} onChange={(e) => handleChange("eventType", e.target.value)} maxLength={200} />
        </Feld>
        <Feld id="date" label="Datum / Zeitraum">
          <Input id="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} maxLength={100} />
        </Feld>
        <Feld id="location" label="Ort der Veranstaltung">
          <Input id="location" value={form.location} onChange={(e) => handleChange("location", e.target.value)} maxLength={200} />
        </Feld>
        <Feld id="visitors" label="Erwartete Besucherzahl">
          <Auswahl
            id="visitors" wert={form.visitors}
            setze={(v) => handleChange("visitors", v)}
            werte={BESUCHERZAHLEN}
          />
        </Feld>
        <Feld id="epoch" label="Gewünschte Epoche">
          <Auswahl
            id="epoch" wert={form.epoch}
            setze={(v) => handleChange("epoch", v)}
            werte={EPOCHEN}
          />
        </Feld>
      </div>
      <Feld id="message" label="Nachricht / Weitere Informationen">
        <Textarea id="message" value={form.message} onChange={(e) => handleChange("message", e.target.value)} rows={4} maxLength={5000} />
      </Feld>
      <Button type="submit" disabled={loading} className="w-full md:w-auto">
        {loading ? "Wird gesendet…" : "Anfrage senden"}
      </Button>
    </form>
  );
}

function Feld({ id, label, children }: { id: string; label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function Auswahl({ id, wert, setze, werte }: {
  id: string; wert: string; setze: (v: string) => void; werte: string[];
}) {
  return (
    <Select value={wert} onValueChange={setze}>
      <SelectTrigger id={id}><SelectValue placeholder="Bitte wählen" /></SelectTrigger>
      <SelectContent>
        {werte.map((w) => (
          <SelectItem key={w} value={w}>{BESUCHER_BESCHRIFTUNG[w] ?? w}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
