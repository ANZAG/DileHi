import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Download, FileCheck2, HandCoins, Loader2, Plus, Trash2, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SEITE } from "@/lib/layout";
import { datumDe, heuteIso, tageBis } from "@/lib/datum";
import { bescheidReichtBis, bestaetigungHtml, drucken, euro, type BescheidArt, type Bestaetigung } from "@/lib/zuwendung";

const db = supabase as unknown as {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

interface Zuwendung {
  id: string;
  donor_user_id: string | null;
  donor_name: string | null;
  donor_address: string | null;
  kind: "money" | "membership_fee";
  amount: number;
  received_on: string;
  waiver: boolean;
  note: string | null;
  receipt_id: string | null;
}

interface Mitglied { id: string; display_name: string }

interface Steuerangaben {
  tax_office: string | null;
  tax_number: string | null;
  tax_purposes: string | null;
  exemption_notice_kind: BescheidArt | null;
  exemption_notice_date: string | null;
  exemption_notice_period: string | null;
  fees_deductible: boolean;
}

const VON_AUSSEN = "__aussen__";
const ART = { money: "Geldzuwendung", membership_fee: "Mitgliedsbeitrag" } as const;

/**
 * Zuwendungen und Zuwendungsbestätigungen.
 *
 * Mitglieder finden hier ihre Bestätigungen zum Ausdrucken. Wer Spenden
 * verwaltet, erfasst eingegangene Spenden und stellt aus – einzeln oder als
 * Sammelbestätigung für ein Jahr. Was nicht erlaubt ist, lehnt die Datenbank
 * mit einer Begründung ab; die Seite zeigt die Hindernisse vorher an.
 */
export default function Zuwendungen() {
  const { hasPermission } = useAuth();
  const kasse = hasPermission("donations.manage");
  const [ansicht, setAnsicht] = useState<"spenden" | "bestaetigungen" | "meine">(kasse ? "spenden" : "meine");

  return (
    <div className={SEITE}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>

        <div className="mb-6">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-none py-1">Zuwendungen</h1>
          <p className="text-sm text-muted-foreground mt-1">Zuwendungsbestätigungen nach amtlichem Muster, zum Ausdrucken oder als PDF.</p>
        </div>

        {kasse && (
          <div className="mb-6 flex flex-wrap gap-1 border-b">
            {([
              ["spenden", "Spenden erfassen"],
              ["bestaetigungen", "Ausgestellte Bestätigungen"],
              ["meine", "Meine Bestätigungen"],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setAnsicht(id)}
                className={`px-3 py-2 text-sm -mb-px border-b-2 ${ansicht === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {ansicht === "meine" && <MeineBestaetigungen />}
        {kasse && ansicht === "spenden" && <Spenden />}
        {kasse && ansicht === "bestaetigungen" && <Bestaetigungen />}
      </motion.div>
    </div>
  );
}

function DruckKnopf({ b }: { b: Bestaetigung }) {
  return (
    <Button size="sm" variant="outline" className="h-8" onClick={() => drucken(bestaetigungHtml(b))}>
      <Download size={14} className="mr-1" /> Drucken / PDF
    </Button>
  );
}

function MeineBestaetigungen() {
  const { user } = useAuth();
  const { data = [], isLoading } = useQuery({
    queryKey: ["zuwendungen", "meine", user?.id],
    queryFn: async (): Promise<Bestaetigung[]> => {
      const { data, error } = await db.from("donation_receipts").select("*")
        .eq("donor_user_id", user!.id).is("cancelled_at", null).order("issued_on", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Bestaetigung[];
    },
    enabled: !!user,
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Lade …</p>;
  if (data.length === 0) {
    return (
      <div className="py-12 text-center border rounded-lg bg-card">
        <HandCoins className="mx-auto mb-3 text-muted-foreground" size={30} />
        <p className="text-sm text-muted-foreground">Für dich wurde noch keine Zuwendungsbestätigung ausgestellt.</p>
      </div>
    );
  }
  return (
    <ul className="divide-y rounded-lg border bg-card">
      {data.map((b) => (
        <li key={b.id} className="p-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Nr. {b.number} · {euro(b.total)}</p>
            <p className="text-xs text-muted-foreground">
              {b.kind === "collective" ? "Sammelbestätigung" : "Bestätigung"} vom {datumDe(b.issued_on)}
            </p>
          </div>
          <DruckKnopf b={b} />
        </li>
      ))}
    </ul>
  );
}

function useSteuerangaben() {
  return useQuery({
    queryKey: ["zuwendungen", "steuerangaben"],
    queryFn: async (): Promise<Steuerangaben | null> => {
      const { data } = await db.from("app_settings")
        .select("tax_office, tax_number, tax_purposes, exemption_notice_kind, exemption_notice_date, exemption_notice_period, fees_deductible")
        .maybeSingle();
      return data as Steuerangaben | null;
    },
  });
}

/** Was einer Bestätigung im Weg steht – bevor jemand es beim Ausstellen merkt. */
function hindernisse(s: Steuerangaben | null | undefined): string[] {
  if (!s) return [];
  const fehlt: string[] = [];
  if (!s.tax_office?.trim()) fehlt.push("Finanzamt");
  if (!s.tax_number?.trim()) fehlt.push("Steuernummer");
  if (!s.exemption_notice_date) fehlt.push("Datum des Bescheids");
  if ((s.exemption_notice_kind ?? "exemption") === "exemption" && !s.exemption_notice_period?.trim()) fehlt.push("Veranlagungszeitraum");
  if (!s.tax_purposes?.trim()) fehlt.push("steuerbegünstigte Zwecke");
  const liste = fehlt.length ? [`Im Erscheinungsbild unter Gemeinnützigkeit fehlt: ${fehlt.join(", ")}.`] : [];
  if (s.exemption_notice_date) {
    const bis = bescheidReichtBis(s.exemption_notice_kind ?? "exemption", s.exemption_notice_date);
    if (tageBis(bis) < 0) liste.push(`Der Bescheid reichte nur bis ${datumDe(bis)}. Bestätigungen gibt es erst mit einem neuen (§ 63 Abs. 5 AO).`);
  }
  return liste;
}

function Spenden() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: steuer } = useSteuerangaben();
  const [formular, setFormular] = useState(false);
  const [auswahl, setAuswahl] = useState<Set<string>>(new Set());
  const beitragsjahr = new Date().getFullYear() - 1;

  const { data: mitglieder = [] } = useQuery({
    queryKey: ["mitglieder-verzeichnis"],
    queryFn: async (): Promise<Mitglied[]> => {
      const { data } = await db.rpc("get_member_directory");
      return ((data ?? []) as Mitglied[]).sort((a, b) => a.display_name.localeCompare(b.display_name, "de"));
    },
  });

  const { data: offen = [], isLoading } = useQuery({
    queryKey: ["zuwendungen", "offen"],
    queryFn: async (): Promise<Zuwendung[]> => {
      const { data, error } = await db.from("donations").select("*").is("receipt_id", null).order("received_on");
      if (error) throw new Error(error.message);
      return (data ?? []) as Zuwendung[];
    },
  });

  const nameVon = (z: Zuwendung) =>
    z.donor_name?.trim() || mitglieder.find((m) => m.id === z.donor_user_id)?.display_name || "Mitglied";

  // Eine Bestätigung gilt für eine Person und ein Jahr – so gruppiert die Seite.
  const gruppen = useMemo(() => {
    const karte = new Map<string, Zuwendung[]>();
    for (const z of offen) {
      const wer = z.donor_user_id ?? `${(z.donor_name ?? "").trim().toLowerCase()}|${(z.donor_address ?? "").trim().toLowerCase()}`;
      const schluessel = `${wer}#${z.received_on.slice(0, 4)}`;
      karte.set(schluessel, [...(karte.get(schluessel) ?? []), z]);
    }
    return [...karte.entries()];
  }, [offen]);

  const neuLaden = () => qc.invalidateQueries({ queryKey: ["zuwendungen"] });
  const fehler = (titel: string) => (err: Error) => toast({ title: titel, description: err.message, variant: "destructive" });

  const ausstellen = useMutation({
    mutationFn: async (ids: string[]) => {
      const { data, error } = await db.rpc("issue_donation_receipt", { _donation_ids: ids });
      if (error) throw new Error(error.message);
      const { data: beleg, error: lesen } = await db.from("donation_receipts").select("*").eq("id", data).single();
      if (lesen) throw new Error(lesen.message);
      return beleg as Bestaetigung;
    },
    onSuccess: (beleg) => {
      setAuswahl(new Set());
      neuLaden();
      toast({ title: `Bestätigung Nr. ${beleg.number} ausgestellt`, description: "Ausdrucken, unterschreiben, übergeben." });
      drucken(bestaetigungHtml(beleg));
    },
    onError: fehler("Nicht ausgestellt"),
  });

  const loeschen = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("donations").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: neuLaden,
    onError: fehler("Nicht gelöscht"),
  });

  const uebernehmen = useMutation({
    mutationFn: async () => {
      const { data, error } = await db.rpc("import_paid_contributions", { _year: beitragsjahr });
      if (error) throw new Error(error.message);
      return data as number;
    },
    onSuccess: (n) => {
      neuLaden();
      toast({ title: n ? `${n} Beiträge übernommen` : "Nichts Neues", description: n ? undefined : `Alle bezahlten Beiträge ${beitragsjahr} sind schon übernommen.` });
    },
    onError: fehler("Nicht übernommen"),
  });

  const hin = hindernisse(steuer);
  const umschalten = (id: string) =>
    setAuswahl((alt) => {
      const neu = new Set(alt);
      if (neu.has(id)) neu.delete(id);
      else neu.add(id);
      return neu;
    });

  return (
    <div className="space-y-4">
      {hin.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-1">
          {hin.map((h) => <p key={h} className="flex gap-2"><AlertTriangle size={15} className="shrink-0 mt-0.5" /> {h}</p>)}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {!formular && (
          <Button size="sm" onClick={() => setFormular(true)}>
            <Plus size={15} className="mr-1" /> Spende erfassen
          </Button>
        )}
        {steuer?.fees_deductible && (
          <Button size="sm" variant="outline" onClick={() => uebernehmen.mutate()} disabled={uebernehmen.isPending}>
            Bezahlte Beiträge {beitragsjahr} übernehmen
          </Button>
        )}
      </div>

      {formular && <SpendeErfassen mitglieder={mitglieder} beitraegeAbziehbar={!!steuer?.fees_deductible} onFertig={() => setFormular(false)} />}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Lade …</p>
      ) : gruppen.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Zuwendungen ohne Bestätigung.</p>
      ) : (
        <div className="space-y-3">
          {gruppen.map(([schluessel, liste]) => {
            const gewaehlt = liste.filter((z) => auswahl.has(z.id));
            const ids = (gewaehlt.length ? gewaehlt : liste).map((z) => z.id);
            const summe = (gewaehlt.length ? gewaehlt : liste).reduce((s, z) => s + Number(z.amount), 0);
            return (
              <div key={schluessel} className="rounded-lg border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 border-b">
                  <p className="text-sm font-medium">{nameVon(liste[0])} · {liste[0].received_on.slice(0, 4)}</p>
                  <Button size="sm" className="h-8" disabled={hin.length > 0 || ausstellen.isPending} onClick={() => ausstellen.mutate(ids)}>
                    {ausstellen.isPending ? <Loader2 size={14} className="mr-1 animate-spin" /> : <FileCheck2 size={14} className="mr-1" />}
                    {ids.length > 1 ? "Sammelbestätigung" : "Bestätigung"} über {euro(summe)}
                  </Button>
                </div>
                <ul className="divide-y">
                  {liste.map((z) => (
                    <li key={z.id} className="px-3 py-2 flex items-center gap-3 text-sm">
                      {liste.length > 1 && (
                        <input type="checkbox" className="h-4 w-4 accent-primary" checked={auswahl.has(z.id)} onChange={() => umschalten(z.id)}
                          aria-label="Für die Bestätigung auswählen" />
                      )}
                      <span className="flex-1 min-w-0">
                        {datumDe(z.received_on)} · {ART[z.kind]} · {euro(z.amount)}
                        {z.waiver && " · Verzicht auf Erstattung"}
                        {z.note && <span className="text-muted-foreground"> · {z.note}</span>}
                      </span>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Löschen"
                        onClick={() => confirm("Diese Zuwendung löschen?") && loeschen.mutate(z.id)}>
                        <Trash2 size={14} />
                      </Button>
                    </li>
                  ))}
                </ul>
                {liste.length > 1 && (
                  <p className="px-3 pb-2 text-xs text-muted-foreground">
                    Ohne Auswahl umfasst die Sammelbestätigung alle Zuwendungen dieses Jahres.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground max-w-prose">
        Bis 300 € je Zuwendung genügt dem Finanzamt meist der Kontoauszug – eine Bestätigung schadet trotzdem nicht.
        Die gedruckte Bestätigung von Hand unterschreiben; ohne Unterschrift gilt sie nur, wenn das Finanzamt das
        maschinelle Verfahren des Vereins kennt.
      </p>
    </div>
  );
}

function SpendeErfassen({ mitglieder, beitraegeAbziehbar, onFertig }: { mitglieder: Mitglied[]; beitraegeAbziehbar: boolean; onFertig: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [wer, setWer] = useState("");
  const [name, setName] = useState("");
  const [anschrift, setAnschrift] = useState("");
  const [art, setArt] = useState<"money" | "membership_fee">("money");
  const [betrag, setBetrag] = useState("");
  const [datum, setDatum] = useState(heuteIso());
  const [verzicht, setVerzicht] = useState(false);
  const [notiz, setNotiz] = useState("");
  const aussen = wer === VON_AUSSEN;
  const betragZahl = Number(betrag.replace(",", "."));

  const speichern = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("donations").insert({
        donor_user_id: aussen ? null : wer,
        donor_name: aussen ? name.trim() : null,
        donor_address: aussen ? anschrift.trim() : null,
        kind: art,
        amount: Math.round(betragZahl * 100) / 100,
        received_on: datum,
        waiver: verzicht,
        note: notiz.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["zuwendungen"] });
      onFertig();
    },
    onError: (err: Error) => toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  const bereit = (aussen ? name.trim() && anschrift.trim() : !!wer) && betragZahl > 0 && !!datum;

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="text-xs">Von wem?</Label>
          <Select value={wer} onValueChange={setWer}>
            <SelectTrigger className="h-9"><SelectValue placeholder="Mitglied wählen" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={VON_AUSSEN}>Jemand, der nicht Mitglied ist</SelectItem>
              {mitglieder.map((m) => <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
          {!aussen && wer && (
            <p className="text-xs text-muted-foreground mt-1">Name und Anschrift kommen beim Ausstellen aus dem Profil.</p>
          )}
        </div>
        {aussen && (
          <>
            <div>
              <Label className="text-xs">Name</Label>
              <Input className="h-9" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Anschrift</Label>
              <Textarea rows={2} value={anschrift} onChange={(e) => setAnschrift(e.target.value)} placeholder={"Straße 1\n12345 Ort"} />
            </div>
          </>
        )}
        <div>
          <Label className="text-xs">Betrag in €</Label>
          <Input className="h-9" inputMode="decimal" value={betrag} onChange={(e) => setBetrag(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Eingegangen am</Label>
          <Input className="h-9" type="date" max={heuteIso()} value={datum} onChange={(e) => setDatum(e.target.value)} />
        </div>
        {beitraegeAbziehbar && (
          <div>
            <Label className="text-xs">Art</Label>
            <Select value={art} onValueChange={(v) => setArt(v as typeof art)}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="money">Geldzuwendung</SelectItem>
                <SelectItem value="membership_fee">Mitgliedsbeitrag</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <Label className="text-xs">Notiz (optional)</Label>
          <Input className="h-9" value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder="z. B. Spende Sommerfest" />
        </div>
        <label className="sm:col-span-2 flex items-start gap-2 text-sm cursor-pointer">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={verzicht} onChange={(e) => setVerzicht(e.target.checked)} />
          <span>
            Verzicht auf Erstattung von Aufwendungen
            <span className="block text-xs text-muted-foreground">
              Wer eine Auslage nicht zurückhaben will, spendet sie. Das geht nur, wenn ein Anspruch auf Erstattung
              bestand – etwa aus der Satzung oder einem Vorstandsbeschluss – und der Verein ihn hätte zahlen können.
            </span>
          </span>
        </label>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => speichern.mutate()} disabled={!bereit || speichern.isPending}>Speichern</Button>
        <Button size="sm" variant="outline" onClick={onFertig}>Abbrechen</Button>
      </div>
    </div>
  );
}

function Bestaetigungen() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [jahr, setJahr] = useState(new Date().getFullYear());

  const { data = [], isLoading } = useQuery({
    queryKey: ["zuwendungen", "bestaetigungen", jahr],
    queryFn: async (): Promise<Bestaetigung[]> => {
      const { data, error } = await db.from("donation_receipts").select("*")
        .gte("issued_on", `${jahr}-01-01`).lte("issued_on", `${jahr}-12-31`).order("number", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Bestaetigung[];
    },
  });

  const zuruecknehmen = useMutation({
    mutationFn: async ({ id, grund }: { id: string; grund: string }) => {
      const { error } = await db.rpc("cancel_donation_receipt", { _receipt_id: id, _reason: grund });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zuwendungen"] }),
    onError: (err: Error) => toast({ title: "Nicht zurückgenommen", description: err.message, variant: "destructive" }),
  });

  const gueltig = data.filter((b) => !b.cancelled_at);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select value={String(jahr)} onValueChange={(v) => setJahr(Number(v))}>
          <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[0, 1, 2, 3, 4].map((d) => new Date().getFullYear() - d).map((j) => <SelectItem key={j} value={String(j)}>{j}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">
          {gueltig.length} gültig, zusammen {euro(gueltig.reduce((s, b) => s + Number(b.total), 0))}
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Lade …</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground">{jahr}: keine Bestätigungen ausgestellt.</p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {data.map((b) => (
            <li key={b.id} className={`p-3 flex flex-wrap items-center justify-between gap-2 ${b.cancelled_at ? "opacity-60" : ""}`}>
              <div className="min-w-0">
                <p className="text-sm font-medium break-words">Nr. {b.number} · {b.donor_name} · {euro(b.total)}</p>
                <p className="text-xs text-muted-foreground">
                  {b.kind === "collective" ? "Sammelbestätigung" : "Bestätigung"} vom {datumDe(b.issued_on)}
                  {b.cancelled_at && ` · zurückgenommen: ${b.cancel_reason}`}
                </p>
              </div>
              <div className="flex gap-1">
                <DruckKnopf b={b} />
                {!b.cancelled_at && (
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => {
                    const grund = prompt("Warum zurücknehmen? Die Bestätigung bleibt als ungültig gespeichert, die Zuwendungen werden wieder frei.");
                    if (grund?.trim()) zuruecknehmen.mutate({ id: b.id, grund: grund.trim() });
                  }}>
                    <Undo2 size={14} className="mr-1" /> Zurücknehmen
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
