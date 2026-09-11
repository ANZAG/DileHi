import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

/**
 * Der Verweis auf die Satzung im Aufnahmeantrag.
 *
 * Stand bis eben unter Erscheinungsbild, zwischen Farben und Bankverbindung.
 * Dort sucht niemand danach: Wer den Antrag zusammenstellt, ist im Reiter
 * Aufnahmeantrag, und die Frage „verweist {{satzung}} auf ein Dokument?"
 * gehört zu den Texten dieses Antrags, nicht zum Aussehen des Vereins.
 */

interface Stand {
  statutes_link: boolean;
  statutes_document_id: string | null;
}

const db = supabase as unknown as { from: (t: string) => any };

export default function SatzungEinstellung() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [entwurf, setEntwurf] = useState<Stand | null>(null);

  const { data } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await db.from("app_settings").select("*").maybeSingle();
      if (error) throw new Error(error.message);
      return data as Stand;
    },
  });

  useEffect(() => {
    if (data) setEntwurf({ statutes_link: data.statutes_link, statutes_document_id: data.statutes_document_id });
  }, [data]);

  const { data: dokumente = [] } = useQuery({
    queryKey: ["satzung-auswahl"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("statutes_options" as never);
      if (error) throw new Error(error.message);
      return (data ?? []) as { id: string; title: string; created_at: string }[];
    },
  });

  const speichern = useMutation({
    mutationFn: async (werte: Stand) => {
      const { error } = await db.from("app_settings").update(werte).eq("id", true);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["app-settings"] });
      qc.invalidateQueries({ queryKey: ["branding"] });
      toast({ title: "Gespeichert" });
    },
    onError: (err: Error) =>
      toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  if (!entwurf) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Lade Einstellungen …</p>;
  }

  const geaendert =
    !!data &&
    (entwurf.statutes_link !== data.statutes_link ||
      entwurf.statutes_document_id !== data.statutes_document_id);

  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-muted-foreground">
        In der Zustimmung des Antrags steht der Platzhalter <code>{"{{satzung}}"}</code>.
        Hier entscheidet sich, ob daraus ein Verweis auf das hinterlegte Dokument
        wird oder nur das Wort.
      </p>

      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          checked={entwurf.statutes_link}
          onChange={(e) => setEntwurf({ ...entwurf, statutes_link: e.target.checked })}
          className="mt-0.5 h-4 w-4 rounded border-input shrink-0 accent-primary"
        />
        <span className="text-sm">
          Satzung im Antrag verlinken
          <span className="block text-xs text-muted-foreground">
            Der Verweis ist ohne Anmeldung erreichbar. Er muss es sein, denn wer
            einen Antrag stellt, hat noch kein Konto.
          </span>
        </span>
      </label>

      {entwurf.statutes_link && (
        <div>
          <Label className="text-sm">Welches Dokument ist die Satzung?</Label>
          <Select
            value={entwurf.statutes_document_id ?? "neuestes"}
            onValueChange={(v) =>
              setEntwurf({ ...entwurf, statutes_document_id: v === "neuestes" ? null : v })
            }
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="neuestes">Neuestes aus „Satzung &amp; Ordnungen“</SelectItem>
              {dokumente.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.title} ({new Date(d.created_at).toLocaleDateString("de-DE")})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            {dokumente.length === 0
              ? "In der Kategorie „Satzung & Ordnungen“ liegt noch kein Dokument. Hochladen unter Mitgliederbereich → Dokumente."
              : "In dieser Kategorie liegen auch Beitrags- und Vorstandsordnungen. Die sind meist neuer als die Satzung, deshalb wird sie hier ausdrücklich gewählt."}
          </p>
        </div>
      )}

      <Button
        size="sm"
        disabled={!geaendert || speichern.isPending}
        onClick={() => speichern.mutate(entwurf)}
      >
        {speichern.isPending
          ? <Loader2 size={15} className="mr-1 animate-spin" />
          : <Save size={15} className="mr-1" />}
        Speichern
      </Button>
    </div>
  );
}
