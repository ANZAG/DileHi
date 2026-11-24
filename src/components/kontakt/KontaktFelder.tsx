import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { sendeKontaktnachricht } from "@/daten/website";
import { useToast } from "@/hooks/use-toast";
import { useSprache } from "@/hooks/useSprache";
import { mitWerten } from "@/lib/texte";

/**
 * Der Editor kommt erst, wenn das Formular in Sicht kommt.
 *
 * Er ist der grösste Teil dieses Formulars (rund 150 KB gepackt), und das
 * Formular steht als Baustein auch auf der Startseite – ganz unten. Fest
 * eingebunden lud jeder Besucher ihn mit, bevor die Seite überhaupt etwas
 * zeigte; PageSpeed führte ihn auf dem Handy als grössten Posten unter
 * „nicht verwendetes JavaScript". Bis er da ist, steht ein gleich hoher
 * Rahmen an seiner Stelle.
 */
const ForumEditor = lazy(() => import("@/components/forum/ForumEditor"));

/** Platzhalter in der Grösse des Editors (Leiste plus min-h-[8rem]). */
function EditorPlatzhalter({ aufwecken }: { aufwecken?: () => void }) {
  const { t } = useSprache();
  return (
    <div
      className="rounded-md border border-input bg-background min-h-[10.75rem] px-3 py-2.5 text-sm text-muted-foreground"
      onPointerDown={aufwecken}
      onFocus={aufwecken}
      tabIndex={aufwecken ? 0 : -1}
      aria-label={t.nachricht}
    >
      {t.deineNachricht}
    </div>
  );
}

/** Wird true, sobald das Element in die Nähe des sichtbaren Bereichs kommt. */
function useInSicht<T extends Element>(): [React.RefObject<T>, boolean, () => void] {
  const ref = useRef<T>(null);
  const [inSicht, setInSicht] = useState(false);
  useEffect(() => {
    if (inSicht || !ref.current) return;
    if (typeof IntersectionObserver === "undefined") { setInSicht(true); return; }
    const beobachter = new IntersectionObserver(
      (eintraege) => { if (eintraege.some((e) => e.isIntersecting)) setInSicht(true); },
      { rootMargin: "400px" },
    );
    beobachter.observe(ref.current);
    return () => beobachter.disconnect();
  }, [inSicht]);
  return [ref, inSicht, () => setInSicht(true)];
}

const generateCaptcha = () => {
  const a = Math.floor(Math.random() * 10) + 1;
  const b = Math.floor(Math.random() * 10) + 1;
  // Die Frage selbst entsteht erst beim Anzeigen – in der Sprache der Seite.
  return { a, b, answer: a + b };
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
  const { t } = useSprache();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [honeypot, setHoneypot] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  const [captcha, setCaptcha] = useState(generateCaptcha);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [editorOrt, editorLaden, editorJetzt] = useInSicht<HTMLDivElement>();

  const nachrichtLeer = form.message.replace(/<[^>]*>/g, "").trim() === "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (honeypot) return; // Falle für Bots

    if (parseInt(captchaInput) !== captcha.answer) {
      toast({ title: t.captchaFalsch, description: t.captchaHinweis, variant: "destructive" });
      setCaptcha(generateCaptcha());
      setCaptchaInput("");
      return;
    }

    if (!form.name.trim() || !form.email.trim() || nachrichtLeer) {
      toast({ title: t.alleFelder, variant: "destructive" });
      return;
    }

    setSending(true);
    const nachricht = form.message.trim();
    const error = await sendeKontaktnachricht({
      name: form.name.trim(),
      email: form.email.trim(),
      message: nachricht,
    }).then(() => null, (err: unknown) => err);

    // Mailbenachrichtigung ohne Warten: Die Nachricht steht bereits in der
    // Datenbank und ist in der Verwaltung sichtbar.
    supabase.functions.invoke("notify-contact", {
      body: { name: form.name.trim(), email: form.email.trim(), message: nachricht },
    }).catch(() => undefined);

    setSending(false);
    if (error) {
      toast({ title: t.fehler, description: t.nichtGesendet, variant: "destructive" });
    } else {
      setSent(true);
    }
  };

  if (sent) {
    return (
      <div className="text-center py-8 animate-in fade-in zoom-in-90 duration-300 motion-reduce:animate-none">
        <CheckCircle2 size={48} className="text-primary mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold mb-2">{t.gesendetTitel}</h2>
        <p className="text-muted-foreground">
          {t.gesendetText}
        </p>
      </div>
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
        <label htmlFor="contact-name" className="text-sm font-medium mb-1.5 block">{t.name} *</label>
        <input
          id="contact-name" type="text" required maxLength={100}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={EINGABE}
          placeholder={t.deinName}
        />
      </div>

      <div>
        <label htmlFor="contact-email" className="text-sm font-medium mb-1.5 block">{t.email} *</label>
        <input
          id="contact-email" type="email" required maxLength={255}
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className={EINGABE}
          placeholder={t.emailBeispiel}
        />
      </div>

      <div ref={editorOrt}>
        <span className="text-sm font-medium mb-1.5 block">{t.nachricht} *</span>
        {editorLaden ? (
          <Suspense fallback={<EditorPlatzhalter />}>
            <ForumEditor
              value={form.message}
              onChange={(html) => setForm((f) => ({ ...f, message: html }))}
              placeholder={t.deineNachricht}
              umfang="knapp"
            />
          </Suspense>
        ) : (
          <EditorPlatzhalter aufwecken={editorJetzt} />
        )}
      </div>

      <div>
        <label htmlFor="contact-captcha" className="text-sm font-medium mb-1.5 block">{mitWerten(t.rechenaufgabe, captcha)}</label>
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
        {sending ? t.wirdGesendet : t.nachrichtSenden}
      </button>
    </form>
  );
}
