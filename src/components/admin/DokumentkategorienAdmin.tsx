import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Check, X, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useWoerter } from "@/hooks/useBranding";
import { useDokumentkategorien, type Dokumentkategorie } from "@/hooks/useDokumentkategorien";

const db = supabase as unknown as { from: (t: string) => any };

/**
 * Die Ablagen der Dokumente.
 *
 * Bis zum Probelauf standen sie im Quelltext: sechs Stück, „Vereinsshirts"
 * dabei. Wer eine siebte brauchte, konnte nichts tun, und wer die
 * Vereinsshirts nicht hatte, wurde sie nicht los.
 *
 * Wer eine Ablage sehen darf, gehört hierher und nicht in eine Einstellung
 * anderswo: Es ist dieselbe Entscheidung wie die, sie überhaupt anzulegen.
 * Drei Stufen, mehr braucht es erfahrungsgemäss nicht — und jede weitere
 * müsste man in der Richtlinie nachziehen.
 */

/**
 * Warum eine Ablage nicht weggeht.
 *
 * Zwei Gründe, beide gewollt: Es liegen noch Dokumente darin, oder der
 * Verweis auf die Satzung im Aufnahmeantrag zeigt auf sie. Ohne diese
 * Übersetzung stünde dort „update or delete on table violates foreign key
 * constraint" – eine Meldung, die dem Vorstand nichts sagt.
 */
export function bremse(meldung: string, satzung: string): string {
  if (meldung.includes("app_settings_statutes_category_fkey")) {
    return `Auf diese Ablage zeigt der Verweis auf ${satzung} im Aufnahmeantrag. `
      + `Stellt ihn erst auf eine andere Ablage um (Verwaltung → Aufnahmeantrag → ${satzung}).`;
  }
  if (meldung.includes("documents_category_fkey")) {
    return "In dieser Ablage liegen noch Dokumente. Räumt sie erst um oder löscht sie.";
  }
  if (meldung.includes("foreign key") || meldung.includes("violates")) {
    return "Diese Ablage wird noch gebraucht.";
  }
  return meldung;
}

const STUFEN = [
  {
    value: "alle",
    recht: null as string | null,
    label: "Alle Mitglieder",
    hinweis: "Jedes Mitglied sieht und öffnet, was hier liegt.",
  },
  {
    value: "leitung",
    recht: "profiles.view_all" as string | null,
    label: "Nur die Leitung",
    hinweis: "Wer die Mitgliederdaten sehen darf, sieht auch diese Ablage.",
  },
  {
    value: "verwaltung",
    recht: "documents.manage" as string | null,
    label: "Nur die Dokumentenverwaltung",
    hinweis: "Nur, wer Dokumente hochlädt und löscht.",
  },
];

function stufeVon(recht: string | null): string {
  return STUFEN.find((s) => s.recht === recht)?.value ?? "verwaltung";
}

export default function DokumentkategorienAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const woerter = useWoerter();
  const [neuOffen, setNeuOffen] = useState(false);
  const [neuLabel, setNeuLabel] = useState("");
  const [neuStufe, setNeuStufe] = useState("alle");
  const [bearbeitet, setBearbeitet] = useState<string | null>(null);
  const [entwurf, setEntwurf] = useState("");

  const { data: kategorien = [], isLoading } = useDokumentkategorien();

  // Wie viele Dokumente liegen darin? Ohne diese Zahl löscht jemand die
  // Ablage, an der zwanzig Protokolle hängen – und wundert sich über die
  // Fehlermeldung, die der Fremdschlüssel schickt.
  const { data: verwendung = {} } = useQuery({
    queryKey: ["dokumente-je-kategorie"],
    queryFn: async () => {
      const { data, error } = await supabase.from("documents").select("category");
      if (error) throw new Error(error.message);
      const zaehler: Record<string, number> = {};
      for (const zeile of data ?? []) {
        const k = (zeile as { category?: string }).category;
        if (k) zaehler[k] = (zaehler[k] ?? 0) + 1;
      }
      return zaehler;
    },
  });

  const frisch = () => {
    queryClient.invalidateQueries({ queryKey: ["document-categories"] });
    queryClient.invalidateQueries({ queryKey: ["dokumente-je-kategorie"] });
    queryClient.invalidateQueries({ queryKey: ["documents"] });
  };

  const anlegen = useMutation({
    mutationFn: async () => {
      const key = neuLabel.trim().toLowerCase()
        .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
      if (!key) throw new Error("Bitte einen Namen eingeben.");
      const letzte = kategorien[kategorien.length - 1]?.sort_order ?? 0;
      const { error } = await db.from("document_categories").insert({
        key,
        label: neuLabel.trim(),
        sort_order: letzte + 10,
        required_permission: STUFEN.find((s) => s.value === neuStufe)?.recht ?? null,
      });
      if (error) {
        throw new Error(
          error.message.includes("duplicate")
            ? "Diese Ablage gibt es schon."
            : error.message
        );
      }
    },
    onSuccess: () => { setNeuOffen(false); setNeuLabel(""); setNeuStufe("alle"); frisch(); },
    onError: (err: Error) =>
      toast({ title: "Nicht angelegt", description: err.message, variant: "destructive" }),
  });

  const umbenennen = useMutation({
    mutationFn: async ({ key, label }: { key: string; label: string }) => {
      const { error } = await db.from("document_categories").update({ label }).eq("key", key);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { setBearbeitet(null); frisch(); },
    onError: (err: Error) =>
      toast({ title: "Nicht geändert", description: err.message, variant: "destructive" }),
  });

  const stufeSetzen = useMutation({
    mutationFn: async ({ key, stufe }: { key: string; stufe: string }) => {
      const { error } = await db
        .from("document_categories")
        .update({ required_permission: STUFEN.find((s) => s.value === stufe)?.recht ?? null })
        .eq("key", key);
      if (error) throw new Error(error.message);
    },
    onSuccess: frisch,
    onError: (err: Error) =>
      toast({ title: "Nicht geändert", description: err.message, variant: "destructive" }),
  });

  const entfernen = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await db.from("document_categories").delete().eq("key", key);
      if (error) throw new Error(error.message);
    },
    onSuccess: frisch,
    onError: (err: Error) =>
      toast({
        title: "Nicht gelöscht",
        // Zwei Fremdschlüssel halten eine Ablage fest, und die Meldung der
        // Datenbank versteht niemand, der keine Datenbanken baut. Welcher es
        // war, steht im Namen der Regel.
        description: bremse(err.message, woerter.satzung),
        variant: "destructive",
      }),
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-serif text-lg font-semibold">Ablagen für {woerter.dokumente}</h2>
          <p className="text-sm text-muted-foreground max-w-prose">
            Wonach die Dokumente sortiert sind – und wer hineinsehen darf.
          </p>
        </div>
        {!neuOffen && (
          <Button size="sm" onClick={() => setNeuOffen(true)}>
            <Plus size={15} className="mr-1" /> Ablage anlegen
          </Button>
        )}
      </div>

      {neuOffen && (
        <div className="rounded-lg border bg-card p-4 mb-4 space-y-3">
          <div>
            <Label htmlFor="ablage-name" className="text-sm">Name</Label>
            <Input
              id="ablage-name" value={neuLabel} autoFocus
              onChange={(e) => setNeuLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && neuLabel.trim()) anlegen.mutate(); }}
              placeholder="z. B. Versicherungen"
            />
          </div>
          <div>
            <Label className="text-sm">Wer sieht sie?</Label>
            <Select value={neuStufe} onValueChange={setNeuStufe}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STUFEN.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              {STUFEN.find((s) => s.value === neuStufe)?.hinweis}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNeuOffen(false)}>Abbrechen</Button>
            <Button disabled={!neuLabel.trim() || anlegen.isPending} onClick={() => anlegen.mutate()}>
              Anlegen
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Lade Ablagen …</p>
      ) : kategorien.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Noch keine Ablage. Ohne mindestens eine lässt sich nichts hochladen.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card overflow-hidden">
          {kategorien.map((k: Dokumentkategorie) => {
            const anzahl = verwendung[k.key] ?? 0;
            return (
              <li key={k.key} className="flex flex-wrap items-center gap-2 p-3">
                <span className="min-w-0 flex-1 basis-full sm:basis-auto">
                  {bearbeitet === k.key ? (
                    <span className="flex gap-1">
                      <Input
                        value={entwurf}
                        autoFocus
                        onChange={(e) => setEntwurf(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && entwurf.trim()) umbenennen.mutate({ key: k.key, label: entwurf });
                          if (e.key === "Escape") setBearbeitet(null);
                        }}
                      />
                      <Button
                        variant="ghost" size="icon" aria-label="Übernehmen"
                        onClick={() => umbenennen.mutate({ key: k.key, label: entwurf })}
                      >
                        <Check size={15} />
                      </Button>
                      <Button variant="ghost" size="icon" aria-label="Abbrechen" onClick={() => setBearbeitet(null)}>
                        <X size={15} />
                      </Button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="text-left"
                      // Beim Bearbeiten steht der gespeicherte Text da, mit
                      // Platzhalter: Wer „{satzung}" sieht, versteht, warum
                      // die Ablage bei ihm anders heisst.
                      onClick={() => { setBearbeitet(k.key); setEntwurf(k.rohLabel); }}
                    >
                      <span className="font-medium text-sm">{k.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {anzahl === 0 ? "leer" : `${anzahl} Dokument${anzahl === 1 ? "" : "e"}`}
                        {k.required_permission && (
                          <>
                            {" · "}
                            <Lock size={11} className="inline -mt-0.5" />{" "}
                            {STUFEN.find((s) => s.recht === k.required_permission)?.label}
                          </>
                        )}
                      </span>
                    </button>
                  )}
                </span>

                <span className="w-56 shrink-0">
                  <Select
                    value={stufeVon(k.required_permission)}
                    onValueChange={(stufe) => stufeSetzen.mutate({ key: k.key, stufe })}
                  >
                    <SelectTrigger aria-label={`Wer sieht ${k.label}?`}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STUFEN.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </span>

                {/* Der Platz bleibt stehen, damit die Zeilen fluchten. */}
                <span className="w-10 shrink-0 flex justify-center">
                  {bearbeitet !== k.key && (
                    <Button
                      variant="ghost" size="icon"
                      aria-label={`Ablage ${k.label} löschen`}
                      title={anzahl > 0 ? `Enthält noch ${anzahl} Dokumente` : "Löschen"}
                      disabled={anzahl > 0}
                      onClick={() => {
                        if (confirm(`Ablage ${k.label} löschen?`)) entfernen.mutate(k.key);
                      }}
                    >
                      <Trash2 size={15} className="text-destructive" />
                    </Button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
