import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import { ArrowLeft, Check, X, Pencil, Banknote, CalendarIcon, LayoutGrid, List } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useBeitragsstufenStatus, stufenFuerJahr } from "@/hooks/useBeitragsstufen";
import { SEITE } from "@/lib/layout";

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
  const [bearbeitet, setBearbeitet] = useState<Eintrag | null>(null);
  const [ansicht, setzeAnsicht] = useAnsicht();

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
      setBearbeitet(null);
      toast({ title: "Gespeichert" });
    },
  });

  const memberRows: Eintrag[] = useMemo(() => {
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
      <div className={SEITE}>
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
    <div className={SEITE}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">Beitragsübersicht</h1>
          <div className="flex items-center gap-2">
            <AnsichtSchalter ansicht={ansicht} setzeAnsicht={setzeAnsicht} />
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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

        <div
          className={
            ansicht === "kacheln"
              ? "grid grid-cols-2 lg:grid-cols-3 gap-3"
              : "space-y-2"
          }
        >
          {memberRows.map((m) => (
            <BeitragEintrag
              key={m.userId}
              m={m}
              kachel={ansicht === "kacheln"}
              onBearbeiten={() => setBearbeitet(m)}
              onZuruecksetzen={() =>
                upsertMutation.mutate({ userId: m.userId, status: "offen", paidAt: null })
              }
            />
          ))}
        </div>

        <ZahlungDialog
          eintrag={bearbeitet}
          satz={bearbeitet ? satzFuer(parseInt(selectedYear), bearbeitet.membershipType)?.amount ?? null : null}
          jahr={parseInt(selectedYear)}
          laeuft={upsertMutation.isPending}
          onSchliessen={() => setBearbeitet(null)}
          onSpeichern={(werte) =>
            bearbeitet &&
            upsertMutation.mutate({
              userId: bearbeitet.userId,
              membershipType: bearbeitet.membershipType,
              status: "bezahlt",
              amount: werte.betrag,
              notes: werte.notiz,
              paidAt: werte.datum,
            })
          }
        />
      </motion.div>
    </div>
  );
};

export default Contributions;

/** Eine Zeile der Beitragsübersicht: ein Mitglied und sein Stand im Jahr. */
interface Eintrag {
  userId: string;
  membershipType: string | null;
  name: string;
  status: string;
  amount: number | null;
  paidAt: string | null;
  notes: string | null;
  contribId?: string;
  interval: string | null;
}

/**
 * Liste oder Kacheln.
 *
 * Bei fünfzehn Mitgliedern ist die Liste angenehm, bei achtzig scrollt man
 * sich einen Wolf. Die Wahl bleibt im Browser stehen, damit sie nicht bei
 * jedem Aufruf neu getroffen werden muss.
 */
type Ansicht = "liste" | "kacheln";

function useAnsicht(): [Ansicht, (a: Ansicht) => void] {
  const [ansicht, setzen] = useState<Ansicht>(() => {
    try {
      return localStorage.getItem("beitraege-ansicht") === "kacheln" ? "kacheln" : "liste";
    } catch {
      // Privates Fenster, blockierte Speicherung: dann eben die Liste.
      return "liste";
    }
  });
  const merken = (a: Ansicht) => {
    setzen(a);
    try {
      localStorage.setItem("beitraege-ansicht", a);
    } catch {
      // Nicht schlimm – die Wahl gilt dann nur für diesen Besuch.
    }
  };
  return [ansicht, merken];
}

function AnsichtSchalter({
  ansicht,
  setzeAnsicht,
}: {
  ansicht: Ansicht;
  setzeAnsicht: (a: Ansicht) => void;
}) {
  return (
    <div className="inline-flex rounded-md border p-0.5" role="group" aria-label="Ansicht">
      {([
        { wert: "liste" as const, icon: List, titel: "Liste" },
        { wert: "kacheln" as const, icon: LayoutGrid, titel: "Kacheln" },
      ]).map((o) => (
        <button
          key={o.wert}
          type="button"
          onClick={() => setzeAnsicht(o.wert)}
          aria-pressed={ansicht === o.wert}
          title={o.titel}
          className={cn(
            "px-2 py-1.5 rounded transition-colors",
            ansicht === o.wert
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          )}
        >
          <o.icon size={15} />
          <span className="sr-only">{o.titel}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * Ein Mitglied in der Beitragsübersicht.
 *
 * Liste und Kacheln zeigen dasselbe, nur anders angeordnet – deshalb eine
 * Komponente mit einem Schalter und nicht zwei, die auseinanderlaufen.
 */
function BeitragEintrag({
  m,
  kachel,
  onBearbeiten,
  onZuruecksetzen,
}: {
  m: Eintrag;
  kachel: boolean;
  onBearbeiten: () => void;
  onZuruecksetzen: () => void;
}) {
  const bezahlt = m.status === "bezahlt" || m.status === "teilzahlung";
  const details = [
    m.amount ? `${Number(m.amount).toFixed(2)} €` : null,
    m.paidAt ? format(new Date(m.paidAt + "T00:00:00"), "dd.MM.yyyy") : null,
    m.notes || null,
  ].filter(Boolean).join(" · ");

  const aktionen = (
    <div className="flex gap-1 flex-wrap">
      {m.status !== "bezahlt" && (
        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onBearbeiten}>
          <Pencil size={12} className="mr-1" /> Bezahlt
        </Button>
      )}
      {bezahlt && (
        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onZuruecksetzen}>
          Zurücksetzen
        </Button>
      )}
    </div>
  );

  if (kachel) {
    return (
      <div className="p-3 rounded-lg border bg-card flex flex-col gap-2 h-full">
        <div className="min-w-0">
          <p className="text-sm font-medium break-words hyphens-auto" lang="de">{m.name}</p>
          <div className="flex items-center gap-1.5 flex-wrap mt-1">
            <StatusBadge status={m.status} />
            <IntervalBadge interval={m.interval} />
          </div>
        </div>
        {details && <p className="text-xs text-muted-foreground break-words">{details}</p>}
        <div className="mt-auto pt-1">{aktionen}</div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-lg border bg-card flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium truncate">{m.name}</p>
          <IntervalBadge interval={m.interval} />
        </div>
        {details && <p className="text-xs text-muted-foreground">{details}</p>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {aktionen}
        <StatusBadge status={m.status} />
      </div>
    </div>
  );
}

/**
 * Eine Zahlung erfassen.
 *
 * Vorher stand dieses Formular aufgeklappt in der Zeile. In einer Kachel wäre
 * dafür kein Platz, und zwei Formulare für dasselbe würden auseinanderlaufen.
 * Der Betrag ist mit dem Satz der Beitragsstufe vorbelegt – der Normalfall ist
 * „hat den vollen Beitrag überwiesen".
 */
function ZahlungDialog({
  eintrag,
  satz,
  jahr,
  laeuft,
  onSchliessen,
  onSpeichern,
}: {
  eintrag: Eintrag | null;
  satz: number | null;
  jahr: number;
  laeuft: boolean;
  onSchliessen: () => void;
  onSpeichern: (werte: { betrag: string; datum: string; notiz: string }) => void;
}) {
  const [betrag, setBetrag] = useState("");
  const [datum, setDatum] = useState<Date | undefined>(undefined);
  const [notiz, setNotiz] = useState("");
  const [vorbelegt, setVorbelegt] = useState<string | null>(null);

  // Beim Öffnen einmal füllen. Ein useEffect wäre hier ein Umweg: Der Dialog
  // bleibt gemountet, und der Wechsel des Eintrags ist genau das Signal.
  if (eintrag && vorbelegt !== eintrag.userId) {
    setVorbelegt(eintrag.userId);
    setBetrag(eintrag.amount ? String(eintrag.amount) : satz != null ? String(satz) : "");
    setDatum(eintrag.paidAt ? new Date(eintrag.paidAt + "T00:00:00") : new Date());
    setNotiz(eintrag.notes || "");
  }

  const alsDatum = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  return (
    <Dialog open={!!eintrag} onOpenChange={(o) => { if (!o) { setVorbelegt(null); onSchliessen(); } }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Zahlung erfassen</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-2">
          {eintrag?.name} · Beitragsjahr {jahr}
        </p>

        <div className="space-y-3">
          <div>
            <label htmlFor="zahlung-betrag" className="text-sm font-medium mb-1.5 block">Betrag</label>
            <div className="flex items-center gap-2">
              <Input
                id="zahlung-betrag"
                type="number"
                step="0.01"
                value={betrag}
                onChange={(e) => setBetrag(e.target.value)}
                className="h-9"
              />
              <span className="text-sm text-muted-foreground">€</span>
            </div>
            {satz != null && (
              <p className="text-xs text-muted-foreground mt-1">
                Satz dieser Stufe: {Number(satz).toFixed(2)} €. Ein kleinerer Betrag
                wird als Teilzahlung verbucht.
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Zahldatum</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("h-9 w-full justify-start font-normal", !datum && "text-muted-foreground")}
                >
                  <CalendarIcon size={14} className="mr-2" />
                  {datum ? format(datum, "dd.MM.yyyy") : "Datum wählen"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={datum}
                  onSelect={setDatum}
                  locale={de}
                  disabled={(d) => d > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label htmlFor="zahlung-notiz" className="text-sm font-medium mb-1.5 block">
              Notiz <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              id="zahlung-notiz"
              rows={2}
              value={notiz}
              onChange={(e) => setNotiz(e.target.value)}
              placeholder="z. B. bar bei der Versammlung"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { setVorbelegt(null); onSchliessen(); }}>
            Abbrechen
          </Button>
          <Button
            disabled={!betrag || laeuft}
            onClick={() => {
              setVorbelegt(null);
              onSpeichern({
                betrag,
                datum: datum ? alsDatum(datum) : alsDatum(new Date()),
                notiz,
              });
            }}
          >
            <Check size={14} className="mr-1" /> Speichern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Die Beitragssätze eines Jahres – einer je Beitragsstufe.
 *
 * Gezeigt werden die Stufen, die in diesem Jahr gelten, und zusätzlich jede,
 * für die es in diesem Jahr einen Satz gibt. Ohne das Zweite verschwände beim
 * Blick auf 2024 der Satz einer inzwischen ausgelaufenen Stufe, obwohl die
 * Zahlungen von damals genau daran hängen.
 */
function Beitragssaetze({ jahr, saetze, canEdit }: {
  jahr: number;
  saetze: { year: number; category?: string; amount: number }[];
  canEdit: boolean;
}) {
  const { data: stufen = [] } = useBeitragsstufenStatus(canEdit);

  const satzVon = (key: string) =>
    saetze.find((r) => r.year === jahr && (r.category ?? "aktiv") === key)?.amount ?? null;

  const sichtbar = stufenFuerJahr(stufen, jahr, (key) => satzVon(key) != null);

  if (stufen.length === 0) return null;

  return (
    <div className="text-sm">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 justify-end">
        <span className="text-muted-foreground">Beitragssätze {jahr}:</span>
        {sichtbar.map((stufe) => (
          <span key={stufe.key} className="flex items-center gap-1.5">
            <span className="text-muted-foreground">{stufe.label}</span>
            <RateEditor
              year={jahr}
              category={stufe.key}
              rate={satzVon(stufe.key)}
              canEdit={canEdit}
            />
          </span>
        ))}
      </div>
    </div>
  );
}
