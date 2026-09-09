import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FieldListEditor from "@/components/event-forms/FieldListEditor";
import FormFieldRenderer from "@/components/event-forms/FormFieldRenderer";
import type { FormField } from "@/components/event-forms/types";
import {
  useAntragsfelder, ANTRAG_FELDTYPEN, istKernfeld, type Antragsfeld,
} from "@/hooks/useAntragsfelder";

const db = supabase as unknown as { from: (t: string) => any };

/**
 * Die Felder des Aufnahmeantrags.
 *
 * Derselbe Baukasten wie bei den Veranstaltungsformularen – bewusst, denn es
 * ist dieselbe Aufgabe: Fragen zusammenstellen, sortieren, ansehen. Zwei
 * Baukästen nebeneinander wären zwei Bedienungen zum Lernen und zwei Stellen
 * zum Pflegen.
 *
 * Zwei Unterschiede gibt es doch:
 *
 *   * Angeboten wird nur, was in einen Aufnahmeantrag gehört. Zelte und
 *     Helferaufgaben stehen im Veranstaltungsformular zur Wahl und wären hier
 *     kein Fehler, den jemand absichtlich macht – sondern einer, der passiert,
 *     weil die Auswahl sie anbietet.
 *   * Tragende Felder lassen sich nicht löschen. Aus Vorname, Nachname und
 *     E-Mail entsteht das Konto, Anschrift und Geburtsdatum wandern ins
 *     Profil. Umbenennen, umsortieren und mit einem Hilfetext versehen: ja.
 */
export default function AntragsfelderAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: gespeichert = [], isLoading } = useAntragsfelder();

  const [felder, setFelder] = useState<Antragsfeld[]>([]);
  const [offen, setOffen] = useState<string | null>(null);
  const [geaendert, setGeaendert] = useState(false);

  useEffect(() => {
    if (!geaendert) setFelder(gespeichert);
  }, [gespeichert, geaendert]);

  const speichern = useMutation({
    mutationFn: async () => {
      const vorher = new Map(gespeichert.map((f) => [f.id, f]));
      const jetzt = new Map(felder.map((f) => [f.id, f]));

      // Entfernte Felder: nur Zusatzfelder koennen ueberhaupt fehlen, die
      // Liste laesst tragende gar nicht erst loeschen.
      const entfernt = [...vorher.keys()].filter((id) => !jetzt.has(id));
      if (entfernt.length > 0) {
        const { error } = await db.from("application_fields").delete().in("id", entfernt);
        if (error) throw new Error(error.message);
      }

      for (const [i, feld] of felder.entries()) {
        const daten = {
          type: feld.type,
          label: feld.label,
          description: feld.description,
          required: feld.required,
          sort_order: (i + 1) * 10,
          options: feld.options ?? [],
          settings: feld.settings ?? {},
        };
        if (vorher.has(feld.id)) {
          const { error } = await db.from("application_fields").update(daten).eq("id", feld.id);
          if (error) throw new Error(error.message);
        } else {
          // Neue Felder sind immer Zusatzfelder – ein tragendes entsteht nur
          // zusammen mit einer Spalte, und die legt eine Migration an.
          const { error } = await db.from("application_fields")
            .insert({ ...daten, column_name: null });
          if (error) throw new Error(error.message);
        }
      }
    },
    onSuccess: () => {
      setGeaendert(false);
      queryClient.invalidateQueries({ queryKey: ["application-fields"] });
      toast({ title: "Gespeichert" });
    },
    onError: (err: Error) =>
      toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Lade Felder …</p>;
  }
  if (gespeichert.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Keine Felder gefunden. Ist die Migration eingespielt?
      </p>
    );
  }

  const aendern = (neue: FormField[]) => {
    setFelder(neue as Antragsfeld[]);
    setGeaendert(true);
  };

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-serif text-lg font-semibold">Felder des Aufnahmeantrags</h2>
          <p className="text-sm text-muted-foreground max-w-prose">
            Was im Antrag abgefragt wird. Mit „fest" gekennzeichnete Felder
            tragen die Aufnahme – sie lassen sich umbenennen und umsortieren,
            aber nicht entfernen. Mitgliedsart, Beitrag und die Zustimmungen
            stehen nicht hier: Sie hängen am Beitragsmodell und an den
            Textvorlagen.
          </p>
        </div>
        <Button
          size="sm"
          disabled={!geaendert || speichern.isPending}
          onClick={() => speichern.mutate()}
        >
          {speichern.isPending
            ? <Loader2 size={15} className="mr-1 animate-spin" />
            : <Save size={15} className="mr-1" />}
          Speichern
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FieldListEditor
          fields={felder}
          onChange={aendern}
          activeId={offen}
          onActiveChange={setOffen}
          nurTypen={ANTRAG_FELDTYPEN}
          darfEntfernen={(f) => !istKernfeld(f as Antragsfeld)}
        />

        <div className="lg:sticky lg:top-20 self-start w-full">
          <Vorschau felder={felder} hervorgehoben={offen} />
        </div>
      </div>
    </div>
  );
}

/**
 * Wie der Antrag aussehen wird.
 *
 * Nur der Teil, den dieser Baukasten bestimmt – der Beitragsabschnitt und die
 * Zustimmungen kommen von woanders und stünden hier nur als Attrappe.
 */
function Vorschau({ felder, hervorgehoben }: { felder: Antragsfeld[]; hervorgehoben: string | null }) {
  const [werte, setWerte] = useState<Record<string, unknown>>({});

  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Vorschau</p>
      <div className="space-y-4">
        {felder.filter((f) => f.is_active !== false).map((feld) => (
          <div
            key={feld.id}
            className={`rounded-md ${hervorgehoben === feld.id ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-card" : ""}`}
          >
            {feld.type !== "section" && (
              <p className="text-sm font-medium mb-1">
                {feld.label || <span className="text-muted-foreground">(ohne Beschriftung)</span>}
                {feld.required && " *"}
              </p>
            )}
            <FormFieldRenderer
              field={feld}
              value={werte[feld.id]}
              onChange={(v) => setWerte({ ...werte, [feld.id]: v })}
            />
            {feld.type !== "section" && feld.description && (
              <p className="text-xs text-muted-foreground mt-1">{feld.description}</p>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-6 pt-3 border-t">
        Darunter folgen im Antrag noch Mitgliedsart und Beitrag sowie die
        Zustimmungen zu Satzung und Datenverarbeitung.
      </p>
    </div>
  );
}
