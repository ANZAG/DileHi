import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText, Gavel, Loader2, Pencil, Plus, Save, Trash2, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SEITE } from "@/lib/layout";
import { datumDe, heuteIso } from "@/lib/datum";
import { ergebnisVon, stimmen } from "@/lib/ergebnisBild";
import type { Election, ElectionResult } from "@/components/elections/types";

const db = supabase as unknown as {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

type Gremium = "assembly" | "board" | "other";
type Ausgang = "adopted" | "rejected";

interface Beschluss {
  id: string;
  number: string | null;
  decided_on: string;
  body: Gremium;
  title: string;
  text: string;
  outcome: Ausgang;
  result: string | null;
  visibility: "members" | "board";
  election_id: string | null;
  document_id: string | null;
  superseded_by: string | null;
  note: string | null;
}

const GREMIUM: Record<Gremium, string> = {
  assembly: "Mitgliederversammlung",
  board: "Vorstand",
  other: "Sonstiges",
};

const KEINE = "__keine__";

/**
 * Das Beschlussregister.
 *
 * Jeder Beschluss einzeln, mit Nummer und Wortlaut – statt in Protokollen,
 * die man erst finden und dann durchlesen muss. Die Nummer vergibt die
 * Datenbank fortlaufend je Jahr.
 *
 * Aus einer geschlossenen Abstimmung lässt sich ein Beschluss direkt
 * übernehmen: Titel, Datum und Ergebnis stehen dann schon da.
 */
export default function Beschluesse() {
  const { hasPermission } = useAuth();
  const verwalter = hasPermission("resolutions.manage");
  const [params, setParams] = useSearchParams();

  const { data: beschluesse = [], isLoading } = useQuery({
    queryKey: ["beschluesse"],
    queryFn: async (): Promise<Beschluss[]> => {
      const { data, error } = await db.from("resolutions").select("*").order("decided_on", { ascending: false }).order("number", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Beschluss[];
    },
  });

  const { data: dokumente = [] } = useQuery({
    queryKey: ["beschluesse", "dokumente"],
    queryFn: async (): Promise<{ id: string; title: string }[]> => {
      const { data } = await db.from("documents").select("id, title").order("created_at", { ascending: false }).limit(200);
      return (data ?? []) as { id: string; title: string }[];
    },
  });

  const [gremium, setGremium] = useState<Gremium | null>(null);
  const [jahr, setJahr] = useState<string | null>(null);
  const [suche, setSuche] = useState("");
  const [entwurf, setEntwurf] = useState<Partial<Beschluss> | null>(null);

  // Aus einer Abstimmung übernehmen: /intern/beschluesse?aus=<Abstimmung>
  const aus = params.get("aus");
  useEffect(() => {
    if (!aus || !verwalter) return;
    let abgebrochen = false;
    (async () => {
      const vorlage = await beschlussAusAbstimmung(aus);
      if (!abgebrochen && vorlage) setEntwurf(vorlage);
      setParams({}, { replace: true });
    })();
    return () => { abgebrochen = true; };
  }, [aus, verwalter, setParams]);

  const jahre = [...new Set(beschluesse.map((b) => b.decided_on.slice(0, 4)))].sort().reverse();
  const nummerVon = (id: string | null) => beschluesse.find((b) => b.id === id)?.number ?? null;
  const dokumentVon = (id: string | null) => dokumente.find((d) => d.id === id)?.title ?? null;

  const gefiltert = useMemo(() => {
    const begriff = suche.trim().toLowerCase();
    return beschluesse.filter((b) =>
      (!gremium || b.body === gremium) &&
      (!jahr || b.decided_on.startsWith(jahr)) &&
      (!begriff || [b.number, b.title, b.text, b.result, b.note].some((t) => (t ?? "").toLowerCase().includes(begriff)))
    );
  }, [beschluesse, gremium, jahr, suche]);

  return (
    <div className={SEITE}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-none py-1">Beschlüsse</h1>
            <p className="text-sm text-muted-foreground mt-1">Was Mitgliederversammlung und Vorstand beschlossen haben.</p>
          </div>
          {verwalter && !entwurf && (
            <Button size="sm" onClick={() => setEntwurf({ decided_on: heuteIso(), body: "assembly", outcome: "adopted", visibility: "members" })}>
              <Plus size={15} className="mr-1" /> Beschluss erfassen
            </Button>
          )}
        </div>

        {entwurf && (
          <Formular
            beschluss={entwurf}
            beschluesse={beschluesse}
            dokumente={dokumente}
            onFertig={() => setEntwurf(null)}
          />
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Nummer, Titel oder Wortlaut" className="h-9 w-64" />
          {(["assembly", "board"] as Gremium[]).map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => setGremium(gremium === g ? null : g)}
              className={`text-xs px-2.5 py-1.5 rounded-md border ${gremium === g ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              {GREMIUM[g]}
            </button>
          ))}
          {jahre.length > 1 && (
            <Select value={jahr ?? KEINE} onValueChange={(v) => setJahr(v === KEINE ? null : v)}>
              <SelectTrigger className="h-9 w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={KEINE}>Alle Jahre</SelectItem>
                {jahre.map((j) => <SelectItem key={j} value={j}>{j}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>

        {isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Lade Beschlüsse …</p>
        ) : beschluesse.length === 0 ? (
          <div className="py-16 text-center border rounded-lg bg-card">
            <Gavel className="mx-auto mb-3 text-muted-foreground" size={30} />
            <p className="text-sm text-muted-foreground">
              Noch keine Beschlüsse erfasst.
              {verwalter && " Aus einer geschlossenen Abstimmung lässt sich einer mit einem Klick übernehmen."}
            </p>
          </div>
        ) : gefiltert.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nichts gefunden.</p>
        ) : (
          <ul className="space-y-3">
            {gefiltert.map((b) => (
              <li key={b.id} className={`rounded-lg border bg-card p-4 space-y-2 ${b.superseded_by ? "opacity-70" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground flex flex-wrap gap-x-2 gap-y-0.5">
                      <span className="font-mono">Nr. {b.number}</span>
                      <span>{datumDe(b.decided_on)}</span>
                      <span>{GREMIUM[b.body]}</span>
                      {b.visibility === "board" && <span>nur für den Vorstand sichtbar</span>}
                    </p>
                    <h2 className="font-medium mt-0.5 break-words">{b.title}</h2>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded ${b.outcome === "adopted" ? "bg-green-100 text-green-800" : "bg-muted text-muted-foreground"}`}>
                      {b.outcome === "adopted" ? "angenommen" : "abgelehnt"}
                    </span>
                    {verwalter && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEntwurf(b)} aria-label="Bearbeiten">
                        <Pencil size={14} />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm whitespace-pre-line break-words">{b.text}</p>
                {b.result && <p className="text-xs text-muted-foreground">Ergebnis: {b.result}</p>}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                  {b.election_id && (
                    <Link to="/intern/abstimmungen" className="inline-flex items-center gap-1 text-primary hover:underline">
                      <Vote size={12} /> Abstimmung
                    </Link>
                  )}
                  {b.document_id && dokumentVon(b.document_id) && (
                    <Link to="/intern/dokumente" className="inline-flex items-center gap-1 text-primary hover:underline">
                      <FileText size={12} /> {dokumentVon(b.document_id)}
                    </Link>
                  )}
                  {b.superseded_by && (
                    <span className="text-amber-800">Aufgehoben durch Nr. {nummerVon(b.superseded_by) ?? "?"}</span>
                  )}
                </div>
                {b.note && <p className="text-xs text-muted-foreground break-words">{b.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  );
}

/**
 * Vorlage aus einer geschlossenen Abstimmung: Titel, Tag des Abschlusses und
 * das Ergebnis als Satz, etwa „Ja: 10 Stimmen · Enthaltung: 1 Stimme ·
 * Nein: 0 Stimmen (11 von 17 möglichen Stimmen)".
 */
async function beschlussAusAbstimmung(electionId: string): Promise<Partial<Beschluss> | null> {
  const { data: wahl } = await db.from("elections").select("*, candidates(*)").eq("id", electionId).maybeSingle();
  if (!wahl || wahl.status !== "closed") return null;
  const { data: ergebnisse } = await db.rpc("get_election_results");
  let moeglich: number | null = null;
  if (wahl.group_id) {
    const { data: mitglieder } = await db.from("group_members").select("vote_count").eq("group_id", wahl.group_id);
    moeglich = ((mitglieder ?? []) as { vote_count: number }[]).reduce((s, m) => s + m.vote_count, 0) || null;
  }
  const e = ergebnisVon(wahl as Election, (ergebnisse ?? []) as ElectionResult[], moeglich);
  if (!e) return null;
  const zeilen = e.zeilen.map((z) => `${z.name}: ${stimmen(z.stimmen)}`).join(" · ");
  const summe = e.moeglich != null ? `${e.abgegeben} von ${e.moeglich} möglichen Stimmen` : `${stimmen(e.abgegeben)} abgegeben`;
  return {
    title: wahl.title,
    text: wahl.description ?? wahl.title,
    decided_on: (wahl.closed_at ?? new Date().toISOString()).slice(0, 10),
    body: "assembly",
    outcome: "adopted",
    visibility: "members",
    result: `${zeilen} (${summe})`,
    election_id: wahl.id,
  };
}

function Formular({ beschluss, beschluesse, dokumente, onFertig }: {
  beschluss: Partial<Beschluss>;
  beschluesse: Beschluss[];
  dokumente: { id: string; title: string }[];
  onFertig: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [b, setB] = useState<Partial<Beschluss>>(beschluss);
  const setze = (patch: Partial<Beschluss>) => setB((x) => ({ ...x, ...patch }));

  const speichern = useMutation({
    mutationFn: async () => {
      const daten = {
        number: b.number?.trim() || null,
        decided_on: b.decided_on,
        body: b.body ?? "assembly",
        title: (b.title ?? "").trim(),
        text: (b.text ?? "").trim(),
        outcome: b.outcome ?? "adopted",
        result: b.result?.trim() || null,
        visibility: b.visibility ?? "members",
        election_id: b.election_id ?? null,
        document_id: b.document_id ?? null,
        superseded_by: b.superseded_by ?? null,
        note: b.note?.trim() || null,
      };
      const { error } = b.id
        ? await db.from("resolutions").update(daten).eq("id", b.id)
        : await db.from("resolutions").insert(daten);
      if (error) {
        throw new Error(error.message.includes("resolutions_number_key") ? `Die Nummer ${daten.number} ist schon vergeben.` : error.message);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beschluesse"] });
      toast({ title: "Beschluss gespeichert" });
      onFertig();
    },
    onError: (err: Error) => toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  const loeschen = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("resolutions").delete().eq("id", b.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["beschluesse"] });
      onFertig();
    },
    onError: (err: Error) => toast({ title: "Nicht gelöscht", description: err.message, variant: "destructive" }),
  });

  return (
    <section className="mb-6 rounded-lg border bg-card p-4 space-y-3">
      <h2 className="text-sm font-semibold">{b.id ? `Beschluss Nr. ${b.number} bearbeiten` : "Beschluss erfassen"}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <Label className="text-xs">Beschlossen am</Label>
          <Input className="h-9" type="date" value={b.decided_on ?? ""} onChange={(e) => setze({ decided_on: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Gremium</Label>
          <Select value={b.body ?? "assembly"} onValueChange={(v) => setze({ body: v as Gremium })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(GREMIUM) as Gremium[]).map((g) => <SelectItem key={g} value={g}>{GREMIUM[g]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Nummer</Label>
          <Input className="h-9" value={b.number ?? ""} onChange={(e) => setze({ number: e.target.value })} placeholder="wird vergeben" />
        </div>
        <div className="sm:col-span-3">
          <Label className="text-xs">Titel</Label>
          <Input className="h-9" value={b.title ?? ""} onChange={(e) => setze({ title: e.target.value })} />
        </div>
        <div className="sm:col-span-3">
          <Label className="text-xs">Wortlaut</Label>
          <Textarea rows={4} value={b.text ?? ""} onChange={(e) => setze({ text: e.target.value })} />
        </div>
        <div>
          <Label className="text-xs">Ausgang</Label>
          <Select value={b.outcome ?? "adopted"} onValueChange={(v) => setze({ outcome: v as Ausgang })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="adopted">angenommen</SelectItem>
              <SelectItem value="rejected">abgelehnt</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Ergebnis (optional)</Label>
          <Input className="h-9" value={b.result ?? ""} onChange={(e) => setze({ result: e.target.value })} placeholder="z. B. einstimmig" />
        </div>
        <div>
          <Label className="text-xs">Sichtbar für</Label>
          <Select value={b.visibility ?? "members"} onValueChange={(v) => setze({ visibility: v as "members" | "board" })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="members">alle Mitglieder</SelectItem>
              <SelectItem value="board">nur den Vorstand</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Protokoll</Label>
          <Select value={b.document_id ?? KEINE} onValueChange={(v) => setze({ document_id: v === KEINE ? null : v })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={KEINE}>keins</SelectItem>
              {dokumente.map((d) => <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Aufgehoben durch</Label>
          <Select value={b.superseded_by ?? KEINE} onValueChange={(v) => setze({ superseded_by: v === KEINE ? null : v })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={KEINE}>gilt</SelectItem>
              {beschluesse.filter((x) => x.id !== b.id).map((x) => (
                <SelectItem key={x.id} value={x.id}>Nr. {x.number} – {x.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-3">
          <Label className="text-xs">Notiz (optional)</Label>
          <Input className="h-9" value={b.note ?? ""} onChange={(e) => setze({ note: e.target.value })} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => speichern.mutate()} disabled={!(b.title ?? "").trim() || !(b.text ?? "").trim() || !b.decided_on || speichern.isPending}>
          {speichern.isPending ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Save size={14} className="mr-1" />} Speichern
        </Button>
        <Button size="sm" variant="outline" onClick={onFertig}>Abbrechen</Button>
        {b.id && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-destructive"
            onClick={() => confirm(`Beschluss Nr. ${b.number} löschen? Besser: „aufgehoben durch" setzen.`) && loeschen.mutate()}
          >
            <Trash2 size={14} className="mr-1" /> Löschen
          </Button>
        )}
      </div>
    </section>
  );
}
