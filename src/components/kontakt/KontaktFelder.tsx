import { useState } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ForumEditor from "@/components/forum/ForumEditor";

const generateCaptcha = () => {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { question: `Was ist ${a} + ${b}?`, answer: a + b };
};

const EINGABE =
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm " +
  "ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none " +
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2";

/**
 * Das Kontaktformular.
 *
 * Stand vorher fest in der Kontaktseite. Herausgezogen, weil es jetzt auch als
 * Baustein im Seiteneditor zur Verfügung steht – und weil die Umstellung der
 * Nachricht auf einen richtigen Editor sonst an zwei Stellen hätte passieren
 * müssen.
 *
 * Die Nachricht ist jetzt formatierbar. Die Werkzeugleiste ist die schmale
 * Fassung: fett, kursiv, Aufzählung, Link. Absätze und Aufzählungen sind
 * genau das, woran eine Anfrage wie „können Sie uns zwischen 12 und 13 Uhr
 * Einblick gewähren?" bisher gescheitert ist – die kam als ein Block Text an
 * und war im Backend kaum lesbar.
 */
export default function KontaktFelder({ kompakt = false }: { kompakt?: boolean }) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [honeypot, setHoneypot] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const nachrichtLeer = form.message.replace(/<[^>]*>/g, "").trim() === "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // Falle für Bots

    if (parseInt(captchaInput) !== captcha.answer) {
      toast({ title: "Captcha falsch", description: "Bitte löse die Rechenaufgabe.", variant: "destructive" });
      setCaptcha(generateCaptcha());
      setCaptchaInput("");
      return;
    }

    if (!form.name.trim() || !form.email.trim() || nachrichtLeer) {
      toast({ title: "Bitte alle Felder ausfüllen", variant: "destructive" });
      return;
    }

    setSending(true);
    const nachricht = form.message.trim();
    const { error } = await supabase.from("contact_messages").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      message: nachricht,
    });

    // Mailbenachrichtigung ohne Warten: Die Nachricht steht bereits in der
    // Datenbank und ist in der Verwaltung sichtbar.
    supabase.functions.invoke("notify-contact", {
      body: { name: form.name.trim(), email: form.email.trim(), message: nachricht },
    }).catch(() => undefined);

    setSending(false);
    if (error) {
      toast({ title: "Fehler", description: "Nachricht konnte nicht gesendet werden.", variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-8"
      >
        <CheckCircle2 size={48} className="text-primary mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold mb-2">Nachricht gesendet!</h2>
        <p className="text-muted-foreground">
          Vielen Dank für deine Nachricht. Wir melden uns so schnell wie möglich bei dir.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={kompakt ? "space-y-4" : "p-6 rounded-lg border bg-card space-y-4"}>
      {/* Honigtopf – für Menschen unsichtbar, Bots füllen ihn aus. */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />

      <div>
        <label htmlFor="contact-name" className="text-sm font-medium mb-1.5 block">Name *</label>
        <input
          id="contact-name" type="text" required maxLength={100}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={EINGABE}
          placeholder="Dein Name"
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="text-sm font-medium mb-1.5 block">E-Mail *</label>
        <input
          id="contact-email" type="email" required maxLength={255}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={EINGABE}
          placeholder="deine@email.de"
        />
      </div>

      <div>
        <span className="text-sm font-medium mb-1.5 block">Nachricht *</span>
        <ForumEditor
          value={form.message}
          onChange={(html) => setForm((f) => ({ ...f, message: html }))}
          placeholder="Deine Nachricht an uns …"
          umfang="knapp"
        />
      </div>

      <div>
        <label htmlFor="contact-captcha" className="text-sm font-medium mb-1.5 block">{captcha.question}</label>
        <input
          id="contact-captcha" type="number" required
          value={captchaInput}
          onChange={(e) => setCaptchaInput(e.target.value)}
          className={`${EINGABE} w-32`}
          placeholder="?"
        />
      </div>

      <button
        type="submit"
        disabled={sending}
        className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm
          hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Send size={16} />
        {sending ? "Wird gesendet …" : "Nachricht senden"}
      </button>
    </form>
  );
}
