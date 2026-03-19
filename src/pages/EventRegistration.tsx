import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import FormFieldRenderer from "@/components/event-forms/FormFieldRenderer";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { motion } from "framer-motion";
import { Calendar, MapPin, CheckCircle2 } from "lucide-react";
import SEO from "@/components/SEO";
import type { FormField } from "@/components/event-forms/types";

interface FormData {
  form: { id: string; title: string; description: string | null; is_open: boolean; event_id: string };
  event: { title: string; start_date: string; end_date: string | null; location: string | null; all_day: boolean };
  fields: FormField[];
}

export default function EventRegistration() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState<FormData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [answers, setAnswers] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!token) return;
    supabase.rpc("get_form_by_token", { _token: token }).then(({ data, error }) => {
      if (error || !data) {
        setLoading(false);
        return;
      }
      setFormData(data as unknown as FormData);
      setLoading(false);
    });
  }, [token]);

  // Pre-fill name for logged-in members
  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("display_name").eq("id", user.id).single().then(({ data }) => {
        if (data) setName(data.display_name);
      });
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!formData || !name.trim()) return;

    // Validate required fields
    for (const field of formData.fields) {
      if (field.required) {
        const val = answers[field.id];
        if (val === undefined || val === null || val === "" || (Array.isArray(val) && val.length === 0)) {
          toast({ title: `"${field.label}" ist ein Pflichtfeld`, variant: "destructive" });
          return;
        }
        if (field.type === "attendance_days" && (!val?.days || val.days.length === 0)) {
          toast({ title: `"${field.label}" ist ein Pflichtfeld`, variant: "destructive" });
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const answerArray = Object.entries(answers).map(([field_id, value]) => ({
        field_id,
        value,
      }));

      const { error } = await supabase.rpc("submit_form_response", {
        _token: token!,
        _name: name.trim(),
        _email: email.trim() || null,
        _answers: answerArray as any,
      });

      if (error) throw error;
      setSubmitted(true);
      toast({ title: "Anmeldung erfolgreich!" });
    } catch (err: any) {
      toast({ title: "Fehler beim Absenden", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-20 text-center">
        <p className="text-muted-foreground">Formular wird geladen...</p>
      </div>
    );
  }

  if (!formData) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Formular nicht gefunden</h2>
        <p className="text-muted-foreground">Dieses Formular existiert nicht oder ist geschlossen.</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container py-20 max-w-lg text-center">
        <SEO title="Anmeldung erfolgreich" description="Deine Anmeldung wurde gespeichert." />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <CheckCircle2 size={64} className="mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-serif font-bold mb-2">Vielen Dank!</h2>
          <p className="text-muted-foreground">Deine Anmeldung für „{formData.event.title}" wurde gespeichert.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-2xl px-4">
      <SEO
        title={`Anmeldung – ${formData.event.title}`}
        description={formData.form.description || `Anmeldeformular für ${formData.event.title}`}
      />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Event info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="font-serif">{formData.event.title}</CardTitle>
            {formData.form.description && (
              <CardDescription>{formData.form.description}</CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Calendar size={14} />
              {format(parseISO(formData.event.start_date), "d. MMMM yyyy", { locale: de })}
              {formData.event.end_date && ` – ${format(parseISO(formData.event.end_date), "d. MMMM yyyy", { locale: de })}`}
            </span>
            {formData.event.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={14} /> {formData.event.location}
              </span>
            )}
          </CardContent>
        </Card>

        {/* Form */}
        <div className="space-y-6">
          {/* Name & Email */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" />
            </div>
            <div>
              <Label>E-Mail</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Für Rückfragen (optional)" />
            </div>
          </div>

          {/* Dynamic fields */}
          {formData.fields.map((field) => (
            <FormFieldRenderer
              key={field.id}
              field={field}
              value={answers[field.id]}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [field.id]: v }))}
              eventStartDate={formData.event.start_date}
              eventEndDate={formData.event.end_date}
              allAnswers={answers}
            />
          ))}

          <Button onClick={handleSubmit} disabled={submitting || !name.trim()} className="w-full" size="lg">
            {submitting ? "Wird gesendet..." : "Anmeldung absenden"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
