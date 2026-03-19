import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Users, Tent, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { de } from "date-fns/locale";
import {
  CLUB_TENTS,
  TENT_TYPES,
  calcTentArea,
  calcClubTentArea,
  getClubTentDimensions,
  type FormField,
  type FormResponse,
  type FormAnswer,
} from "@/components/event-forms/types";

export default function EventFormEvaluation() {
  const { eventId } = useParams<{ eventId: string }>();
  const { isVorstand } = useAuth();

  const [selectedClubTents, setSelectedClubTents] = useState<string[]>([]);
  const [spacing, setSpacing] = useState(0);

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

  // Fetch form
  const { data: form } = useQuery({
    queryKey: ["event_form", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_forms")
        .select("*")
        .eq("event_id", eventId!)
        .maybeSingle();
      if (error) throw error;
      if (data?.settings) {
        setSpacing((data.settings as any)?.spacing_m ?? 0);
        setSelectedClubTents((data.settings as any)?.club_tents ?? []);
      }
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

  // Fetch responses with answers
  const { data: responses = [] } = useQuery({
    queryKey: ["event_form_responses", form?.id],
    queryFn: async () => {
      const { data: respData, error } = await supabase
        .from("event_form_responses")
        .select("*")
        .eq("form_id", form!.id)
        .order("created_at");
      if (error) throw error;

      // Fetch all answers
      const responseIds = respData.map((r) => r.id);
      if (responseIds.length === 0) return [];

      const { data: ansData } = await supabase
        .from("event_form_answers")
        .select("*")
        .in("response_id", responseIds);

      return respData.map((r) => ({
        ...r,
        answers: (ansData || []).filter((a) => a.response_id === r.id),
      })) as (FormResponse & { answers: FormAnswer[] })[];
    },
    enabled: !!form?.id,
  });

  // Compute event days
  const eventDays = useMemo(() => {
    if (!event?.start_date) return [];
    const start = parseISO(event.start_date);
    const end = event.end_date ? parseISO(event.end_date) : start;
    return eachDayOfInterval({ start, end });
  }, [event]);

  // Get answer value for a response and field
  const getAnswer = (response: FormResponse & { answers: FormAnswer[] }, fieldId: string) => {
    const answer = response.answers?.find((a) => a.field_id === fieldId);
    return answer?.value;
  };

  // Format answer for display
  const formatAnswer = (field: FormField, value: any): string => {
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
      case "tent":
        if (!value?.has_tent) return "Kein Zelt";
        const type = TENT_TYPES.find((t) => t.value === value.tent_type);
        if (!type) return "Zelt (Typ unbekannt)";
        const dim = type.shape === "circle"
          ? `Ø${value.diameter}m`
          : `${value.length}×${value.width}m`;
        return `${type.label} ${dim}, ${value.capacity} Plätze`;
      default:
        return String(value);
    }
  };

  // Summary statistics
  const summary = useMemo(() => {
    const tentField = fields.find((f) => f.type === "tent");
    const attendanceField = fields.find((f) => f.type === "attendance_days");

    const tents: { type: string; diameter?: number; length?: number; width?: number; capacity: number; respondent: string }[] = [];
    const dayCount: Record<string, number> = {};
    let totalCapacity = 0;
    let carsCount = 0;
    let trailerCount = 0;
    let canTowCount = 0;
    let kitchenHelpers = 0;
    let shoppers = 0;

    for (const resp of responses) {
      // Tents
      if (tentField) {
        const tv = getAnswer(resp, tentField.id);
        if (tv?.has_tent && tv.tent_type) {
          tents.push({
            type: tv.tent_type,
            diameter: tv.diameter,
            length: tv.length,
            width: tv.width,
            capacity: tv.capacity || 1,
            respondent: resp.respondent_name,
          });
          totalCapacity += tv.capacity || 1;
        }
      }

      // Attendance
      if (attendanceField) {
        const av = getAnswer(resp, attendanceField.id);
        if (av?.days) {
          for (const d of av.days) {
            dayCount[d] = (dayCount[d] || 0) + 1;
          }
        }
      }

      // Count checkboxes by label matching
      for (const field of fields) {
        const val = getAnswer(resp, field.id);
        if (field.type === "checkbox" && val === true) {
          if (field.label.toLowerCase().includes("pkw")) carsCount++;
          if (field.label.toLowerCase().includes("anhänger zur verfügung")) trailerCount++;
          if (field.label.toLowerCase().includes("anhänger") && field.label.toLowerCase().includes("ziehen")) canTowCount++;
          if (field.label.toLowerCase().includes("küche")) kitchenHelpers++;
          if (field.label.toLowerCase().includes("einkauf")) shoppers++;
        }
      }
    }

    // Calculate tent areas
    let memberTentArea = 0;
    const tentItems: { label: string; area: number; w: number; h: number; shape: string }[] = [];

    for (const t of tents) {
      const area = calcTentArea(t.type, t.diameter, t.length, t.width, spacing);
      memberTentArea += area;
      const typeInfo = TENT_TYPES.find((tt) => tt.value === t.type);
      if (typeInfo) {
        let w = 0, h = 0;
        if (typeInfo.shape === "circle" && t.diameter) {
          const d = t.diameter + 2 * typeInfo.guyRope + 2 * spacing;
          w = d; h = d;
        } else if (t.length && t.width) {
          w = t.width + 2 * typeInfo.guyRope + 2 * spacing;
          h = t.length + 2 * typeInfo.guyRope + 2 * spacing;
        }
        tentItems.push({ label: `${t.respondent}: ${typeInfo.label}`, area, w, h, shape: typeInfo.shape });
      }
    }

    let clubTentArea = 0;
    for (const ctId of selectedClubTents) {
      const area = calcClubTentArea(ctId, spacing);
      clubTentArea += area;
      const ct = CLUB_TENTS.find((c) => c.id === ctId);
      if (ct) {
        const dims = getClubTentDimensions(ctId, spacing);
        tentItems.push({ label: ct.label, area, w: dims.w, h: dims.h, shape: ct.shape });
      }
    }

    const totalArea = memberTentArea + clubTentArea;
    // Suggest rectangle
    const side = Math.ceil(Math.sqrt(totalArea * 1.3)); // 30% extra for layout

    return { tents, totalCapacity, dayCount, carsCount, trailerCount, canTowCount, kitchenHelpers, shoppers, memberTentArea, clubTentArea, totalArea, suggestedSide: side, tentItems };
  }, [responses, fields, selectedClubTents, spacing]);

  // CSV export
  const exportCSV = () => {
    const headers = ["Name", "E-Mail", ...fields.map((f) => f.label)];
    const rows = responses.map((r) => [
      r.respondent_name,
      r.respondent_email || "",
      ...fields.map((f) => {
        const val = getAnswer(r, f.id);
        return formatAnswer(f, val).replace(/,/g, ";");
      }),
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anmeldungen-${event?.title || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container py-8 max-w-6xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/intern/veranstaltungen"><ArrowLeft size={20} /></Link>
          </Button>
          <div className="flex-1">
            <h1 className="font-serif text-2xl font-bold">Auswertung</h1>
            {event && <p className="text-sm text-muted-foreground">{event.title}</p>}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/intern/veranstaltungen/${eventId}/formular`}>Formular bearbeiten</Link>
          </Button>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download size={14} className="mr-1" /> CSV
          </Button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <SummaryCard icon={<Users size={20} />} label="Anmeldungen" value={responses.length} />
          <SummaryCard icon={<Tent size={20} />} label="Zelte" value={summary.tents.length} />
          <SummaryCard icon={<BarChart3 size={20} />} label="Schlafplätze" value={summary.totalCapacity} />
          <SummaryCard icon={<BarChart3 size={20} />} label="PKW" value={summary.carsCount} />
        </div>

        {/* Quick stats */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Attendance per day */}
          {eventDays.length > 1 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-3">Teilnehmer pro Tag</h3>
              <div className="space-y-2">
                {eventDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const count = summary.dayCount[key] || 0;
                  return (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm">{format(day, "EE, d. MMM", { locale: de })}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Logistics */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3">Logistik</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Eigener PKW</span><span className="font-medium">{summary.carsCount}</span></div>
              <div className="flex justify-between"><span>Anhänger verfügbar</span><span className="font-medium">{summary.trailerCount}</span></div>
              <div className="flex justify-between"><span>Kann Anhänger ziehen</span><span className="font-medium">{summary.canTowCount}</span></div>
              <div className="flex justify-between"><span>Bereit einzukaufen</span><span className="font-medium">{summary.shoppers}</span></div>
              <div className="flex justify-between"><span>Küchenteam</span><span className="font-medium">{summary.kitchenHelpers}</span></div>
            </div>
          </div>
        </div>

        {/* Area calculator */}
        <div className="border rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Tent size={18} /> Flächenrechner
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Abstand / Laufweg pro Zelt (m)</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  value={spacing}
                  onChange={(e) => setSpacing(Number(e.target.value) || 0)}
                  className="w-32"
                />
              </div>

              <div>
                <Label className="text-sm mb-2 block">Vereinszelte einplanen</Label>
                <div className="space-y-2">
                  {CLUB_TENTS.map((ct) => (
                    <div key={ct.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedClubTents.includes(ct.id)}
                        onCheckedChange={(checked) => {
                          if (checked) setSelectedClubTents([...selectedClubTents, ct.id]);
                          else setSelectedClubTents(selectedClubTents.filter((id) => id !== ct.id));
                        }}
                      />
                      <Label className="font-normal cursor-pointer text-sm">
                        {ct.label} ({calcClubTentArea(ct.id, spacing).toFixed(1)} m²)
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Mitgliederzelte</span>
                  <span className="font-medium">{summary.memberTentArea.toFixed(1)} m²</span>
                </div>
                <div className="flex justify-between">
                  <span>Vereinszelte</span>
                  <span className="font-medium">{summary.clubTentArea.toFixed(1)} m²</span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-1 border-t">
                  <span>Gesamtfläche</span>
                  <span>{summary.totalArea.toFixed(1)} m²</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Empfohlene Fläche (ca. +30%)</span>
                  <span>~{summary.suggestedSide}×{summary.suggestedSide} m</span>
                </div>
              </div>
            </div>

            {/* Visual preview */}
            <div>
              <Label className="text-sm mb-2 block">Vorschau (schematisch)</Label>
              <TentVisualizer items={summary.tentItems} totalSide={summary.suggestedSide} />
            </div>
          </div>
        </div>

        {/* Responses table */}
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px]">Name</TableHead>
                  {fields.map((f) => (
                    <TableHead key={f.id} className="min-w-[100px] text-xs">{f.label}</TableHead>
                  ))}
                  <TableHead className="text-xs">Datum</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {responses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={fields.length + 2} className="text-center text-muted-foreground py-8">
                      Noch keine Anmeldungen.
                    </TableCell>
                  </TableRow>
                ) : (
                  responses.map((resp) => (
                    <TableRow key={resp.id}>
                      <TableCell className="font-medium">{resp.respondent_name}</TableCell>
                      {fields.map((f) => (
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
      </motion.div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="border rounded-lg p-3 text-center">
      <div className="flex justify-center text-muted-foreground mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function TentVisualizer({ items, totalSide }: { items: { label: string; area: number; w: number; h: number; shape: string }[]; totalSide: number }) {
  if (items.length === 0) {
    return <div className="h-48 border-2 border-dashed rounded flex items-center justify-center text-sm text-muted-foreground">Keine Zelte</div>;
  }

  const svgSize = 300;
  const scale = svgSize / Math.max(totalSide, 1);
  const padding = 10;

  // Simple grid packing
  let x = padding;
  let y = padding;
  let rowHeight = 0;

  const placed: { x: number; y: number; w: number; h: number; label: string; shape: string }[] = [];

  for (const item of items) {
    const w = item.w * scale;
    const h = item.h * scale;

    if (x + w > svgSize - padding) {
      x = padding;
      y += rowHeight + 4;
      rowHeight = 0;
    }

    placed.push({ x, y, w, h, label: item.label, shape: item.shape });
    x += w + 4;
    rowHeight = Math.max(rowHeight, h);
  }

  const svgHeight = Math.max(y + rowHeight + padding, 200);

  return (
    <svg viewBox={`0 0 ${svgSize} ${svgHeight}`} className="w-full border rounded bg-muted/30" style={{ maxHeight: 400 }}>
      {/* Grid area */}
      <rect x={0} y={0} width={svgSize} height={svgHeight} fill="none" stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="4 4" />

      {placed.map((p, i) => (
        <g key={i}>
          {p.shape === "circle" ? (
            <ellipse
              cx={p.x + p.w / 2}
              cy={p.y + p.h / 2}
              rx={p.w / 2}
              ry={p.h / 2}
              fill="hsl(var(--primary) / 0.2)"
              stroke="hsl(var(--primary))"
              strokeWidth={1}
            />
          ) : (
            <rect
              x={p.x}
              y={p.y}
              width={p.w}
              height={p.h}
              fill="hsl(var(--primary) / 0.2)"
              stroke="hsl(var(--primary))"
              strokeWidth={1}
              rx={2}
            />
          )}
          <text
            x={p.x + p.w / 2}
            y={p.y + p.h / 2}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.min(8, p.w / 4)}
            fill="hsl(var(--foreground))"
            className="select-none"
          >
            {p.label.length > 15 ? p.label.slice(0, 12) + "…" : p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
