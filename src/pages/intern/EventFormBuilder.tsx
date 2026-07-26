import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, Plus, Trash2, Copy, Link as LinkIcon, FileText, Settings, Save, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import type { FormField } from "@/components/event-forms/types";
import FieldListEditor from "@/components/event-forms/FieldListEditor";
import FormPreview from "@/components/event-forms/FormPreview";
import { fetchDefaultTemplate } from "@/components/event-forms/templateStore";
import EventMapSettings from "@/components/evaluation/EventMapSettings";

export default function EventFormBuilder() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasPermission } = useAuth();
  const isVorstand = hasPermission("events.moderate");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleBack = () => navigate("/intern/veranstaltungen");

  const [showSettings, setShowSettings] = useState(() => location.state?.openSettings === true);
  const [draft, setDraft] = useState<FormField[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  const { data: form, isLoading: formLoading } = useQuery({
    queryKey: ["event_form", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_forms")
        .select("*")
        .eq("event_id", eventId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!eventId,
  });

  const { data: fields = [] } = useQuery({
    queryKey: ["event_form_fields", form?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_form_fields")
        .select("*")
        .eq("form_id", form!.id)
        .order("sort_order");
      if (error) throw error;
      return data as FormField[];
    },
    enabled: !!form?.id,
  });

  // Serverzustand in den Entwurf übernehmen (nur wenn nichts Ungespeichertes offen ist)
  useEffect(() => {
    if (dirty) return;
    setDraft(fields.map((f) => ({ ...f, options: f.options || [], settings: f.settings || {} })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields]);

  const createForm = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("event_forms")
        .insert({
          event_id: eventId!,
          title: event?.title || "Anmeldeformular",
          created_by: user!.id,
          settings: { spacing_m: 0, club_tents: [], whatsapp_link: "" },
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event_form", eventId] }),
  });

  const loadTemplate = async () => {
    const template = await fetchDefaultTemplate();
    setDraft(
      template.fields.map((f, i) => ({
        ...f,
        id: `new-${crypto.randomUUID()}`,
        sort_order: i,
      }))
    );
    setActiveId(null);
    setDirty(true);
    toast({ title: "Vorlage geladen", description: "Prüfe die Fragen und speichere anschließend." });
  };

  const saveFields = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const keptIds = draft.filter((f) => !f.id.startsWith("new-")).map((f) => f.id);
      const removed = fields.filter((f) => !keptIds.includes(f.id));
      if (removed.length > 0) {
        const { error } = await supabase
          .from("event_form_fields")
          .delete()
          .in("id", removed.map((f) => f.id));
        if (error) throw error;
      }

      const inserts = draft
        .map((f, i) => ({ f, i }))
        .filter(({ f }) => f.id.startsWith("new-"))
        .map(({ f, i }) => ({
          form_id: form.id,
          type: f.type,
          label: f.label,
          description: f.description,
          required: f.required,
          sort_order: i,
          options: f.options || [],
          settings: f.settings || {},
        }));
      if (inserts.length > 0) {
        const { error } = await supabase.from("event_form_fields").insert(inserts);
        if (error) throw error;
      }

      const updates = draft
        .map((f, i) => ({ f, i }))
        .filter(({ f }) => !f.id.startsWith("new-"))
        .map(({ f, i }) =>
          supabase
            .from("event_form_fields")
            .update({
              label: f.label,
              description: f.description,
              required: f.required,
              options: f.options || [],
              settings: f.settings || {},
              sort_order: i,
            })
            .eq("id", f.id)
        );
      await Promise.all(updates);
    },
    onSuccess: () => {
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ["event_form_fields"] });
      toast({ title: "Formular gespeichert" });
    },
    onError: (e: any) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const deleteForm = useMutation({
    mutationFn: async () => {
      if (!form) return;
      await supabase.from("event_form_answers").delete().in(
        "response_id",
        (await supabase.from("event_form_responses").select("id").eq("form_id", form.id)).data?.map((r: any) => r.id) || []
      );
      await supabase.from("event_form_responses").delete().eq("form_id", form.id);
      await supabase.from("event_form_fields").delete().eq("form_id", form.id);
      const { error } = await supabase.from("event_forms").delete().eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_form", eventId] });
      setShowSettings(false);
      setDirty(false);
      toast({ title: "Formular gelöscht" });
    },
  });

  const updateForm = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!form) return;
      const { error } = await supabase.from("event_forms").update(updates).eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event_form", eventId] }),
  });

  // Auto-Schließung: Anmeldeschluss überschritten → Formular schließen
  useEffect(() => {
    if (!form?.is_open) return;
    const closesAt = (form.settings as any)?.closes_at;
    if (closesAt && new Date(closesAt).getTime() < Date.now()) {
      updateForm.mutate({ is_open: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.id, form?.is_open, (form?.settings as any)?.closes_at]);

  const copyPublicLink = () => {
    if (form?.public_token) {
      const url = `${window.location.origin}/anmeldung/${form.public_token}`;
      navigator.clipboard.writeText(url);
      toast({ title: "Link kopiert", description: "Gäste können sich über diesen Link anmelden." });
    }
  };

  const discard = () => {
    setDraft(fields.map((f) => ({ ...f, options: f.options || [], settings: f.settings || {} })));
    setDirty(false);
    setActiveId(null);
  };

  const eventDates = useMemo(
    () => ({
      start: (event as any)?.start_date || (event as any)?.event_date || undefined,
      end: (event as any)?.end_date || null,
    }),
    [event]
  );

  if (!eventId) return null;

  return (
    <div className="container py-8 max-w-6xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={handleBack}><ArrowLeft size={20} /></Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-2xl font-bold">Anmeldeformular</h1>
            {event && <p className="text-sm text-muted-foreground truncate">{event.title}</p>}
          </div>
        </div>

        {!formLoading && !form && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Noch kein Formular vorhanden</h3>
            <p className="text-sm text-muted-foreground mb-4">Erstelle ein Anmeldeformular für diese Veranstaltung.</p>
            <Button onClick={() => createForm.mutate()} disabled={createForm.isPending}>
              <Plus size={16} className="mr-1" /> Formular anlegen
            </Button>
          </div>
        )}

        {form && (
          <div className="space-y-4">
            {/* Actions bar */}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={copyPublicLink}>
                <LinkIcon size={14} className="mr-1" /> Link kopieren
              </Button>
              <Button variant="outline" size="sm" onClick={loadTemplate}>
                <Copy size={14} className="mr-1" /> Vorlage laden
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
                <Settings size={14} className="mr-1" /> Einstellungen
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/intern/veranstaltungen/${eventId}/auswertung`} state={{ from: `/intern/veranstaltungen/${eventId}/formular` }}>
                  Auswertung →
                </Link>
              </Button>
              <div className="flex items-center gap-2 sm:ml-auto">
                <Label className="text-sm">Anmeldung möglich</Label>
                <Switch
                  checked={form.is_open}
                  onCheckedChange={(checked) => updateForm.mutate({ is_open: checked })}
                />
              </div>
            </div>

            {/* Speicherleiste */}
            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
              <p className="text-xs text-muted-foreground flex-1 min-w-[12rem]">
                {dirty
                  ? "Du hast ungespeicherte Änderungen."
                  : "Alle Änderungen sind gespeichert."}
              </p>
              {dirty && (
                <Button variant="ghost" size="sm" onClick={discard}>
                  <RotateCcw size={14} className="mr-1" /> Verwerfen
                </Button>
              )}
              <Button size="sm" onClick={() => saveFields.mutate()} disabled={!dirty || saveFields.isPending}>
                <Save size={14} className="mr-1" /> Speichern
              </Button>
            </div>

            {/* Split-View: Bearbeiten | Vorschau */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              <FieldListEditor
                fields={draft}
                onChange={(next) => {
                  setDraft(next);
                  setDirty(true);
                }}
                activeId={activeId}
                onActiveChange={setActiveId}
              />

              <div className="lg:sticky lg:top-20 self-start w-full">
                <FormPreview
                  title={form.title}
                  description={form.description}
                  fields={draft}
                  eventStartDate={eventDates.start}
                  eventEndDate={eventDates.end}
                  highlightFieldId={activeId}
                />
              </div>
            </div>
          </div>
        )}

        {/* Settings Dialog */}
        <Dialog open={showSettings} onOpenChange={setShowSettings}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Formular-Einstellungen</DialogTitle>
            </DialogHeader>
            {form && (
              <div className="space-y-4">
                <div>
                  <Label>Formular-Titel</Label>
                  <Input
                    defaultValue={form.title}
                    onBlur={(e) => updateForm.mutate({ title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Beschreibung</Label>
                  <Textarea
                    defaultValue={form.description || ""}
                    onBlur={(e) => updateForm.mutate({ description: e.target.value || null })}
                    rows={2}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Öffnet am</Label>
                    <Input
                      type="datetime-local"
                      defaultValue={form.settings?.opens_at || ""}
                      onBlur={(e) => {
                        updateForm.mutate({ settings: { ...form.settings, opens_at: e.target.value || null } });
                      }}
                    />
                  </div>
                  <div>
                    <Label>Schließt am</Label>
                    <Input
                      type="datetime-local"
                      defaultValue={form.settings?.closes_at || ""}
                      onBlur={(e) => {
                        updateForm.mutate({ settings: { ...form.settings, closes_at: e.target.value || null } });
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground col-span-2">Leer lassen = unbegrenzt. Wird zusätzlich zum Schalter „Anmeldung möglich" geprüft.</p>
                </div>
                <div>
                  <Label>Zelt-Abstand / Laufweg (m)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    defaultValue={form.settings?.spacing_m ?? 0}
                    onBlur={(e) => {
                      const spacing = Number(e.target.value) || 0;
                      updateForm.mutate({ settings: { ...form.settings, spacing_m: spacing } });
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Zusätzlicher Radius/Rand pro Zelt für Laufwege</p>
                </div>
                <div>
                  <Label>WhatsApp-Gruppenlink</Label>
                  <Input
                    defaultValue={form.settings?.whatsapp_link || ""}
                    onBlur={(e) => {
                      updateForm.mutate({ settings: { ...form.settings, whatsapp_link: e.target.value.trim() } });
                    }}
                    placeholder="https://chat.whatsapp.com/..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">Wird in der Bestätigungsmail mit QR-Code angezeigt</p>
                </div>
                <div>
                  <Label className="mb-2 block">Öffentlicher Link</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/anmeldung/${form.public_token}`}
                      className="text-xs"
                    />
                    <Button variant="outline" size="sm" onClick={copyPublicLink}>
                      <Copy size={14} />
                    </Button>
                  </div>
                </div>

                <EventMapSettings
                  eventId={eventId!}
                  formId={form.id}
                  mapImagePath={(form.settings as any)?.map_image_path}
                  mapScale={(form.settings as any)?.map_scale}
                  onChange={(patch) => updateForm.mutate({ settings: { ...form.settings, ...patch } })}
                />

                {/* Formular löschen – nur Vorstand */}
                {isVorstand && (
                  <div className="border-t pt-4">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="w-full">
                          <Trash2 size={14} className="mr-1" /> Formular unwiderruflich löschen
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Formular löschen?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Alle Felder und Anmeldungen werden unwiderruflich gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteForm.mutate()}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Endgültig löschen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setShowSettings(false)}>Schließen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
