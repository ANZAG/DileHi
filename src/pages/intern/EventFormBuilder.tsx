import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { ArrowLeft, Plus, GripVertical, Trash2, Copy, Link as LinkIcon, FileText, Settings, Pencil, X } from "lucide-react";
import { motion } from "framer-motion";
import { FIELD_TYPES, type FormField } from "@/components/event-forms/types";
import { DEFAULT_TEMPLATE_FIELDS } from "@/components/event-forms/defaultTemplate";

export default function EventFormBuilder() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isVorstand } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleBack = () => {
    const referrer = (location.state as any)?.from as string | undefined;
    if (referrer) {
      navigate(referrer);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/intern/veranstaltungen");
    }
  };

  const [showAddField, setShowAddField] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldDescription, setNewFieldDescription] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Conditional logic state for add/edit
  const [newCondOn, setNewCondOn] = useState("");
  const [newCondValue, setNewCondValue] = useState("true");

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_form", eventId] });
    },
  });

  const loadTemplate = useMutation({
    mutationFn: async () => {
      if (!form) return;
      await supabase.from("event_form_fields").delete().eq("form_id", form.id);
      const inserts = DEFAULT_TEMPLATE_FIELDS.map((f, i) => ({
        form_id: form.id,
        type: f.type,
        label: f.label,
        description: f.description,
        required: f.required,
        sort_order: i,
        options: f.options,
        settings: f.settings,
      }));
      const { error } = await supabase.from("event_form_fields").insert(inserts);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_form_fields"] });
      toast({ title: "Standardvorlage geladen" });
    },
  });

  const deleteForm = useMutation({
    mutationFn: async () => {
      if (!form) return;
      // Delete fields first, then form
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
      toast({ title: "Formular gelöscht" });
    },
  });

  const addField = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const options = ["select", "multi_select"].includes(newFieldType)
        ? newFieldOptions.split("\n").map((s) => s.trim()).filter(Boolean)
        : [];
      const settings: Record<string, any> = {};
      if (newCondOn) {
        settings.conditional_on = newCondOn;
        if (newCondValue === "false") settings.conditional_value = false;
      }
      const { error } = await supabase.from("event_form_fields").insert({
        form_id: form.id,
        type: newFieldType,
        label: newFieldLabel,
        description: newFieldDescription || null,
        required: newFieldRequired,
        sort_order: fields.length,
        options,
        settings,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_form_fields"] });
      setShowAddField(false);
      resetFieldForm();
      toast({ title: "Feld hinzugefügt" });
    },
  });

  const updateField = useMutation({
    mutationFn: async (field: FormField) => {
      const { error } = await supabase
        .from("event_form_fields")
        .update({
          label: field.label,
          description: field.description,
          required: field.required,
          options: field.options,
          settings: field.settings,
        })
        .eq("id", field.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_form_fields"] });
      setEditingField(null);
      toast({ title: "Feld aktualisiert" });
    },
  });

  const deleteField = useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase.from("event_form_fields").delete().eq("id", fieldId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_form_fields"] });
    },
  });

  const reorderFields = useMutation({
    mutationFn: async (reordered: FormField[]) => {
      const updates = reordered.map((f, i) =>
        supabase.from("event_form_fields").update({ sort_order: i }).eq("id", f.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_form_fields"] });
    },
  });

  const updateForm = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!form) return;
      const { error } = await supabase.from("event_forms").update(updates).eq("id", form.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_form", eventId] });
    },
  });

  const resetFieldForm = () => {
    setNewFieldType("text");
    setNewFieldLabel("");
    setNewFieldDescription("");
    setNewFieldRequired(false);
    setNewFieldOptions("");
    setNewCondOn("");
    setNewCondValue("true");
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = [...fields];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    reorderFields.mutate(reordered);
  };

  const copyPublicLink = () => {
    if (form?.public_token) {
      const url = `${window.location.origin}/anmeldung/${form.public_token}`;
      navigator.clipboard.writeText(url);
      toast({ title: "Link kopiert", description: "Gäste können sich über diesen Link anmelden." });
    }
  };

  const fieldTypeLabel = (type: string) => FIELD_TYPES.find((f) => f.value === type)?.label || type;

  // Get labels of checkbox/select fields for conditional logic dropdown
  const conditionalCandidates = fields.filter((f) => f.type === "checkbox" || f.type === "select");

  if (!eventId) return null;

  return (
    <div className="container py-8 max-w-3xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={handleBack}><ArrowLeft size={20} /></Button>
          <div className="flex-1">
            <h1 className="font-serif text-2xl font-bold">Anmeldeformular</h1>
            {event && <p className="text-sm text-muted-foreground">{event.title}</p>}
          </div>
        </div>

        {!formLoading && !form && (
          <div className="text-center py-12 border-2 border-dashed rounded-lg">
            <FileText size={48} className="mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">Noch kein Formular vorhanden</h3>
            <p className="text-sm text-muted-foreground mb-4">Erstelle ein Anmeldeformular für diese Veranstaltung.</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => createForm.mutate()} disabled={createForm.isPending}>
                <Plus size={16} className="mr-1" /> Leeres Formular
              </Button>
            </div>
          </div>
        )}

        {form && (
          <div className="space-y-6">
            {/* Actions bar */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyPublicLink}>
                <LinkIcon size={14} className="mr-1" /> Link kopieren
              </Button>
              <Button variant="outline" size="sm" onClick={() => loadTemplate.mutate()} disabled={loadTemplate.isPending}>
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
              <div className="flex items-center gap-2 ml-auto">
                <Label className="text-sm">Anmeldung möglich</Label>
                <Switch
                  checked={form.is_open}
                  onCheckedChange={(checked) => updateForm.mutate({ is_open: checked })}
                />
              </div>
            </div>

            {/* Fields list */}
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="fields">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                    {fields.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                        <p>Noch keine Felder. Füge Felder hinzu oder lade die Standardvorlage.</p>
                      </div>
                    )}
                    {fields.map((field, index) => (
                      <Draggable key={field.id} draggableId={field.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center gap-2 p-3 border rounded-lg bg-card transition-shadow ${
                              snapshot.isDragging ? "shadow-lg" : ""
                            } ${field.type === "section" ? "bg-muted border-primary/20" : ""}`}
                          >
                            <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground">
                              <GripVertical size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm truncate ${field.type === "section" ? "font-serif font-bold text-base" : "font-medium"}`}>{field.label}</span>
                                {field.required && field.type !== "section" && <Badge variant="destructive" className="text-[10px] px-1 py-0">Pflicht</Badge>}
                                {field.settings?.conditional_on && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0" title={`Sichtbar wenn: ${field.settings.conditional_on} = ${field.settings.conditional_value ?? "Ja"}`}>
                                    Bedingt
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground">{fieldTypeLabel(field.type)}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setEditingField({ ...field });
                                setNewFieldOptions((field.options || []).join("\n"));
                                setNewCondOn(field.settings?.conditional_on || "");
                                setNewCondValue(field.settings?.conditional_value === false ? "false" : "true");
                              }}
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => deleteField.mutate(field.id)}
                            >
                              <Trash2 size={14} className="text-destructive" />
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            <Button variant="outline" className="w-full" onClick={() => { resetFieldForm(); setShowAddField(true); }}>
              <Plus size={16} className="mr-1" /> Feld hinzufügen
            </Button>
          </div>
        )}

        {/* Add Field Dialog */}
        <Dialog open={showAddField} onOpenChange={setShowAddField}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Neues Feld</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Feldtyp</Label>
                <Select value={newFieldType} onValueChange={setNewFieldType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Bezeichnung</Label>
                <Input value={newFieldLabel} onChange={(e) => setNewFieldLabel(e.target.value)} placeholder="z.B. Allergien" />
              </div>
              <div>
                <Label>Beschreibung (optional)</Label>
                <Input value={newFieldDescription} onChange={(e) => setNewFieldDescription(e.target.value)} />
              </div>
              {["select", "multi_select"].includes(newFieldType) && (
                <div>
                  <Label>Optionen (eine pro Zeile)</Label>
                  <Textarea value={newFieldOptions} onChange={(e) => setNewFieldOptions(e.target.value)} rows={4} placeholder={"Option 1\nOption 2\nOption 3"} />
                </div>
              )}
              <div className="flex items-center gap-2">
                <Switch checked={newFieldRequired} onCheckedChange={setNewFieldRequired} />
                <Label>Pflichtfeld</Label>
              </div>
              {/* Conditional logic */}
              <div className="border-t pt-3 space-y-3">
                <Label className="text-sm font-semibold">Bedingte Anzeige (optional)</Label>
                <p className="text-xs text-muted-foreground">Feld nur anzeigen, wenn ein anderes Feld einen bestimmten Wert hat.</p>
                <div>
                  <Label className="text-xs">Abhängig von Feld</Label>
                  <Select value={newCondOn} onValueChange={setNewCondOn}>
                    <SelectTrigger><SelectValue placeholder="Kein (immer sichtbar)" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value=" ">Kein (immer sichtbar)</SelectItem>
                      {conditionalCandidates.map((f) => (
                        <SelectItem key={f.id} value={f.label}>{f.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {newCondOn && newCondOn.trim() && (
                  <div>
                    <Label className="text-xs">Erwarteter Wert</Label>
                    <Select value={newCondValue} onValueChange={setNewCondValue}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Ja / aktiviert</SelectItem>
                        <SelectItem value="false">Nein / nicht aktiviert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddField(false)}>Abbrechen</Button>
              <Button onClick={() => addField.mutate()} disabled={!newFieldLabel || addField.isPending}>Hinzufügen</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Field Dialog */}
        <Dialog open={!!editingField} onOpenChange={(open) => { if (!open) setEditingField(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Feld bearbeiten</DialogTitle>
            </DialogHeader>
            {editingField && (
              <div className="space-y-4">
                <div>
                  <Label>Bezeichnung</Label>
                  <Input
                    value={editingField.label}
                    onChange={(e) => setEditingField({ ...editingField, label: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Beschreibung</Label>
                  <Input
                    value={editingField.description || ""}
                    onChange={(e) => setEditingField({ ...editingField, description: e.target.value || null })}
                  />
                </div>
                {["select", "multi_select"].includes(editingField.type) && (
                  <div>
                    <Label>Optionen (eine pro Zeile)</Label>
                    <Textarea
                      value={newFieldOptions}
                      onChange={(e) => setNewFieldOptions(e.target.value)}
                      rows={4}
                    />
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingField.required}
                    onCheckedChange={(checked) => setEditingField({ ...editingField, required: checked })}
                  />
                  <Label>Pflichtfeld</Label>
                </div>
                {/* Conditional logic editing */}
                <div className="border-t pt-3 space-y-3">
                  <Label className="text-sm font-semibold">Bedingte Anzeige</Label>
                  <div>
                    <Label className="text-xs">Abhängig von Feld</Label>
                    <Select
                      value={newCondOn || " "}
                      onValueChange={(v) => {
                        setNewCondOn(v.trim());
                        if (!v.trim()) {
                          const { conditional_on, conditional_value, ...rest } = editingField.settings || {};
                          setEditingField({ ...editingField, settings: rest });
                        }
                      }}
                    >
                      <SelectTrigger><SelectValue placeholder="Kein (immer sichtbar)" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value=" ">Kein (immer sichtbar)</SelectItem>
                        {conditionalCandidates.filter((f) => f.id !== editingField.id).map((f) => (
                          <SelectItem key={f.id} value={f.label}>{f.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {newCondOn && newCondOn.trim() && (
                    <div>
                      <Label className="text-xs">Erwarteter Wert</Label>
                      <Select value={newCondValue} onValueChange={setNewCondValue}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Ja / aktiviert</SelectItem>
                          <SelectItem value="false">Nein / nicht aktiviert</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingField(null)}>Abbrechen</Button>
              <Button
                onClick={() => {
                  if (!editingField) return;
                  const updated = { ...editingField };
                  if (["select", "multi_select"].includes(updated.type)) {
                    updated.options = newFieldOptions.split("\n").map((s) => s.trim()).filter(Boolean);
                  }
                  // Update conditional logic
                  const settings = { ...(updated.settings || {}) };
                  if (newCondOn && newCondOn.trim()) {
                    settings.conditional_on = newCondOn.trim();
                    if (newCondValue === "false") {
                      settings.conditional_value = false;
                    } else {
                      delete settings.conditional_value;
                    }
                  } else {
                    delete settings.conditional_on;
                    delete settings.conditional_value;
                  }
                  updated.settings = settings;
                  updateField.mutate(updated);
                }}
              >
                Speichern
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

                {/* Delete form - only for Vorstand */}
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
