import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Minus, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { datumDe } from "@/lib/datum";
import {
  db, istMinderjaehrig, useEinwilligungsArten, type Einwilligung, type EinwilligungsArt, type Notfallkontakt,
} from "@/hooks/useEinwilligungen";

interface Mitglied {
  id: string;
  display_name: string;
  birthdate: string | null;
}

/**
 * Einwilligungen in der Verwaltung.
 *
 * Die häufigste Frage kommt von der Person mit der Kamera: Wen darf ich nicht
 * zeigen? Deshalb beginnt die Übersicht mit „ohne Fotofreigabe". Wer noch
 * gar nicht entschieden hat, zählt dazu – ohne Einwilligung keine Freigabe.
 */
export default function EinwilligungenAdmin() {
  const { data: arten = [] } = useEinwilligungsArten();
  const aktiv = arten.filter((a) => a.is_active);
  const fotoArt = arten.find((a) => a.key === "photos");

  const { data: mitglieder = [] } = useQuery({
    queryKey: ["einwilligungen", "mitglieder"],
    queryFn: async (): Promise<Mitglied[]> => {
      const { data, error } = await db.from("profiles").select("id, display_name, birthdate").eq("is_active", true).order("display_name");
      if (error) throw new Error(error.message);
      return (data ?? []) as Mitglied[];
    },
  });

  const { data: entscheidungen = [] } = useQuery({
    queryKey: ["einwilligungen", "alle"],
    queryFn: async (): Promise<Einwilligung[]> => {
      const { data, error } = await db.from("member_consents").select("*");
      if (error) throw new Error(error.message);
      return (data ?? []) as Einwilligung[];
    },
  });

  const { data: kontakte = [] } = useQuery({
    queryKey: ["einwilligungen", "alle-kontakte"],
    queryFn: async (): Promise<Notfallkontakt[]> => {
      const { data, error } = await db.from("member_emergency_contacts").select("*");
      if (error) throw new Error(error.message);
      return (data ?? []) as Notfallkontakt[];
    },
  });

  const [nurOhneFoto, setNurOhneFoto] = useState(true);
  const entscheidung = (user: string, art: string) => entscheidungen.find((e) => e.user_id === user && e.type_id === art);

  const zeilen = useMemo(
    () =>
      mitglieder.filter((m) => !nurOhneFoto || !fotoArt || entscheidung(m.id, fotoArt.id)?.granted !== true),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mitglieder, entscheidungen, nurOhneFoto, fotoArt]
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-serif text-lg font-semibold">Einwilligungen</h2>
        <p className="text-sm text-muted-foreground max-w-prose">
          Mitglieder entscheiden im Profil selbst; jede Entscheidung steht mit Zeitpunkt im Protokoll. Die Leitung
          einer Veranstaltung sieht bei den Zusagen, wer keine Fotofreigabe hat, wer minderjährig ist und die
          Notfallkontakte.
        </p>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">Übersicht</h3>
          {fotoArt && (
            <div className="inline-flex rounded-md border p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setNurOhneFoto(true)}
                className={`px-2.5 py-1 rounded ${nurOhneFoto ? "bg-primary text-primary-foreground" : ""}`}
              >
                Ohne Fotofreigabe
              </button>
              <button
                type="button"
                onClick={() => setNurOhneFoto(false)}
                className={`px-2.5 py-1 rounded ${!nurOhneFoto ? "bg-primary text-primary-foreground" : ""}`}
              >
                Alle Mitglieder
              </button>
            </div>
          )}
        </div>

        {zeilen.length === 0 ? (
          <p className="text-sm text-muted-foreground">Alle haben der Fotofreigabe zugestimmt.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Mitglied</th>
                  {aktiv.map((a) => <th key={a.id} className="px-3 py-2 font-medium">{a.label}</th>)}
                  <th className="px-3 py-2 font-medium">Notfallkontakt</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {zeilen.map((m) => {
                  const eigene = kontakte.filter((k) => k.user_id === m.id);
                  return (
                    <tr key={m.id}>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {m.display_name}
                        {istMinderjaehrig(m.birthdate) && (
                          <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">minderjährig</span>
                        )}
                      </td>
                      {aktiv.map((a) => {
                        const e = entscheidung(m.id, a.id);
                        return (
                          <td
                            key={a.id}
                            className="px-3 py-2"
                            title={e ? `${e.granted ? "Ja" : "Nein"} am ${datumDe(e.decided_at.slice(0, 10))}${e.guardian_name ? `, durch ${e.guardian_name}` : ""}` : "Noch nicht entschieden"}
                          >
                            {e?.granted === true ? (
                              <Check size={16} className="text-green-700" aria-label="ja" />
                            ) : e?.granted === false ? (
                              <X size={16} className="text-destructive" aria-label="nein" />
                            ) : (
                              <Minus size={16} className="text-muted-foreground" aria-label="offen" />
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-xs">
                        {eigene.length === 0 ? (
                          <span className="text-muted-foreground">–</span>
                        ) : (
                          eigene.map((k) => (
                            <span key={k.id} className="block whitespace-nowrap">
                              {k.name}{k.relation && ` (${k.relation})`} · <a href={`tel:${k.phone}`} className="text-primary hover:underline">{k.phone}</a>
                            </span>
                          ))
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Arten arten={arten} />
    </div>
  );
}

/** Welche Einwilligungen der Verein einholt. */
function Arten({ arten }: { arten: EinwilligungsArt[] }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [aenderungen, setAenderungen] = useState<Record<string, Partial<EinwilligungsArt>>>({});
  const [neu, setNeu] = useState<{ label: string; text: string } | null>(null);

  const wert = <K extends keyof EinwilligungsArt>(a: EinwilligungsArt, feld: K): EinwilligungsArt[K] =>
    (aenderungen[a.id]?.[feld] as EinwilligungsArt[K] | undefined) ?? a[feld];
  const setze = (id: string, patch: Partial<EinwilligungsArt>) =>
    setAenderungen((x) => ({ ...x, [id]: { ...x[id], ...patch } }));

  const speichern = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("consent_types").update(aenderungen[id]).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, id) => {
      setAenderungen((x) => {
        const rest = { ...x };
        delete rest[id];
        return rest;
      });
      qc.invalidateQueries({ queryKey: ["einwilligungen"] });
      toast({ title: "Gespeichert" });
    },
    onError: (err: Error) => toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  const anlegen = useMutation({
    mutationFn: async () => {
      const letzte = arten[arten.length - 1]?.sort_order ?? 0;
      const { error } = await db.from("consent_types").insert({ label: neu!.label.trim(), text: neu!.text.trim(), sort_order: letzte + 10 });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNeu(null);
      qc.invalidateQueries({ queryKey: ["einwilligungen"] });
    },
    onError: (err: Error) => toast({ title: "Nicht angelegt", description: err.message, variant: "destructive" }),
  });

  return (
    <section className="space-y-3 border-t pt-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-medium">Welche Einwilligungen der Verein einholt</h3>
          <p className="text-sm text-muted-foreground max-w-prose">
            Den Wortlaut einer Einwilligung, der schon zugestimmt wurde, nicht wesentlich ändern – die Zustimmung
            galt dem alten Text. Lieber eine neue anlegen und die alte ausschalten.
          </p>
        </div>
        {!neu && (
          <Button size="sm" variant="outline" onClick={() => setNeu({ label: "", text: "" })}>
            <Plus size={14} className="mr-1" /> Einwilligung
          </Button>
        )}
      </div>

      {arten.map((a) => (
        <div key={a.id} className="rounded-lg border p-3 space-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-48">
              <Label className="text-xs">Bezeichnung</Label>
              <Input className="h-9" value={wert(a, "label")} onChange={(e) => setze(a.id, { label: e.target.value })} />
            </div>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground pb-2">
              <Switch checked={wert(a, "is_active")} onCheckedChange={(v) => setze(a.id, { is_active: v })} />
              aktiv
            </label>
            <Button size="sm" variant="outline" disabled={!aenderungen[a.id] || speichern.isPending} onClick={() => speichern.mutate(a.id)}>
              <Save size={14} className="mr-1" /> Speichern
            </Button>
          </div>
          <div>
            <Label className="text-xs">Wortlaut</Label>
            <Textarea rows={3} value={wert(a, "text")} onChange={(e) => setze(a.id, { text: e.target.value })} />
          </div>
          {a.key === "photos" && (
            <p className="text-xs text-muted-foreground">An dieser Einwilligung erkennt die Veranstaltung, wer nicht fotografiert werden will.</p>
          )}
        </div>
      ))}

      {neu && (
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div>
            <Label className="text-xs">Bezeichnung</Label>
            <Input className="h-9" value={neu.label} onChange={(e) => setNeu({ ...neu, label: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Wortlaut</Label>
            <Textarea rows={3} value={neu.text} onChange={(e) => setNeu({ ...neu, text: e.target.value })} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => anlegen.mutate()} disabled={!neu.label.trim() || !neu.text.trim() || anlegen.isPending}>Anlegen</Button>
            <Button size="sm" variant="outline" onClick={() => setNeu(null)}>Abbrechen</Button>
          </div>
        </div>
      )}
    </section>
  );
}
