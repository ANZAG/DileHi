import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Download, Tent, Plus, Trash2, MessageCircle } from "lucide-react";
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
import { autoLayout, type TentItem } from "@/components/evaluation/TentVisualizer";
import EvalSummaryCards from "@/components/evaluation/EvalSummaryCards";
import EvalLogistics from "@/components/evaluation/EvalLogistics";
import EvalAreaCalculator from "@/components/evaluation/EvalAreaCalculator";
import EvalResponsesTable from "@/components/evaluation/EvalResponsesTable";

interface ProgramItem {
  point: string;
  person: string;
}

export default function EventFormEvaluation() {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, isVorstand } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  // Zurück-Navigation: woher kam der Nutzer?
  // Mögliche Quellen: /intern/auswertungen (Liste) oder /intern/veranstaltungen/:id/formular (Formular-Builder)
  // Fallback: Auswertungsliste
  const handleBack = () => {
    const referrer = (location.state as any)?.from as string | undefined;
    if (referrer) {
      navigate(referrer);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/intern/auswertungen");
    }
  };

  const [selectedClubTents, setSelectedClubTents] = useState<string[]>([]);
  const [spacing, setSpacing] = useState(0);
  const [kitchenLead, setKitchenLead] = useState("");
  const [programItems, setProgramItems] = useState<ProgramItem[]>([]);
  const [newProgPoint, setNewProgPoint] = useState("");
  const [newProgPerson, setNewProgPerson] = useState("");
  const [poolTentIds, setPoolTentIds] = useState<string[]>([]);
  const [vizHeight, setVizHeight] = useState(450);
  const [eventLeadId, setEventLeadId] = useState<string>("");
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
      return data as any;
    },
    enabled: !!eventId,
  });

  // Sync local state from form settings whenever form data is available (including from cache)
  const formSettingsKey = form?.id;
  const settingsApplied = useRef<string | null>(null);
  useEffect(() => {
    if (!form?.settings || settingsApplied.current === form.id) return;
    settingsApplied.current = form.id;
    const s = form.settings as any;
    setSpacing(s.spacing_m ?? 0);
    setSelectedClubTents(s.club_tents ?? []);
    setKitchenLead(s.kitchen_lead ?? "");
    setProgramItems(s.program_items ?? []);
    setPoolTentIds(s.pool_tent_ids ?? []);
    setEventLeadId(s.event_lead_id ?? "");
  }, [formSettingsKey, form]);

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

  const { data: allMemberTents = [] } = useQuery({
    queryKey: ["all_member_tents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_tents")
        .select("*, profiles!member_tents_user_id_fkey(display_name)")
        .order("created_at");
      if (error) { console.error("member_tents error:", error); return []; }
      return data;
    },
  });

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

  const doSaveSettings = (patch: Record<string, any>) => saveSettings.mutate(patch);

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

  const summary = useMemo(() => {
    const tentField = fields.find((f) => f.type === "tent");
    const attendanceField = fields.find((f) => f.type === "attendance_days");

    const tents: { type: string; diameter?: number; length?: number; width?: number; capacity: number; respondent: string; member_tent_id?: string }[] = [];
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
                member_tent_id: t.member_tent_id,
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
          if (lbl.includes("einkauf") || lbl.includes("einkaufen") || lbl.includes("einzukaufen")) shoppers++;
        }

        if (field.type === "number" && (lbl.includes("mitnehmen") || lbl.includes("sitzplätze")) && typeof val === "number") {
          totalSeats += val;
        }
      }
    }

    let memberTentArea = 0;
    const tentItems: TentItem[] = [];
    const registeredMemberTentIds = new Set<string>();
    for (const t of tents) {
      if (t.member_tent_id) registeredMemberTentIds.add(t.member_tent_id);
    }

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
          label: t.respondent, typeName: typeInfo.label,
          area, w, h, innerW, innerH,
          guyRope: typeInfo.guyRope, shape: typeInfo.shape,
          category: "member", x: 0, y: 0,
        });
      }
    }

    let poolTentArea = 0;
    for (const ptId of poolTentIds) {
      if (registeredMemberTentIds.has(ptId)) continue;
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
        label: `${pt.name} (${ownerName})`, typeName: pt.tent_type,
        area, w, h, innerW, innerH,
        guyRope: Number(pt.guy_rope), shape: pt.shape,
        category: "member", x: 0, y: 0,
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
          kuechenzelt: "kitchen", versorgung_klein: "supply",
          versorgung_gross: "supply", scheune: "scheune",
        };
        tentItems.push({
          id: `club-${ctId}`, label: ct.label, typeName: "",
          area, w: dims.w, h: dims.h, innerW, innerH,
          guyRope: ct.guyRope, shape: ct.shape,
          category: catMap[ct.id] || "club", x: 0, y: 0,
        });
      }
    }

    const totalArea = memberTentArea + poolTentArea + clubTentArea;
    autoLayout(tentItems);

    return { tents, totalCapacity, dayCount, carsCount, totalSeats, trailerCount, canTowCount, kitchenHelpers, shoppers, memberTentArea: memberTentArea + poolTentArea, clubTentArea, totalArea, tentItems };
  }, [responses, fields, selectedClubTents, spacing, poolTentIds, allMemberTents, layoutVersion]);

  const exportCSV = () => {
    const dataFields = fields.filter((f) => f.type !== "section");
    const headers = ["Name", "E-Mail", ...dataFields.map((f) => f.label)];

    const formatAnswer = (field: FormField, value: any): string => {
      if (value === null || value === undefined || value === "") return "–";
      switch (field.type) {
        case "checkbox":
          return value === true ? "Ja" : "Nein";
        case "multi_select":
          return Array.isArray(value) ? value.join("; ") : String(value);
        case "attendance_days": {
          if (value?.all_days) return "Alle Tage";
          if (Array.isArray(value?.days) && value.days.length) {
            return value.days
              .map((d: string) => {
                try { return format(parseISO(d), "dd.MM.yyyy", { locale: de }); }
                catch { return d; }
              })
              .join("; ");
          }
          return "–";
        }
        case "tent": {
          const tents = value?.tents;
          if (Array.isArray(tents) && tents.length > 0) {
            return tents.map((t: any) => {
              const type = TENT_TYPES.find((tt) => tt.value === t.tent_type);
              const typeLabel = type?.label || t.tent_type || "Zelt";
              const dim = type?.shape === "circle"
                ? (t.diameter ? `Ø${t.diameter}m` : "")
                : (t.length && t.width ? `${t.length}×${t.width}m` : "");
              return `${typeLabel}${dim ? " " + dim : ""}, ${t.capacity || 1} Pl.`;
            }).join(" | ");
          }
          if (value?.has_tent && value?.tent_type) {
            const type = TENT_TYPES.find((t) => t.value === value.tent_type);
            const typeLabel = type?.label || value.tent_type;
            const dim = type?.shape === "circle"
              ? (value.diameter ? `Ø${value.diameter}m` : "")
              : (value.length && value.width ? `${value.length}×${value.width}m` : "");
            return `${typeLabel}${dim ? " " + dim : ""}, ${value.capacity || 1} Pl.`;
          }
          return "Kein Zelt";
        }
        default:
          return String(value);
      }
    };

    // Excel-friendly: semicolon delimiter, CRLF line endings, RFC4180 quoting
    const escape = (s: string) => {
      const needsQuotes = /[";\r\n]/.test(s);
      const cleaned = s.replace(/\r?\n/g, " "); // collapse line breaks within cells
      return needsQuotes ? `"${cleaned.replace(/"/g, '""')}"` : cleaned;
    };

    const rows = responses.map((r) => [
      r.respondent_name,
      r.respondent_email || "",
      ...dataFields.map((f) => formatAnswer(f, getAnswer(r, f.id))),
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((c) => escape(String(c ?? ""))).join(";"))
      .join("\r\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anmeldungen-${event?.title || "export"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Delete a single response (board / event organizer)
  const deleteResponse = useMutation({
    mutationFn: async (responseId: string) => {
      const { error } = await supabase.from("event_form_responses").delete().eq("id", responseId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["event_form_responses", form?.id] }),
  });

  const addProgramItem = () => {
    if (!newProgPoint.trim()) return;
    const updated = [...programItems, { point: newProgPoint.trim(), person: newProgPerson.trim() }];
    setProgramItems(updated);
    doSaveSettings({ program_items: updated });
    setNewProgPoint("");
    setNewProgPerson("");
  };

  const removeProgramItem = (index: number) => {
    const updated = programItems.filter((_, i) => i !== index);
    setProgramItems(updated);
    doSaveSettings({ program_items: updated });
  };

  const resetLayout = () => {
    doSaveSettings({ tent_positions: null });
    setLayoutVersion((v) => v + 1);
  };

  const whatsappLink = (form?.settings as any)?.whatsapp_link || "";
  const eventLeadName = eventLeadId
    ? members.find((m: any) => m.id === eventLeadId)?.display_name
    : null;
  const creatorName = event?.created_by
    ? members.find((m: any) => m.id === event.created_by)?.display_name
    : null;

  return (
    <div className="container py-8 max-w-6xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
          <div className="flex items-center gap-3 flex-1">
            <Button variant="ghost" size="icon" onClick={handleBack}><ArrowLeft size={20} /></Button>
            <div className="flex-1 min-w-0">
              <h1 className="font-serif text-xl sm:text-2xl font-bold">Auswertung</h1>
              {event && <p className="text-sm text-muted-foreground truncate">{event.title}</p>}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/intern/veranstaltungen/${eventId}/formular`} state={{ from: `/intern/veranstaltungen/${eventId}/auswertung` }}>Formular</Link>
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download size={14} className="mr-1" /> CSV
            </Button>
          </div>
        </div>

        <EvalSummaryCards
          responsesCount={responses.length}
          tentsCount={summary.tents.length}
          totalCapacity={summary.totalCapacity}
          carsCount={summary.carsCount}
          totalSeats={summary.totalSeats}
        />

        {/* Event info row */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {/* Verantwortliche */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold text-sm">Verantwortliche</h3>
            <div>
              <Label className="text-xs text-muted-foreground">Event-Verantwortlicher</Label>
              {isVorstand ? (
                <Select
                  value={eventLeadId || event?.created_by || ""}
                  onValueChange={(v) => {
                    setEventLeadId(v);
                    doSaveSettings({ event_lead_id: v });
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
                onBlur={() => doSaveSettings({ kitchen_lead: kitchenLead })}
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

          {/* WhatsApp */}
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

          {/* Day attendance */}
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

        <EvalLogistics
          carsCount={summary.carsCount}
          canTowCount={summary.canTowCount}
          trailerCount={summary.trailerCount}
          shoppers={summary.shoppers}
          kitchenHelpers={summary.kitchenHelpers}
        />

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
                      doSaveSettings({ pool_tent_ids: next });
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

        <EvalAreaCalculator
          spacing={spacing}
          setSpacing={setSpacing}
          selectedClubTents={selectedClubTents}
          setSelectedClubTents={setSelectedClubTents}
          saveSettings={doSaveSettings}
          memberTentArea={summary.memberTentArea}
          clubTentArea={summary.clubTentArea}
          totalArea={summary.totalArea}
          tentItems={summary.tentItems}
          vizHeight={vizHeight}
          setVizHeight={setVizHeight}
          resetLayout={resetLayout}
          layoutVersion={layoutVersion}
          savedPositions={(form?.settings as any)?.tent_positions}
          onPositionsChange={(positions) => doSaveSettings({ tent_positions: positions })}
        />

        <EvalResponsesTable
          fields={fields}
          responses={responses}
          formId={form?.id}
          canEdit={isVorstand || event?.created_by === user?.id}
          canDelete={isVorstand || event?.created_by === user?.id}
          onDelete={(id) => deleteResponse.mutate(id)}
        />
      </motion.div>
    </div>
  );
}
