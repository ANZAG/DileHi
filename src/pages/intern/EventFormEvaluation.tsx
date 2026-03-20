import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Download, Users, Tent, Bed, Car, Truck, ShoppingCart, UtensilsCrossed, Plus, Trash2, RefreshCw, MessageCircle } from "lucide-react";
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

interface TentItem {
  id: string;
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
  x: number;
  y: number;
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

  // Visualizer size
  const [vizHeight, setVizHeight] = useState(450);

  // Event responsible person
  const [eventLeadId, setEventLeadId] = useState<string>("");

  // Force re-layout
  const [layoutVersion, setLayoutVersion] = useState(0);

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
        setEventLeadId(s.event_lead_id ?? "");
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
        .select("*, profiles!member_tents_user_id_fkey(display_name)")
        .order("created_at");
      if (error) {
        console.error("member_tents error:", error);
        return [];
      }
      return data;
    },
  });

  // Fetch member directory for responsible person dropdown
  const { data: members = [] } = useQuery({
    queryKey: ["member_directory"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_member_directory");
      return data || [];
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
  };

  const summary = useMemo(() => {
    const tentField = fields.find((f) => f.type === "tent");
    const attendanceField = fields.find((f) => f.type === "attendance_days");

    const tents: { type: string; diameter?: number; length?: number; width?: number; capacity: number; respondent: string }[] = [];
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
        if (tv?.tents && Array.isArray(tv.tents)) {
          for (const t of tv.tents) {
            if (t.tent_type) {
              tents.push({
                type: t.tent_type,
                diameter: t.diameter ? Number(t.diameter) : undefined,
                length: t.length ? Number(t.length) : undefined,
                width: t.width ? Number(t.width) : undefined,
                capacity: t.capacity || 1,
                respondent: resp.respondent_name,
              });
              totalCapacity += t.capacity || 1;
            }
          }
        } else if (tv?.has_tent && tv.tent_type) {
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
          id: `resp-${t.respondent}-${tentItems.length}`,
          label: t.respondent,
          typeName: typeInfo.label,
          area, w, h, innerW, innerH,
          guyRope: typeInfo.guyRope,
          shape: typeInfo.shape,
          category: "member",
          x: 0, y: 0,
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
        id: `pool-${ptId}`,
        label: `${pt.name} (${ownerName})`,
        typeName: pt.tent_type,
        area, w, h, innerW, innerH,
        guyRope: Number(pt.guy_rope),
        shape: pt.shape,
        category: "member",
        x: 0, y: 0,
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
          id: `club-${ctId}`,
          label: ct.label,
          typeName: "",
          area, w: dims.w, h: dims.h,
          innerW, innerH,
          guyRope: ct.guyRope,
          shape: ct.shape,
          category: catMap[ct.id] || "club",
          x: 0, y: 0,
        });
      }
    }

    const totalArea = memberTentArea + poolTentArea + clubTentArea;

    // Auto-layout in a row, then compute bounding box
    autoLayout(tentItems);

    return { tents, totalCapacity, dayCount, carsCount, totalSeats, trailerCount, canTowCount, kitchenHelpers, shoppers, memberTentArea: memberTentArea + poolTentArea, clubTentArea, totalArea, tentItems };
  }, [responses, fields, selectedClubTents, spacing, poolTentIds, allMemberTents, layoutVersion]);

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

  const resetLayout = () => {
    // Clear saved positions and force re-layout
    saveSettings.mutate({ tent_positions: null });
    setLayoutVersion((v) => v + 1);
  };

  const whatsappLink = (form?.settings as any)?.whatsapp_link || "";
  const eventLeadName = eventLeadId
    ? members.find((m: any) => m.id === eventLeadId)?.display_name
    : null;
  const creatorName = event?.created_by
    ? members.find((m: any) => m.id === event.created_by)?.display_name
    : null;

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

        {/* Event info row */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {/* All Verantwortliche in one card */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Verantwortliche</h3>
            <div>
              <Label className="text-xs text-muted-foreground">Event-Verantwortlicher</Label>
              {isVorstand ? (
                <Select
                  value={eventLeadId || event?.created_by || ""}
                  onValueChange={(v) => {
                    setEventLeadId(v);
                    saveSettings.mutate({ event_lead_id: v });
                  }}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Ersteller" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m: any) => (
                      <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm">{eventLeadName || creatorName || "–"}</p>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Küche</Label>
              <Input
                value={kitchenLead}
                onChange={(e) => setKitchenLead(e.target.value)}
                onBlur={() => saveSettings.mutate({ kitchen_lead: kitchenLead })}
                placeholder="Name eingeben..."
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Programme</Label>
              {programItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2 mt-1">
                  <span className="text-xs flex-1">{item.point}: <strong>{item.person || "–"}</strong></span>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => removeProgramItem(i)}>
                    <Trash2 size={10} className="text-destructive" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-1 mt-1.5">
                <Input value={newProgPoint} onChange={(e) => setNewProgPoint(e.target.value)} placeholder="Punkt" className="flex-1 h-7 text-xs" />
                <Input value={newProgPerson} onChange={(e) => setNewProgPerson(e.target.value)} placeholder="Person" className="flex-1 h-7 text-xs" />
                <Button size="sm" variant="outline" onClick={addProgramItem} disabled={!newProgPoint.trim()} className="h-7 px-2">
                  <Plus size={12} />
                </Button>
              </div>
            </div>
          </div>

          {/* WhatsApp link */}
          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm flex items-center gap-1.5">
              <MessageCircle size={14} /> WhatsApp-Gruppe
            </h3>
            {whatsappLink ? (
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline break-all">
                {whatsappLink.length > 40 ? whatsappLink.slice(0, 40) + "…" : whatsappLink}
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">Kein Link hinterlegt (Einstellungen im Formular-Baukasten)</p>
            )}
          </div>

          {/* Quick stat */}
          {eventDays.length > 1 && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-2">Teilnehmer/Tag</h3>
              <div className="space-y-1">
                {eventDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const count = summary.dayCount[key] || 0;
                  return (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <span>{format(day, "EE, d. MMM", { locale: de })}</span>
                      <Badge variant="secondary" className="text-xs">{count}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Quick stats row */}
        <div className="grid sm:grid-cols-2 gap-6 mb-6">
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

        {/* Member tent pool */}
        <div className="border rounded-lg p-4 mb-6 space-y-3">
          <h3 className="font-semibold flex items-center gap-2"><Tent size={16} /> Zelte aus dem Pool</h3>
          <p className="text-xs text-muted-foreground">Zelte von Mitgliedern manuell für diese Veranstaltung hinzufügen. Bereits über Anmeldung ausgewählte Zelte sind markiert.</p>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
            {allMemberTents.map((mt: any) => {
              const ownerName = mt.profiles?.display_name || "Mitglied";
              const typeLabel = TENT_TYPES.find((t) => t.value === mt.tent_type)?.label || mt.tent_type;
              const dimStr = mt.shape === "circle" && mt.diameter
                ? `Ø${mt.diameter}m`
                : mt.length && mt.width ? `${mt.length}×${mt.width}m` : "";
              // Check if this tent was already selected by a respondent
              const selectedByRespondent = responses.some((r: any) => {
                const tentField = fields.find((f) => f.type === "tent");
                if (!tentField) return false;
                const tv = r.answers?.find((a: any) => a.field_id === tentField.id)?.value;
                if (!tv?.tents) return false;
                return tv.tents.some((t: any) => t.member_tent_id === mt.id);
              });
              return (
                <div key={mt.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={poolTentIds.includes(mt.id)}
                    disabled={selectedByRespondent}
                    onCheckedChange={(checked) => {
                      const next = checked
                        ? [...poolTentIds, mt.id]
                        : poolTentIds.filter((id: string) => id !== mt.id);
                      setPoolTentIds(next);
                      saveSettings.mutate({ pool_tent_ids: next });
                    }}
                  />
                  <Label className={`font-normal cursor-pointer text-sm ${selectedByRespondent ? "line-through text-muted-foreground" : ""}`}>
                    {ownerName}: {typeLabel} {dimStr}
                    {selectedByRespondent && <span className="text-xs ml-1">(angemeldet)</span>}
                  </Label>
                </div>
              );
            })}
            {allMemberTents.length === 0 && (
              <p className="text-xs text-muted-foreground col-span-full">Keine Mitgliederzelte im Pool vorhanden.</p>
            )}
          </div>
        </div>

        {/* Area calculator */}
        <div className="border rounded-lg p-4 mb-6">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <Tent size={18} /> Flächenrechner & Lagerplan
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
              </div>
            </div>

            {/* Visual preview with drag & drop */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">Lagerplan (Zelte verschiebbar)</Label>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs px-2"
                    title="Optimiertes Layout berechnen"
                    onClick={resetLayout}
                  >
                    <RefreshCw size={12} className="mr-1" /> Auto-Layout
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setVizHeight((v) => Math.max(200, v - 50))}
                    disabled={vizHeight <= 200}
                  >
                    <span className="text-xs font-bold">−</span>
                  </Button>
                  <span className="text-xs text-muted-foreground w-10 text-center">{vizHeight}px</span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setVizHeight((v) => Math.min(600, v + 50))}
                    disabled={vizHeight >= 600}
                  >
                    <span className="text-xs font-bold">+</span>
                  </Button>
                </div>
              </div>
              <TentVisualizer
                items={summary.tentItems}
                spacing={spacing}
                maxHeight={vizHeight}
                onPositionsChange={(positions) => {
                  saveSettings.mutate({ tent_positions: positions });
                }}
                savedPositions={(form?.settings as any)?.tent_positions}
                layoutVersion={layoutVersion}
              />
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

/** Auto-layout: pack tents into smallest possible rectangle */
function autoLayout(items: TentItem[]) {
  if (items.length === 0) return;

  const scheune = items.find((i) => i.category === "scheune");
  const kitchen = items.filter((i) => i.category === "kitchen");
  const supply = items.filter((i) => i.category === "supply");
  const members = items.filter((i) => i.category === "member");
  const rest = items.filter((i) => !["scheune", "kitchen", "supply", "member"].includes(i.category));

  const gap = 1;

  // Strategy: pack into rows with a target width, try to minimize total area
  // Determine target width based on total area estimate
  const allItems = [...kitchen, ...supply, ...(scheune ? [scheune] : []), ...members, ...rest];
  const totalItemArea = allItems.reduce((sum, i) => sum + i.w * i.h, 0);
  const targetWidth = Math.max(
    Math.sqrt(totalItemArea) * 1.3,
    ...allItems.map((i) => i.w + 2 * gap)
  );

  // Place kitchen + supply in first row
  let curX = gap;
  let curY = gap;
  let rowH = 0;

  for (const k of [...kitchen, ...supply]) {
    if (curX + k.w > targetWidth && curX > gap) {
      curX = gap;
      curY += rowH + gap;
      rowH = 0;
    }
    k.x = curX;
    k.y = curY;
    curX += k.w + gap;
    rowH = Math.max(rowH, k.h);
  }

  // Next row: Scheune centered
  if (scheune) {
    curY += rowH + gap;
    scheune.x = Math.max(gap, (targetWidth - scheune.w) / 2);
    scheune.y = curY;
    rowH = scheune.h;
  }

  // Remaining rows: member tents packed tightly
  curY += rowH + gap;
  curX = gap;
  rowH = 0;
  for (const m of [...members, ...rest]) {
    if (curX + m.w > targetWidth && curX > gap) {
      curX = gap;
      curY += rowH + gap;
      rowH = 0;
    }
    m.x = curX;
    m.y = curY;
    curX += m.w + gap;
    rowH = Math.max(rowH, m.h);
  }
}

/** Compute tight bounding box from items and their positions */
function computeBounds(items: TentItem[], positions: Record<string, { x: number; y: number }>) {
  if (items.length === 0) return { minX: 0, minY: 0, maxX: 10, maxY: 10 };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const item of items) {
    const pos = positions[item.id] || { x: item.x, y: item.y };
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + item.w);
    maxY = Math.max(maxY, pos.y + item.h);
  }
  return { minX: minX - 1, minY: minY - 1, maxX: maxX + 1, maxY: maxY + 1 };
}

function TentVisualizer({
  items,
  spacing,
  maxHeight,
  onPositionsChange,
  savedPositions,
  layoutVersion,
}: {
  items: TentItem[];
  spacing: number;
  maxHeight: number;
  onPositionsChange?: (positions: Record<string, { x: number; y: number }>) => void;
  savedPositions?: Record<string, { x: number; y: number }>;
  layoutVersion: number;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({});

  // Apply saved positions or auto-layout positions
  useEffect(() => {
    const pos: Record<string, { x: number; y: number }> = {};
    for (const item of items) {
      if (layoutVersion === 0 && savedPositions?.[item.id]) {
        pos[item.id] = savedPositions[item.id];
      } else {
        pos[item.id] = { x: item.x, y: item.y };
      }
    }
    setPositions(pos);
  }, [items, savedPositions, layoutVersion]);

  if (items.length === 0) {
    return <div className="border-2 border-dashed rounded flex items-center justify-center text-sm text-muted-foreground" style={{ height: maxHeight }}>Keine Zelte</div>;
  }

  const bounds = computeBounds(items, positions);
  const vbW = bounds.maxX - bounds.minX;
  const vbH = bounds.maxY - bounds.minY;

  const getSVGPoint = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * vbW + bounds.minX;
    const y = ((e.clientY - rect.top) / rect.height) * vbH + bounds.minY;
    return { x, y };
  };

  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const pt = getSVGPoint(e as any);
    const pos = positions[id] || { x: 0, y: 0 };
    setDragOffset({ dx: pt.x - pos.x, dy: pt.y - pos.y });
    setDragging(id);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const pt = getSVGPoint(e);
    setPositions((prev) => ({
      ...prev,
      [dragging]: { x: pt.x - dragOffset.dx, y: pt.y - dragOffset.dy },
    }));
  };

  const handleMouseUp = () => {
    if (dragging && onPositionsChange) {
      onPositionsChange(positions);
    }
    setDragging(null);
  };

  // Compute total area from bounds
  const totalW = (bounds.maxX - bounds.minX - 2).toFixed(1);
  const totalH = (bounds.maxY - bounds.minY - 2).toFixed(1);

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`${bounds.minX} ${bounds.minY} ${vbW} ${vbH}`}
        className="w-full border rounded bg-muted/30 cursor-crosshair select-none"
        style={{ maxHeight }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Border rectangle fitting tents */}
        <rect
          x={bounds.minX} y={bounds.minY} width={vbW} height={vbH}
          fill="none" stroke="hsl(var(--border))" strokeWidth={0.2} strokeDasharray="1 1"
        />

        {/* Dimension labels on edges */}
        <text
          x={bounds.minX + vbW / 2} y={bounds.minY + 0.6}
          textAnchor="middle" fontSize={Math.max(0.4, vbW / 40)}
          fill="hsl(var(--muted-foreground))"
          className="select-none pointer-events-none"
        >
          ~{totalW}m
        </text>
        <text
          x={bounds.maxX - 0.3} y={bounds.minY + vbH / 2}
          textAnchor="middle" dominantBaseline="central"
          fontSize={Math.max(0.4, vbH / 40)}
          fill="hsl(var(--muted-foreground))"
          className="select-none pointer-events-none"
          transform={`rotate(90, ${bounds.maxX - 0.3}, ${bounds.minY + vbH / 2})`}
        >
          ~{totalH}m
        </text>

        {items.map((item) => {
          const pos = positions[item.id] || { x: item.x, y: item.y };
          const px = pos.x;
          const py = pos.y;
          const pw = item.w;
          const ph = item.h;
          const innerW = item.innerW;
          const innerH = item.innerH;
          const guyRope = item.guyRope;
          const spacingVal = spacing;

          const fontSize = Math.max(0.4, Math.min(0.7, Math.min(pw, ph) / 8));
          const isClub = item.category !== "member";
          const fillColor = isClub ? "hsl(var(--primary) / 0.15)" : "hsl(var(--accent) / 0.3)";
          const strokeColor = isClub ? "hsl(var(--primary))" : "hsl(var(--accent-foreground) / 0.5)";
          const isDragged = dragging === item.id;

          return (
            <g
              key={item.id}
              onMouseDown={(e) => handleMouseDown(item.id, e)}
              style={{ cursor: isDragged ? "grabbing" : "grab" }}
            >
              {item.shape === "circle" ? (
                <>
                  <ellipse
                    cx={px + pw / 2} cy={py + ph / 2}
                    rx={pw / 2} ry={ph / 2}
                    fill="none" stroke="hsl(var(--border))" strokeWidth={0.15} strokeDasharray="0.5 0.5"
                  />
                  {guyRope > 0 && (
                    <ellipse
                      cx={px + pw / 2} cy={py + ph / 2}
                      rx={(pw / 2) - spacingVal} ry={(ph / 2) - spacingVal}
                      fill="none" stroke={strokeColor} strokeWidth={0.2} strokeDasharray="0.8 0.5" opacity={0.5}
                    />
                  )}
                  <ellipse
                    cx={px + pw / 2} cy={py + ph / 2}
                    rx={innerW / 2} ry={innerH / 2}
                    fill={fillColor} stroke={strokeColor} strokeWidth={0.2}
                  />
                </>
              ) : (
                <>
                  <rect
                    x={px} y={py} width={pw} height={ph}
                    fill="none" stroke="hsl(var(--border))" strokeWidth={0.15} strokeDasharray="0.5 0.5" rx={0.2}
                  />
                  {guyRope > 0 && (
                    <rect
                      x={px + spacingVal} y={py + spacingVal}
                      width={pw - 2 * spacingVal} height={ph - 2 * spacingVal}
                      fill="none" stroke={strokeColor} strokeWidth={0.2} strokeDasharray="0.8 0.5" opacity={0.5} rx={0.2}
                    />
                  )}
                  <rect
                    x={px + guyRope + spacingVal} y={py + guyRope + spacingVal}
                    width={innerW} height={innerH}
                    fill={fillColor} stroke={strokeColor} strokeWidth={0.2} rx={0.3}
                  />
                </>
              )}

              {/* Label + area */}
              <text
                x={px + pw / 2} y={py + ph / 2 - fontSize * 0.3}
                textAnchor="middle" dominantBaseline="central"
                fontSize={fontSize} fill="hsl(var(--foreground))"
                fontWeight={isClub ? "600" : "400"} className="select-none pointer-events-none"
              >
                {item.label.length > 16 ? item.label.slice(0, 14) + "…" : item.label}
              </text>
              <text
                x={px + pw / 2} y={py + ph / 2 + fontSize * 0.9}
                textAnchor="middle" dominantBaseline="central"
                fontSize={fontSize * 0.8} fill="hsl(var(--muted-foreground))"
                className="select-none pointer-events-none"
              >
                ({item.area.toFixed(1)} m²)
              </text>

              {/* Dimension labels */}
              {item.shape === "rect" && innerW > 1.5 && (
                <>
                  <text
                    x={px + pw / 2} y={py + guyRope + spacingVal - 0.2}
                    textAnchor="middle" fontSize={Math.max(0.3, fontSize * 0.6)}
                    fill="hsl(var(--muted-foreground))" className="select-none pointer-events-none"
                  >
                    {innerW}m
                  </text>
                  <text
                    x={px + guyRope + spacingVal + innerW + 0.3} y={py + ph / 2}
                    textAnchor="start" dominantBaseline="central"
                    fontSize={Math.max(0.3, fontSize * 0.6)}
                    fill="hsl(var(--muted-foreground))"
                    className="select-none pointer-events-none"
                    transform={`rotate(90, ${px + guyRope + spacingVal + innerW + 0.3}, ${py + ph / 2})`}
                  >
                    {innerH}m
                  </text>
                </>
              )}

              {item.shape === "circle" && innerW > 1.5 && (
                <>
                  <line
                    x1={px + pw / 2 - innerW / 2} y1={py + ph / 2 + innerH / 2 + 0.2}
                    x2={px + pw / 2 + innerW / 2} y2={py + ph / 2 + innerH / 2 + 0.2}
                    stroke="hsl(var(--muted-foreground))" strokeWidth={0.1}
                  />
                  <text
                    x={px + pw / 2} y={py + ph / 2 + innerH / 2 + 0.7}
                    textAnchor="middle" fontSize={Math.max(0.3, fontSize * 0.6)}
                    fill="hsl(var(--muted-foreground))" className="select-none pointer-events-none"
                  >
                    Ø{innerW}m
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      <p className="text-xs text-muted-foreground mt-1 text-center">
        Gesamtfläche: ~{totalW}×{totalH}m = ~{(Number(totalW) * Number(totalH)).toFixed(0)} m²
      </p>
    </div>
  );
}
