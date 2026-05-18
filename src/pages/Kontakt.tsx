import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";

const generateCaptcha = () => {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  return { question: `Was ist ${a} + ${b}?`, answer: a + b };
};

const Kontakt = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [honeypot, setHoneypot] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // bot trap

    if (parseInt(captchaInput) !== captcha.answer) {
      toast({ title: "Captcha falsch", description: "Bitte löse die Rechenaufgabe.", variant: "destructive" });
      setCaptcha(generateCaptcha());
      setCaptchaInput("");
      return;
    }

    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast({ title: "Bitte alle Felder ausfüllen", variant: "destructive" });
      return;
    }

    setSending(true);
    const { error } = await supabase.from("contact_messages").insert({
      name: form.name.trim(),
      email: form.email.trim(),
      message: form.message.trim(),
    });

    // Fire-and-forget email notification
    supabase.functions.invoke("notify-contact", {
      body: { name: form.name.trim(), email: form.email.trim(), message: form.message.trim() },
    }).catch(() => {});

    setSending(false);

    if (error) {
      toast({ title: "Fehler", description: "Nachricht konnte nicht gesendet werden.", variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="container py-20 max-w-xl text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <CheckCircle2 size={48} className="text-primary mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-bold mb-2">Nachricht gesendet!</h1>
          <p className="text-muted-foreground">
            Vielen Dank für deine Nachricht. Wir melden uns so schnell wie möglich bei dir.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container py-12 md:py-20 max-w-xl">
      <SEO 
        title="Kontakt - Diu lebendec Histôrje"
        description="Haben Sie Fragen zu unserem Verein oder Interesse an einer Mitgliedschaft? Schreiben Sie uns eine Nachricht oder kontaktieren Sie uns direkt per E-Mail."
        url="/kontakt"
      />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
        <h1 className="font-serif text-3xl md:text-4xl font-bold mb-2">Kontakt aufnehmen</h1>
        <p className="text-muted-foreground mb-8">
          Hast du Fragen, Anregungen oder Interesse an einer Mitgliedschaft? Schreib uns eine Nachricht!
        </p>

        <form onSubmit={handleSubmit} className="p-6 rounded-lg border bg-card space-y-4">
          {/* Honeypot - hidden from users */}
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
              id="contact-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              maxLength={100}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Dein Name"
            />
          </div>

          <div>
            <label htmlFor="contact-email" className="text-sm font-medium mb-1.5 block">E-Mail *</label>
            <input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              maxLength={255}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="deine@email.de"
            />
          </div>

          <div>
            <label htmlFor="contact-message" className="text-sm font-medium mb-1.5 block">Nachricht *</label>
            <textarea
              id="contact-message"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              required
              maxLength={2000}
              rows={5}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[120px]"
              placeholder="Deine Nachricht an uns..."
            />
          </div>

          <div>
            <label htmlFor="contact-captcha" className="text-sm font-medium mb-1.5 block">{captcha.question}</label>
            <input
              id="contact-captcha"
              type="number"
              value={captchaInput}
              onChange={(e) => setCaptchaInput(e.target.value)}
              required
              className="flex h-10 w-32 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="?"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send size={16} />
            {sending ? "Wird gesendet..." : "Nachricht senden"}
          </button>
        </form>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          Alternativ erreichst du uns unter{" "}
          <a href="mailto:vorstand@dilehi.de" className="text-primary hover:underline">
            vorstand@dilehi.de
          </a>
        </p>
      </motion.div>
    </div>
  );
};

export default Kontakt;
