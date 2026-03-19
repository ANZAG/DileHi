import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
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
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { ArrowLeft, Plus, GripVertical, Trash2, Copy, Link as LinkIcon, FileText, Settings, Pencil, X } from "lucide-react";
import { motion } from "framer-motion";
import { FIELD_TYPES, type FormField } from "@/components/event-forms/types";
import { DEFAULT_TEMPLATE_FIELDS } from "@/components/event-forms/defaultTemplate";

export default function EventFormBuilder() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [showAddField, setShowAddField] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [newFieldType, setNewFieldType] = useState("text");
  const [newFieldLabel, setNewFieldLabel] = useState("");
  const [newFieldDescription, setNewFieldDescription] = useState("");
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState("");
  const [showSettings, setShowSettings] = useState(false);

  // Fetch event
  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  // Fetch or create form
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

  // Fetch fields
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

  // Create form if doesn't exist
  const createForm = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from("event_forms")
        .insert({
          event_id: eventId!,
          title: event?.title || "Anmeldeformular",
          created_by: user!.id,
          settings: { spacing_m: 0, club_tents: [] },
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

  // Load template
  const loadTemplate = useMutation({
    mutationFn: async () => {
      if (!form) return;
      // Delete existing fields first
      await supabase.from("event_form_fields").delete().eq("form_id", form.id);
      // Insert template fields
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

  // Add field
  const addField = useMutation({
    mutationFn: async () => {
      if (!form) return;
      const options = ["select", "multi_select"].includes(newFieldType)
        ? newFieldOptions.split("\n").map((s) => s.trim()).filter(Boolean)
        : [];
      const { error } = await supabase.from("event_form_fields").insert({
        form_id: form.id,
        type: newFieldType,
        label: newFieldLabel,
        description: newFieldDescription || null,
        required: newFieldRequired,
        sort_order: fields.length,
        options,
        settings: {},
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

  // Update field
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

  // Delete field
  const deleteField = useMutation({
    mutationFn: async (fieldId: string) => {
      const { error } = await supabase.from("event_form_fields").delete().eq("id", fieldId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event_form_fields"] });
    },
  });

  // Reorder fields
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

  // Update form settings
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

  if (!eventId) return null;

  return (
    <div className="container py-8 max-w-3xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/intern/veranstaltungen"><ArrowLeft size={20} /></Link>
          </Button>
          <div className="flex-1">
            <h1 className="font-serif text-2xl font-bold">Anmeldeformular</h1>
            {event && <p className="text-sm text-muted-foreground">{event.title}</p>}
          </div>
        </div>

        {/* Create form if not exists */}
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

        {/* Form exists - show builder */}
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
                <Link to={`/intern/veranstaltungen/${eventId}/auswertung`}>
                  Auswertung →
                </Link>
              </Button>
              <div className="flex items-center gap-2 ml-auto">
                <Label className="text-sm">Formular offen</Label>
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
                            }`}
                          >
                            <div {...provided.dragHandleProps} className="cursor-grab text-muted-foreground">
                              <GripVertical size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">{field.label}</span>
                                {field.required && <Badge variant="destructive" className="text-[10px] px-1 py-0">Pflicht</Badge>}
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

            {/* Add field button */}
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
