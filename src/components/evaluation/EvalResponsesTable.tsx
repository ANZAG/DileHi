import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import type { FormField, FormResponse, FormAnswer } from "@/components/event-forms/types";
import { TENT_TYPES } from "@/components/event-forms/types";

interface Props {
  fields: FormField[];
  responses: (FormResponse & { answers: FormAnswer[] })[];
}

function getAnswer(response: FormResponse & { answers: FormAnswer[] }, fieldId: string) {
  const answer = response.answers?.find((a) => a.field_id === fieldId);
  return answer?.value;
}

function formatAnswer(field: FormField, value: any): string {
  if (field.type === "section") return "";
  if (value === null || value === undefined) return "–";
  switch (field.type) {
    case "checkbox":
      return value === true ? "Ja" : "Nein";
    case "multi_select":
      return Array.isArray(value) ? value.join(", ") : String(value);
    case "attendance_days":
      if (value?.all_days) return "Alle Tage";
      if (value?.days?.length) {
        return value.days.map((d: string) => {
          try { return format(parseISO(d), "dd.MM.", { locale: de }); }
          catch { return d; }
        }).join(", ");
      }
      return "–";
    case "tent": {
      const tents = value?.tents;
      if (Array.isArray(tents) && tents.length > 0) {
        return tents.map((t: any) => {
          const type = TENT_TYPES.find((tt) => tt.value === t.tent_type);
          if (!type) return "Zelt (unbekannt)";
          const dim = type.shape === "circle"
            ? `Ø${t.diameter}m`
            : `${t.length}×${t.width}m`;
          return `${type.label} ${dim}, ${t.capacity || 1} Pl.`;
        }).join("; ");
      }
      if (value?.has_tent && value?.tent_type) {
        const type = TENT_TYPES.find((t) => t.value === value.tent_type);
        if (!type) return "Zelt (Typ unbekannt)";
        const dim = type.shape === "circle"
          ? `Ø${value.diameter}m`
          : `${value.length}×${value.width}m`;
        return `${type.label} ${dim}, ${value.capacity} Plätze`;
      }
      return "Kein Zelt";
    }
    default:
      return String(value);
  }
}

export default function EvalResponsesTable({ fields, responses }: Props) {
  const dataFields = fields.filter((f) => f.type !== "section");

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Name</TableHead>
              {dataFields.map((f) => (
                <TableHead key={f.id} className="min-w-[100px] text-xs">{f.label}</TableHead>
              ))}
              <TableHead className="text-xs">Datum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {responses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={dataFields.length + 2} className="text-center text-muted-foreground py-8">
                  Noch keine Anmeldungen.
                </TableCell>
              </TableRow>
            ) : (
              responses.map((resp) => (
                <TableRow key={resp.id}>
                  <TableCell className="font-medium">{resp.respondent_name}</TableCell>
                  {dataFields.map((f) => (
                    <TableCell key={f.id} className="text-sm">
                      {formatAnswer(f, getAnswer(resp, f.id))}
                    </TableCell>
                  ))}
                  <TableCell className="text-xs text-muted-foreground">
                    {format(parseISO(resp.created_at), "dd.MM.yy", { locale: de })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
