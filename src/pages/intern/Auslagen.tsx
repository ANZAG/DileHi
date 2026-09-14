import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Check, FileImage, Loader2, Plus, Receipt, Trash2, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SEITE } from "@/lib/layout";
import { datumDe, heuteIso } from "@/lib/datum";
import {
  belegPfad, db, euro, FREIBETRAG_VORGABE, KATEGORIE, PAUSCHALE, pauschaleStand, STATUS,
  type Auslage, type Kategorie, type PauschalArt, type Pauschalzahlung,
} from "@/hooks/useAuslagen";

interface Mitglied { id: string; display_name: string }
interface Termin { id: string; title: string; start_date: string }

const KEINE = "__keine__";

/**
 * Auslagen einreichen und erstatten – und für die Kasse die Pauschalen.
 *
 * Für Mitglieder ist das eine kurze Seite: einreichen, Stand sehen. Die Kasse
 * sieht zusätzlich, was zu prüfen und was zu überweisen ist, und wie viel von
 * den Freibeträgen jedes Mitglied in einem Jahr schon bekommen hat.
 */
export default function Auslagen() {
  const { hasPermission } = useAuth();
  const kasse = hasPermission("expenses.manage");
  const [ansicht, setAnsicht] = useState<"meine" | "pruefen" | "pauschalen">("meine");

  const { data: offen = 0 } = useQuery({
    queryKey: ["auslagen", "zu-pruefen-anzahl"],
    queryFn: async (): Promise<number> => {
      const { count } = await db.from("expense_claims").select("id", { count: "exact", head: true }).in("status", ["submitted", "approved"]);
      return count ?? 0;
    },
    enabled: kasse,
  });

  return (
    <div className={SEITE}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>

        <div className="mb-6">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-none py-1">Auslagen</h1>
          <p className="text-sm text-muted-foreground mt-1">Was du für den Verein bezahlt hast, mit Beleg einreichen und erstattet bekommen.</p>
        </div>

        {kasse && (
          <div className="mb-6 flex flex-wrap gap-1 border-b">
            {([
              ["meine", "Meine Auslagen"],
              ["pruefen", `Zu prüfen und zu erstatten${offen ? ` (${offen})` : ""}`],
              ["pauschalen", "Pauschalen"],
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

        {ansicht === "meine" && <MeineAuslagen />}
        {kasse && ansicht === "pruefen" && <Pruefen />}
        {kasse && ansicht === "pauschalen" && <Pauschalen />}
      </motion.div>
    </div>
  );
}

function useTermine() {
  return useQuery({
    queryKey: ["auslagen", "termine"],
    queryFn: async (): Promise<Termin[]> => {
      const vorEinemJahr = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await db.from("events").select("id, title, start_date").gte("start_date", vorEinemJahr).order("start_date", { ascending: false }).limit(60);
      return (data ?? []) as Termin[];
    },
  });
}

function useMitglieder(enabled = true) {
  return useQuery({
    queryKey: ["mitglieder-verzeichnis"],
    queryFn: async (): Promise<Mitglied[]> => {
      const { data } = await db.rpc("get_member_directory");
      return ((data ?? []) as Mitglied[]).sort((a, b) => a.display_name.localeCompare(b.display_name, "de"));
    },
    enabled,
  });
}

/** Beleg in einem neuen Tab öffnen – über eine Adresse, die nur kurz gilt. */
async function belegOeffnen(pfad: string) {
  const { data, error } = await db.storage.from("receipts").createSignedUrl(pfad, 120);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? "Der Beleg ließ sich nicht öffnen.");
  window.open(data.signedUrl, "_blank", "noopener");
}

function MeineAuslagen() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: termine = [] } = useTermine();
  const [formular, setFormular] = useState(false);

  const { data: meine = [], isLoading } = useQuery({
    queryKey: ["auslagen", "meine", user?.id],
    queryFn: async (): Promise<Auslage[]> => {
      const { data, error } = await db.from("expense_claims").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Auslage[];
    },
    enabled: !!user,
  });

  const zurueckziehen = useMutation({
    mutationFn: async (a: Auslage) => {
      const { error } = await db.from("expense_claims").delete().eq("id", a.id);
      if (error) throw new Error(error.message);
      if (a.receipt_path) await db.storage.from("receipts").remove([a.receipt_path]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auslagen"] }),
    onError: (err: Error) => toast({ title: "Nicht zurückgezogen", description: err.message, variant: "destructive" }),
  });

  const offenSumme = meine.filter((a) => a.status === "submitted" || a.status === "approved").reduce((s, a) => s + Number(a.amount), 0);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {offenSumme > 0 ? `Noch offen: ${euro(offenSumme)}` : "Nichts offen."}
        </p>
        {!formular && (
          <Button size="sm" onClick={() => setFormular(true)}>
            <Plus size={15} className="mr-1" /> Auslage einreichen
          </Button>
        )}
      </div>

      {formular && <Einreichen termine={termine} onFertig={() => setFormular(false)} />}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Lade …</p>
      ) : meine.length === 0 ? (
        <div className="py-12 text-center border rounded-lg bg-card">
          <Receipt className="mx-auto mb-3 text-muted-foreground" size={30} />
          <p className="text-sm text-muted-foreground">Noch keine Auslagen eingereicht.</p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {meine.map((a) => (
            <li key={a.id} className="p-3 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium break-words">{a.title}</p>
                <p className="text-xs text-muted-foreground">
                  {euro(a.amount)} · {KATEGORIE[a.category]} · {datumDe(a.spent_on)}
                  {a.event_id && termine.find((t) => t.id === a.event_id) && ` · ${termine.find((t) => t.id === a.event_id)!.title}`}
                </p>
                {a.decision_note && <p className="text-xs mt-1 break-words">Kasse: {a.decision_note}</p>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS[a.status].farbe}`}>{STATUS[a.status].label}</span>
                {a.receipt_path && (
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Beleg ansehen"
                    onClick={() => belegOeffnen(a.receipt_path!).catch((e: Error) => toast({ title: "Beleg", description: e.message, variant: "destructive" }))}>
                    <FileImage size={14} />
                  </Button>
                )}
                {a.status === "submitted" && (
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label="Zurückziehen"
                    onClick={() => confirm("Diese Auslage zurückziehen?") && zurueckziehen.mutate(a)}>
                    <Trash2 size={14} />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Einreichen({ termine, onFertig }: { termine: Termin[]; onFertig: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [titel, setTitel] = useState("");
  const [kategorie, setKategorie] = useState<Kategorie>("material");
  const [betrag, setBetrag] = useState("");
  const [datum, setDatum] = useState(heuteIso());
  const [termin, setTermin] = useState(KEINE);
  const [notiz, setNotiz] = useState("");
  const [beleg, setBeleg] = useState<File | null>(null);

  const betragZahl = Number(betrag.replace(",", "."));

  const einreichen = useMutation({
    mutationFn: async () => {
      // Erst der Beleg, dann die Auslage. Scheitert die Auslage, wird der
      // Beleg wieder entfernt – sonst läge ein Foto ohne Zweck im Speicher.
      const pfad = belegPfad(user!.id, beleg!.name);
      const { error: hochladen } = await db.storage.from("receipts").upload(pfad, beleg!, { contentType: beleg!.type || undefined });
      if (hochladen) throw new Error(`Beleg nicht hochgeladen: ${hochladen.message}`);
      const { error } = await db.from("expense_claims").insert({
        user_id: user!.id,
        title: titel.trim(),
        category: kategorie,
        amount: Math.round(betragZahl * 100) / 100,
        spent_on: datum,
        event_id: termin === KEINE ? null : termin,
        note: notiz.trim() || null,
        receipt_path: pfad,
      });
      if (error) {
        await db.storage.from("receipts").remove([pfad]);
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["auslagen"] });
      toast({ title: "Eingereicht", description: "Die Kasse bekommt Bescheid." });
      onFertig();
    },
    onError: (err: Error) => toast({ title: "Nicht eingereicht", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label className="text-xs">Wofür?</Label>
          <Input className="h-9" value={titel} onChange={(e) => setTitel(e.target.value)} placeholder="z. B. Lampenöl fürs Lager" />
        </div>
        <div>
          <Label className="text-xs">Betrag in €</Label>
          <Input className="h-9" inputMode="decimal" value={betrag} onChange={(e) => setBetrag(e.target.value)} placeholder="12,50" />
        </div>
        <div>
          <Label className="text-xs">Bezahlt am</Label>
          <Input className="h-9" type="date" value={datum} max={heuteIso()} onChange={(e) => setDatum(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Art</Label>
          <Select value={kategorie} onValueChange={(v) => setKategorie(v as Kategorie)}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(KATEGORIE) as Kategorie[]).map((k) => <SelectItem key={k} value={k}>{KATEGORIE[k]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Für eine Veranstaltung (optional)</Label>
          <Select value={termin} onValueChange={setTermin}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={KEINE}>keine</SelectItem>
              {termine.map((t) => <SelectItem key={t.id} value={t.id}>{t.title} ({datumDe(t.start_date.slice(0, 10))})</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Beleg (Foto oder PDF)</Label>
          <Input
            className="h-9 bg-background"
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => setBeleg(e.target.files?.[0] ?? null)}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Ohne Beleg keine Erstattung. Sehen können ihn nur du und die Kasse.
          </p>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Notiz (optional)</Label>
          <Input className="h-9" value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder="z. B. abweichende Kontoverbindung" />
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => einreichen.mutate()}
          disabled={!titel.trim() || !(betragZahl > 0) || !datum || !beleg || einreichen.isPending}
        >
          {einreichen.isPending && <Loader2 size={14} className="mr-1 animate-spin" />} Einreichen
        </Button>
        <Button size="sm" variant="outline" onClick={onFertig}>Abbrechen</Button>
      </div>
    </div>
  );
}

function Pruefen() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: mitglieder = [] } = useMitglieder();
  const { data: termine = [] } = useTermine();

  const { data: auslagen = [], isLoading } = useQuery({
    queryKey: ["auslagen", "alle"],
    queryFn: async (): Promise<Auslage[]> => {
      const { data, error } = await db.from("expense_claims").select("*").order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as Auslage[];
    },
  });

  const aendern = useMutation({
    mutationFn: async ({ id, status, notiz }: { id: string; status: Auslage["status"]; notiz?: string | null }) => {
      const patch: Record<string, unknown> = { status };
      if (notiz !== undefined) patch.decision_note = notiz;
      const { error } = await db.from("expense_claims").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auslagen"] }),
    onError: (err: Error) => toast({ title: "Nicht geändert", description: err.message, variant: "destructive" }),
  });

  const nameVon = (id: string) => mitglieder.find((m) => m.id === id)?.display_name ?? "Mitglied";
  const zuPruefen = auslagen.filter((a) => a.status === "submitted");
  const zuErstatten = auslagen.filter((a) => a.status === "approved");
  const erledigt = auslagen.filter((a) => a.status === "paid" || a.status === "rejected").reverse().slice(0, 20);

  const Zeile = ({ a, knoepfe }: { a: Auslage; knoepfe: React.ReactNode }) => (
    <li className="p-3 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium break-words">{nameVon(a.user_id)}: {a.title}</p>
        <p className="text-xs text-muted-foreground">
          {euro(a.amount)} · {KATEGORIE[a.category]} · {datumDe(a.spent_on)}
          {a.event_id && termine.find((t) => t.id === a.event_id) && ` · ${termine.find((t) => t.id === a.event_id)!.title}`}
        </p>
        {a.note && <p className="text-xs mt-1 break-words">{a.note}</p>}
        {a.decision_note && <p className="text-xs mt-1 text-muted-foreground break-words">Vermerk: {a.decision_note}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-1 shrink-0">
        {a.receipt_path && (
          <Button size="sm" variant="ghost" className="h-8"
            onClick={() => belegOeffnen(a.receipt_path!).catch((e: Error) => toast({ title: "Beleg", description: e.message, variant: "destructive" }))}>
            <FileImage size={14} className="mr-1" /> Beleg
          </Button>
        )}
        {knoepfe}
      </div>
    </li>
  );

  if (isLoading) return <p className="text-sm text-muted-foreground">Lade …</p>;

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="font-medium">Zu prüfen ({zuPruefen.length})</h2>
        {zuPruefen.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nichts zu prüfen.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {zuPruefen.map((a) => (
              <Zeile key={a.id} a={a} knoepfe={
                <>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => aendern.mutate({ id: a.id, status: "approved" })}>
                    <Check size={14} className="mr-1" /> Genehmigen
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => {
                    const grund = prompt("Warum abgelehnt? Das Mitglied sieht diesen Vermerk.");
                    if (grund !== null) aendern.mutate({ id: a.id, status: "rejected", notiz: grund.trim() || null });
                  }}>
                    <X size={14} className="mr-1" /> Ablehnen
                  </Button>
                </>
              } />
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">
          Zu erstatten ({zuErstatten.length}{zuErstatten.length > 0 && `, ${euro(zuErstatten.reduce((s, a) => s + Number(a.amount), 0))}`})
        </h2>
        {zuErstatten.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nichts zu überweisen.</p>
        ) : (
          <ul className="divide-y rounded-lg border bg-card">
            {zuErstatten.map((a) => (
              <Zeile key={a.id} a={a} knoepfe={
                <Button size="sm" variant="outline" className="h-8" onClick={() => aendern.mutate({ id: a.id, status: "paid" })}>
                  <Wallet size={14} className="mr-1" /> Erstattet
                </Button>
              } />
            ))}
          </ul>
        )}
      </section>

      {erledigt.length > 0 && (
        <details className="rounded-lg border">
          <summary className="cursor-pointer select-none p-3 text-sm font-medium">Zuletzt erledigt</summary>
          <ul className="divide-y border-t">
            {erledigt.map((a) => (
              <Zeile key={a.id} a={a} knoepfe={
                <span className={`text-xs px-2 py-0.5 rounded ${STATUS[a.status].farbe}`}>{STATUS[a.status].label}</span>
              } />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function Pauschalen() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: mitglieder = [] } = useMitglieder();
  const [jahr, setJahr] = useState(new Date().getFullYear());
  const [neu, setNeu] = useState<{ user_id: string; kind: PauschalArt; amount: string; paid_on: string; note: string } | null>(null);

  const { data: freibetrag = FREIBETRAG_VORGABE } = useQuery({
    queryKey: ["auslagen", "freibetraege"],
    queryFn: async (): Promise<Record<PauschalArt, number>> => {
      const { data } = await db.from("app_settings").select("volunteer_allowance, trainer_allowance").maybeSingle();
      if (!data) return FREIBETRAG_VORGABE;
      return { volunteer: Number(data.volunteer_allowance), trainer: Number(data.trainer_allowance) };
    },
  });

  const { data: zahlungen = [] } = useQuery({
    queryKey: ["auslagen", "pauschalen"],
    queryFn: async (): Promise<Pauschalzahlung[]> => {
      const { data, error } = await db.from("volunteer_payments").select("*").order("paid_on", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Pauschalzahlung[];
    },
  });

  const eintragen = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("volunteer_payments").insert({
        user_id: neu!.user_id,
        kind: neu!.kind,
        amount: Math.round(Number(neu!.amount.replace(",", ".")) * 100) / 100,
        paid_on: neu!.paid_on,
        note: neu!.note.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNeu(null);
      qc.invalidateQueries({ queryKey: ["auslagen", "pauschalen"] });
    },
    onError: (err: Error) => toast({ title: "Nicht eingetragen", description: err.message, variant: "destructive" }),
  });

  const loeschen = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("volunteer_payments").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["auslagen", "pauschalen"] }),
  });

  const imJahr = zahlungen.filter((z) => z.paid_on.startsWith(String(jahr)));
  const empfaenger = useMemo(() => [...new Set(imJahr.map((z) => z.user_id))], [imJahr]);
  const nameVon = (id: string) => mitglieder.find((m) => m.id === id)?.display_name ?? "Mitglied";
  const vorschau = neu && neu.user_id
    ? pauschaleStand(zahlungen, neu.user_id, Number(neu.paid_on.slice(0, 4)), neu.kind, freibetrag[neu.kind])
    : null;
  const wuerdeUeberschreiten = !!(vorschau && neu && vorschau.summe + (Number(neu.amount.replace(",", ".")) || 0) > freibetrag[neu.kind]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground max-w-prose">
        Ehrenamtspauschale ({PAUSCHALE.volunteer.paragraf}, {euro(freibetrag.volunteer)}) und Übungsleiterfreibetrag
        ({PAUSCHALE.trainer.paragraf}, {euro(freibetrag.trainer)}) sind Freibeträge je Person und Jahr – über alle
        Vereine hinweg, in denen jemand tätig ist. Für dieselbe Tätigkeit gibt es nicht beides. Die Beträge lassen
        sich im Erscheinungsbild anpassen, falls sich das Gesetz ändert.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={String(jahr)} onValueChange={(v) => setJahr(Number(v))}>
          <SelectTrigger className="h-9 w-28"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[0, 1, 2, 3].map((d) => new Date().getFullYear() - d).map((j) => <SelectItem key={j} value={String(j)}>{j}</SelectItem>)}
          </SelectContent>
        </Select>
        {!neu && (
          <Button size="sm" variant="outline" onClick={() => setNeu({ user_id: "", kind: "volunteer", amount: "", paid_on: heuteIso(), note: "" })}>
            <Plus size={14} className="mr-1" /> Auszahlung eintragen
          </Button>
        )}
      </div>

      {neu && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <Label className="text-xs">Mitglied</Label>
              <Select value={neu.user_id} onValueChange={(v) => setNeu({ ...neu, user_id: v })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="Wer?" /></SelectTrigger>
                <SelectContent>
                  {mitglieder.map((m) => <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Art</Label>
              <Select value={neu.kind} onValueChange={(v) => setNeu({ ...neu, kind: v as PauschalArt })}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAUSCHALE) as PauschalArt[]).map((k) => <SelectItem key={k} value={k}>{PAUSCHALE[k].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Betrag in €</Label>
              <Input className="h-9" inputMode="decimal" value={neu.amount} onChange={(e) => setNeu({ ...neu, amount: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Ausgezahlt am</Label>
              <Input className="h-9" type="date" value={neu.paid_on} onChange={(e) => setNeu({ ...neu, paid_on: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <Label className="text-xs">Notiz (optional)</Label>
              <Input className="h-9" value={neu.note} onChange={(e) => setNeu({ ...neu, note: e.target.value })} placeholder="z. B. Leitung Schaukampftraining" />
            </div>
          </div>
          {vorschau && (
            <p className={`text-xs flex items-center gap-1 ${wuerdeUeberschreiten ? "text-destructive" : "text-muted-foreground"}`}>
              {wuerdeUeberschreiten && <AlertTriangle size={13} />}
              Bisher {neu!.paid_on.slice(0, 4)}: {euro(vorschau.summe)} von {euro(freibetrag[neu!.kind])}
              {wuerdeUeberschreiten && " – mit dieser Zahlung wird der Freibetrag überschritten."}
            </p>
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={() => eintragen.mutate()} disabled={!neu.user_id || !(Number(neu.amount.replace(",", ".")) > 0) || !neu.paid_on || eintragen.isPending}>
              Eintragen
            </Button>
            <Button size="sm" variant="outline" onClick={() => setNeu(null)}>Abbrechen</Button>
          </div>
        </div>
      )}

      {empfaenger.length === 0 ? (
        <p className="text-sm text-muted-foreground">{jahr}: keine Pauschalen ausgezahlt.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Mitglied</th>
                <th className="px-3 py-2 font-medium">{PAUSCHALE.volunteer.label}</th>
                <th className="px-3 py-2 font-medium">{PAUSCHALE.trainer.label}</th>
                <th className="px-3 py-2 font-medium">Zahlungen</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {empfaenger.map((id) => (
                <tr key={id}>
                  <td className="px-3 py-2 whitespace-nowrap">{nameVon(id)}</td>
                  {(["volunteer", "trainer"] as PauschalArt[]).map((art) => {
                    const s = pauschaleStand(zahlungen, id, jahr, art, freibetrag[art]);
                    return (
                      <td key={art} className={`px-3 py-2 whitespace-nowrap ${s.ueberschritten ? "text-destructive font-medium" : ""}`}>
                        {s.summe > 0 ? `${euro(s.summe)} von ${euro(freibetrag[art])}` : "–"}
                        {s.ueberschritten && " (überschritten)"}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2 text-xs">
                    {imJahr.filter((z) => z.user_id === id).map((z) => (
                      <span key={z.id} className="flex items-center gap-1 whitespace-nowrap">
                        {datumDe(z.paid_on)}: {euro(z.amount)} ({PAUSCHALE[z.kind].label})
                        <button type="button" className="text-muted-foreground hover:text-destructive" aria-label="Zahlung löschen"
                          onClick={() => confirm("Diese Zahlung löschen?") && loeschen.mutate(z.id)}>
                          <Trash2 size={12} />
                        </button>
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
