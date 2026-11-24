import { useState, useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ladeAnmeldeVorgaben, ladeZelte, mitgliedSchluessel } from "@/daten/mitglieder";
import {
  aendereAnmeldungAlsGast, aendereAnmeldungMitAntworten, ladeAnmeldungZumAendern, ladeAntwortenVon,
  ladeEigeneAnmeldung, ladeFormularMitSchluessel, reicheAnmeldungEin, sageZu,
} from "@/daten/veranstaltungen";
import { ausJson } from "@/lib/json";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import FormFieldRenderer, { isFieldVisible } from "@/components/event-forms/FormFieldRenderer";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { EINBLENDEN_KARTE, EINBLENDEN_SEITE } from "@/lib/einblenden";
import { Calendar, MapPin, CheckCircle2, ArrowLeft } from "lucide-react";
import SEO from "@/components/SEO";
import type { FormField } from "@/components/event-forms/types";
import { findFieldByRole } from "@/components/event-forms/fieldRoles";

interface FormData {
  form: { id: string; title: string; description: string | null; is_open: boolean; event_id: string; settings?: { group_link?: string; whatsapp_link?: string; opens_at?: string; closes_at?: string } };
  event: { title: string; start_date: string; end_date: string | null; location: string | null; all_day: boolean };
  fields: FormField[];
}

interface Props {
  /** Wird intern gesetzt, wenn die Anmeldung im Mitgliederbereich laeuft. */
  tokenOverride?: string;
  /** Innerhalb des Mitgliederbereichs: ohne Suchmaschinen-Angaben, mit Rueckweg. */
  internal?: boolean;
}

export default function EventRegistration({ tokenOverride, internal = false }: Props = {}) {
  const { token: tokenFromUrl } = useParams<{ token: string }>();
  const token = tokenOverride ?? tokenFromUrl;
  const [searchParams] = useSearchParams();
  const editToken = searchParams.get("edit");
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
  const [guestEditToken, setGuestEditToken] = useState<string | null>(editToken);

  // Load form by guest edit token
  useEffect(() => {
    if (!editToken) return;
    (async () => {
      const data = await ladeAnmeldungZumAendern(editToken).catch(() => null);
      if (!data) {
        // Fall back to normal token load
        setGuestEditToken(null);
        return;
      }
      // Die Funktion antwortet mit JSON: das Formular wie beim öffentlichen
      // Aufruf, dazu die eigene Anmeldung und ihre Antworten.
      const d = ausJson<FormData & {
        response: { id: string; respondent_name: string; respondent_email: string | null };
        answers: { field_id: string; value: unknown }[] | null;
      }>(data);
      setFormData({
        form: d.form,
        event: d.event,
        fields: d.fields,
      });
      setName(d.response.respondent_name);
      setEmail(d.response.respondent_email || "");
      setExistingResponseId(d.response.id);
      setIsEditMode(true);

      // Load answers
      const answerMap: Record<string, any> = {};
      (d.answers || []).forEach((a) => {
        answerMap[a.field_id] = a.value;
      });
      setAnswers(answerMap);
      setLoading(false);
    })();
  }, [editToken]);

  // Load form by public token (normal flow)
  useEffect(() => {
    if (!token || editToken) return;
    // Ohne Formular – auch bei einem Fehler – zeigt die Seite „nicht gefunden".
    ladeFormularMitSchluessel(token)
      .catch(() => null)
      .then((data) => {
        if (data) setFormData(ausJson<FormData>(data));
        setLoading(false);
      });
  }, [token, editToken]);

  // Vorbefuellung fuer angemeldete Mitglieder. Ernaehrung und Allergien werden
  // ueber die Feldrolle zugeordnet, nicht mehr ueber den Beschriftungstext –
  // sonst bleibt die Vorbefuellung aus, sobald ein Feld anders heisst.
  useEffect(() => {
    if (user && !editToken) {
      // Vorbefüllen ist eine Hilfe, keine Voraussetzung: Ohne Profil bleibt das Formular leer.
      ladeAnmeldeVorgaben(user.id)
        .catch(() => null)
        .then((data) => {
          if (!data) return;
          if (data.display_name) setName(data.display_name);
          // Pre-fill dynamic form fields by matching their label
          if (data.diet || data.allergies) {
            setAnswers((prev) => {
              const updated = { ...prev };
              const all = (formData?.fields ?? []) as FormField[];
              const dietField = findFieldByRole(all, "catering.diet");
              const allergyField = findFieldByRole(all, "catering.allergies");
              if (data.diet && dietField && !updated[dietField.id]) {
                updated[dietField.id] = data.diet;
              }
              if (data.allergies && allergyField && !updated[allergyField.id]) {
                updated[allergyField.id] = data.allergies;
              }
              return updated;
            });
          }
        });
      setEmail(user.email || "");
    }
  }, [user, editToken, formData?.fields]);

  // Load existing response if user already submitted (logged-in members only)
  useEffect(() => {
    if (!user || !formData?.form.id || editToken) return;
    (async () => {
      let resp: Awaited<ReturnType<typeof ladeEigeneAnmeldung>>;
      try {
        resp = await ladeEigeneAnmeldung(formData.form.id, user.id);
      } catch (err) {
        // Sonst legte das Absenden eine zweite Anmeldung neben die erste.
        toast({ title: "Deine Anmeldung ließ sich nicht laden", description: (err as Error).message, variant: "destructive" });
        return;
      }

      if (resp) {
        setExistingResponseId(resp.id);
        setIsEditMode(true);
        setName(resp.respondent_name);
        if (resp.respondent_email) setEmail(resp.respondent_email);

        const existingAnswers = await ladeAntwortenVon(resp.id).catch(
          (err: Error): Awaited<ReturnType<typeof ladeAntwortenVon>> => {
            toast({ title: "Deine Antworten ließen sich nicht laden", description: err.message, variant: "destructive" });
            return [];
          },
        );

        if (existingAnswers.length > 0) {
          const answerMap: Record<string, any> = {};
          existingAnswers.forEach((a) => {
            answerMap[a.field_id] = a.value;
          });
          setAnswers(answerMap);
        }
      }
    })();
  // `toast` ist die eine Funktion des Moduls und ändert sich nie.
  }, [user, formData?.form.id, editToken, toast]);

  // Fetch member's saved tents
  const { data: memberTents = [] } = useQuery({
    queryKey: mitgliedSchluessel.zelteVon(user?.id),
    enabled: !!user,
    queryFn: () => ladeZelte(user!.id),
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
      // Guest edit via edit_token
      if (guestEditToken && !user) {
        const answerArray = visibleFields
          .filter((f) => answers[f.id] !== undefined)
          .map((f) => ({ field_id: f.id, value: answers[f.id] }));

        await aendereAnmeldungAlsGast({
          aenderungsSchluessel: guestEditToken,
          name: name.trim(),
          email: email.trim() || null,
          antworten: answerArray,
        });
        setSubmitted(true);
        toast({ title: "Anmeldung aktualisiert!" });
      } else if (isEditMode && existingResponseId) {
        // Logged-in member edit
        await aendereAnmeldungMitAntworten(
          existingResponseId,
          { name: name.trim(), email: email.trim() || null },
          visibleFields
            .filter((f) => answers[f.id] !== undefined)
            .map((f) => ({ field_id: f.id, value: answers[f.id] })),
        );

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

        const returnedEditToken = await reicheAnmeldungEin({
          token: token!,
          name: name.trim(),
          email: email.trim() || null,
          antworten: answerArray,
        });

        // Auto-RSVP for logged-in members
        if (user && formData.form.event_id) {
          // Die Anmeldung steht schon. Scheitert die Zusage, ist das kein Grund,
          // „Fehler beim Absenden" zu melden – sonst sendet jemand ein zweites Mal.
          await sageZu(formData.form.event_id, user.id).catch((err) =>
            console.warn("Zusage zur Veranstaltung nicht eingetragen:", err),
          );
        }

        // Send confirmation email (content is derived server-side from the edit token)
        if (email.trim() && returnedEditToken) {
          supabase.functions.invoke("confirm-registration", {
            body: { editToken: returnedEditToken },
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
        <h1 className="text-xl font-bold mb-2">Formular nicht gefunden</h1>
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
        <h1 className="text-xl font-bold mb-2">Anmeldung nicht möglich</h1>
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
        {!internal && <SEO title="Anmeldung erfolgreich" description="Deine Anmeldung wurde gespeichert." />}
        <div className={EINBLENDEN_KARTE}>
          <CheckCircle2 size={64} className="mx-auto text-primary mb-4" />
          <h1 className="text-2xl font-serif font-bold mb-2">
            {isEditMode ? "Änderungen gespeichert!" : "Vielen Dank!"}
          </h1>
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
        </div>
      </div>
    );
  }

  const visibleFields = formData.fields.filter(
    (f) => f.type === "section" || isFieldVisible(f, formData.fields, answers)
  );

  return (
    <div className="container py-8 max-w-2xl px-4">
      {!internal && (
        <SEO
          title={`Anmeldung – ${formData.event.title}`}
          description={formData.form.description || `Anmeldeformular für ${formData.event.title}`}
        />
      )}
      {internal && (
        <Link
          to="/intern/veranstaltungen"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft size={16} /> Zurück zu den Veranstaltungen
        </Link>
      )}
      <div className={EINBLENDEN_SEITE}>
        {/* Event info */}
        <Card className="mb-6">
          <CardHeader>
            <h1 className="text-2xl font-serif font-semibold leading-none tracking-tight">
              Anmeldung: {formData.event.title}
            </h1>
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
              <Label htmlFor="registration-name">Name *</Label>
              <Input id="registration-name" name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dein Name" />
            </div>
            <div>
              <Label htmlFor="registration-email">E-Mail</Label>
              <Input id="registration-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Für Bestätigungsmail" />
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
      </div>
    </div>
  );
}
