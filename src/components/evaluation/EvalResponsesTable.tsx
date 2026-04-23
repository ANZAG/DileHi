import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import type { FormField, FormResponse, FormAnswer } from "@/components/event-forms/types";
import { TENT_TYPES } from "@/components/event-forms/types";

interface Props {
  fields: FormField[];
  responses: (FormResponse & { answers: FormAnswer[] })[];
  canDelete?: boolean;
  onDelete?: (responseId: string) => void;
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

export default function EvalResponsesTable({ fields, responses, canDelete, onDelete }: Props) {
  const dataFields = fields.filter((f) => f.type !== "section");
  const [pendingDelete, setPendingDelete] = useState<(FormResponse & { answers: FormAnswer[] }) | null>(null);

  return (
    <>
      {/* Outer wrapper: relative positioning context for sticky column */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {/* Sticky first column */}
                <TableHead
                  className="min-w-[140px] sticky left-0 z-20 bg-background border-r"
                >
                  Name
                </TableHead>
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
                    colSpan={dataFields.length + 2 + (canDelete ? 1 : 0)}
                    className="text-center text-muted-foreground py-8"
                  >
                    Noch keine Anmeldungen.
                  </TableCell>
                </TableRow>
              ) : (
                responses.map((resp) => (
                  <TableRow key={resp.id}>
                    {/* Sticky first column */}
                    <TableCell
                      className="font-medium sticky left-0 z-10 bg-background border-r"
                    >
                      {resp.respondent_name}
                    </TableCell>
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
                ))
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
