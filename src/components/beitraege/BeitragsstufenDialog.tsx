import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, RotateCcw, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useBeitragsstufenStatus, type BeitragsstufeStatus } from "@/hooks/useBeitragsstufen";
import { beschreibung, meldung, nachfrageText, type Ergebnis } from "./meldungen";

/**
 * Beitragsstufen anlegen und wieder loswerden.
 *
 * Das Entfernen entscheidet die Datenbank, nicht dieser Dialog: Ob eine Stufe
 * gelöscht, stillgelegt oder erst zum nächsten Jahr vermerkt wird, hängt
 * davon ab, was an ihr hängt. Hier stehen die Zahlen, die zu dieser
 * Entscheidung führen, und hinterher das Ergebnis.
 */
export default function BeitragsstufenDialog({
  offen,
  onOpenChange,
}: {
  offen: boolean;
  onOpenChange: (offen: boolean) => void;
}) {
  const { data: stufen = [], isLoading } = useBeitragsstufenStatus(offen);
  const { toast } = useToast();
  const qc = useQueryClient();
  const [neuOffen, setNeuOffen] = useState(false);
  const [neuLabel, setNeuLabel] = useState("");
  const [nachfrage, setNachfrage] = useState<BeitragsstufeStatus | null>(null);

  const alles = () => {
    qc.invalidateQueries({ queryKey: ["beitragsstufen-status"] });
    qc.invalidateQueries({ queryKey: ["beitragsstufen"] });
    qc.invalidateQueries({ queryKey: ["contribution-categories"] });
    qc.invalidateQueries({ queryKey: ["beitragsmodell"] });
    qc.invalidateQueries({ queryKey: ["contribution-rates"] });
  };

  const anlegen = useMutation({
    mutationFn: async () => {
      const label = neuLabel.trim();
      // Der Schlüssel wird aus der Beschriftung gebildet. Er steht später in
      // profiles.membership_type und soll dort lesbar sein.
      const key = label.toLowerCase()
        .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 30);
      if (!key) throw new Error("Die Beschriftung ergibt keinen brauchbaren Schlüssel.");
      const letzte = stufen[stufen.length - 1]?.sort_order ?? 0;
      const { error } = await (supabase as unknown as { from: (t: string) => any })
        .from("contribution_categories")
        .insert({ key, label, sort_order: letzte + 10 });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNeuOffen(false);
      setNeuLabel("");
      alles();
      toast({ title: "Beitragsstufe angelegt" });
    },
    onError: (err: Error) =>
      toast({ title: "Nicht angelegt", description: err.message, variant: "destructive" }),
  });

  const entfernen = useMutation({
    mutationFn: async (key: string) => {
      const { data, error } = await supabase.rpc("remove_contribution_category" as never, { _key: key } as never);
      if (error) throw new Error(error.message);
      return data as Ergebnis;
    },
    onSuccess: (ergebnis) => {
      alles();
      setNachfrage(null);
      const m = meldung(ergebnis);
      toast({
        title: m.titel,
        description: m.text,
        variant: ergebnis.ok ? undefined : "destructive",
      });
    },
    onError: (err: Error) =>
      toast({ title: "Nicht entfernt", description: err.message, variant: "destructive" }),
  });

  const wiederAnbieten = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await supabase.rpc("restore_contribution_category" as never, { _key: key } as never);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      alles();
      toast({ title: "Wird wieder angeboten" });
    },
  });

  return (
    <>
      <Dialog open={offen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Beitragsstufen</DialogTitle>
            <DialogDescription>
              Wer wie viel zahlt. Regulär, ermässigt, Familie: Zu jeder Stufe gehört
              ein eigener Beitragssatz je Jahr.
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="animate-spin text-muted-foreground" size={20} />
            </div>
          ) : (
            <ul className="divide-y">
              {stufen.map((s) => (
                <li key={s.key} className="py-3 flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">{s.label}</span>
                      {!s.offered && (
                        <Badge variant="secondary" className="text-xs">Nicht mehr im Antrag</Badge>
                      )}
                      {s.removed_from != null && (
                        <Badge variant="outline" className="text-xs">
                          Läuft aus zum {s.removed_from}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{beschreibung(s)}</p>
                  </div>

                  {s.removed_from != null ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 h-8 text-xs"
                      onClick={() => wiederAnbieten.mutate(s.key)}
                    >
                      <RotateCcw size={13} className="mr-1" /> Zurücknehmen
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 h-8 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setNachfrage(s)}
                      aria-label={`${s.label} entfernen`}
                    >
                      <Trash2 size={13} />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {neuOffen ? (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Input
                autoFocus
                value={neuLabel}
                onChange={(e) => setNeuLabel(e.target.value)}
                placeholder="z. B. Ermässigt"
                className="h-9 flex-1 min-w-40"
              />
              <Button size="sm" disabled={!neuLabel.trim() || anlegen.isPending} onClick={() => anlegen.mutate()}>
                Anlegen
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setNeuOffen(false); setNeuLabel(""); }}>
                Abbrechen
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" className="self-start" onClick={() => setNeuOffen(true)}>
              <Plus size={14} className="mr-1" /> Stufe hinzufügen
            </Button>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!nachfrage} onOpenChange={(o) => !o && setNachfrage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {nachfrage?.label} entfernen?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {nachfrage && nachfrageText(nachfrage)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => nachfrage && entfernen.mutate(nachfrage.key)}
              disabled={entfernen.isPending}
            >
              Entfernen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
