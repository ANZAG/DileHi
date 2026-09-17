import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  db, gueltigBisVorschlag, nachweisStand, STAND_FARBE, standText,
  useAlleNachweise, useNachweisArten, type NachweisArt,
} from "@/hooks/useNachweise";

interface Mitglied {
  id: string;
  display_name: string;
}

/**
 * Nachweise in der Verwaltung: wer was hat, was bald abläuft, und welche
 * Arten es gibt.
 *
 * Die Übersicht beginnt mit dem, was Aufmerksamkeit braucht – abgelaufen oder
 * bald fällig. Eine Liste aller Nachweise ist bei dreissig Mitgliedern schnell
 * hundert Zeilen lang, und die drei, die handeln müssen, gehen darin unter.
 */
export default function NachweiseAdmin() {
  const { hasPermission } = useAuth();
  const darfVerwalten = hasPermission("certificates.manage");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-lg font-semibold">Nachweise</h2>
        <p className="text-sm text-muted-foreground max-w-prose">
          Qualifikationen mit Ablaufdatum. Mitglieder tragen sie in ihrem Profil ein, DING erinnert sie vor dem
          Ablauf in der Glocke und in der Abendmail. Die Leitung einer Veranstaltung sieht bei den Zusagen, wer
          welchen gültigen Nachweis hat.
        </p>
      </div>
      <Uebersicht darfVerwalten={darfVerwalten} />
      {darfVerwalten && <Arten />}
    </div>
  );
}

function Uebersicht({ darfVerwalten }: { darfVerwalten: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: arten = [] } = useNachweisArten();
  const { data: nachweise = [], isLoading } = useAlleNachweise(true);
  const { data: mitglieder = [] } = useQuery({
    queryKey: ["mitglieder-verzeichnis"],
    queryFn: async (): Promise<Mitglied[]> => {
      const { data } = await db.rpc("get_member_directory");
      return ((data ?? []) as Mitglied[]).sort((a, b) => a.display_name.localeCompare(b.display_name, "de"));
    },
  });

  const [ansicht, setAnsicht] = useState<"aufmerksamkeit" | "alle">("aufmerksamkeit");
  const [suche, setSuche] = useState("");
  const [neu, setNeu] = useState<{ user_id: string; type_id: string; issued_on: string; valid_until: string } | null>(null);

  const artVon = (id: string) => arten.find((a) => a.id === id);
  const nameVon = (id: string) => mitglieder.find((m) => m.id === id)?.display_name ?? "Mitglied";

  const zeilen = useMemo(() => {
    const begriff = suche.trim().toLowerCase();
    return nachweise
      .map((n) => ({ n, art: artVon(n.type_id), name: nameVon(n.user_id), ...nachweisStand(n, artVon(n.type_id)) }))
      .filter((z) => ansicht === "alle" || z.stand === "abgelaufen" || z.stand === "laeuft_ab")
      .filter((z) => !begriff || z.name.toLowerCase().includes(begriff) || (z.art?.label ?? "").toLowerCase().includes(begriff))
      .sort((a, b) => (a.tage ?? Infinity) - (b.tage ?? Infinity) || a.name.localeCompare(b.name, "de"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nachweise, arten, mitglieder, ansicht, suche]);

  const pruefen = useMutation({
    mutationFn: async ({ id, geprueft }: { id: string; geprueft: boolean }) => {
      const { error } = await db.from("member_certificates")
        .update(geprueft ? { verified_at: new Date().toISOString(), verified_by: user!.id } : { verified_at: null, verified_by: null })
        .eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nachweise"] }),
    onError: (err: Error) => toast({ title: "Nicht geändert", description: err.message, variant: "destructive" }),
  });

  const loeschen = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("member_certificates").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nachweise"] }),
    onError: (err: Error) => toast({ title: "Nicht gelöscht", description: err.message, variant: "destructive" }),
  });

  const eintragen = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("member_certificates").insert({
        user_id: neu!.user_id,
        type_id: neu!.type_id,
        issued_on: neu!.issued_on || null,
        valid_until: neu!.valid_until || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNeu(null);
      qc.invalidateQueries({ queryKey: ["nachweise"] });
      toast({ title: "Nachweis eingetragen" });
    },
    onError: (err: Error) => toast({ title: "Nicht eingetragen", description: err.message, variant: "destructive" }),
  });

  const aufmerksamkeit = nachweise.filter((n) => {
    const s = nachweisStand(n, artVon(n.type_id)).stand;
    return s === "abgelaufen" || s === "laeuft_ab";
  }).length;

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium">Übersicht</h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md border p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setAnsicht("aufmerksamkeit")}
              className={`px-2.5 py-1 rounded ${ansicht === "aufmerksamkeit" ? "bg-primary text-primary-foreground" : ""}`}
            >
              Abgelaufen oder bald fällig ({aufmerksamkeit})
            </button>
            <button
              type="button"
              onClick={() => setAnsicht("alle")}
              className={`px-2.5 py-1 rounded ${ansicht === "alle" ? "bg-primary text-primary-foreground" : ""}`}
            >
              Alle ({nachweise.length})
            </button>
          </div>
          <Input
            value={suche}
            onChange={(e) => setSuche(e.target.value)}
            placeholder="Name oder Nachweis"
            className="h-8 w-44 text-sm"
          />
          {darfVerwalten && !neu && arten.some((a) => a.is_active) && (
            <Button size="sm" variant="outline" onClick={() => setNeu({ user_id: "", type_id: "", issued_on: "", valid_until: "" })}>
              <Plus size={14} className="mr-1" /> Für ein Mitglied eintragen
            </Button>
          )}
        </div>
      </div>

      {neu && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end rounded-lg border bg-muted/30 p-3">
          <div>
            <Label className="text-xs">Mitglied</Label>
            <Select value={neu.user_id} onValueChange={(v) => setNeu({ ...neu, user_id: v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Wer?" /></SelectTrigger>
              <SelectContent>
                {mitglieder.map((m) => <SelectItem key={m.id} value={m.id}>{m.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Art</Label>
            <Select
              value={neu.type_id}
              onValueChange={(v) => setNeu({
                ...neu,
                type_id: v,
                valid_until: gueltigBisVorschlag(neu.issued_on || null, artVon(v)?.validity_months ?? null) ?? neu.valid_until,
              })}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="Welcher Nachweis?" /></SelectTrigger>
              <SelectContent>
                {arten.filter((a) => a.is_active).map((a) => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Ausgestellt am</Label>
            <Input
              type="date"
              className="h-9"
              value={neu.issued_on}
              onChange={(e) => setNeu({
                ...neu,
                issued_on: e.target.value,
                valid_until: gueltigBisVorschlag(e.target.value || null, artVon(neu.type_id)?.validity_months ?? null) ?? neu.valid_until,
              })}
            />
          </div>
          <div>
            <Label className="text-xs">Gültig bis</Label>
            <Input type="date" className="h-9" value={neu.valid_until} onChange={(e) => setNeu({ ...neu, valid_until: e.target.value })} />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
            <Button size="sm" onClick={() => eintragen.mutate()} disabled={!neu.user_id || !neu.type_id || eintragen.isPending}>
              {eintragen.isPending && <Loader2 size={14} className="mr-1 animate-spin" />} Eintragen
            </Button>
            <Button size="sm" variant="outline" onClick={() => setNeu(null)}>Abbrechen</Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Lade …</p>
      ) : zeilen.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {ansicht === "aufmerksamkeit" ? "Nichts abgelaufen und nichts bald fällig." : "Noch keine Nachweise eingetragen."}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Mitglied</th>
                <th className="px-3 py-2 font-medium">Nachweis</th>
                <th className="px-3 py-2 font-medium">Stand</th>
                <th className="px-3 py-2 font-medium">Geprüft</th>
                {darfVerwalten && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y">
              {zeilen.map(({ n, art, name, stand }) => (
                <tr key={n.id}>
                  <td className="px-3 py-2 whitespace-nowrap">{name}</td>
                  <td className="px-3 py-2">{art?.label ?? "Unbekannte Art"}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded whitespace-nowrap ${STAND_FARBE[stand]}`}>
                      {standText(n, art)}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {darfVerwalten ? (
                      <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!n.verified_at}
                          onChange={(e) => pruefen.mutate({ id: n.id, geprueft: e.target.checked })}
                          className="h-4 w-4 accent-primary"
                        />
                        {n.verified_at ? "geprüft" : "offen"}
                      </label>
                    ) : n.verified_at ? (
                      <BadgeCheck size={16} className="text-primary" aria-label="geprüft" />
                    ) : (
                      <span className="text-xs text-muted-foreground">offen</span>
                    )}
                  </td>
                  {darfVerwalten && (
                    <td className="px-3 py-2 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => confirm(`${art?.label ?? "Nachweis"} von ${name} löschen?`) && loeschen.mutate(n.id)}
                        aria-label="Löschen"
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Die Arten von Nachweisen, die dieser Verein führt. */
function Arten() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: arten = [], isLoading } = useNachweisArten();
  const [aenderungen, setAenderungen] = useState<Record<string, Partial<NachweisArt>>>({});
  const [neuLabel, setNeuLabel] = useState("");

  const wert = <K extends keyof NachweisArt>(a: NachweisArt, feld: K): NachweisArt[K] =>
    (aenderungen[a.id]?.[feld] as NachweisArt[K] | undefined) ?? a[feld];
  const setze = (id: string, patch: Partial<NachweisArt>) =>
    setAenderungen((x) => ({ ...x, [id]: { ...x[id], ...patch } }));

  const speichern = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("certificate_types").update(aenderungen[id]).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, id) => {
      setAenderungen((x) => {
        const rest = { ...x };
        delete rest[id];
        return rest;
      });
      qc.invalidateQueries({ queryKey: ["nachweis-arten"] });
      toast({ title: "Gespeichert" });
    },
    onError: (err: Error) => toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  const anlegen = useMutation({
    mutationFn: async () => {
      const letzte = arten[arten.length - 1]?.sort_order ?? 0;
      const { error } = await db.from("certificate_types").insert({ label: neuLabel.trim(), sort_order: letzte + 10 });
      if (error) throw new Error(error.message.includes("duplicate") ? "Diese Art gibt es schon." : error.message);
    },
    onSuccess: () => {
      setNeuLabel("");
      qc.invalidateQueries({ queryKey: ["nachweis-arten"] });
    },
    onError: (err: Error) => toast({ title: "Nicht angelegt", description: err.message, variant: "destructive" }),
  });

  const loeschen = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("certificate_types").delete().eq("id", id);
      if (error) {
        // Der Fremdschlüssel verhindert das Löschen, solange Nachweise daran hängen.
        throw new Error(
          error.code === "23503" || error.message.includes("foreign key")
            ? "An dieser Art hängen noch Nachweise. Schalte sie stattdessen aus – dann erscheint sie nicht mehr zur Auswahl."
            : error.message
        );
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nachweis-arten"] }),
    onError: (err: Error) => toast({ title: "Nicht gelöscht", description: err.message, variant: "destructive" }),
  });

  return (
    <section className="space-y-3 border-t pt-6">
      <div>
        <h3 className="font-medium">Arten von Nachweisen</h3>
        <p className="text-sm text-muted-foreground max-w-prose">
          Welche Nachweise ihr führt, etwa Erste Hilfe, Pulverschein, Befähigungsnachweis nach dem
          Sprengstoffgesetz, Anhänger-Führerschein oder Schaukampf-Einweisung. Die Gültigkeit schlägt beim
          Eintragen das Ablaufdatum vor; leer heisst ohne Ablaufdatum.
        </p>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Lade …</p>
      ) : (
        <div className="space-y-2">
          {arten.map((a) => (
            <div key={a.id} className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_8rem_8rem_auto] sm:items-end">
              <div>
                <Label className="text-xs">Bezeichnung</Label>
                <Input className="h-9" value={wert(a, "label")} onChange={(e) => setze(a.id, { label: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Gültig (Monate)</Label>
                <Input
                  className="h-9"
                  type="number"
                  min={1}
                  max={240}
                  placeholder="unbefristet"
                  value={wert(a, "validity_months") ?? ""}
                  onChange={(e) => setze(a.id, { validity_months: e.target.value ? Number(e.target.value) : null })}
                />
              </div>
              <div>
                <Label className="text-xs">Erinnern (Tage vorher)</Label>
                <Input
                  className="h-9"
                  type="number"
                  min={0}
                  max={365}
                  value={wert(a, "remind_days")}
                  onChange={(e) => setze(a.id, { remind_days: Math.max(0, Math.min(365, Number(e.target.value) || 0)) })}
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Switch
                    checked={wert(a, "is_active")}
                    onCheckedChange={(v) => setze(a.id, { is_active: v })}
                    aria-label={`${a.label} zur Auswahl anbieten`}
                  />
                  aktiv
                </label>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  disabled={!aenderungen[a.id] || speichern.isPending}
                  onClick={() => speichern.mutate(a.id)}
                  aria-label="Speichern"
                >
                  <Save size={14} />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => confirm(`„${a.label}" löschen?`) && loeschen.mutate(a.id)}
                  aria-label="Löschen"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}

          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={neuLabel}
              onChange={(e) => setNeuLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && neuLabel.trim()) anlegen.mutate(); }}
              placeholder="Neue Art, z. B. Pulverschein"
              className="h-9 flex-1 min-w-48 max-w-sm"
            />
            <Button size="sm" variant="outline" onClick={() => anlegen.mutate()} disabled={!neuLabel.trim() || anlegen.isPending}>
              <Plus size={14} className="mr-1" /> Anlegen
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
