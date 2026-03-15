import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, Check, X, Pencil, Banknote, CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

const BANK_INFO = {
  recipient: "Diu lebendec Historje e.V.",
  iban: "DE02 5109 0000 0030 8806 09",
};

const INTERVAL_LABELS: Record<string, string> = {
  jaehrlich: "Jährlich",
  halbjaehrlich: "Halbjährlich",
  vierteljaehrlich: "Vierteljährlich",
  monatlich: "Monatlich",
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "bezahlt") return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">Bezahlt</Badge>;
  if (status === "teilzahlung") return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs">Teilzahlung</Badge>;
  if (status === "offen") return <Badge variant="outline" className="text-xs">Offen</Badge>;
  return <Badge variant="secondary" className="text-xs">{status}</Badge>;
};

const IntervalBadge = ({ interval }: { interval: string | null }) => {
  const label = interval ? INTERVAL_LABELS[interval] || interval : "Jährlich";
  return <Badge variant="secondary" className="text-xs">{label}</Badge>;
};

const BankInfoCard = () => (
  <div className="flex items-start gap-3 p-4 rounded-lg border bg-card mb-4">
    <Banknote size={20} className="text-primary mt-0.5 shrink-0" />
    <div className="text-sm space-y-0.5">
      <p className="font-medium">Bankverbindung</p>
      <p className="text-muted-foreground">Empfänger: {BANK_INFO.recipient}</p>
      <p className="text-muted-foreground font-mono">{BANK_INFO.iban}</p>
    </div>
  </div>
);

const RateEditor = ({
  year,
  rate,
  canEdit,
}: {
  year: number;
  rate: number | null;
  canEdit: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(rate ? String(rate) : "");
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (amount: number) => {
      const { data: { user } } = await supabase.auth.getUser();
      // Try update first, then insert
      const { data: existing } = await supabase
        .from("contribution_rates")
        .select("id")
        .eq("year", year)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("contribution_rates")
          .update({ amount, updated_by: user!.id, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("contribution_rates")
          .insert({ year, amount, updated_by: user!.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contribution-rates"] });
      setEditing(false);
      toast({ title: "Beitragssatz gespeichert" });
    },
  });

  const isCurrentYear = year === currentYear;
  const canEditThis = canEdit && isCurrentYear;

  if (editing && canEditThis) {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-20 h-7 text-xs"
          step="0.01"
        />
        <span className="text-xs">€</span>
        <Button size="sm" className="h-7 text-xs" onClick={() => value && mutation.mutate(parseFloat(value))}>
          <Check size={12} />
        </Button>
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditing(false)}>
          <X size={12} />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{rate != null ? `${Number(rate).toFixed(2)} €` : "–"}</span>
      {canEditThis && (
        <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => { setValue(rate ? String(rate) : ""); setEditing(true); }}>
          <Pencil size={12} />
        </Button>
      )}
    </div>
  );
};

const Contributions = () => {
  const { user, hasPermission } = useAuth();
  const canEdit = hasPermission("contributions.manage");
  const { toast } = useToast();
  const qc = useQueryClient();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editPaidAt, setEditPaidAt] = useState<Date | undefined>(undefined);

  const { data: profiles = [] } = useQuery({
    queryKey: ["contribution-profiles"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id");
      const userIds = [...new Set(roles?.map((r) => r.user_id) || [])];
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, first_name, last_name, is_active, contribution_interval")
        .in("id", userIds);
      if (error) throw error;
      return data.filter((p) => p.is_active !== false);
    },
  });

  const { data: contributions = [] } = useQuery({
    queryKey: ["contributions", selectedYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contributions")
        .select("*")
        .eq("year", parseInt(selectedYear));
      if (error) throw error;
      return data;
    },
  });

  const { data: rates = [] } = useQuery({
    queryKey: ["contribution-rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contribution_rates")
        .select("*")
        .order("year", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const currentRate = rates.find((r: any) => r.year === parseInt(selectedYear));

  const upsertMutation = useMutation({
    mutationFn: async (params: { userId: string; status: string; amount?: string; notes?: string; paidAt?: string | null }) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      // Determine status: if amount provided and less than rate → teilzahlung
      let resolvedStatus = params.status;
      if (params.status === "bezahlt" && params.amount && currentRate) {
        const amt = parseFloat(params.amount);
        if (amt > 0 && amt < Number(currentRate.amount)) {
          resolvedStatus = "teilzahlung";
        }
      }

      const row = {
        user_id: params.userId,
        year: parseInt(selectedYear),
        status: resolvedStatus,
        amount: params.amount ? parseFloat(params.amount) : null,
        paid_at: params.paidAt !== undefined ? params.paidAt : (resolvedStatus === "bezahlt" || resolvedStatus === "teilzahlung" ? new Date().toISOString().split("T")[0] : null),
        notes: params.notes || null,
        updated_by: authUser!.id,
        updated_at: new Date().toISOString(),
      };

      const existing = contributions.find((c: any) => c.user_id === params.userId);
      if (existing) {
        const { error } = await supabase.from("contributions").update(row).eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contributions").insert(row);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contributions", selectedYear] });
      setEditingId(null);
      toast({ title: "Gespeichert" });
    },
  });

  const memberRows = useMemo(() => {
    return profiles.map((p: any) => {
      const contrib = contributions.find((c: any) => c.user_id === p.id);
      return {
        userId: p.id,
        name: p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : p.display_name,
        status: contrib?.status || "offen",
        amount: contrib?.amount,
        paidAt: contrib?.paid_at,
        notes: contrib?.notes,
        contribId: contrib?.id,
        interval: p.contribution_interval,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [profiles, contributions]);

  const paidCount = memberRows.filter((m) => m.status === "bezahlt" || m.status === "teilzahlung").length;

  // Non-admin members only see their own status
  if (!canEdit) {
    const myRow = memberRows.find((m) => m.userId === user?.id);
    return (
      <div className="container py-8 sm:py-12 max-w-3xl px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft size={16} /> Zurück
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-6">Mein Beitragsstatus</h1>

          <BankInfoCard />

          <div className="space-y-3">
            {YEARS.map((y) => {
              const yearRate = rates.find((r: any) => r.year === y);
              return (
                <div key={y} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sm">{y}</span>
                    {yearRate && (
                      <span className="text-xs text-muted-foreground">{Number(yearRate.amount).toFixed(2)} €</span>
                    )}
                  </div>
                  <StatusBadge status={y === parseInt(selectedYear) ? (myRow?.status || "offen") : "—"} />
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container py-8 sm:py-12 max-w-3xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">Beitragsübersicht</h1>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <BankInfoCard />

        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <p className="text-sm text-muted-foreground">
            {paidCount} von {memberRows.length} bezahlt
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Beitragssatz {selectedYear}:</span>
            <RateEditor year={parseInt(selectedYear)} rate={currentRate?.amount ?? null} canEdit={canEdit} />
          </div>
        </div>

        <div className="space-y-2">
          {memberRows.map((m) => (
            <div key={m.userId} className="p-3 rounded-lg border bg-card space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium truncate">{m.name}</p>
                    <IntervalBadge interval={m.interval} />
                  </div>
              {(m.amount || m.paidAt) && (
                    <p className="text-xs text-muted-foreground">
                      {m.amount ? `${Number(m.amount).toFixed(2)} €` : ""}
                      {m.paidAt ? ` · ${format(new Date(m.paidAt + "T00:00:00"), "dd.MM.yyyy")}` : ""}
                      {m.notes ? ` · ${m.notes}` : ""}
                    </p>
                  )}
                </div>
                <StatusBadge status={m.status} />
              </div>
              <div className="flex gap-2 flex-wrap">
              {editingId === m.userId ? (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex gap-2 flex-wrap items-center">
                      <Input
                        type="number"
                        placeholder="Betrag"
                        value={editAmount}
                        onChange={(e) => setEditAmount(e.target.value)}
                        className="w-24 h-8 text-xs"
                      />
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className={cn("h-8 text-xs w-36 justify-start", !editPaidAt && "text-muted-foreground")}>
                            <CalendarIcon size={12} className="mr-1" />
                            {editPaidAt ? format(editPaidAt, "dd.MM.yyyy") : "Zahldatum"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={editPaidAt}
                            onSelect={setEditPaidAt}
                            locale={de}
                            disabled={(date) => date > new Date()}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => upsertMutation.mutate({
                          userId: m.userId,
                          status: "bezahlt",
                          amount: editAmount,
                          notes: editNotes,
                          paidAt: editPaidAt ? editPaidAt.toISOString().split("T")[0] : undefined,
                        })}
                      >
                        <Check size={14} className="mr-1" /> OK
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setEditingId(null)}>
                        <X size={14} />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {m.status !== "bezahlt" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => {
                          setEditingId(m.userId);
                          setEditAmount(m.amount ? String(m.amount) : "");
                          setEditNotes(m.notes || "");
                          setEditPaidAt(m.paidAt ? new Date(m.paidAt + "T00:00:00") : undefined);
                        }}
                      >
                        <Pencil size={12} className="mr-1" /> Bezahlt
                      </Button>
                    )}
                    {(m.status === "bezahlt" || m.status === "teilzahlung") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => upsertMutation.mutate({ userId: m.userId, status: "offen", paidAt: null })}
                      >
                        Zurücksetzen
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

export default Contributions;
