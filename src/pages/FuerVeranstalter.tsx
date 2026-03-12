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
      <SEO title="Für Veranstalter - Diu lebendec Histôrje" description="Wir arbeiten mit Partnern zusammen, die historische Bildung in den Mittelpunkt stellen. Erfahren Sie mehr über unsere Angebote für Museen, historische Orte und Veranstaltungen." url="/fuer-veranstalter" image="/lederworkshop.jpg" />
      <section className="bg-card py-16 md:py-20">
        <div className="container max-w-3xl mx-auto text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="font-serif text-3xl md:text-4xl font-bold mb-4">Für Veranstalter</h1>
            <p className="text-muted-foreground leading-relaxed">Wir arbeiten mit Partnern zusammen, die historische Bildung und Authentizität in den Mittelpunkt stellen – nicht als Dekoration, sondern als Inhalt.</p>
          </motion.div>
        </div>
      </section>
      <div className="container max-w-3xl mx-auto py-12 md:py-16 space-y-12">
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-serif text-2xl font-semibold mb-4">Was wir bieten</h2>
          <div className="text-muted-foreground leading-relaxed space-y-4">
            <p>Im Mittelpunkt unserer Auftritte stehen Displayarbeit und Wissensvermittlung. Wir präsentieren rekonstruierte Alltagsgegenstände, Kleidung, Ausrüstung und Handwerk und erklären den historischen Kontext fundiert und verständlich für jedes Publikum.</p>
            <p>Wir verstehen uns dabei nicht als Kulisse, sondern als Gesprächspartner. Besucher können Fragen stellen, Objekte aus der Nähe betrachten und mit uns über Geschichte ins Gespräch kommen.</p>
            <p>Viele unserer Ausrüstungsgegenstände und Kleidungsstücke entstehen in eigener Arbeit innerhalb der Gruppe – orientiert an Museumsfunden, zeitgenössischen Abbildungen und aktuellem Forschungsstand.</p>
            <p>Wir treten gegen eine Aufwandsentschädigung auf, über deren Höhe wir uns gerne im Rahmen der Anfrage abstimmen.</p>
          </div>
          <div className="rounded-lg overflow-hidden mt-6 max-w-md mx-auto">
            <img src={lederworkshopImg.src} alt={lederworkshopImg.alt} loading="lazy" className="w-full h-auto object-cover rounded-lg" />
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-serif text-2xl font-semibold mb-4">Unsere Darstellungen</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">Aktuell decken wir drei Epochen der regionalen Geschichte ab:</p>
          <ul className="space-y-3 text-muted-foreground">
            <li><span className="font-semibold text-foreground">Spätmittelalter (1290–1310)</span><br />Grafschaft Nassau im Raum Wiesbaden – vom Niederadel bis zum Handwerk</li>
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
            <p>Unsere Partner sind Städte, Museen, historische Orte wie Burgen und Klöster sowie Veranstaltungen mit dokumentarisch-historischem Anspruch.</p>
            <p>Als Wiesbadener Verein liegt unser geografischer Schwerpunkt auf dem Raum Wiesbaden und dem historischen Nassauer Land – dem Gebiet, das heute grob den Rheingau-Taunus-Kreis, den Lahn-Dill-Kreis und angrenzende Regionen umfasst. Unsere Mitglieder sind jedoch deutschlandweit verteilt, und wir sind grundsätzlich auch überregional für Veranstaltungen verfügbar.</p>
            <p>Dieser regionale Fokus spiegelt sich auch in unseren Darstellungen wider: Wir beschäftigen uns bewusst mit der Geschichte dieser Region und den Menschen, die hier gelebt haben.</p>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="p-8 rounded-xl bg-primary/5 border border-primary/20">
            <h2 className="font-serif text-lg font-semibold mb-3 text-primary">Unser Schwerpunkt</h2>
            <div className="text-sm text-foreground/80 leading-relaxed space-y-2">
              <p>Unser Angebot richtet sich vor allem an Veranstalter, die historischen Inhalt und Vermittlung in den Mittelpunkt stellen.</p>
              <p>Formate, die vor allem auf Unterhaltung oder Fantasy setzen, passen daher in der Regel weniger zu unserer Arbeit.</p>
            </div>
          </div>
        </motion.section>

        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <h2 className="font-serif text-2xl font-semibold mb-4">Anfrage</h2>
          <div className="text-muted-foreground leading-relaxed mb-6 space-y-2">
            <p>Sie möchten uns für eine Veranstaltung anfragen? Wir freuen uns darüber.</p>
            <p>Je mehr Informationen Sie uns bereits zu Termin, Ort und Art der Veranstaltung geben können, desto besser können wir einschätzen, ob und wie wir zusammenpassen.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2"><Label htmlFor="name">Name *</Label><Input id="name" value={form.name} onChange={(e) => handleChange("name", e.target.value)} required maxLength={100} /></div>
              <div className="space-y-2"><Label htmlFor="organisation">Organisation / Institution *</Label><Input id="organisation" value={form.organisation} onChange={(e) => handleChange("organisation", e.target.value)} required maxLength={200} /></div>
              <div className="space-y-2"><Label htmlFor="email">E-Mail *</Label><Input id="email" type="email" value={form.email} onChange={(e) => handleChange("email", e.target.value)} required maxLength={255} /></div>
              <div className="space-y-2"><Label htmlFor="eventType">Art der Veranstaltung</Label><Input id="eventType" value={form.eventType} onChange={(e) => handleChange("eventType", e.target.value)} maxLength={200} /></div>
              <div className="space-y-2"><Label htmlFor="date">Datum / Zeitraum</Label><Input id="date" value={form.date} onChange={(e) => handleChange("date", e.target.value)} maxLength={100} /></div>
              <div className="space-y-2"><Label htmlFor="location">Ort der Veranstaltung</Label><Input id="location" value={form.location} onChange={(e) => handleChange("location", e.target.value)} maxLength={200} /></div>
              <div className="space-y-2"><Label>Erwartete Besucherzahl</Label><Select value={form.visitors} onValueChange={(v) => handleChange("visitors", v)}><SelectTrigger><SelectValue placeholder="Bitte wählen" /></SelectTrigger><SelectContent><SelectItem value="bis 100">bis 100</SelectItem><SelectItem value="100–500">100–500</SelectItem><SelectItem value="500–1000">500–1.000</SelectItem><SelectItem value="über 1000">über 1.000</SelectItem></SelectContent></Select></div>
              <div className="space-y-2"><Label>Gewünschte Epoche</Label><Select value={form.epoch} onValueChange={(v) => handleChange("epoch", v)}><SelectTrigger><SelectValue placeholder="Bitte wählen" /></SelectTrigger><SelectContent><SelectItem value="Spätmittelalter">Spätmittelalter</SelectItem><SelectItem value="Napoleonik">Napoleonik</SelectItem><SelectItem value="Erster Weltkrieg">Erster Weltkrieg</SelectItem><SelectItem value="Mehrere">Mehrere</SelectItem><SelectItem value="Offen">Offen</SelectItem></SelectContent></Select></div>
            </div>
            <div className="space-y-2"><Label htmlFor="message">Nachricht / Weitere Informationen</Label><Textarea id="message" value={form.message} onChange={(e) => handleChange("message", e.target.value)} rows={4} maxLength={5000} /></div>
            <Button type="submit" disabled={loading} className="w-full md:w-auto">{loading ? "Wird gesendet…" : "Anfrage senden"}</Button>
          </form>
        </motion.section>
      </div>
    </div>
  );
};

export default FuerVeranstalter;
