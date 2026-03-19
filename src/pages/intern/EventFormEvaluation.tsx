import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Users, Tent, Bed, Car, Truck, ShoppingCart, UtensilsCrossed, Plus, Trash2 } from "lucide-react";
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

interface ProgramItem {
  point: string;
  person: string;
}

export default function EventFormEvaluation() {
  const { eventId } = useParams<{ eventId: string }>();
  const { isVorstand } = useAuth();
  const queryClient = useQueryClient();

  const [selectedClubTents, setSelectedClubTents] = useState<string[]>([]);
  const [spacing, setSpacing] = useState(0);

  // Organizer fields
  const [kitchenLead, setKitchenLead] = useState("");
  const [programItems, setProgramItems] = useState<ProgramItem[]>([]);
  const [newProgPoint, setNewProgPoint] = useState("");
  const [newProgPerson, setNewProgPerson] = useState("");

  // Pool tents from members
  const [poolTentIds, setPoolTentIds] = useState<string[]>([]);

  const { data: event } = useQuery({
    queryKey: ["event", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

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
        const s = data.settings as any;
        setSpacing(s.spacing_m ?? 0);
        setSelectedClubTents(s.club_tents ?? []);
        setKitchenLead(s.kitchen_lead ?? "");
        setProgramItems(s.program_items ?? []);
        setPoolTentIds(s.pool_tent_ids ?? []);
      }
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

  const { data: responses = [] } = useQuery({
    queryKey: ["event_form_responses", form?.id],
    queryFn: async () => {
      const { data: respData, error } = await supabase
        .from("event_form_responses")
        .select("*")
        .eq("form_id", form!.id)
        .order("created_at");
      if (error) throw error;

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

  // Fetch all member tents for pool
  const { data: allMemberTents = [] } = useQuery({
    queryKey: ["all_member_tents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_tents")
        .select("*, profiles:user_id(display_name)")
        .order("created_at");
      if (error) return [];
      return data;
    },
  });

  const saveSettings = useMutation({
    mutationFn: async (patch: Record<string, any>) => {
      if (!form) return;
      await supabase.from("event_forms").update({
        settings: { ...(form.settings || {}), ...patch },
      }).eq("id", form.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event_form", eventId] }),
  });

  const eventDays = useMemo(() => {
    if (!event?.start_date) return [];
    const start = parseISO(event.start_date);
    const end = event.end_date ? parseISO(event.end_date) : start;
    return eachDayOfInterval({ start, end });
  }, [event]);

  const getAnswer = (response: FormResponse & { answers: FormAnswer[] }, fieldId: string) => {
    const answer = response.answers?.find((a) => a.field_id === fieldId);
    return answer?.value;
  };

  const formatAnswer = (field: FormField, value: any): string => {
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

  const summary = useMemo(() => {
    const tentField = fields.find((f) => f.type === "tent");
    const attendanceField = fields.find((f) => f.type === "attendance_days");

    const tents: { type: string; diameter?: number; length?: number; width?: number; capacity: number; respondent: string; guyRope?: number }[] = [];
    const dayCount: Record<string, number> = {};
    let totalCapacity = 0;
    let carsCount = 0;
    let totalSeats = 0;
    let trailerCount = 0;
    let canTowCount = 0;
    let kitchenHelpers = 0;
    let shoppers = 0;

    for (const resp of responses) {
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

      if (attendanceField) {
        const av = getAnswer(resp, attendanceField.id);
        if (av?.days) {
          for (const d of av.days) {
            dayCount[d] = (dayCount[d] || 0) + 1;
          }
        }
      }

      for (const field of fields) {
        const val = getAnswer(resp, field.id);
        const lbl = field.label.toLowerCase();

        if (field.type === "checkbox" && val === true) {
          if (lbl.includes("pkw") && !lbl.includes("anhänger")) carsCount++;
          if (lbl.includes("anhänger zur verfügung")) trailerCount++;
          if (lbl.includes("anhänger") && lbl.includes("ziehen")) canTowCount++;
          if (lbl.includes("küche")) kitchenHelpers++;
          if (lbl.includes("einkauf")) shoppers++;
        }

        if (field.type === "number" && (lbl.includes("mitnehmen") || lbl.includes("sitzplätze")) && typeof val === "number") {
          totalSeats += val;
        }
      }
    }

    // Calculate tent areas
    let memberTentArea = 0;
    const tentItems: TentItem[] = [];

    for (const t of tents) {
      const area = calcTentArea(t.type, t.diameter, t.length, t.width, spacing);
      memberTentArea += area;
      const typeInfo = TENT_TYPES.find((tt) => tt.value === t.type);
      if (typeInfo) {
        let w = 0, h = 0, innerW = 0, innerH = 0;
        if (typeInfo.shape === "circle" && t.diameter) {
          innerW = t.diameter; innerH = t.diameter;
          const d = t.diameter + 2 * typeInfo.guyRope + 2 * spacing;
          w = d; h = d;
        } else if (t.length && t.width) {
          innerW = t.width; innerH = t.length;
          w = t.width + 2 * typeInfo.guyRope + 2 * spacing;
          h = t.length + 2 * typeInfo.guyRope + 2 * spacing;
        }
        tentItems.push({
          label: t.respondent,
          typeName: typeInfo.label,
          area, w, h, innerW, innerH,
          guyRope: typeInfo.guyRope,
          shape: typeInfo.shape,
          category: "member",
        });
      }
    }

    // Pool tents from members
    let poolTentArea = 0;
    for (const ptId of poolTentIds) {
      const pt = allMemberTents.find((t: any) => t.id === ptId);
      if (!pt) continue;
      const ownerName = (pt as any).profiles?.display_name || "Mitglied";
      let area = 0, w = 0, h = 0, innerW = 0, innerH = 0;
      if (pt.shape === "circle" && pt.diameter) {
        innerW = Number(pt.diameter); innerH = Number(pt.diameter);
        const d = Number(pt.diameter) + 2 * Number(pt.guy_rope) + 2 * spacing;
        w = d; h = d;
        area = Math.PI * (d / 2) ** 2;
      } else if (pt.length && pt.width) {
        innerW = Number(pt.width); innerH = Number(pt.length);
        w = Number(pt.width) + 2 * Number(pt.guy_rope) + 2 * spacing;
        h = Number(pt.length) + 2 * Number(pt.guy_rope) + 2 * spacing;
        area = w * h;
      }
      poolTentArea += area;
      tentItems.push({
        label: `${pt.name} (${ownerName})`,
        typeName: pt.tent_type,
        area, w, h, innerW, innerH,
        guyRope: Number(pt.guy_rope),
        shape: pt.shape,
        category: "member",
      });
    }

    let clubTentArea = 0;
    for (const ctId of selectedClubTents) {
      const area = calcClubTentArea(ctId, spacing);
      clubTentArea += area;
      const ct = CLUB_TENTS.find((c) => c.id === ctId);
      if (ct) {
        const dims = getClubTentDimensions(ctId, spacing);
        let innerW = 0, innerH = 0;
        if (ct.shape === "circle" && "diameter" in ct) {
          innerW = ct.diameter; innerH = ct.diameter;
        } else if ("width" in ct && "length" in ct) {
          innerW = ct.width; innerH = ct.length;
        }
        const catMap: Record<string, string> = {
          kuechenzelt: "kitchen",
          versorgung_klein: "supply",
          versorgung_gross: "supply",
          scheune: "scheune",
        };
        tentItems.push({
          label: ct.label,
          typeName: "",
          area, w: dims.w, h: dims.h,
          innerW, innerH,
          guyRope: ct.guyRope,
          shape: ct.shape,
          category: catMap[ct.id] || "club",
        });
      }
    }

    const totalArea = memberTentArea + poolTentArea + clubTentArea;
    const side = Math.ceil(Math.sqrt(totalArea * 1.3));

    return { tents, totalCapacity, dayCount, carsCount, totalSeats, trailerCount, canTowCount, kitchenHelpers, shoppers, memberTentArea: memberTentArea + poolTentArea, clubTentArea, totalArea, suggestedSide: side, tentItems };
  }, [responses, fields, selectedClubTents, spacing, poolTentIds, allMemberTents]);

  const exportCSV = () => {
    const dataFields = fields.filter((f) => f.type !== "section");
    const headers = ["Name", "E-Mail", ...dataFields.map((f) => f.label)];
    const rows = responses.map((r) => [
      r.respondent_name,
      r.respondent_email || "",
      ...dataFields.map((f) => {
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

  const addProgramItem = () => {
    if (!newProgPoint.trim()) return;
    const updated = [...programItems, { point: newProgPoint.trim(), person: newProgPerson.trim() }];
    setProgramItems(updated);
    saveSettings.mutate({ program_items: updated });
    setNewProgPoint("");
    setNewProgPerson("");
  };

  const removeProgramItem = (index: number) => {
    const updated = programItems.filter((_, i) => i !== index);
    setProgramItems(updated);
    saveSettings.mutate({ program_items: updated });
  };

  const dataFields = fields.filter((f) => f.type !== "section");

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
          <SummaryCard icon={<Bed size={20} />} label="Schlafplätze" value={summary.totalCapacity} />
          <SummaryCard icon={<Car size={20} />} label={`PKW (${summary.totalSeats} Plätze)`} value={summary.carsCount} />
        </div>

        {/* Quick stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
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
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <Truck size={16} /> Logistik
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><Car size={14} className="text-muted-foreground" /> PKW</span>
                <span className="font-medium">{summary.carsCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><Car size={14} className="text-muted-foreground" /> PKW mit Anhängerkupplung</span>
                <span className="font-medium">{summary.canTowCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><Truck size={14} className="text-muted-foreground" /> Anhänger</span>
                <span className="font-medium">{summary.trailerCount}</span>
              </div>
            </div>
          </div>

          {/* Kitchen */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <UtensilsCrossed size={16} /> Küche
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><ShoppingCart size={14} className="text-muted-foreground" /> Einkäufer</span>
                <span className="font-medium">{summary.shoppers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="flex items-center gap-1.5"><UtensilsCrossed size={14} className="text-muted-foreground" /> Küchenteam</span>
                <span className="font-medium">{summary.kitchenHelpers}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Organizer fields */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Verantwortliche</h3>
            <div>
              <Label className="text-sm">Verantwortlicher Küche</Label>
              <Input
                value={kitchenLead}
                onChange={(e) => setKitchenLead(e.target.value)}
                onBlur={() => saveSettings.mutate({ kitchen_lead: kitchenLead })}
                placeholder="Name eingeben..."
              />
            </div>
            <div>
              <Label className="text-sm">Programme & Verantwortliche</Label>
              {programItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 mt-1.5">
                  <span className="text-sm flex-1">{item.point}: <strong>{item.person || "–"}</strong></span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeProgramItem(i)}>
                    <Trash2 size={12} className="text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <Input
                  value={newProgPoint}
                  onChange={(e) => setNewProgPoint(e.target.value)}
                  placeholder="Programmpunkt"
                  className="flex-1"
                />
                <Input
                  value={newProgPerson}
                  onChange={(e) => setNewProgPerson(e.target.value)}
                  placeholder="Person"
                  className="flex-1"
                />
                <Button size="sm" variant="outline" onClick={addProgramItem} disabled={!newProgPoint.trim()}>
                  <Plus size={14} />
                </Button>
              </div>
            </div>
          </div>

          {/* Member tent pool */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2"><Tent size={16} /> Zelte aus dem Pool</h3>
            <p className="text-xs text-muted-foreground">Zelte von Mitgliedern, die manuell für diese Veranstaltung hinzugefügt werden.</p>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {allMemberTents.map((mt: any) => {
                const ownerName = mt.profiles?.display_name || "Mitglied";
                const dimStr = mt.shape === "circle" && mt.diameter
                  ? `Ø${mt.diameter}m`
                  : mt.length && mt.width ? `${mt.length}×${mt.width}m` : "";
                return (
                  <div key={mt.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={poolTentIds.includes(mt.id)}
                      onCheckedChange={(checked) => {
                        const next = checked
                          ? [...poolTentIds, mt.id]
                          : poolTentIds.filter((id) => id !== mt.id);
                        setPoolTentIds(next);
                        saveSettings.mutate({ pool_tent_ids: next });
                      }}
                    />
                    <Label className="font-normal cursor-pointer text-sm">
                      {mt.name || mt.tent_type} ({ownerName}) {dimStr}
                    </Label>
                  </div>
                );
              })}
              {allMemberTents.length === 0 && (
                <p className="text-xs text-muted-foreground">Keine Mitgliederzelte im Pool vorhanden.</p>
              )}
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
                          const next = checked
                            ? [...selectedClubTents, ct.id]
                            : selectedClubTents.filter((id) => id !== ct.id);
                          setSelectedClubTents(next);
                          saveSettings.mutate({ club_tents: next });
                        }}
                      />
                      <Label className="font-normal cursor-pointer text-sm">
                        {ct.label}
                        <span className="text-muted-foreground ml-1">({calcClubTentArea(ct.id, spacing).toFixed(1)} m²)</span>
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
              <TentVisualizer items={summary.tentItems} totalSide={summary.suggestedSide} spacing={spacing} />
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
      </motion.div>
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number | string }) {
  return (
    <div className="border rounded-lg p-3 text-center">
      <div className="flex justify-center text-muted-foreground mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

interface TentItem {
  label: string;
  typeName: string;
  area: number;
  w: number;
  h: number;
  innerW: number;
  innerH: number;
  guyRope: number;
  shape: string;
  category: string;
}

function TentVisualizer({ items, totalSide, spacing }: { items: TentItem[]; totalSide: number; spacing: number }) {
  if (items.length === 0) {
    return <div className="h-48 border-2 border-dashed rounded flex items-center justify-center text-sm text-muted-foreground">Keine Zelte</div>;
  }

  const svgSize = 360;
  const scale = (svgSize - 20) / Math.max(totalSide, 1);
  const padding = 10;

  const sorted = [...items].sort((a, b) => {
    const order: Record<string, number> = { scheune: 0, kitchen: 1, supply: 2, club: 3, member: 4 };
    return (order[a.category] ?? 4) - (order[b.category] ?? 4);
  });

  let x = padding;
  let y = padding;
  let rowHeight = 0;

  const placed: (TentItem & { px: number; py: number; pw: number; ph: number })[] = [];

  for (const item of sorted) {
    const w = item.w * scale;
    const h = item.h * scale;

    if (x + w > svgSize - padding) {
      x = padding;
      y += rowHeight + 6;
      rowHeight = 0;
    }

    placed.push({ ...item, px: x, py: y, pw: w, ph: h });
    x += w + 6;
    rowHeight = Math.max(rowHeight, h);
  }

  const svgHeight = Math.max(y + rowHeight + padding, 200);

  return (
    <svg viewBox={`0 0 ${svgSize} ${svgHeight}`} className="w-full border rounded bg-muted/30" style={{ maxHeight: 450 }}>
      <rect x={0} y={0} width={svgSize} height={svgHeight} fill="none" stroke="hsl(var(--border))" strokeWidth={1} strokeDasharray="4 4" />

      {placed.map((p, i) => {
        const innerScale = scale;
        const guyRopePx = p.guyRope * innerScale;
        const spacingPx = spacing * innerScale;
        const innerW = p.innerW * innerScale;
        const innerH = p.innerH * innerScale;
        const fontSize = Math.max(6, Math.min(9, Math.min(p.pw, p.ph) / 5));
        const isClub = p.category !== "member";
        const fillColor = isClub ? "hsl(var(--primary) / 0.15)" : "hsl(var(--accent) / 0.3)";
        const strokeColor = isClub ? "hsl(var(--primary))" : "hsl(var(--accent-foreground) / 0.5)";

        return (
          <g key={i}>
            {p.shape === "circle" ? (
              <>
                <ellipse
                  cx={p.px + p.pw / 2} cy={p.py + p.ph / 2}
                  rx={p.pw / 2} ry={p.ph / 2}
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth={0.5}
                  strokeDasharray="2 2"
                />
                {p.guyRope > 0 && (
                  <ellipse
                    cx={p.px + p.pw / 2} cy={p.py + p.ph / 2}
                    rx={(p.pw / 2) - spacingPx} ry={(p.ph / 2) - spacingPx}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={0.8}
                    strokeDasharray="3 2"
                    opacity={0.5}
                  />
                )}
                <ellipse
                  cx={p.px + p.pw / 2} cy={p.py + p.ph / 2}
                  rx={innerW / 2} ry={innerH / 2}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={1}
                />
              </>
            ) : (
              <>
                <rect
                  x={p.px} y={p.py} width={p.pw} height={p.ph}
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth={0.5}
                  strokeDasharray="2 2"
                  rx={1}
                />
                {p.guyRope > 0 && (
                  <rect
                    x={p.px + spacingPx} y={p.py + spacingPx}
                    width={p.pw - 2 * spacingPx} height={p.ph - 2 * spacingPx}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={0.8}
                    strokeDasharray="3 2"
                    opacity={0.5}
                    rx={1}
                  />
                )}
                <rect
                  x={p.px + guyRopePx + spacingPx} y={p.py + guyRopePx + spacingPx}
                  width={innerW} height={innerH}
                  fill={fillColor}
                  stroke={strokeColor}
                  strokeWidth={1}
                  rx={2}
                />
              </>
            )}

            <text
              x={p.px + p.pw / 2}
              y={p.py + p.ph / 2 - fontSize * 0.3}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              fill="hsl(var(--foreground))"
              fontWeight={isClub ? "600" : "400"}
              className="select-none"
            >
              {p.label.length > 16 ? p.label.slice(0, 14) + "…" : p.label}
            </text>
            <text
              x={p.px + p.pw / 2}
              y={p.py + p.ph / 2 + fontSize * 0.9}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize * 0.8}
              fill="hsl(var(--muted-foreground))"
              className="select-none"
            >
              ({p.area.toFixed(1)} m²)
            </text>

            {p.shape === "rect" && innerW > 20 && (
              <>
                <text
                  x={p.px + p.pw / 2}
                  y={p.py + guyRopePx + spacingPx - 2}
                  textAnchor="middle"
                  fontSize={Math.max(5, fontSize * 0.65)}
                  fill="hsl(var(--muted-foreground))"
                  className="select-none"
                >
                  {p.innerW}m
                </text>
                <text
                  x={p.px + guyRopePx + spacingPx + innerW + 2}
                  y={p.py + p.ph / 2}
                  textAnchor="start"
                  dominantBaseline="central"
                  fontSize={Math.max(5, fontSize * 0.65)}
                  fill="hsl(var(--muted-foreground))"
                  className="select-none"
                  transform={`rotate(90, ${p.px + guyRopePx + spacingPx + innerW + 2}, ${p.py + p.ph / 2})`}
                >
                  {p.innerH}m
                </text>
              </>
            )}

            {p.shape === "circle" && innerW > 20 && (
              <>
                <line
                  x1={p.px + p.pw / 2 - innerW / 2}
                  y1={p.py + p.ph / 2 + innerH / 2 + 3}
                  x2={p.px + p.pw / 2 + innerW / 2}
                  y2={p.py + p.ph / 2 + innerH / 2 + 3}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={0.5}
                />
                <text
                  x={p.px + p.pw / 2}
                  y={p.py + p.ph / 2 + innerH / 2 + 9}
                  textAnchor="middle"
                  fontSize={Math.max(5, fontSize * 0.65)}
                  fill="hsl(var(--muted-foreground))"
                  className="select-none"
                >
                  Ø{p.innerW}m
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
