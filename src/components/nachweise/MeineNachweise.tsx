import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Loader2, Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  db, gueltigBisVorschlag, nachweisStand, STAND_FARBE, standText,
  useMeineNachweise, useNachweisArten, type Nachweis,
} from "@/hooks/useNachweise";

interface Entwurf {
  id: string | null;
  type_id: string;
  issued_on: string;
  valid_until: string;
  note: string;
  /** Hat jemand „gültig bis" selbst geändert? Dann schlägt DING nichts mehr vor. */
  bisVonHand: boolean;
}

const NEU: Entwurf = { id: null, type_id: "", issued_on: "", valid_until: "", note: "", bisVonHand: false };

/**
 * „Meine Nachweise" im Profil.
 *
 * Jedes Mitglied trägt seine Nachweise selbst ein – wer den Schein in der
 * Hand hat, weiss das Datum. Die Verwaltung kann sie prüfen; ändert das
 * Mitglied danach Art oder Datum, ist die Prüfung hinfällig und muss neu
 * erfolgen. Das regelt die Datenbank, nicht diese Seite.
 */
export default function MeineNachweise() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: arten = [] } = useNachweisArten();
  const { data: nachweise = [], isLoading } = useMeineNachweise(user?.id);
  const [entwurf, setEntwurf] = useState<Entwurf | null>(null);

  const artVon = (id: string) => arten.find((a) => a.id === id);
  const waehlbar = arten.filter((a) => a.is_active);

  const neuBerechnen = (e: Entwurf): Entwurf => {
    if (e.bisVonHand) return e;
    const vorschlag = gueltigBisVorschlag(e.issued_on || null, artVon(e.type_id)?.validity_months ?? null);
    return { ...e, valid_until: vorschlag ?? e.valid_until };
  };

  const speichern = useMutation({
    mutationFn: async (e: Entwurf) => {
      const daten = {
        type_id: e.type_id,
        issued_on: e.issued_on || null,
        valid_until: e.valid_until || null,
        note: e.note.trim() || null,
      };
      const { error } = e.id
        ? await db.from("member_certificates").update(daten).eq("id", e.id)
        : await db.from("member_certificates").insert({ ...daten, user_id: user!.id });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setEntwurf(null);
      qc.invalidateQueries({ queryKey: ["nachweise"] });
      toast({ title: "Nachweis gespeichert" });
    },
    onError: (err: Error) => toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  const loeschen = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("member_certificates").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nachweise"] }),
    onError: (err: Error) => toast({ title: "Nicht gelöscht", description: err.message, variant: "destructive" }),
  });

  const bearbeiten = (n: Nachweis) =>
    setEntwurf({
      id: n.id,
      type_id: n.type_id,
      issued_on: n.issued_on ?? "",
      valid_until: n.valid_until ?? "",
      note: n.note ?? "",
      bisVonHand: true,
    });

  const sortiert = [...nachweise].sort((a, b) => {
    const x = artVon(a.type_id);
    const y = artVon(b.type_id);
    return (x?.sort_order ?? 0) - (y?.sort_order ?? 0) || (x?.label ?? "").localeCompare(y?.label ?? "", "de");
  });

  return (
    <div data-tour="profil-nachweise" className="p-6 rounded-lg border bg-card space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
          <ShieldCheck size={18} /> Meine Nachweise
        </h2>
        {!entwurf && waehlbar.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setEntwurf(NEU)}>
            <Plus size={14} className="mr-1" /> Nachweis
          </Button>
        )}
      </div>
      <p className="text-sm text-muted-foreground">
        Qualifikationen mit Ablaufdatum. DING erinnert dich rechtzeitig, bevor einer abläuft, und die Leitung
        einer Veranstaltung sieht, wer was darf.
      </p>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Lade …</p>
      ) : waehlbar.length === 0 && nachweise.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Die Verwaltung hat noch keine Arten von Nachweisen angelegt.
        </p>
      ) : sortiert.length === 0 && !entwurf ? (
        <p className="text-sm text-muted-foreground">Noch keine Nachweise eingetragen.</p>
      ) : (
        <ul className="space-y-2">
          {sortiert.map((n) => {
            const art = artVon(n.type_id);
            const { stand } = nachweisStand(n, art);
            return (
              <li key={n.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium flex items-center gap-1.5 flex-wrap">
                    {art?.label ?? "Unbekannte Art"}
                    {n.verified_at && (
                      <BadgeCheck size={15} className="text-primary shrink-0" aria-label="Von der Verwaltung geprüft" />
                    )}
                  </p>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded ${STAND_FARBE[stand]}`}>
                    {standText(n, art)}
                  </span>
                  {n.note && <p className="text-xs text-muted-foreground mt-1 break-words">{n.note}</p>}
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => bearbeiten(n)} aria-label="Bearbeiten">
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => confirm(`${art?.label ?? "Nachweis"} löschen?`) && loeschen.mutate(n.id)}
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

      {entwurf && (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
          <div>
            <Label className="text-sm">Art</Label>
            <Select
              value={entwurf.type_id}
              onValueChange={(v) => setEntwurf(neuBerechnen({ ...entwurf, type_id: v }))}
            >
              <SelectTrigger><SelectValue placeholder="Welcher Nachweis?" /></SelectTrigger>
              <SelectContent>
                {waehlbar.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {artVon(entwurf.type_id)?.description && (
              <p className="text-xs text-muted-foreground mt-1">{artVon(entwurf.type_id)!.description}</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-sm" htmlFor="nachweis-ausgestellt">Ausgestellt am</Label>
              <Input
                id="nachweis-ausgestellt"
                type="date"
                value={entwurf.issued_on}
                onChange={(e) => setEntwurf(neuBerechnen({ ...entwurf, issued_on: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-sm" htmlFor="nachweis-bis">Gültig bis</Label>
              <Input
                id="nachweis-bis"
                type="date"
                value={entwurf.valid_until}
                onChange={(e) => setEntwurf({ ...entwurf, valid_until: e.target.value, bisVonHand: true })}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {artVon(entwurf.type_id)?.validity_months
                  ? `Vorschlag aus ${artVon(entwurf.type_id)!.validity_months} Monaten Gültigkeit, lässt sich ändern.`
                  : "Leer lassen, wenn der Nachweis nicht abläuft."}
              </p>
            </div>
          </div>
          <div>
            <Label className="text-sm" htmlFor="nachweis-notiz">Notiz (optional)</Label>
            <Input
              id="nachweis-notiz"
              value={entwurf.note}
              onChange={(e) => setEntwurf({ ...entwurf, note: e.target.value })}
              placeholder="z. B. Aussteller, Nummer des Scheins"
            />
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => speichern.mutate(entwurf)}
              disabled={!entwurf.type_id || speichern.isPending}
            >
              {speichern.isPending && <Loader2 size={14} className="mr-1 animate-spin" />} Speichern
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEntwurf(null)}>Abbrechen</Button>
          </div>
        </div>
      )}
    </div>
  );
}
