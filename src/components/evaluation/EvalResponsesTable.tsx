import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Trash2, UserCheck, UserPlus, Check, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { FormField, FormResponse, FormAnswer } from "@/components/event-forms/types";
import { TENT_TYPES } from "@/components/event-forms/types";

interface Member { id: string; display_name: string; is_active: boolean | null }

interface Props {
  fields: FormField[];
  responses: (FormResponse & { answers: FormAnswer[] })[];
  canDelete?: boolean;
  onDelete?: (responseId: string) => void;
  members?: Member[];
  formId?: string;
  canAssign?: boolean;
}

function getAnswer(response: FormResponse & { answers: FormAnswer[] }, fieldId: string) {
  return response.answers?.find((a) => a.field_id === fieldId)?.value;
}

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

export default function EvalResponsesTable({
  fields, responses, canDelete, onDelete, members = [], formId, canAssign,
}: Props) {
  const dataFields = fields.filter((f) => f.type !== "section");
  const [pendingDelete, setPendingDelete] = useState<(FormResponse & { answers: FormAnswer[] }) | null>(null);
  const [openAssignId, setOpenAssignId] = useState<string | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const assign = useMutation({
    mutationFn: async ({ responseId, userId }: { responseId: string; userId: string | null }) => {
      const { error } = await (supabase.rpc as any)("assign_response_to_member", {
        _response_id: responseId,
        _user_id: userId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["event_form_responses", formId] });
      toast({ title: "Zuordnung gespeichert" });
      setOpenAssignId(null);
    },
    onError: (err: any) => {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    },
  });

  const activeMembers = members.filter((m) => m.is_active !== false);

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[140px] sticky left-0 z-20 bg-background border-r">
                  Name
                </TableHead>
                {canAssign && (
                  <TableHead className="min-w-[180px] text-xs whitespace-nowrap">
                    Mitglied
                  </TableHead>
                )}
                {dataFields.map((f) => (
                  <TableHead key={f.id} className="min-w-[120px] text-xs whitespace-nowrap">
                    {f.label}
                  </TableHead>
                ))}
                <TableHead className="text-xs whitespace-nowrap">Datum</TableHead>
                {canDelete && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {responses.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={dataFields.length + 2 + (canDelete ? 1 : 0) + (canAssign ? 1 : 0)}
                    className="text-center text-muted-foreground py-8"
                  >
                    Noch keine Anmeldungen.
                  </TableCell>
                </TableRow>
              ) : (
                responses.map((resp) => {
                  const matched = resp.user_id ? members.find((m) => m.id === resp.user_id) : null;
                  return (
                    <TableRow key={resp.id}>
                      <TableCell className="font-medium sticky left-0 z-10 bg-background border-r">
                        {resp.respondent_name}
                      </TableCell>
                      {canAssign && (
                        <TableCell className="text-xs">
                          <Popover
                            open={openAssignId === resp.id}
                            onOpenChange={(o) => setOpenAssignId(o ? resp.id : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 gap-1.5 text-xs w-full justify-start"
                              >
                                {matched ? (
                                  <>
                                    <UserCheck size={12} className="text-primary shrink-0" />
                                    <span className="truncate">{matched.display_name}</span>
                                  </>
                                ) : resp.user_id ? (
                                  <Badge variant="secondary" className="text-[10px]">Eingeloggt</Badge>
                                ) : (
                                  <>
                                    <UserPlus size={12} className="text-muted-foreground shrink-0" />
                                    <span className="text-muted-foreground">Gast – zuordnen</span>
                                  </>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-[260px]" align="start">
                              <Command>
                                <CommandInput placeholder="Mitglied suchen..." />
                                <CommandList>
                                  <CommandEmpty>Kein Treffer.</CommandEmpty>
                                  {resp.user_id && (
                                    <CommandGroup>
                                      <CommandItem
                                        onSelect={() => assign.mutate({ responseId: resp.id, userId: null })}
                                        className="text-destructive"
                                      >
                                        <X size={14} className="mr-2" />
                                        Zuordnung entfernen
                                      </CommandItem>
                                    </CommandGroup>
                                  )}
                                  <CommandGroup heading="Mitglieder">
                                    {activeMembers.map((m) => (
                                      <CommandItem
                                        key={m.id}
                                        value={m.display_name}
                                        onSelect={() => assign.mutate({ responseId: resp.id, userId: m.id })}
                                      >
                                        {resp.user_id === m.id && <Check size={14} className="mr-2 text-primary" />}
                                        <span className={resp.user_id === m.id ? "" : "ml-6"}>{m.display_name}</span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </TableCell>
                      )}
                      {dataFields.map((f) => (
                        <TableCell key={f.id} className="text-sm whitespace-nowrap">
                          {formatAnswer(f, getAnswer(resp, f.id))}
                        </TableCell>
                      ))}
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(resp.created_at), "dd.MM.yy", { locale: de })}
                      </TableCell>
                      {canDelete && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setPendingDelete(resp)}
                            aria-label="Anmeldung löschen"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Anmeldung wirklich löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Die Anmeldung von <strong>{pendingDelete?.respondent_name}</strong> wird unwiderruflich gelöscht.
              Alle damit verbundenen Antworten (Tage, Zelte, Einkäufer-Status etc.) gehen verloren und
              fließen nicht mehr in die Auswertung oder Logistik-Planung ein.
              <br /><br />
              Diese Aktion kann nicht rückgängig gemacht werden. Bitte stelle vorab sicher, dass die
              Anmeldung wirklich entfernt werden soll – z.B. weil sie doppelt erfasst wurde (Mitglied + Gast).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (pendingDelete && onDelete) onDelete(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              Endgültig löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
