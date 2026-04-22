import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, Pencil, Save, UserCheck, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { FormField, FormResponse, FormAnswer } from "@/components/event-forms/types";
import { TENT_TYPES } from "@/components/event-forms/types";

interface Member { id: string; display_name: string; }

interface Props {
  fields: FormField[];
  responses: (FormResponse & { answers: FormAnswer[]; assigned_member_id?: string | null; assigned_member_name?: string | null })[];
  members?: Member[];
  canDelete?: boolean;
  canEdit?: boolean;
  formId?: string;
  onDelete?: (responseId: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getAnswer(response: FormResponse & { answers: FormAnswer[] }, fieldId: string) {
  return response.answers?.find((a) => a.field_id === fieldId)?.value;
}

const EDITABLE_TYPES = ["text", "number", "checkbox", "select", "multi_select", "textarea", "tent"];

function formatAnswer(field: FormField, value: any): string {
  if (field.type === "section") return "";
  if (value === null || value === undefined) return "–";
  switch (field.type) {
    case "checkbox": return value === true ? "Ja" : "Nein";
    case "multi_select": return Array.isArray(value) ? value.join(", ") : String(value);
    case "attendance_days":
      if (value?.all_days) return "Alle Tage";
      if (value?.days?.length) {
        return value.days.map((d: string) => {
          try { return format(parseISO(d), "dd.MM.", { locale: de }); } catch { return d; }
        }).join(", ");
      }
      return "–";
    case "tent": {
      const tents = value?.tents;
      if (Array.isArray(tents) && tents.length > 0) {
        return tents.map((t: any) => {
          const type = TENT_TYPES.find((tt) => tt.value === t.tent_type);
          if (!type) return "Zelt (unbekannt)";
          const dim = type.shape === "circle" ? `Ø${t.diameter}m` : `${t.length}×${t.width}m`;
          return `${type.label} ${dim}, ${t.capacity || 1} Pl.`;
        }).join("; ");
      }
      if (value?.has_tent && value?.tent_type) {
        const type = TENT_TYPES.find((t) => t.value === value.tent_type);
        if (!type) return "Zelt (Typ unbekannt)";
        const dim = type.shape === "circle" ? `Ø${value.diameter}m` : `${value.length}×${value.width}m`;
        return `${type.label} ${dim}, ${value.capacity} Plätze`;
      }
      return "Kein Zelt";
    }
    default: return String(value);
  }
}

// ---------------------------------------------------------------------------
// Zelt-Editor (innerhalb Edit-Dialog)
// ---------------------------------------------------------------------------
function TentEditor({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const tents: any[] = value?.tents ?? (value?.has_tent ? [value] : []);

  const updateTent = (i: number, patch: Partial<any>) => {
    const updated = tents.map((t, idx) => idx === i ? { ...t, ...patch } : t);
    onChange({ tents: updated });
  };

  if (tents.length === 0) return <p className="text-sm text-muted-foreground">Kein Zelt angegeben.</p>;

  return (
    <div className="space-y-4">
      {tents.map((t: any, i: number) => {
        const typeInfo = TENT_TYPES.find((tt) => tt.value === t.tent_type);
        return (
          <div key={i} className="border rounded-md p-3 space-y-2 bg-muted/20">
            <p className="text-sm font-medium">{typeInfo?.label ?? t.tent_type}</p>
            <div className="grid grid-cols-2 gap-2">
              {typeInfo?.shape === "circle" ? (
                <div className="space-y-1">
                  <Label className="text-xs">Durchmesser (m)</Label>
                  <Input
                    type="number" step="0.5" min="1"
                    value={t.diameter ?? ""}
                    onChange={(e) => updateTent(i, { diameter: e.target.value === "" ? null : Number(e.target.value) })}
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">Länge (m)</Label>
                    <Input type="number" step="0.5" min="1" value={t.length ?? ""}
                      onChange={(e) => updateTent(i, { length: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Breite (m)</Label>
                    <Input type="number" step="0.5" min="1" value={t.width ?? ""}
                      onChange={(e) => updateTent(i, { width: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Personenanzahl</Label>
                <Input type="number" min="1" value={t.capacity ?? 1}
                  onChange={(e) => updateTent(i, { capacity: Math.max(1, Number(e.target.value)) })} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit-Dialog
// ---------------------------------------------------------------------------
interface EditDialogProps {
  open: boolean;
  onClose: () => void;
  response: (FormResponse & { answers: FormAnswer[]; assigned_member_id?: string | null }) | null;
  fields: FormField[];
  formId: string;
  members: Member[];
  onSaved: () => void;
}

function EditDialog({ open, onClose, response, fields, formId, members, onSaved }: EditDialogProps) {
  const queryClient = useQueryClient();
  const [editValues, setEditValues] = useState<Record<string, any>>({});
  const [editName, setEditName] = useState("");
  const [saving, setSaving] = useState(false);

  const initState = (resp: typeof response) => {
    if (!resp) return;
    setEditName(resp.respondent_name ?? "");
    const initial: Record<string, any> = {};
    for (const field of fields) {
      if (field.type === "section") continue;
      const ans = resp.answers?.find((a) => a.field_id === field.id);
      initial[field.id] = ans?.value ?? null;
    }
    setEditValues(initial);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && response) initState(response);
    if (!isOpen) onClose();
  };

  const setValue = (fieldId: string, value: any) => setEditValues((prev) => ({ ...prev, [fieldId]: value }));

  const handleSave = async () => {
    if (!response) return;
    setSaving(true);
    try {
      await supabase.from("event_form_responses")
        .update({ respondent_name: editName.trim() })
        .eq("id", response.id);

      const editableFields = fields.filter((f) => EDITABLE_TYPES.includes(f.type));
      for (const field of editableFields) {
        const newVal = editValues[field.id];
        const existing = response.answers?.find((a) => a.field_id === field.id);
        if (existing) {
          await supabase.from("event_form_answers").update({ value: newVal }).eq("id", existing.id);
        } else if (newVal !== null && newVal !== undefined) {
          await supabase.from("event_form_answers").insert({
            response_id: response.id, field_id: field.id, form_id: formId, value: newVal,
          });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["event_form_responses"] });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!response) return null;
  const editableFields = fields.filter((f) => f.type !== "section");

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Anmeldung bearbeiten</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1">
            <Label className="text-sm font-medium">Name</Label>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name des Teilnehmers" />
          </div>
          {editableFields.map((field) => {
            const isEditable = EDITABLE_TYPES.includes(field.type);
            const currentVal = editValues[field.id];
            return (
              <div key={field.id} className="space-y-1">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">{field.label}</Label>
                  {!isEditable && (
                    <Badge variant="secondary" className="text-[10px] py-0">Nur Ansicht</Badge>
                  )}
                </div>
                {!isEditable ? (
                  <p className="text-sm text-muted-foreground">{formatAnswer(field, currentVal)}</p>
                ) : field.type === "tent" ? (
                  <TentEditor value={currentVal} onChange={(v) => setValue(field.id, v)} />
                ) : field.type === "checkbox" ? (
                  <div className="flex items-center gap-2">
                    <Checkbox checked={currentVal === true}
                      onCheckedChange={(checked) => setValue(field.id, !!checked)} />
                    <span className="text-sm text-muted-foreground">{currentVal === true ? "Ja" : "Nein"}</span>
                  </div>
                ) : field.type === "select" ? (
                  <Select value={currentVal ?? ""} onValueChange={(v) => setValue(field.id, v)}>
                    <SelectTrigger><SelectValue placeholder="Auswählen…" /></SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((opt: string) => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "multi_select" ? (
                  <div className="space-y-1">
                    {(field.options ?? []).map((opt: string) => {
                      const selected = Array.isArray(currentVal) ? currentVal.includes(opt) : false;
                      return (
                        <div key={opt} className="flex items-center gap-2">
                          <Checkbox checked={selected}
                            onCheckedChange={(checked) => {
                              const prev = Array.isArray(currentVal) ? currentVal : [];
                              setValue(field.id, checked ? [...prev, opt] : prev.filter((v: string) => v !== opt));
                            }} />
                          <span className="text-sm">{opt}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : field.type === "number" ? (
                  <Input type="number" value={currentVal ?? ""}
                    onChange={(e) => setValue(field.id, e.target.value === "" ? null : Number(e.target.value))} />
                ) : (
                  <Input value={currentVal ?? ""} onChange={(e) => setValue(field.id, e.target.value)} />
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={saving}>
            <Save size={14} className="mr-1" />{saving ? "Speichern…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Member-Assignment-Dialog
// ---------------------------------------------------------------------------
interface AssignDialogProps {
  open: boolean;
  onClose: () => void;
  response: (FormResponse & { assigned_member_id?: string | null }) | null;
  members: Member[];
  onSaved: () => void;
}

function AssignDialog({ open, onClose, response, members, onSaved }: AssignDialogProps) {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && response) setSelectedId(response.assigned_member_id ?? "");
    if (!isOpen) onClose();
  };

  const handleSave = async () => {
    if (!response) return;
    setSaving(true);
    try {
      await supabase.rpc("assign_member_to_response", {
        _response_id: response.id,
        _member_id: selectedId === "" ? null : selectedId,
      });
      queryClient.invalidateQueries({ queryKey: ["event_form_responses"] });
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!response) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-serif">Mitglied zuweisen</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Anmeldung von <strong>{response.respondent_name}</strong> einem Mitglied zuordnen.
            Dadurch werden in der Logistik-Auswertung die hinterlegten Zelte des Mitglieds verwendet.
          </p>
          <Select value={selectedId} onValueChange={setSelectedId}>
            <SelectTrigger>
              <SelectValue placeholder="Mitglied auswählen…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">— Keine Zuweisung —</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedId && (
            <p className="text-xs text-muted-foreground">
              Die Zelte von <strong>{members.find(m => m.id === selectedId)?.display_name}</strong> werden
              für die Flächenberechnung verwendet.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Abbrechen</Button>
          <Button onClick={handleSave} disabled={saving}>
            <UserCheck size={14} className="mr-1" />{saving ? "Speichern…" : "Speichern"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Hauptkomponente
// ---------------------------------------------------------------------------
export default function EvalResponsesTable({ fields, responses, members = [], canDelete, canEdit, formId, onDelete }: Props) {
  const dataFields = fields.filter((f) => f.type !== "section");
  const [pendingDelete, setPendingDelete] = useState<(FormResponse & { answers: FormAnswer[] }) | null>(null);
  const [editingResponse, setEditingResponse] = useState<(FormResponse & { answers: FormAnswer[]; assigned_member_id?: string | null }) | null>(null);
  const [assigningResponse, setAssigningResponse] = useState<(FormResponse & { assigned_member_id?: string | null }) | null>(null);
  const queryClient = useQueryClient();

  const showActions = canDelete || canEdit;

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px]">Name</TableHead>
                {dataFields.map((f) => (
                  <TableHead key={f.id} className="min-w-[100px] text-xs">{f.label}</TableHead>
                ))}
                <TableHead className="text-xs">Datum</TableHead>
                {showActions && <TableHead className="w-24" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={dataFields.length + 2 + (showActions ? 1 : 0)} className="text-center text-muted-foreground py-8">
                    Noch keine Anmeldungen.
                  </TableCell>
                </TableRow>
              ) : (
                responses.map((resp) => (
                  <TableRow key={resp.id}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col gap-0.5">
                        <span>{resp.respondent_name}</span>
                        {resp.assigned_member_name && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 w-fit gap-1">
                            <UserCheck size={10} />
                            {resp.assigned_member_name}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    {dataFields.map((f) => (
                      <TableCell key={f.id} className="text-sm">
                        {formatAnswer(f, getAnswer(resp, f.id))}
                      </TableCell>
                    ))}
                    <TableCell className="text-xs text-muted-foreground">
                      {format(parseISO(resp.created_at), "dd.MM.yy", { locale: de })}
                    </TableCell>
                    {showActions && (
                      <TableCell>
                        <div className="flex items-center gap-0.5">
                          {canEdit && (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={() => setEditingResponse(resp as any)} aria-label="Bearbeiten">
                                <Pencil size={14} />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-primary"
                                onClick={() => setAssigningResponse(resp as any)} aria-label="Mitglied zuweisen"
                                title="Mitglied zuweisen">
                                <UserCheck size={14} />
                              </Button>
                            </>
                          )}
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => setPendingDelete(resp)} aria-label="Löschen">
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Delete */}
      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anmeldung wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Anmeldung von <strong>{pendingDelete?.respondent_name}</strong> wird unwiderruflich gelöscht.
              Alle Antworten gehen verloren und fließen nicht mehr in Auswertung und Logistik ein.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (pendingDelete && onDelete) onDelete(pendingDelete.id); setPendingDelete(null); }}>
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit */}
      <EditDialog
        open={!!editingResponse}
        onClose={() => setEditingResponse(null)}
        response={editingResponse}
        fields={fields}
        formId={formId ?? ""}
        members={members}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["event_form_responses"] })}
      />

      {/* Assign */}
      <AssignDialog
        open={!!assigningResponse}
        onClose={() => setAssigningResponse(null)}
        response={assigningResponse}
        members={members}
        onSaved={() => queryClient.invalidateQueries({ queryKey: ["event_form_responses"] })}
      />
    </>
  );
}
