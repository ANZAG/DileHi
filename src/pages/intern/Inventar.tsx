import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowLeft, CalendarDays, Loader2, MapPin, Package, Pencil, Plus, Trash2, Undo2, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { SEITE } from "@/lib/layout";
import {
  db, frei, heuteIso, istUeberfaellig, STATUS, useGegenstaende, useOffeneAusleihen, zeitraumText, ZUSTAND,
  type Ausleihe, type Gegenstand, type Zustand,
} from "@/hooks/useInventar";

interface Mitglied { id: string; display_name: string }
interface Termin { id: string; title: string; start_date: string; end_date: string | null }

const KEINE = "__keine__";

/**
 * Das Inventar des Vereins.
 *
 * Die Frage, die diese Seite beantworten soll, ist meistens nicht „was haben
 * wir", sondern „wer hat das Kochzelt?" – deshalb steht bei jedem Gegenstand,
 * wer ihn gerade hat oder für welche Veranstaltung er reserviert ist. Oben
 * steht, was einen selbst betrifft, und für die Verwaltung, was überfällig ist.
 */
export default function Inventar() {
  const { user, hasPermission } = useAuth();
  const verwalter = hasPermission("inventory.manage");
  const { data: gegenstaende = [], isLoading } = useGegenstaende();
  const { data: ausleihen = [] } = useOffeneAusleihen();

  const { data: mitglieder = [] } = useQuery({
    queryKey: ["mitglieder-verzeichnis"],
    queryFn: async (): Promise<Mitglied[]> => {
      const { data } = await db.rpc("get_member_directory");
      return ((data ?? []) as Mitglied[]).sort((a, b) => a.display_name.localeCompare(b.display_name, "de"));
    },
  });

  const { data: termine = [] } = useQuery({
    queryKey: ["inventar", "termine"],
    queryFn: async (): Promise<Termin[]> => {
      const gestern = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data } = await db.from("events").select("id, title, start_date, end_date")
        .gte("start_date", gestern).order("start_date").limit(50);
      return (data ?? []) as Termin[];
    },
  });

  const [suche, setSuche] = useState("");
  const [kategorie, setKategorie] = useState<string | null>(null);
  const [bearbeiten, setBearbeiten] = useState<Partial<Gegenstand> | null>(null);
  const [reservieren, setReservieren] = useState<Gegenstand | null>(null);

  const nameVon = (id: string) => mitglieder.find((m) => m.id === id)?.display_name ?? "Mitglied";
  const terminVon = (id: string | null) => termine.find((t) => t.id === id);
  const gegenstandVon = (id: string) => gegenstaende.find((g) => g.id === id);

  const kategorien = [...new Set(gegenstaende.map((g) => g.category))].sort((a, b) => a.localeCompare(b, "de"));
  const heute = heuteIso();

  const gefiltert = useMemo(() => {
    const begriff = suche.trim().toLowerCase();
    return gegenstaende.filter((g) =>
      (!kategorie || g.category === kategorie) &&
      (!begriff || [g.name, g.description, g.location, g.category].some((t) => (t ?? "").toLowerCase().includes(begriff)))
    );
  }, [gegenstaende, suche, kategorie]);

  const meine = ausleihen.filter((a) => a.user_id === user?.id);
  const ueberfaellig = ausleihen.filter((a) => istUeberfaellig(a));

  return (
    <div className={SEITE}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold leading-none py-1">Inventar</h1>
            <p className="text-sm text-muted-foreground mt-1">Was uns gehört, wo es liegt und wer es gerade hat.</p>
          </div>
          {verwalter && (
            <Button size="sm" onClick={() => setBearbeiten({ quantity: 1, condition: "good", category: kategorie ?? "" })}>
              <Plus size={15} className="mr-1" /> Gegenstand
            </Button>
          )}
        </div>

        {verwalter && ueberfaellig.length > 0 && (
          <section className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4">
            <h2 className="text-sm font-semibold flex items-center gap-2 text-amber-900">
              <AlertTriangle size={16} /> Überfällig ({ueberfaellig.length})
            </h2>
            <ul className="mt-2 space-y-1 text-sm">
              {ueberfaellig.map((a) => (
                <li key={a.id} className="text-amber-900">
                  {a.quantity > 1 && `${a.quantity}× `}{gegenstandVon(a.item_id)?.name ?? "Gegenstand"} bei {nameVon(a.user_id)} –
                  zurück bis {zeitraumText({ from_date: a.until_date, until_date: a.until_date })}
                </li>
              ))}
            </ul>
          </section>
        )}

        {meine.length > 0 && (
          <section className="mb-6 rounded-lg border bg-card p-4">
            <h2 className="text-sm font-semibold mb-2">Bei mir oder für mich reserviert</h2>
            <ul className="divide-y">
              {meine.map((a) => (
                <AusleiheZeile
                  key={a.id}
                  ausleihe={a}
                  titel={`${a.quantity > 1 ? `${a.quantity}× ` : ""}${gegenstandVon(a.item_id)?.name ?? "Gegenstand"}`}
                  termin={terminVon(a.event_id)?.title}
                  darfAbsagen={a.status === "reserved"}
                  verwalter={verwalter}
                />
              ))}
            </ul>
          </section>
        )}

        {bearbeiten && (
          <GegenstandFormular
            gegenstand={bearbeiten}
            kategorien={kategorien}
            mitglieder={mitglieder}
            onFertig={() => setBearbeiten(null)}
          />
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <Input value={suche} onChange={(e) => setSuche(e.target.value)} placeholder="Suchen …" className="h-9 w-56" />
          {kategorien.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => setKategorie(null)}
                className={`text-xs px-2.5 py-1.5 rounded-md border ${!kategorie ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                Alle
              </button>
              {kategorien.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKategorie(k === kategorie ? null : k)}
                  className={`text-xs px-2.5 py-1.5 rounded-md border ${kategorie === k ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  {k}
                </button>
              ))}
            </>
          )}
        </div>

        {isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Lade Inventar …</p>
        ) : gegenstaende.length === 0 ? (
          <div className="py-16 text-center border rounded-lg bg-card">
            <Package className="mx-auto mb-3 text-muted-foreground" size={30} />
            <p className="text-sm text-muted-foreground">
              {verwalter ? "Noch nichts eingetragen. Leg oben den ersten Gegenstand an." : "Die Inventarverwaltung hat noch nichts eingetragen."}
            </p>
          </div>
        ) : gefiltert.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Nichts gefunden.</p>
        ) : (
          <div className="space-y-6">
            {[...new Set(gefiltert.map((g) => g.category))].map((k) => (
              <section key={k}>
                <h2 className="font-serif text-lg font-semibold mb-2">{k}</h2>
                <ul className="grid gap-3 lg:grid-cols-2">
                  {gefiltert.filter((g) => g.category === k).map((g) => {
                    const offen = ausleihen.filter((a) => a.item_id === g.id);
                    const jetztFrei = frei(g, ausleihen, heute, heute);
                    return (
                      <li key={g.id} className="rounded-lg border bg-card p-4 space-y-2 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-medium break-words">{g.name}</p>
                            <p className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                              <span>{g.quantity} Stück · jetzt {jetztFrei} frei</span>
                              {g.location && <span className="inline-flex items-center gap-1"><MapPin size={11} />{g.location}</span>}
                              {g.owner_id && <span className="inline-flex items-center gap-1"><User size={11} />Leihgabe von {nameVon(g.owner_id)}</span>}
                            </p>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${ZUSTAND[g.condition].farbe}`}>
                            {ZUSTAND[g.condition].label}
                          </span>
                        </div>
                        {g.description && <p className="text-sm text-muted-foreground break-words">{g.description}</p>}

                        {offen.length > 0 && (
                          <ul className="text-xs space-y-1 border-t pt-2">
                            {offen.map((a) => (
                              <li key={a.id} className={istUeberfaellig(a) ? "text-amber-800" : "text-muted-foreground"}>
                                {STATUS[a.status]}{a.quantity > 1 && ` (${a.quantity}×)`}: {nameVon(a.user_id)}, {zeitraumText(a)}
                                {a.event_id && terminVon(a.event_id) && ` · ${terminVon(a.event_id)!.title}`}
                                {istUeberfaellig(a) && " · überfällig"}
                              </li>
                            ))}
                          </ul>
                        )}

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          {g.condition !== "retired" && (
                            <Button size="sm" variant="outline" onClick={() => setReservieren(reservieren?.id === g.id ? null : g)}>
                              <CalendarDays size={14} className="mr-1" /> Reservieren
                            </Button>
                          )}
                          {verwalter && (
                            <Button size="sm" variant="ghost" onClick={() => setBearbeiten(g)}>
                              <Pencil size={14} className="mr-1" /> Bearbeiten
                            </Button>
                          )}
                        </div>

                        {reservieren?.id === g.id && (
                          <ReservierenFormular
                            gegenstand={g}
                            ausleihen={ausleihen}
                            termine={termine}
                            mitglieder={verwalter ? mitglieder : []}
                            onFertig={() => setReservieren(null)}
                          />
                        )}

                        {verwalter && offen.length > 0 && (
                          <ul className="divide-y border-t">
                            {offen.map((a) => (
                              <AusleiheZeile
                                key={a.id}
                                ausleihe={a}
                                titel={nameVon(a.user_id)}
                                termin={terminVon(a.event_id)?.title}
                                darfAbsagen
                                verwalter
                              />
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

/** Eine Ausleihe mit den Knöpfen, die gerade passen. */
function AusleiheZeile({ ausleihe, titel, termin, darfAbsagen, verwalter }: {
  ausleihe: Ausleihe;
  titel: string;
  termin?: string;
  darfAbsagen: boolean;
  verwalter: boolean;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const aendern = useMutation({
    mutationFn: async (patch: Partial<Ausleihe> | "loeschen") => {
      const { error } = patch === "loeschen"
        ? await db.from("inventory_loans").delete().eq("id", ausleihe.id)
        : await db.from("inventory_loans").update(patch).eq("id", ausleihe.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["inventar"] }),
    onError: (err: Error) => toast({ title: "Nicht geändert", description: err.message, variant: "destructive" }),
  });

  return (
    <li className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
      <span className="min-w-0">
        <span className="font-medium">{titel}</span>{" "}
        <span className="text-xs text-muted-foreground">
          {STATUS[ausleihe.status]} · {zeitraumText(ausleihe)}{termin && ` · ${termin}`}
        </span>
        {istUeberfaellig(ausleihe) && <span className="ml-2 text-xs text-amber-800">überfällig</span>}
      </span>
      <span className="flex gap-1 shrink-0">
        {verwalter && ausleihe.status === "reserved" && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => aendern.mutate({ status: "handed_out" })}>
            Ausgeben
          </Button>
        )}
        {verwalter && ausleihe.status === "handed_out" && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => aendern.mutate({ status: "returned" })}>
            <Undo2 size={13} className="mr-1" /> Zurück
          </Button>
        )}
        {darfAbsagen && (ausleihe.status === "reserved" || verwalter) && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => confirm("Diese Reservierung löschen?") && aendern.mutate("loeschen")}
            aria-label="Löschen"
          >
            <Trash2 size={13} />
          </Button>
        )}
      </span>
    </li>
  );
}

function ReservierenFormular({ gegenstand, ausleihen, termine, mitglieder, onFertig }: {
  gegenstand: Gegenstand;
  ausleihen: Ausleihe[];
  termine: Termin[];
  /** Nur für die Verwaltung: für jemand anderen reservieren. Leer = für sich. */
  mitglieder: Mitglied[];
  onFertig: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const heute = heuteIso();
  const [termin, setTermin] = useState(KEINE);
  const [von, setVon] = useState(heute);
  const [bis, setBis] = useState(heute);
  const [anzahl, setAnzahl] = useState(1);
  const [fuer, setFuer] = useState(user?.id ?? "");

  const verfuegbar = von && bis && bis >= von ? frei(gegenstand, ausleihen, von, bis) : 0;

  const terminWaehlen = (id: string) => {
    setTermin(id);
    const t = termine.find((x) => x.id === id);
    if (t) {
      setVon(t.start_date.slice(0, 10));
      setBis((t.end_date ?? t.start_date).slice(0, 10));
    }
  };

  const speichern = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("inventory_loans").insert({
        item_id: gegenstand.id,
        user_id: fuer || user!.id,
        event_id: termin === KEINE ? null : termin,
        quantity: anzahl,
        from_date: von,
        until_date: bis,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventar"] });
      toast({ title: "Reserviert", description: gegenstand.name });
      onFertig();
    },
    onError: (err: Error) => toast({ title: "Nicht reserviert", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-3 rounded-md border bg-muted/30 p-3">
      <div>
        <Label className="text-xs">Für eine Veranstaltung</Label>
        <Select value={termin} onValueChange={terminWaehlen}>
          <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={KEINE}>Keine – Zeitraum selbst wählen</SelectItem>
            {termine.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.title} ({t.start_date.slice(8, 10)}.{t.start_date.slice(5, 7)}.)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs">Von</Label>
          <Input type="date" className="h-9" value={von} onChange={(e) => setVon(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Bis</Label>
          <Input type="date" className="h-9" value={bis} min={von} onChange={(e) => setBis(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 items-end">
        <div>
          <Label className="text-xs">Anzahl</Label>
          <Input
            type="number"
            className="h-9"
            min={1}
            max={Math.max(1, verfuegbar)}
            value={anzahl}
            onChange={(e) => setAnzahl(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        <p className={`text-xs pb-2 ${verfuegbar < anzahl ? "text-destructive" : "text-muted-foreground"}`}>
          Im Zeitraum frei: {verfuegbar} von {gegenstand.quantity}
        </p>
      </div>
      {mitglieder.length > 0 && (
        <div>
          <Label className="text-xs">Für</Label>
          <Select value={fuer} onValueChange={setFuer}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {mitglieder.map((m) => <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => speichern.mutate()} disabled={!von || !bis || bis < von || anzahl > verfuegbar || speichern.isPending}>
          {speichern.isPending && <Loader2 size={14} className="mr-1 animate-spin" />} Reservieren
        </Button>
        <Button size="sm" variant="outline" onClick={onFertig}>Abbrechen</Button>
      </div>
    </div>
  );
}

function GegenstandFormular({ gegenstand, kategorien, mitglieder, onFertig }: {
  gegenstand: Partial<Gegenstand>;
  kategorien: string[];
  mitglieder: Mitglied[];
  onFertig: () => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [werte, setWerte] = useState<Partial<Gegenstand>>(gegenstand);
  const setze = (patch: Partial<Gegenstand>) => setWerte((w) => ({ ...w, ...patch }));

  const speichern = useMutation({
    mutationFn: async () => {
      const daten = {
        name: (werte.name ?? "").trim(),
        category: (werte.category ?? "").trim() || "Sonstiges",
        description: werte.description?.trim() || null,
        quantity: Math.max(0, Number(werte.quantity) || 0),
        location: werte.location?.trim() || null,
        condition: werte.condition ?? "good",
        owner_id: werte.owner_id || null,
        note: werte.note?.trim() || null,
      };
      const { error } = werte.id
        ? await db.from("inventory_items").update(daten).eq("id", werte.id)
        : await db.from("inventory_items").insert(daten);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventar"] });
      toast({ title: "Gespeichert" });
      onFertig();
    },
    onError: (err: Error) => toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  const loeschen = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("inventory_items").delete().eq("id", werte.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["inventar"] });
      onFertig();
    },
    onError: (err: Error) => toast({ title: "Nicht gelöscht", description: err.message, variant: "destructive" }),
  });

  return (
    <section className="mb-6 rounded-lg border bg-card p-4 space-y-3">
      <h2 className="text-sm font-semibold">{werte.id ? "Gegenstand bearbeiten" : "Neuer Gegenstand"}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Bezeichnung</Label>
          <Input className="h-9" value={werte.name ?? ""} onChange={(e) => setze({ name: e.target.value })} placeholder="z. B. Speichenradzelt 5 m" />
        </div>
        <div>
          <Label className="text-xs">Kategorie</Label>
          <Input
            className="h-9"
            list="inventar-kategorien"
            value={werte.category ?? ""}
            onChange={(e) => setze({ category: e.target.value })}
            placeholder="z. B. Zelte, Lagerausstattung, Leihgewandung"
          />
          <datalist id="inventar-kategorien">
            {kategorien.map((k) => <option key={k} value={k} />)}
          </datalist>
        </div>
        <div>
          <Label className="text-xs">Anzahl</Label>
          <Input className="h-9" type="number" min={0} value={werte.quantity ?? 1} onChange={(e) => setze({ quantity: Number(e.target.value) })} />
        </div>
        <div>
          <Label className="text-xs">Lagerort</Label>
          <Input className="h-9" value={werte.location ?? ""} onChange={(e) => setze({ location: e.target.value })} placeholder="z. B. Lagerraum, Regal 3" />
        </div>
        <div>
          <Label className="text-xs">Zustand</Label>
          <Select value={werte.condition ?? "good"} onValueChange={(v) => setze({ condition: v as Zustand })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(ZUSTAND) as Zustand[]).map((z) => <SelectItem key={z} value={z}>{ZUSTAND[z].label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Leihgabe von</Label>
          <Select value={werte.owner_id ?? KEINE} onValueChange={(v) => setze({ owner_id: v === KEINE ? null : v })}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={KEINE}>Gehört uns gemeinsam</SelectItem>
              {mitglieder.map((m) => <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label className="text-xs">Beschreibung (optional)</Label>
          <Input className="h-9" value={werte.description ?? ""} onChange={(e) => setze({ description: e.target.value })} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => speichern.mutate()} disabled={!(werte.name ?? "").trim() || speichern.isPending}>
          {speichern.isPending && <Loader2 size={14} className="mr-1 animate-spin" />} Speichern
        </Button>
        <Button size="sm" variant="outline" onClick={onFertig}>Abbrechen</Button>
        {werte.id && (
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto text-destructive"
            onClick={() => confirm(`„${werte.name}" samt allen Reservierungen löschen? Ausgesondert markieren behält den Verlauf.`) && loeschen.mutate()}
          >
            <Trash2 size={14} className="mr-1" /> Löschen
          </Button>
        )}
      </div>
    </section>
  );
}
