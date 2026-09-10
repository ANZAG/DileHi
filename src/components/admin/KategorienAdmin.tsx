import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { leereAuswahlMerker } from "@/components/sitebuilder/auswahl";

interface Kategorie {
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
}

const db = supabase as unknown as { from: (t: string) => any };

/**
 * Kategorien für Galerien, Quellen und Besucher-Highlights.
 *
 * Hiess bei uns „Epoche". Das ist aber unser Wort: Die meisten Vereine stellen
 * genau eine Zeit dar und sortieren nach Themen – Kleidung, Handwerk, Lager.
 *
 * Bisher entstanden diese Schlüssel nebenbei beim Hochladen eines Bildes und
 * liessen sich weder umbenennen noch löschen. Jetzt gibt es eine Stelle dafür.
 */
export default function KategorienAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [neuOffen, setNeuOffen] = useState(false);
  const [neuLabel, setNeuLabel] = useState("");
  const [bearbeitet, setBearbeitet] = useState<string | null>(null);
  const [entwurf, setEntwurf] = useState("");

  const { data: kategorien = [], isLoading } = useQuery({
    queryKey: ["site-categories"],
    queryFn: async () => {
      const { data, error } = await db.from("site_categories").select("*").order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as Kategorie[];
    },
  });

  // Wie oft wird eine Kategorie tatsächlich benutzt? Ohne diese Zahl löscht
  // jemand die Kategorie, an der drei Galerien hängen.
  const { data: verwendung = {} } = useQuery({
    queryKey: ["kategorie-verwendung"],
    queryFn: async () => {
      const [galerien, quellen, highlights] = await Promise.all([
        supabase.from("gallery_images").select("epoch"),
        supabase.from("epoch_sources").select("epoch"),
        supabase.from("epoch_visitor_items").select("epoch"),
      ]);
      const zaehler: Record<string, number> = {};
      for (const zeile of [...(galerien.data ?? []), ...(quellen.data ?? []), ...(highlights.data ?? [])]) {
        const k = (zeile as { epoch?: string }).epoch;
        if (k) zaehler[k] = (zaehler[k] ?? 0) + 1;
      }
      return zaehler;
    },
  });

  const frisch = () => {
    queryClient.invalidateQueries({ queryKey: ["site-categories"] });
    leereAuswahlMerker("kategorien");
  };

  const anlegen = useMutation({
    mutationFn: async () => {
      const key = neuLabel.trim().toLowerCase()
        .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
      if (!key) throw new Error("Bitte einen Namen eingeben.");
      const { error } = await db.from("site_categories").insert({
        key,
        label: neuLabel.trim(),
        sort_order: (kategorien[kategorien.length - 1]?.sort_order ?? 0) + 10,
      });
      if (error) {
        throw new Error(
          error.message.includes("duplicate")
            ? "Diese Kategorie gibt es schon."
            : error.message
        );
      }
    },
    onSuccess: () => { setNeuOffen(false); setNeuLabel(""); frisch(); },
    onError: (err: Error) =>
      toast({ title: "Nicht angelegt", description: err.message, variant: "destructive" }),
  });

  const umbenennen = useMutation({
    mutationFn: async ({ key, label }: { key: string; label: string }) => {
      const { error } = await db.from("site_categories").update({ label }).eq("key", key);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => { setBearbeitet(null); frisch(); },
  });

  const entfernen = useMutation({
    mutationFn: async (key: string) => {
      const { error } = await db.from("site_categories").delete().eq("key", key);
      if (error) throw new Error(error.message);
    },
    onSuccess: frisch,
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-serif text-lg font-semibold">Kategorien</h2>
          <p className="text-sm text-muted-foreground max-w-prose">
            Ordnen Galerien, Quellen und Besucher-Highlights.
            {/* Statt „bei uns sind das die Epochen" die tatsaechlichen Namen:
                Das stimmt in jeder Installation und sagt mehr. */}
            {kategorien.length > 0 && (
              <> Bei euch: {kategorien.map((k) => k.label).join(", ")}.</>
            )}
          </p>
        </div>
        {!neuOffen && (
          <Button size="sm" onClick={() => setNeuOffen(true)}>
            <Plus size={15} className="mr-1" /> Kategorie anlegen
          </Button>
        )}
      </div>

      {neuOffen && (
        <div className="rounded-lg border bg-card p-4 mb-4 space-y-3">
          <div>
            <Label htmlFor="kat-name" className="text-sm">Name</Label>
            <Input
              id="kat-name" value={neuLabel} autoFocus
              onChange={(e) => setNeuLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && neuLabel.trim()) anlegen.mutate(); }}
              placeholder="z. B. Lagerleben"
            />
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
        <p className="py-8 text-center text-sm text-muted-foreground">Lade Kategorien …</p>
      ) : kategorien.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Noch keine Kategorie. Solange keine da ist, werden die Schlüssel aus den vorhandenen
          Bildern angeboten.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card overflow-hidden">
          {kategorien.map((k) => {
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
                      onClick={() => { setBearbeitet(k.key); setEntwurf(k.label); }}
                    >
                      <span className="font-medium text-sm">{k.label}</span>
                      <span className="block text-xs text-muted-foreground">
                        {k.key}
                        {anzahl > 0 && ` · ${anzahl}× verwendet`}
                      </span>
                    </button>
                  )}
                </span>

                {/* Der Platz bleibt stehen, damit die Zeilen fluchten. */}
                <span className="w-10 shrink-0 flex justify-center">
                  {bearbeitet !== k.key && (
                    <Button
                      variant="ghost" size="icon"
                      aria-label={`Kategorie „${k.label}" löschen`}
                      title={anzahl > 0 ? `Wird noch ${anzahl}× verwendet` : "Löschen"}
                      onClick={() => {
                        const warnung = anzahl > 0
                          ? `„${k.label}" wird noch ${anzahl}× verwendet. Die Bilder und Quellen bleiben erhalten, verlieren aber ihre Zuordnung. Trotzdem löschen?`
                          : `Kategorie „${k.label}" löschen?`;
                        if (confirm(warnung)) entfernen.mutate(k.key);
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
