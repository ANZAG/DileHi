import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { useSiteImage } from "@/hooks/useSiteImage";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PublicPersonasSection from "@/components/PublicPersonasSection";

const FuerVeranstalter = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: "", organisation: "", email: "", eventType: "", date: "", location: "", visitors: "", epoch: "", message: "" });

  const lederworkshopImg = useSiteImage("lederworkshop-veranstalter");
  const epochenUebersichtImg = useSiteImage("epochen-uebersicht-veranstalter");

  const handleChange = (field: string, value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.organisation || !form.email) {
      toast({ title: "Bitte alle Pflichtfelder ausfüllen.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const messageText = [
      `Name: ${form.name}`, `Organisation: ${form.organisation}`, `Art: ${form.eventType}`, `Datum: ${form.date}`, `Ort: ${form.location}`,
      form.visitors ? `Besucherzahl: ${form.visitors}` : null, form.epoch ? `Epoche: ${form.epoch}` : null, form.message ? `Nachricht: ${form.message}` : null,
    ].filter(Boolean).join("\n");
    const { error } = await supabase.from("contact_messages").insert({ name: form.name.trim().slice(0, 100), email: form.email.trim().slice(0, 255), message: messageText.slice(0, 5000) });
    supabase.functions.invoke("notify-contact", { body: { name: form.name.trim(), email: form.email.trim(), message: messageText } }).catch(() => {});
    setLoading(false);
    if (error) {
      toast({ title: "Fehler beim Senden.", variant: "destructive" });
    } else {
      toast({ title: "Anfrage gesendet!", description: "Wir melden uns bei Ihnen." });
      setForm({ name: "", organisation: "", email: "", eventType: "", date: "", location: "", visitors: "", epoch: "", message: "" });
    }
  };

  return (
    <div>
      <SEO title="Living History für Veranstalter – Nassauer Geschichte erleben" description="Wir bringen nassauische Geschichte auf Ihre Veranstaltung: Mittelalter, Napoleonik und Erster Weltkrieg, quellenbasiert dargestellt – für Museen, Städte und historische Orte." url="/fuer-veranstalter" image="/lederworkshop.webp" />
      <section className="bg-card py-16 md:py-20">
        <div className="container max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">Nassauer Geschichte auf Ihrer Veranstaltung</h1>
            <p className="text-muted-foreground leading-relaxed">Wir sind ein Wiesbadener Verein, der Alltag, Handwerk und Militärgeschichte des Nassauer Landes zeigt – vom Mittelalter über die Napoleonik bis zum Ersten Weltkrieg. Kein Mittelaltermarkt-Klischee, sondern Zeug zum Anfassen, Nachfragen und Staunen.</p>
          </motion.div>
        </div>
      </section>
      <div className="container max-w-3xl mx-auto py-12 md:py-16 space-y-12">
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-serif text-2xl font-semibold mb-4">Was wir mitbringen</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4">
            <p>Auf dem Platz stehen bei uns die Dinge im Mittelpunkt: rekonstruierte Kleidung, Werkzeug, Ausrüstung und Handwerk. Dazu erzählen wir, wofür das alles gut war – verständlich, ohne Vortragston, für Schulklassen genauso wie für Fachpublikum.</p>
            <p>Wir sind dabei keine Kulisse, sondern ansprechbar. Besucher dürfen fragen, genauer hinsehen und auch mal etwas in die Hand nehmen.</p>
            <p>Vieles davon entsteht in Eigenarbeit in der Gruppe – nach Museumsfunden, zeitgenössischen Abbildungen und dem aktuellen Forschungsstand.</p>
            <p>Wir treten gegen eine Aufwandsentschädigung auf; über die Höhe sprechen wir in Ruhe bei der Anfrage.</p>
          </div>

          <div className="rounded-lg overflow-hidden mt-6 max-w-md mx-auto">
            <img src={lederworkshopImg.src} alt={lederworkshopImg.alt} loading="lazy" className="w-full h-auto object-cover rounded-lg" />
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-serif text-2xl font-semibold mb-4">Unsere drei Epochen</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">Alle drei erzählen ein Stück nassauische Geschichte:</p>
          <ul className="space-y-3 text-muted-foreground">
            <li><span className="font-semibold text-foreground">Spätmittelalter (1290–1310)</span><br />Grafschaft Nassau rund um Wiesbaden – vom Niederadel bis zum Handwerk</li>
            <li><span className="font-semibold text-foreground">Napoleonische Kriege (1815)</span><br />Nassauische Grenadiere des 1. Linien-Regiments</li>
            <li><span className="font-semibold text-foreground">Erster Weltkrieg (1916/17)</span><br />1. Nassauisches Pionier-Bataillon Nr. 21</li>
          </ul>
        </motion.section>

        <div className="rounded-lg overflow-hidden">
          <img src={epochenUebersichtImg.src} alt={epochenUebersichtImg.alt} loading="lazy" className="w-full h-auto object-cover" />
        </div>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-serif text-2xl font-semibold mb-4">Mit wem wir arbeiten</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4">
            <p>Meistens sind das Städte, Museen, Burgen und Klöster oder Veranstaltungen, die Geschichte ernst nehmen.</p>
            <p>Zuhause sind wir in Wiesbaden und im historischen Nassauer Land – grob Rheingau-Taunus, Lahn-Dill und die Nachbarregionen. Unsere Mitglieder wohnen aber über ganz Deutschland verteilt, überregionale Termine sind also möglich.</p>
            <p>Der regionale Fokus ist Absicht: Uns interessiert die Geschichte dieser Gegend und die Menschen, die hier gelebt haben.</p>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="p-8 rounded-xl bg-primary/5 border border-primary/20">
            <h2 className="font-serif text-lg font-semibold mb-3 text-primary">Wo wir gut passen – und wo nicht</h2>
            <div className="text-sm text-foreground/80 leading-relaxed space-y-2">
              <p>Am wohlsten fühlen wir uns dort, wo Inhalt und Vermittlung zählen.</p>
              <p>Bei reinen Unterhaltungs- oder Fantasy-Formaten sind wir vermutlich nicht die richtige Gruppe.</p>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-serif text-2xl font-semibold mb-4">Anfrage</h2>
          <div className="text-muted-foreground leading-relaxed mb-6 space-y-2">
            <p>Sie möchten uns buchen oder erst einmal unverbindlich fragen? Gerne.</p>
            <p>Je mehr wir über Termin, Ort und Art der Veranstaltung wissen, desto schneller können wir sagen, ob es passt.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2"><Label htmlFor="name">Name *</Label><Input id="name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} required maxLength={100} /></div>
              <div className="space-y-2"><Label htmlFor="organisation">Organisation / Institution *</Label><Input id="organisation" value={form.organisation} onChange={(e) => handleChange("organisation", e.target.value)} required maxLength={200} /></div>
              <div className="space-y-2"><Label htmlFor="email">E-Mail *</Label><Input id="email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} required maxLength={255} /></div>
              <div className="space-y-2"><Label htmlFor="eventType">Art der Veranstaltung</Label><Input id="eventType" value={form.eventType} onChange={(e) => handleChange("eventType", e.target.value)} maxLength={200} /></div>
              <div className="space-y-2"><Label htmlFor="date">Datum / Zeitraum</Label><Input id="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} maxLength={100} /></div>
              <div className="space-y-2"><Label htmlFor="location">Ort der Veranstaltung</Label><Input id="location" value={form.location} onChange={(e) => handleChange("location", e.target.value)} maxLength={200} /></div>
              <div className="space-y-2"><Label htmlFor="visitors">Erwartete Besucherzahl</Label><Select value={form.visitors} onValueChange={(v) => handleChange("visitors", v)}><SelectTrigger id="visitors"><SelectValue placeholder="Bitte wählen" /></SelectTrigger><SelectContent><SelectItem value="bis 100">bis 100</SelectItem><SelectItem value="100–500">100–500</SelectItem><SelectItem value="500–1000">500–1.000</SelectItem><SelectItem value="über 1000">über 1.000</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="epoch">Gewünschte Epoche</Label><Select value={form.epoch} onValueChange={(v) => handleChange("epoch", v)}><SelectTrigger id="epoch"><SelectValue placeholder="Bitte wählen" /></SelectTrigger><SelectContent><SelectItem value="Spätmittelalter">Spätmittelalter</SelectItem><SelectItem value="Napoleonik">Napoleonik</SelectItem><SelectItem value="Erster Weltkrieg">Erster Weltkrieg</SelectItem><SelectItem value="Mehrere">Mehrere</SelectItem><SelectItem value="Offen">Offen</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label htmlFor="message">Nachricht / Weitere Informationen</Label><Textarea id="message" value={form.message} onChange={(e) => handleChange("message", e.target.value)} rows={4} maxLength={5000} /></div>
            <Button type="submit" disabled={loading} className="w-full md:w-auto">{loading ? "Wird gesendet…" : "Anfrage senden"}</Button>
          </form>
        </motion.section>
      </div>

      <PublicPersonasSection />
    </div>
  );
};

export default FuerVeranstalter;
