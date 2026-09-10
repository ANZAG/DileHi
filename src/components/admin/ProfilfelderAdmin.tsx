import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Eye, EyeOff, Loader2, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import FieldListEditor from "@/components/event-forms/FieldListEditor";
import FormFieldRenderer from "@/components/event-forms/FormFieldRenderer";
import type { FormField } from "@/components/event-forms/types";
import { useProfilfelder, PROFIL_FELDTYPEN, type Profilfeld } from "@/hooks/useProfilfelder";
import { useAntragsfelder } from "@/hooks/useAntragsfelder";

const db = supabase as unknown as { from: (t: string) => any };

/**
 * Was im Mitgliederprofil steht.
 *
 * Zwei Listen, weil es zwei verschiedene Dinge sind:
 *
 *   Bereiche  fertige Blöcke der Profilseite. Sie lassen sich an- und
 *             abschalten, aber nicht umbenennen oder löschen – dahinter steht
 *             Programmcode, nicht ein Feld. „Meine Zelte" ist ein ganzer
 *             Editor, keine Frage.
 *   Felder    frei zusammengestellte Fragen, wie im Aufnahmeantrag. Ihre
 *             Antworten stehen in profiles.extra.
 *
 * Persönliche Daten, Mitgliedschaft, Benachrichtigungen und Konto stehen
 * bewusst in keiner der beiden Listen: Ein Profil ohne Namensfeld oder ohne
 * Passwortwechsel wäre keins.
 */
export default function ProfilfelderAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: gespeichert = [], isLoading } = useProfilfelder();

  const bereiche = gespeichert.filter((f) => f.block_key);
  const [felder, setFelder] = useState<Profilfeld[]>([]);
  const [offen, setOffen] = useState<string | null>(null);
  const [geaendert, setGeaendert] = useState(false);

  useEffect(() => {
    if (!geaendert) setFelder(gespeichert.filter((f) => !f.block_key));
  }, [gespeichert, geaendert]);

  const bereichSchalten = useMutation({
    mutationFn: async (feld: Profilfeld) => {
      const { error } = await db.from("profile_fields")
        .update({ is_active: !feld.is_active }).eq("id", feld.id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["profile-fields"] }),
    onError: (err: Error) =>
      toast({ title: "Nicht geändert", description: err.message, variant: "destructive" }),
  });

  const speichern = useMutation({
    mutationFn: async () => {
      const vorher = new Map(gespeichert.filter((f) => !f.block_key).map((f) => [f.id, f]));
      const jetzt = new Map(felder.map((f) => [f.id, f]));

      const entfernt = [...vorher.keys()].filter((id) => !jetzt.has(id));
      if (entfernt.length > 0) {
        const { error } = await db.from("profile_fields").delete().in("id", entfernt);
        if (error) throw new Error(error.message);
      }

      for (const [i, feld] of felder.entries()) {
        // Nach den Bereichen einsortieren, damit „Weitere Angaben" im Profil
        // unter den fertigen Bloecken steht.
        const daten = {
          type: feld.type,
          label: feld.label,
          description: feld.description,
          required: feld.required,
          sort_order: 1000 + (i + 1) * 10,
          options: feld.options ?? [],
          settings: feld.settings ?? {},
        };
        if (vorher.has(feld.id)) {
          const { error } = await db.from("profile_fields").update(daten).eq("id", feld.id);
          if (error) throw new Error(error.message);
        } else {
          const { error } = await db.from("profile_fields")
            .insert({ ...daten, block_key: null });
          if (error) throw new Error(error.message);
        }
      }
    },
    onSuccess: () => {
      setGeaendert(false);
      queryClient.invalidateQueries({ queryKey: ["profile-fields"] });
      toast({ title: "Gespeichert" });
    },
    onError: (err: Error) =>
      toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Lade Profilfelder …</p>;
  }
  if (gespeichert.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Keine Profilfelder gefunden. Ist die Migration eingespielt?
      </p>
    );
  }

  const aendern = (neue: FormField[]) => {
    setFelder(neue as Profilfeld[]);
    setGeaendert(true);
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="font-serif text-base font-semibold">Bereiche</h3>
        <p className="text-sm text-muted-foreground mb-3 max-w-prose">
          Fertige Blöcke der Profilseite. Abgeschaltet verschwinden sie samt
          ihrer Bedienung. Die bereits eingetragenen Angaben bleiben in der
          Datenbank und kommen beim Wiedereinschalten zurück.
        </p>
        <ul className="divide-y rounded-lg border bg-card overflow-hidden">
          {bereiche.map((b) => (
            <li
              key={b.id}
              className={`flex flex-wrap items-center gap-2 p-3 ${b.is_active ? "" : "opacity-50"}`}
            >
              <span className="min-w-0 flex-1 basis-full sm:basis-auto">
                <span className="font-medium text-sm">{b.label}</span>
                {b.description && (
                  <span className="block text-xs text-muted-foreground">{b.description}</span>
                )}
              </span>
              <Button
                variant="ghost" size="sm"
                onClick={() => bereichSchalten.mutate(b)}
                aria-label={b.is_active ? "Abschalten" : "Einschalten"}
              >
                {b.is_active
                  ? <><Eye size={15} className="mr-1" /> sichtbar</>
                  : <><EyeOff size={15} className="mr-1" /> aus</>}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="font-serif text-base font-semibold">Eigene Felder</h3>
            <p className="text-sm text-muted-foreground max-w-prose">
              Erscheinen im Profil unter „Weitere Angaben". Persönliche Daten,
              Mitgliedschaft, Benachrichtigungen und Konto stehen immer.
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

        <AusDemAntrag
          vorhanden={felder}
          uebernehmen={(feld) => aendern([...felder, feld])}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
          <FieldListEditor
            fields={felder}
            onChange={aendern}
            activeId={offen}
            onActiveChange={setOffen}
            nurTypen={PROFIL_FELDTYPEN}
          />
          <div className="lg:sticky lg:top-20 self-start w-full">
            <Vorschau felder={felder} hervorgehoben={offen} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Ein Feld aus dem Aufnahmeantrag übernehmen.
 *
 * Wer im Antrag nach der gewünschten Epoche fragt, will die Antwort später oft
 * im Profil pflegen können – sie ändert sich. Die Frage ein zweites Mal von
 * Hand anzulegen hiesse, zwei Formulierungen auseinanderlaufen zu lassen.
 *
 * Kopiert wird trotzdem, nicht verknüpft: Antrag und Profil sind zwei
 * Zeitpunkte. Was jemand beim Eintritt angegeben hat, soll nicht rückwirkend
 * anders lauten, weil das Profil geändert wurde.
 */
function AusDemAntrag({ vorhanden, uebernehmen }: {
  vorhanden: Profilfeld[];
  uebernehmen: (feld: Profilfeld) => void;
}) {
  const { data: antragsfelder = [] } = useAntragsfelder();
  const [gewaehlt, setGewaehlt] = useState("");

  const moeglich = antragsfelder.filter(
    (f) => !f.column_name && f.type !== "section" &&
      !vorhanden.some((v) => v.label === f.label)
  );
  if (moeglich.length === 0) return null;

  const nehmen = () => {
    const quelle = moeglich.find((f) => f.id === gewaehlt);
    if (!quelle) return;
    uebernehmen({
      type: quelle.type,
      label: quelle.label,
      description: quelle.description,
      required: quelle.required,
      options: quelle.options,
      settings: quelle.settings,
      // Neue Kennung: Es ist ein eigenes Feld, keine Verknuepfung.
      id: `neu-${crypto.randomUUID()}`,
      block_key: null,
      modul: null,
      is_active: true,
      sort_order: 0,
    });
    setGewaehlt("");
  };

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
      <span className="text-sm text-muted-foreground">Aus dem Aufnahmeantrag übernehmen:</span>
      <Select value={gewaehlt} onValueChange={setGewaehlt}>
        <SelectTrigger className="h-8 w-56"><SelectValue placeholder="Frage wählen" /></SelectTrigger>
        <SelectContent>
          {moeglich.map((f) => (
            <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" disabled={!gewaehlt} onClick={nehmen}>
        <Plus size={15} className="mr-1" /> Übernehmen
      </Button>
    </div>
  );
}

function Vorschau({ felder, hervorgehoben }: { felder: Profilfeld[]; hervorgehoben: string | null }) {
  const [werte, setWerte] = useState<Record<string, unknown>>({});
  if (felder.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
        Noch keine eigenen Felder. Der Abschnitt „Weitere Angaben" erscheint im
        Profil erst, wenn es welche gibt.
      </div>
    );
  }
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3">Vorschau</p>
      <h2 className="font-serif text-lg font-semibold mb-3">Weitere Angaben</h2>
      <div className="space-y-4">
        {felder.map((feld) => (
          <div
            key={feld.id}
            className={`rounded-md ${hervorgehoben === feld.id ? "ring-2 ring-primary/40 ring-offset-2 ring-offset-card" : ""}`}
          >
            <FormFieldRenderer
              field={feld}
              value={werte[feld.id]}
              onChange={(v) => setWerte({ ...werte, [feld.id]: v })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
