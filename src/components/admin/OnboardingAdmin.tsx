import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { zeichen } from "@/components/onboarding/icons";

/**
 * Die Einführung anpassen.
 *
 * Solange die Texte im Quelltext standen, war das Onboarding für jeden
 * anderen Verein schlicht falscher Inhalt: Es erzählte von unseren Bereichen
 * in unseren Worten. Hier stehen sie als Zeilen, mit einem Weg zurück auf den
 * Auslieferungszustand.
 *
 * Was nicht anpassbar ist, steht bewusst nicht hier: Recht, Modul, Anker und
 * Aufgabe. Das sind Verkabelungen zum Programm, keine Inhalte – ein Anker,
 * den jemand umbenennt, zeigt auf nichts mehr.
 */

interface Schritt {
  key: string;
  tour: string;
  icon: string;
  title: string;
  text: string;
  tip: string | null;
  task: string | null;
  sort_order: number;
  is_active: boolean;
  defaults: { title?: string; text?: string; tip?: string | null } | null;
}

interface Hilfetext {
  key: string;
  title: string | null;
  text: string;
  defaults: { title?: string | null; text?: string } | null;
}

const db = supabase as unknown as { from: (t: string) => any };

/**
 * Die Touren mit Namen.
 *
 * Ein Schluessel, den diese Liste noch nicht kennt, wird trotzdem angezeigt –
 * unter seinem eigenen Namen. Sonst verschwaende eine neue Tour hier
 * stillschweigend.
 */
const TOUR_TITEL: Record<string, string> = {
  start: "Der Rundgang über die Startseite",
  profil: "Aufgaben im Profil",
  veranstaltungen: "Veranstaltungen",
  abstimmungen: "Abstimmungen",
  verwaltung: "Verwaltung",
  seiten: "Seiteneditor",
};

export default function OnboardingAdmin() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [entwurf, setEntwurf] = useState<Record<string, Partial<Schritt>>>({});
  const [hilfeEntwurf, setHilfeEntwurf] = useState<Record<string, Partial<Hilfetext>>>({});

  const { data: schritte = [], isLoading } = useQuery({
    queryKey: ["onboarding-schritte-admin"],
    queryFn: async (): Promise<Schritt[]> => {
      const { data, error } = await db.from("onboarding_steps").select("*").order("sort_order");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: hilfen = [] } = useQuery({
    queryKey: ["onboarding-hilfe-admin"],
    queryFn: async (): Promise<Hilfetext[]> => {
      const { data, error } = await db.from("onboarding_help").select("*").order("key");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const erneuern = () => {
    qc.invalidateQueries({ queryKey: ["onboarding-schritte-admin"] });
    qc.invalidateQueries({ queryKey: ["onboarding-schritte"] });
    qc.invalidateQueries({ queryKey: ["onboarding-hilfe-admin"] });
    qc.invalidateQueries({ queryKey: ["onboarding-hilfe"] });
  };

  const speichern = useMutation({
    mutationFn: async () => {
      for (const [key, werte] of Object.entries(entwurf)) {
        const { error } = await db.from("onboarding_steps").update(werte).eq("key", key);
        if (error) throw new Error(error.message);
      }
      for (const [key, werte] of Object.entries(hilfeEntwurf)) {
        const { error } = await db.from("onboarding_help").update(werte).eq("key", key);
        if (error) throw new Error(error.message);
      }
    },
    onSuccess: () => {
      setEntwurf({});
      setHilfeEntwurf({});
      erneuern();
      toast({ title: "Gespeichert" });
    },
    onError: (err: Error) =>
      toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  const geaendert =
    Object.keys(entwurf).length > 0 || Object.keys(hilfeEntwurf).length > 0;

  const wert = (s: Schritt, feld: "title" | "text" | "tip") =>
    (entwurf[s.key]?.[feld] as string | null | undefined) ?? s[feld] ?? "";

  const setze = (key: string, feld: string, v: unknown) =>
    setEntwurf((e) => ({ ...e, [key]: { ...e[key], [feld]: v } }));

  const zuruecksetzen = (s: Schritt) => {
    if (!s.defaults) return;
    setEntwurf((e) => ({
      ...e,
      [s.key]: {
        ...e[s.key],
        title: s.defaults!.title ?? s.title,
        text: s.defaults!.text ?? s.text,
        tip: s.defaults!.tip ?? null,
      },
    }));
  };

  if (isLoading) {
    return (
      <div className="py-12 flex justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={20} />
      </div>
    );
  }

  const touren = [...new Set(schritte.map((s) => s.tour))].map((t) => ({
    tour: t,
    schritte: schritte.filter((s) => s.tour === t),
  }));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground max-w-prose">
          Was neue Mitglieder als Erstes sehen. Schritte mit dem Vermerk „Aufgabe"
          haken sich selbst ab, sobald die Sache erledigt ist; die übrigen sind
          reine Erklärungen. Wohin ein Schritt zeigt und wer ihn sieht, hängt am
          Programm und lässt sich hier nicht ändern.
        </p>
        <Button size="sm" disabled={!geaendert || speichern.isPending} onClick={() => speichern.mutate()}>
          {speichern.isPending
            ? <Loader2 size={15} className="mr-1 animate-spin" />
            : <Save size={15} className="mr-1" />}
          Speichern
        </Button>
      </div>

      {touren.map(({ tour, schritte: liste }) => (
        <section key={tour} className="mb-8">
          <h3 className="font-serif text-base font-semibold mb-3">
            {TOUR_TITEL[tour] ?? tour}
          </h3>
          <div className="space-y-4">
            {liste.map((s) => {
              const Icon = zeichen(s.icon);
              const aktiv = (entwurf[s.key]?.is_active as boolean | undefined) ?? s.is_active;
              return (
                <div key={s.key} className="p-4 rounded-lg border bg-card space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon size={16} className="text-primary shrink-0" />
                      <span className="text-xs text-muted-foreground font-mono truncate">{s.key}</span>
                      {s.task && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                          Aufgabe
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {s.defaults && (
                        <button
                          type="button"
                          onClick={() => zuruecksetzen(s)}
                          className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
                        >
                          <RotateCcw size={12} /> Auslieferungszustand
                        </button>
                      )}
                      <Switch
                        checked={aktiv}
                        onCheckedChange={(v) => setze(s.key, "is_active", v)}
                        aria-label={`${s.title} zeigen`}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs">Überschrift</Label>
                    <Input
                      className="h-9"
                      value={wert(s, "title")}
                      onChange={(e) => setze(s.key, "title", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Text</Label>
                    <Textarea
                      rows={3}
                      value={wert(s, "text")}
                      onChange={(e) => setze(s.key, "text", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">
                      Tipp <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Input
                      className="h-9"
                      value={wert(s, "tip")}
                      onChange={(e) => setze(s.key, "tip", e.target.value || null)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      <section>
        <h3 className="font-serif text-base font-semibold mb-1">Hilfe am Feld</h3>
        <p className="text-sm text-muted-foreground max-w-prose mb-3">
          Erscheint hinter dem Fragezeichen neben schwierigen Feldern. Wer den Text
          leert, blendet das Fragezeichen aus.
        </p>
        <div className="space-y-4">
          {hilfen.map((h) => (
            <div key={h.key} className="p-4 rounded-lg border bg-card space-y-3">
              <span className="text-xs text-muted-foreground font-mono">{h.key}</span>
              <div>
                <Label className="text-xs">Überschrift</Label>
                <Input
                  className="h-9"
                  value={(hilfeEntwurf[h.key]?.title as string | undefined) ?? h.title ?? ""}
                  onChange={(e) =>
                    setHilfeEntwurf((x) => ({ ...x, [h.key]: { ...x[h.key], title: e.target.value } }))
                  }
                />
              </div>
              <div>
                <Label className="text-xs">Text</Label>
                <Textarea
                  rows={2}
                  value={(hilfeEntwurf[h.key]?.text as string | undefined) ?? h.text}
                  onChange={(e) =>
                    setHilfeEntwurf((x) => ({ ...x, [h.key]: { ...x[h.key], text: e.target.value } }))
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
