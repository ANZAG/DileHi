import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Hilfe } from "@/components/Hilfe";

/**
 * Rollen anlegen, umbenennen, entfernen.
 *
 * Bis eben war die Menge der Rollen ein Aufzählungstyp in der Datenbank mit
 * sechs festen Werten – unseren Ämtern, mitsamt der Nassauer Latinismen. Ein
 * fremder Verein erbte sie und konnte keine eigene anlegen.
 *
 * Was eine Rolle *darf*, steht weiterhin nebenan in der Rechteverwaltung.
 * Hier steht nur, welche es gibt und was sie über sich aussagt.
 */

interface Rolle {
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_board: boolean;
  is_leitung: boolean;
  public_listed: boolean;
  is_system: boolean;
  max_holders: number | null;
  mitglieder: number;
  rechte: number;
}

const db = supabase as unknown as { from: (t: string) => any };

export default function RollenAdmin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [neuOffen, setNeuOffen] = useState(false);
  const [neuLabel, setNeuLabel] = useState("");
  const [nachfrage, setNachfrage] = useState<Rolle | null>(null);

  const { data: rollen = [], isLoading } = useQuery({
    queryKey: ["rollen-status"],
    queryFn: async (): Promise<Rolle[]> => {
      const { data, error } = await supabase.rpc("rollen_status" as never);
      if (error) throw new Error(error.message);
      return (data ?? []) as Rolle[];
    },
  });

  const erneuern = () => {
    qc.invalidateQueries({ queryKey: ["rollen-status"] });
    qc.invalidateQueries({ queryKey: ["role_catalog"] });
    qc.invalidateQueries({ queryKey: ["role_permissions"] });
    qc.invalidateQueries({ queryKey: ["members"] });
  };

  const aendern = useMutation({
    mutationFn: async ({ key, werte }: { key: string; werte: Partial<Rolle> }) => {
      const { error } = await db.from("role_catalog").update(werte).eq("key", key);
      if (error) throw new Error(error.message);
    },
    onSuccess: erneuern,
    onError: (e: Error) =>
      toast({ title: "Nicht gespeichert", description: e.message, variant: "destructive" }),
  });

  const anlegen = useMutation({
    mutationFn: async () => {
      const label = neuLabel.trim();
      // Der Schlüssel steht später in user_roles und soll dort lesbar sein.
      const key = label.toLowerCase()
        .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30);
      if (!key) throw new Error("Die Beschriftung ergibt keinen brauchbaren Schlüssel.");
      const letzte = rollen[rollen.length - 1]?.sort_order ?? 0;
      const { error } = await db
        .from("role_catalog")
        .insert({ key, label, sort_order: letzte + 10 });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNeuOffen(false);
      setNeuLabel("");
      erneuern();
      toast({
        title: "Rolle angelegt",
        description: "Was sie darf, stellst du nebenan unter Berechtigungen ein.",
      });
    },
    onError: (e: Error) =>
      toast({ title: "Nicht angelegt", description: e.message, variant: "destructive" }),
  });

  const loeschen = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await db.from("role_catalog").delete().eq("key", key);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNachfrage(null);
      erneuern();
      toast({ title: "Rolle entfernt" });
    },
    onError: (e: Error) => {
      setNachfrage(null);
      // Die Datenbank sagt selbst, warum es nicht geht – Grundausstattung,
      // noch besetzt, oder die letzte mit Rechteverwaltung.
      toast({ title: "Nicht möglich", description: e.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground max-w-prose">
          Welche Rollen es im Verein gibt. Was eine Rolle darf, stellst du unter
          Berechtigungen ein; wer welche hat, steht im Mitgliederregister.
        </p>
        {!neuOffen && (
          <Button size="sm" onClick={() => setNeuOffen(true)}>
            <Plus size={15} className="mr-1" /> Rolle anlegen
          </Button>
        )}
      </div>

      {neuOffen && (
        <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-lg border bg-card">
          <Input
            autoFocus
            value={neuLabel}
            onChange={(e) => setNeuLabel(e.target.value)}
            placeholder="z. B. Zeugwart"
            className="h-9 flex-1 min-w-40"
          />
          <Button size="sm" disabled={!neuLabel.trim() || anlegen.isPending} onClick={() => anlegen.mutate()}>
            Anlegen
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setNeuOffen(false); setNeuLabel(""); }}>
            Abbrechen
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {rollen.map((r) => (
          <div key={r.key} className="p-4 rounded-lg border bg-card space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Input
                  className="h-9 font-medium"
                  defaultValue={r.label}
                  onBlur={(e) => {
                    const wert = e.target.value.trim();
                    if (wert && wert !== r.label) aendern.mutate({ key: r.key, werte: { label: wert } });
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="font-mono">{r.key}</span>
                  {" · "}
                  {r.mitglieder === 1 ? "1 Mitglied" : `${r.mitglieder} Mitglieder`}
                  {" · "}
                  {r.rechte === 1 ? "1 Recht" : `${r.rechte} Rechte`}
                  {r.is_system && " · Grundausstattung"}
                </p>
              </div>
              {!r.is_system && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="shrink-0 h-8 text-muted-foreground hover:text-destructive"
                  onClick={() => setNachfrage(r)}
                  aria-label={`${r.label} entfernen`}
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </div>

            <Input
              className="h-9"
              placeholder="Wofür ist diese Rolle da? (optional)"
              defaultValue={r.description ?? ""}
              onBlur={(e) => {
                const wert = e.target.value.trim() || null;
                if (wert !== r.description) aendern.mutate({ key: r.key, werte: { description: wert } });
              }}
            />

            <div className="grid sm:grid-cols-3 gap-3 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={r.is_leitung}
                  onCheckedChange={(v) => aendern.mutate({ key: r.key, werte: { is_leitung: v } })}
                />
                <span className="text-sm">
                  Vereinsleitung<Hilfe k="rolle_leitung" />
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={r.is_board}
                  onCheckedChange={(v) => aendern.mutate({ key: r.key, werte: { is_board: v } })}
                />
                <span className="text-sm">
                  Vorstand<Hilfe k="rolle_vorstand" />
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <Switch
                  checked={r.public_listed}
                  onCheckedChange={(v) => aendern.mutate({ key: r.key, werte: { public_listed: v } })}
                />
                <span className="text-sm">
                  Öffentlich nennen<Hilfe k="rolle_oeffentlich" />
                </span>
              </label>
            </div>

            <div className="max-w-[16rem]">
              <Label className="text-xs">
                Höchstens so viele Personen <span className="text-muted-foreground font-normal">(leer = beliebig)</span>
              </Label>
              <Input
                type="number"
                min={1}
                className="h-9"
                defaultValue={r.max_holders ?? ""}
                onBlur={(e) => {
                  const wert = e.target.value ? Number(e.target.value) : null;
                  if (wert !== r.max_holders) aendern.mutate({ key: r.key, werte: { max_holders: wert } });
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!nachfrage} onOpenChange={(o) => !o && setNachfrage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{nachfrage?.label} entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              {nachfrage && nachfrage.mitglieder > 0
                ? `An dieser Rolle hängen noch ${nachfrage.mitglieder} Mitglieder. Solange das so ist, lässt sie sich nicht entfernen – trage sie erst um.`
                : "Die Rolle und ihre Rechtezuordnungen verschwinden. Mitglieder sind nicht betroffen."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => nachfrage && loeschen.mutate(nachfrage.key)}
              disabled={loeschen.isPending}
            >
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
