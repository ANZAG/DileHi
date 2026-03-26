import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import FormFieldRenderer, { isFieldVisible } from "@/components/event-forms/FormFieldRenderer";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { motion } from "framer-motion";
import { Calendar, MapPin, CheckCircle2 } from "lucide-react";
import SEO from "@/components/SEO";
import type { FormField } from "@/components/event-forms/types";

interface FormData {
  form: { id: string; title: string; description: string | null; is_open: boolean; event_id: string; settings?: { whatsapp_link?: string; opens_at?: string; closes_at?: string } };
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingResponseId, setExistingResponseId] = useState<string | null>(null);

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

  // Pre-fill name and email for logged-in members
  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("display_name").eq("id", user.id).single().then(({ data }) => {
        if (data) setName(data.display_name);
      });
      setEmail(user.email || "");
    }
  }, [user]);

  // Load existing response if user already submitted
  useEffect(() => {
    if (!user || !formData?.form.id) return;
    (async () => {
      const { data: responses } = await supabase
        .from("event_form_responses")
        .select("id, respondent_name, respondent_email")
        .eq("form_id", formData.form.id)
        .eq("user_id", user.id)
        .limit(1);

      if (responses && responses.length > 0) {
        const resp = responses[0];
        setExistingResponseId(resp.id);
        setIsEditMode(true);
        setName(resp.respondent_name);
        if (resp.respondent_email) setEmail(resp.respondent_email);

        // Load existing answers
        const { data: existingAnswers } = await supabase
          .from("event_form_answers")
          .select("field_id, value")
          .eq("response_id", resp.id);

        if (existingAnswers && existingAnswers.length > 0) {
          const answerMap: Record<string, any> = {};
          existingAnswers.forEach((a) => {
            answerMap[a.field_id] = a.value;
          });
          setAnswers(answerMap);
        }
      }
    })();
  }, [user, formData?.form.id]);

  // Fetch member's saved tents
  const { data: memberTents = [] } = useQuery({
    queryKey: ["member_tents", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_tents")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at");
      if (error) return [];
      return data;
    },
  });

  // Auto-redirect after submission
  useEffect(() => {
    if (submitted && user) {
      const timer = setTimeout(() => {
        window.location.href = "/intern/veranstaltungen";
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [submitted, user]);

  const handleSubmit = async () => {
    if (!formData || !name.trim()) return;

    const visibleFields = formData.fields.filter(
      (f) => f.type !== "section" && isFieldVisible(f, formData.fields, answers)
    );
    for (const field of visibleFields) {
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
      if (isEditMode && existingResponseId) {
        // Update existing response
        const { error: respError } = await supabase
          .from("event_form_responses")
          .update({ respondent_name: name.trim(), respondent_email: email.trim() || null })
          .eq("id", existingResponseId);
        if (respError) throw respError;

        // Upsert answers: delete old, insert new
        await supabase
          .from("event_form_answers")
          .delete()
          .eq("response_id", existingResponseId);

        const answerRows = visibleFields
          .filter((f) => answers[f.id] !== undefined)
          .map((f) => ({
            response_id: existingResponseId,
            field_id: f.id,
            value: answers[f.id],
          }));

        if (answerRows.length > 0) {
          const { error: ansError } = await supabase
            .from("event_form_answers")
            .insert(answerRows);
          if (ansError) throw ansError;
        }

        setSubmitted(true);
        toast({ title: "Anmeldung aktualisiert!" });
      } else {
        // New submission
        const answerArray = visibleFields
          .filter((f) => answers[f.id] !== undefined)
          .map((f) => ({
            field_id: f.id,
            value: answers[f.id],
          }));

        const { error } = await supabase.rpc("submit_form_response", {
          _token: token!,
          _name: name.trim(),
          _email: email.trim() || null,
          _answers: answerArray as any,
        });

        if (error) throw error;

        // Auto-RSVP for logged-in members
        if (user && formData.form.event_id) {
          await supabase.from("event_attendees").upsert(
            { event_id: formData.form.event_id, user_id: user.id },
            { onConflict: "event_id,user_id", ignoreDuplicates: true }
          ).then(() => {});
        }

        // Send confirmation email
        if (email.trim()) {
          const eventDateStr = formData.event.start_date
            ? format(parseISO(formData.event.start_date), "d. MMMM yyyy", { locale: de }) +
              (formData.event.end_date ? ` – ${format(parseISO(formData.event.end_date), "d. MMMM yyyy", { locale: de })}` : "")
            : "";

          supabase.functions.invoke("confirm-registration", {
            body: {
              email: email.trim(),
              name: name.trim(),
              eventTitle: formData.event.title,
              eventDate: eventDateStr,
              eventLocation: formData.event.location || "",
              whatsappLink: formData.form.settings?.whatsapp_link || "",
            },
          }).catch(() => {});
        }

        setSubmitted(true);
        toast({ title: "Anmeldung erfolgreich!" });
      }
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
  // Check time window
  const now = new Date();
  const opensAt = formData?.form.settings?.opens_at ? new Date(formData.form.settings.opens_at) : null;
  const closesAt = formData?.form.settings?.closes_at ? new Date(formData.form.settings.closes_at) : null;
  const isOutsideWindow = (opensAt && now < opensAt) || (closesAt && now > closesAt);

  if (formData && !submitted && isOutsideWindow) {
    return (
      <div className="container py-20 text-center">
        <h2 className="text-xl font-bold mb-2">Anmeldung nicht möglich</h2>
        <p className="text-muted-foreground">
          {opensAt && now < opensAt
            ? `Die Anmeldung öffnet am ${format(opensAt, "d. MMMM yyyy, HH:mm 'Uhr'", { locale: de })}.`
            : `Die Anmeldung ist seit dem ${format(closesAt!, "d. MMMM yyyy, HH:mm 'Uhr'", { locale: de })} geschlossen.`}
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="container py-20 max-w-lg text-center">
        <SEO title="Anmeldung erfolgreich" description="Deine Anmeldung wurde gespeichert." />
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <CheckCircle2 size={64} className="mx-auto text-primary mb-4" />
          <h2 className="text-2xl font-serif font-bold mb-2">
            {isEditMode ? "Änderungen gespeichert!" : "Vielen Dank!"}
          </h2>
          <p className="text-muted-foreground">
            {isEditMode
              ? `Deine Anmeldung für „${formData.event.title}" wurde aktualisiert.`
              : `Deine Anmeldung für „${formData.event.title}" wurde gespeichert.`}
          </p>
          {!isEditMode && email.trim() && (
            <p className="text-sm text-muted-foreground mt-2">Eine Bestätigung wurde an {email} gesendet.</p>
          )}
          {user && (
            <p className="text-sm text-muted-foreground mt-3">Du wirst in 3 Sekunden zurückgeleitet…</p>
          )}
          <Button variant="outline" className="mt-4" onClick={() => window.history.back()}>
            Zurück
          </Button>
        </motion.div>
      </div>
    );
  }

  const visibleFields = formData.fields.filter(
    (f) => f.type === "section" || isFieldVisible(f, formData.fields, answers)
  );

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

        {isEditMode && (
          <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-sm text-primary">
            Du bearbeitest deine bestehende Anmeldung. Änderungen werden beim Speichern übernommen.
          </div>
        )}

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
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Für Bestätigungsmail" />
            </div>
          </div>

          {/* Dynamic fields */}
          {visibleFields.map((field) => (
            <FormFieldRenderer
              key={field.id}
              field={field}
              value={answers[field.id]}
              onChange={(v) => setAnswers((prev) => ({ ...prev, [field.id]: v }))}
              eventStartDate={formData.event.start_date}
              eventEndDate={formData.event.end_date}
              memberTents={memberTents}
            />
          ))}

          <Button onClick={handleSubmit} disabled={submitting || !name.trim()} className="w-full" size="lg">
            {submitting ? "Wird gespeichert..." : isEditMode ? "Änderungen speichern" : "Anmeldung absenden"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
