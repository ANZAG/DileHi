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

export interface Mitgliedsart {
  key: string;
  label: string;
  hinweis: string | null;
  sort_order: number;
  is_active: boolean;
}

/** Die Mitgliedsarten mit eigenem Beitragssatz. */
function useMitgliedsarten() {
  const { data } = useQuery({
    queryKey: ["contribution-categories"],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => any })
        .from("contribution_categories").select("*").order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as Mitgliedsart[];
    },
  });
  return data ?? [];
}

/** Kontodaten aus den Vereinsangaben – nur für Mitglieder lesbar. */
function useVereinskonto() {
  const { data } = useQuery({
    queryKey: ["vereinskonto"],
    queryFn: async () => {
      const { data, error } = await (supabase as unknown as { from: (t: string) => any })
        .from("app_settings")
        .select("org_name, bank_recipient, bank_iban, bank_bic")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data as {
        org_name: string | null;
        bank_recipient: string | null;
        bank_iban: string | null;
        bank_bic: string | null;
      } | null;
    },
    staleTime: 60 * 60 * 1000,
  });
  return {
    org_name: data?.org_name ?? "",
    bank_recipient: data?.bank_recipient ?? "",
    bank_iban: data?.bank_iban ?? "",
    bank_bic: data?.bank_bic ?? "",
  };
}

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

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

/**
 * Die Bankverbindung des Vereins.
 *
 * Stand bis vor Kurzem fest im Code – mit einem Vereinsnamen ohne Zirkumflex
 * und einer IBAN, die der Beispiel-IBAN aus Anleitungen zum Verwechseln
 * ähnlich sieht. Jetzt aus den Vereinsangaben, und ohne hinterlegte
 * Kontonummer erscheint die Karte gar nicht: Eine falsche Nummer, auf die
 * jemand überweist, ist schlimmer als keine.
 */
const BankInfoCard = () => {
  const { bank_recipient, bank_iban, bank_bic, org_name } = useVereinskonto();
  if (!bank_iban) return null;
  return (
    <div className="flex items-start gap-3 p-4 rounded-lg border bg-card mb-4">
      <Banknote size={20} className="text-primary mt-0.5 shrink-0" />
      <div className="text-sm space-y-0.5">
        <p className="font-medium">Bankverbindung</p>
        <p className="text-muted-foreground">Empfänger: {bank_recipient || org_name}</p>
        <p className="text-muted-foreground font-mono">{bank_iban}</p>
        {bank_bic && <p className="text-muted-foreground font-mono">{bank_bic}</p>}
      </div>
    </div>
  );
};

const RateEditor = ({
  year,
  category,
  rate,
  canEdit,
}: {
  year: number;
  /** Seit es mehrere Mitgliedsarten gibt, haengt ein Satz an Jahr UND Art. */
  category: string;
  rate: number | null;
  canEdit: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(rate ? String(rate) : "");
  const { toast } = useToast();
  const qc = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (amount: number) => {
      // Note: RateEditor is a standalone sub-component - it re-fetches the user
      // here instead of receiving it as a prop. Fine for now, but could be a prop.
      const { data: { user } } = await supabase.auth.getUser();
      // Upsert pattern: try update first to avoid duplicate key errors
      // Ohne die Kategorie liefert die Abfrage seit der Aufteilung mehrere
      // Zeilen, und maybeSingle wirft dann einen Fehler.
      const { data: existing } = await supabase
        .from("contribution_rates")
        .select("id")
        .eq("year", year)
        .eq("category", category)
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
          .insert({ year, category, amount, updated_by: user!.id });
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
        .select("id, display_name, first_name, last_name, is_active, contribution_interval, membership_type")
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

  // Member's own contributions across all years (for member view)
  const { data: myAllContribs = [] } = useQuery({
    queryKey: ["my-contributions", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("contributions")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !canEdit && !!user?.id,
  });

  // Eigenes Profil – für Eintrittsdatum-basierten Historien-Filter
  const { data: myProfile } = useQuery({
    queryKey: ["my-profile-entry", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("entry_date, membership_type")
        .eq("id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !canEdit && !!user?.id,
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

  /**
   * Der Satz eines Jahres für eine Mitgliedsart.
   *
   * Ohne eigenen Satz gilt der erste des Jahres – so wie es war, als es nur
   * einen für alle gab. Sonst stünde bei einer frisch angelegten Art „kein
   * Beitrag", obwohl nur noch niemand einen eingetragen hat.
   */
  const satzFuer = (jahr: number, art: string | null | undefined) => {
    const desJahres = rates.filter((r: any) => r.year === jahr);
    const eigener = desJahres.find((r: any) => (r.category ?? "aktiv") === (art ?? "aktiv"));
    return eigener ?? desJahres[0];
  };

  const upsertMutation = useMutation({
    mutationFn: async (params: { userId: string; status: string; amount?: string; notes?: string; paidAt?: string | null; membershipType?: string | null }) => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      // Determine status: if amount provided and less than rate → teilzahlung
      //
      // Massgeblich ist der Satz der Mitgliedsart dieses Mitglieds. Mit einem
      // Satz fuer alle waere eine volle Zahlung eines Studenten faelschlich
      // als Teilzahlung erschienen.
      const satz = satzFuer(parseInt(selectedYear), params.membershipType);
      let resolvedStatus = params.status;
      if (params.status === "bezahlt" && params.amount && satz) {
        const amt = parseFloat(params.amount);
        if (amt > 0 && amt < Number(satz.amount)) {
          resolvedStatus = "teilzahlung";
        }
      }

      const row = {
        user_id: params.userId,
        year: parseInt(selectedYear),
        status: resolvedStatus,
        amount: params.amount ? parseFloat(params.amount) : null,
        paid_at: params.paidAt !== undefined ? params.paidAt : (resolvedStatus === "bezahlt" || resolvedStatus === "teilzahlung" ? (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; })() : null),
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
        membershipType: p.membership_type ?? null,
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
    const myContribs = myAllContribs;
    return (
      <div className="container py-8 sm:py-12 max-w-3xl px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft size={16} /> Zurück
          </Link>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-6">Mein Beitragsstatus</h1>

          <BankInfoCard />

          <div className="space-y-3">
            {YEARS.filter((y) => {
              const entryYear = myProfile?.entry_date ? parseInt(String(myProfile.entry_date).slice(0, 4)) : null;
              return entryYear ? y >= entryYear : true;
            }).map((y) => {
              const yearRate = satzFuer(y, (myProfile as any)?.membership_type);
              const myContrib = myContribs.find((c: any) => c.year === y);
              const status = myContrib?.status || "offen";
              return (
                <div key={y} className="flex items-center justify-between p-4 rounded-lg border bg-card">
                  <div className="flex flex-col gap-0.5">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-sm">{y}</span>
                      {yearRate && (
                        <span className="text-xs text-muted-foreground">{Number(yearRate.amount).toFixed(2)} €</span>
                      )}
                    </div>
                    {myContrib?.paid_at && (
                      <span className="text-xs text-muted-foreground">
                        Bezahlt am {format(new Date(myContrib.paid_at + "T00:00:00"), "dd.MM.yyyy")}
                        {myContrib.amount ? ` · ${Number(myContrib.amount).toFixed(2)} €` : ""}
                      </span>
                    )}
                  </div>
                  <StatusBadge status={status} />
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
          <Beitragssaetze
            jahr={parseInt(selectedYear)}
            saetze={rates}
            canEdit={canEdit}
          />
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
                          membershipType: m.membershipType,
                          status: "bezahlt",
                          amount: editAmount,
                          notes: editNotes,
                          paidAt: editPaidAt ? `${editPaidAt.getFullYear()}-${String(editPaidAt.getMonth() + 1).padStart(2, '0')}-${String(editPaidAt.getDate()).padStart(2, '0')}` : undefined,
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

/**
 * Die Beitragssätze eines Jahres – einer je Mitgliedsart.
 *
 * Bis eben gab es genau einen Satz für alle. Eine Interessengemeinschaft
 * nimmt aber oft von Studenten und Rentnern weniger, und wer sich anteilig an
 * den Unkosten beteiligt, hat gar keinen Satz. Deshalb hier die Liste – und
 * die Möglichkeit, eine Art anzulegen, ohne die Sätze woanders zu suchen.
 */
function Beitragssaetze({ jahr, saetze, canEdit }: {
  jahr: number;
  saetze: { year: number; category?: string; amount: number }[];
  canEdit: boolean;
}) {
  const arten = useMitgliedsarten();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [neuOffen, setNeuOffen] = useState(false);
  const [neuLabel, setNeuLabel] = useState("");

  const anlegen = useMutation({
    mutationFn: async () => {
      const label = neuLabel.trim();
      // Der Schlüssel wird aus der Beschriftung gebildet – er steht später in
      // profiles.membership_type und soll dort lesbar sein.
      const key = label.toLowerCase()
        .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30);
      if (!key) throw new Error("Die Beschriftung ergibt keinen brauchbaren Schlüssel.");
      const { error } = await (supabase as unknown as { from: (t: string) => any })
        .from("contribution_categories")
        .insert({ key, label, sort_order: (arten[arten.length - 1]?.sort_order ?? 0) + 10 });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNeuOffen(false);
      setNeuLabel("");
      qc.invalidateQueries({ queryKey: ["contribution-categories"] });
      toast({ title: "Mitgliedsart angelegt" });
    },
    onError: (err: Error) =>
      toast({ title: "Nicht angelegt", description: err.message, variant: "destructive" }),
  });

  const aktive = arten.filter((a) => a.is_active);
  if (aktive.length === 0) return null;

  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-end">
        <span className="text-muted-foreground">Beitragssätze {jahr}:</span>
        {aktive.map((art) => (
          <span key={art.key} className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{art.label}</span>
            <RateEditor
              year={jahr}
              category={art.key}
              rate={saetze.find((r) => r.year === jahr && (r.category ?? "aktiv") === art.key)?.amount ?? null}
              canEdit={canEdit}
            />
          </span>
        ))}
        {canEdit && !neuOffen && (
          <button
            type="button"
            onClick={() => setNeuOffen(true)}
            className="text-xs text-primary hover:underline"
          >
            + Mitgliedsart
          </button>
        )}
      </div>

      {neuOffen && (
        <div className="flex flex-wrap items-center gap-2 mt-2 justify-end">
          <Input
            autoFocus
            value={neuLabel}
            onChange={(e) => setNeuLabel(e.target.value)}
            placeholder="z. B. Student"
            className="h-8 w-44"
          />
          <Button size="sm" disabled={!neuLabel.trim() || anlegen.isPending} onClick={() => anlegen.mutate()}>
            Anlegen
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setNeuOffen(false); setNeuLabel(""); }}>
            Abbrechen
          </Button>
        </div>
      )}
    </div>
  );
}
