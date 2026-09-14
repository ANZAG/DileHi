import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Plus, Repeat, RotateCcw, Save, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { datumDe, heuteIso, plusMonate, tageBis } from "@/lib/datum";

const db = supabase as unknown as {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

type Kategorie = "tax" | "register" | "assembly" | "insurance" | "other";

interface Frist {
  id: string;
  title: string;
  category: Kategorie;
  due_date: string;
  repeat_months: number | null;
  remind_days: number;
  responsible_role: string | null;
  note: string | null;
  done_at: string | null;
}

const KATEGORIE: Record<Kategorie, string> = {
  tax: "Finanzamt",
  register: "Vereinsregister",
  assembly: "Mitgliederversammlung",
  insurance: "Versicherung",
  other: "Sonstiges",
};

const ALLE = "__alle__";

interface Vorschlag {
  title: string;
  category: Kategorie;
  repeat_months: number | null;
  remind_days: number;
  note: string;
  /** Fälligkeit aus den Angaben zum Bescheid; null = in einem Jahr, zum Anpassen. */
  faellig: (bescheid: Bescheid) => string | null;
}

interface Bescheid {
  exemption_notice_kind: "exemption" | "assessment_60a" | null;
  exemption_notice_date: string | null;
}

/**
 * Typische Fristen eines gemeinnützigen Vereins – als Vorschlag, nicht als
 * Vorgabe. Jeder Verein hat eine andere Satzung, einen anderen Rhythmus beim
 * Finanzamt und andere Versicherungen. Die Daten lassen sich nach dem
 * Übernehmen ändern.
 */
const VORSCHLAEGE: Vorschlag[] = [
  {
    title: "Steuererklärung für die Gemeinnützigkeit abgeben",
    category: "tax",
    repeat_months: 36,
    remind_days: 90,
    note: "Das Finanzamt prüft die Gemeinnützigkeit in der Regel alle drei Jahre anhand der Steuererklärung.",
    faellig: (b) => (b.exemption_notice_date ? plusMonate(b.exemption_notice_date, 36) : null),
  },
  {
    title: "Bescheid wird für Zuwendungsbestätigungen zu alt",
    category: "tax",
    repeat_months: null,
    remind_days: 180,
    note:
      "Zuwendungsbestätigungen darf der Verein nur ausstellen, solange der Freistellungsbescheid höchstens fünf Jahre oder die Feststellung nach § 60a AO höchstens drei Jahre zurückliegt (§ 63 Abs. 5 AO).",
    faellig: (b) =>
      b.exemption_notice_date
        ? plusMonate(b.exemption_notice_date, b.exemption_notice_kind === "assessment_60a" ? 36 : 60)
        : null,
  },
  {
    title: "Mitgliederversammlung einberufen",
    category: "assembly",
    repeat_months: 12,
    remind_days: 60,
    note: "Einladungsfrist und Form laut Satzung beachten.",
    faellig: () => null,
  },
  {
    title: "Vereinshaftpflichtversicherung prüfen",
    category: "insurance",
    repeat_months: 12,
    remind_days: 30,
    note: "Deckt sie noch alles, was der Verein tut – etwa Veranstaltungen mit Publikum?",
    faellig: () => null,
  },
  {
    title: "Neuen Vorstand beim Vereinsregister anmelden",
    category: "register",
    repeat_months: null,
    remind_days: 7,
    note: "Nach einer Vorstandswahl, notariell beglaubigt.",
    faellig: () => null,
  },
];

/**
 * Fristen des Vereins.
 *
 * Sichtbar nur mit dem Recht „Fristen verwalten" und nur für gemeinnützige
 * Vereine. Erledigt eine Frist, die sich wiederholt, legt die Datenbank die
 * nächste von selbst an – niemand soll daran denken müssen, an die Frist zu
 * denken.
 */
export default function FristenAdmin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [neu, setNeu] = useState<Partial<Frist> | null>(null);
  const [zeigeVorschlaege, setZeigeVorschlaege] = useState(false);

  const { data: fristen = [], isLoading } = useQuery({
    queryKey: ["fristen"],
    queryFn: async (): Promise<Frist[]> => {
      const { data, error } = await db.from("club_deadlines").select("*").order("due_date");
      if (error) throw new Error(error.message);
      return (data ?? []) as Frist[];
    },
  });

  const { data: rollen = [] } = useQuery({
    queryKey: ["rollen-katalog"],
    queryFn: async (): Promise<{ key: string; label: string }[]> => {
      const { data } = await db.rpc("get_role_catalog");
      return (data ?? []) as { key: string; label: string }[];
    },
  });

  const { data: bescheid } = useQuery({
    queryKey: ["bescheid"],
    queryFn: async (): Promise<Bescheid> => {
      const { data } = await db.from("app_settings").select("exemption_notice_kind, exemption_notice_date").maybeSingle();
      return (data ?? { exemption_notice_kind: null, exemption_notice_date: null }) as Bescheid;
    },
  });

  const erneuern = () => qc.invalidateQueries({ queryKey: ["fristen"] });

  const speichern = useMutation({
    mutationFn: async (f: Partial<Frist>) => {
      const daten = {
        title: (f.title ?? "").trim(),
        category: f.category ?? "other",
        due_date: f.due_date,
        repeat_months: f.repeat_months || null,
        remind_days: f.remind_days ?? 30,
        responsible_role: f.responsible_role || null,
        note: f.note?.trim() || null,
      };
      const { error } = f.id
        ? await db.from("club_deadlines").update(daten).eq("id", f.id)
        : await db.from("club_deadlines").insert(daten);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNeu(null);
      erneuern();
      toast({ title: "Frist gespeichert" });
    },
    onError: (err: Error) => toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  const erledigen = useMutation({
    mutationFn: async ({ id, erledigt }: { id: string; erledigt: boolean }) => {
      const { error } = await db.from("club_deadlines")
        .update({ done_at: erledigt ? new Date().toISOString() : null }).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, { erledigt }) => {
      erneuern();
      if (erledigt) toast({ title: "Erledigt" });
    },
    onError: (err: Error) => toast({ title: "Nicht geändert", description: err.message, variant: "destructive" }),
  });

  const loeschen = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("club_deadlines").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: erneuern,
    onError: (err: Error) => toast({ title: "Nicht gelöscht", description: err.message, variant: "destructive" }),
  });

  const offen = fristen.filter((f) => !f.done_at);
  const erledigt = fristen.filter((f) => f.done_at).sort((a, b) => (b.done_at ?? "").localeCompare(a.done_at ?? "")).slice(0, 10);
  const rolleVon = (key: string | null) => (key ? rollen.find((r) => r.key === key)?.label ?? key : "Alle mit dem Recht „Fristen verwalten“");

  const uebernehmen = (v: Vorschlag) => {
    setZeigeVorschlaege(false);
    setNeu({
      title: v.title,
      category: v.category,
      repeat_months: v.repeat_months,
      remind_days: v.remind_days,
      note: v.note,
      due_date: (bescheid && v.faellig(bescheid)) ?? plusMonate(heuteIso(), 12),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-semibold">Fristen</h2>
          <p className="text-sm text-muted-foreground max-w-prose">
            Was der Verein zu welchem Termin erledigen muss. Die Zuständigen bekommen eine Erinnerung in der Glocke
            und in der Abendmail, wenn der Vorlauf beginnt, und noch einmal, wenn die Frist verstrichen ist.
            Wiederkehrende Fristen legt DING beim Erledigen neu an.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setZeigeVorschlaege(!zeigeVorschlaege)}>
            <Sparkles size={14} className="mr-1" /> Vorschläge
          </Button>
          <Button size="sm" onClick={() => setNeu({ category: "other", remind_days: 30, due_date: plusMonate(heuteIso(), 1) })}>
            <Plus size={14} className="mr-1" /> Frist
          </Button>
        </div>
      </div>

      {zeigeVorschlaege && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {VORSCHLAEGE.map((v) => (
            <li key={v.title} className="rounded-lg border p-3 space-y-1">
              <p className="text-sm font-medium">{v.title}</p>
              <p className="text-xs text-muted-foreground">{v.note}</p>
              <Button size="sm" variant="outline" className="h-7 text-xs mt-1" onClick={() => uebernehmen(v)}>
                Übernehmen
              </Button>
            </li>
          ))}
        </ul>
      )}

      {neu && (
        <FristFormular
          frist={neu}
          rollen={rollen}
          pending={speichern.isPending}
          onSpeichern={(f) => speichern.mutate(f)}
          onAbbrechen={() => setNeu(null)}
        />
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Lade Fristen …</p>
      ) : offen.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine offenen Fristen. Die Vorschläge oben sind ein guter Anfang.</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {offen.map((f) => {
            const tage = tageBis(f.due_date);
            const farbe = tage < 0 ? "bg-red-100 text-red-800" : tage <= f.remind_days ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground";
            const stand = tage < 0 ? `Seit ${-tage} ${-tage === 1 ? "Tag" : "Tagen"} verstrichen` : tage === 0 ? "Heute fällig" : `In ${tage} ${tage === 1 ? "Tag" : "Tagen"}`;
            return (
              <li key={f.id} className="p-3 flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium break-words">{f.title}</p>
                  <p className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5">
                    <span>{KATEGORIE[f.category]}</span>
                    <span>fällig {datumDe(f.due_date)}</span>
                    {f.repeat_months && (
                      <span className="inline-flex items-center gap-1">
                        <Repeat size={11} /> alle {f.repeat_months === 12 ? "12 Monate" : `${f.repeat_months} Monate`}
                      </span>
                    )}
                    <span>{rolleVon(f.responsible_role)}</span>
                  </p>
                  {f.note && <p className="text-xs text-muted-foreground break-words max-w-prose">{f.note}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded ${farbe}`}>{stand}</span>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => erledigen.mutate({ id: f.id, erledigt: true })}>
                    <CheckCircle2 size={14} className="mr-1" /> Erledigt
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setNeu(f)}>Bearbeiten</Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => confirm(`„${f.title}" löschen?`) && loeschen.mutate(f.id)}
                    aria-label="Löschen"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {erledigt.length > 0 && (
        <details className="rounded-lg border">
          <summary className="cursor-pointer select-none p-3 text-sm font-medium">Zuletzt erledigt</summary>
          <ul className="divide-y border-t">
            {erledigt.map((f) => (
              <li key={f.id} className="p-3 flex flex-wrap items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">
                  {f.title} · fällig {datumDe(f.due_date)} · erledigt {datumDe(f.done_at!.slice(0, 10))}
                </span>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => erledigen.mutate({ id: f.id, erledigt: false })}>
                  <RotateCcw size={12} className="mr-1" /> Wieder öffnen
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function FristFormular({ frist, rollen, pending, onSpeichern, onAbbrechen }: {
  frist: Partial<Frist>;
  rollen: { key: string; label: string }[];
  pending: boolean;
  onSpeichern: (f: Partial<Frist>) => void;
  onAbbrechen: () => void;
}) {
  const [f, setF] = useState<Partial<Frist>>(frist);
  const setze = (patch: Partial<Frist>) => setF((x) => ({ ...x, ...patch }));

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="text-xs">Was ist zu tun?</Label>
          <Input className="h-9" value={f.title ?? ""} onChange={(e) => setze({ title: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Fällig am</Label>
          <Input className="h-9" type="date" value={f.due_date ?? ""} onChange={(e) => setze({ due_date: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Bereich</Label>
          <Select value={f.category ?? "other"} onValueChange={(v) => setze({ category: v as Kategorie })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(KATEGORIE) as Kategorie[]).map((k) => <SelectItem key={k} value={k}>{KATEGORIE[k]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Wiederholen alle … Monate</Label>
          <Input
            className="h-9"
            type="number"
            min={1}
            max={120}
            placeholder="einmalig"
            value={f.repeat_months ?? ""}
            onChange={(e) => setze({ repeat_months: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
        <div>
          <Label className="text-xs">Erinnern … Tage vorher</Label>
          <Input
            className="h-9"
            type="number"
            min={0}
            max={365}
            value={f.remind_days ?? 30}
            onChange={(e) => setze({ remind_days: Math.max(0, Math.min(365, Number(e.target.value) || 0)) })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Zuständig</Label>
          <Select value={f.responsible_role ?? ALLE} onValueChange={(v) => setze({ responsible_role: v === ALLE ? null : v })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALLE}>Alle mit dem Recht „Fristen verwalten"</SelectItem>
              {rollen.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Notiz (optional)</Label>
          <Input className="h-9" value={f.note ?? ""} onChange={(e) => setze({ note: e.target.value })} />
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSpeichern(f)} disabled={!(f.title ?? "").trim() || !f.due_date || pending}>
          {pending ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />} Speichern
        </Button>
        <Button size="sm" variant="outline" onClick={onAbbrechen}>Abbrechen</Button>
      </div>
    </div>
  );
}
