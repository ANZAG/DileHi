import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { darstellungSchluessel, ladeSteckbriefeZurFreigabe, setzeSteckbriefOeffentlich } from "@/daten/darstellungen";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface PersonaRow {
  id: string;
  user_id: string;
  period: string;
  portrayal: string;
  expertise: string;
  images: string[];
  is_public?: boolean;
  public_images?: string[];
}

/**
 * Freigabe von Darstellungen für die öffentliche Website.
 *
 * Öffentlich erscheinen nur Epoche, Darstellung, Kenntnisse und Bilder – nie
 * der Name. Für ein Museum ist ohnehin interessant, WAS der Verein darstellt,
 * nicht WER. Die Namen stehen hier trotzdem, damit man beim Freigeben weiß,
 * wen man fragt.
 *
 * Freigegeben wird je Steckbrief. Pauschal wäre bequemer, würde aber Angaben
 * veröffentlichen, die jemand nur intern gemeint hat.
 */
export default function PersonaPublishAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const { data: personas = [], isLoading } = useQuery({
    queryKey: darstellungSchluessel.freigabe(),
    queryFn: ladeSteckbriefeZurFreigabe,
  });

  /**
   * Beim Freigeben werden die Bilder aus dem privaten Bucket in die öffentliche
   * Galerie kopiert – anders sind sie für Gäste nicht abrufbar. Beim Zurücknehmen
   * verschwinden die Kopien wieder.
   */
  const publish = useMutation({
    mutationFn: async ({ persona, next }: { persona: PersonaRow; next: boolean }) => {
      let publicPaths: string[] = [];

      if (next) {
        // Kopiert wird mit den Leserechten der freigebenden Person. Deshalb nur
        // aus dem Ordner der Person, der die Darstellung gehört – nie etwa
        // einen Mitgliedsantrag, den jemand als „Bild“ eingetragen hat. Die
        // Datenbank lässt solche Pfade inzwischen gar nicht mehr zu
        // (20261128100000); das hier fängt alte Zeilen ab.
        const ordner = `personas/${persona.user_id}/`;
        const fremd = (persona.images ?? []).filter(
          (p) => !p.startsWith(ordner) || p.slice(ordner.length).includes("/") || p.includes("..")
        );
        if (fremd.length > 0) {
          throw new Error("Diese Darstellung verweist auf Dateien außerhalb ihres Ordners und wird nicht freigegeben.");
        }
        for (const path of persona.images ?? []) {
          const target = `personas/${persona.id}/${path.split("/").pop()}`;
          const { error: dl } = await supabase.storage
            .from("internal-files")
            .copy(path, target, { destinationBucket: "gallery" });
          // Existiert die Kopie schon, ist das kein Fehler.
          if (dl && !/exists/i.test(dl.message)) throw dl;
          publicPaths.push(target);
        }
      } else {
        publicPaths = [];
        const old = persona.public_images ?? [];
        if (old.length > 0) await supabase.storage.from("gallery").remove(old);
      }

      await setzeSteckbriefOeffentlich(persona.id, next, publicPaths);
    },
    onMutate: ({ persona }) => setBusy(persona.id),
    onSettled: () => {
      setBusy(null);
      // Auch was öffentlich steht, hat sich damit geändert.
      queryClient.invalidateQueries({ queryKey: darstellungSchluessel.freigabe() });
      queryClient.invalidateQueries({ queryKey: darstellungSchluessel.oeffentlich() });
    },
    onSuccess: (_d, { next }) =>
      toast({ title: next ? "Darstellung ist öffentlich" : "Darstellung nicht mehr öffentlich" }),
    onError: (err: Error) =>
      toast({ title: "Freigabe fehlgeschlagen", description: err.message, variant: "destructive" }),
  });

  const q = search.trim().toLowerCase();
  const filtered = q
    ? personas.filter((p: PersonaRow & { owner: string }) =>
        [p.owner, p.period, p.portrayal, p.expertise].join(" ").toLowerCase().includes(q)
      )
    : personas;

  const publicCount = personas.filter((p: PersonaRow) => p.is_public).length;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin h-6 w-6 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-serif text-lg font-semibold">Darstellungen veröffentlichen</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Öffentlich erscheinen Kategorie, Darstellung, Kenntnisse und Bilder, <strong>ohne Namen</strong>.
          Derzeit freigegeben: {publicCount} von {personas.length}.
        </p>
      </div>

      <div>
        <Label htmlFor="persona-search" className="sr-only">Suchen</Label>
        <Input
          id="persona-search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nach Person, Zeitstellung oder Kenntnis suchen…"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {personas.length === 0
            ? "Es sind noch keine Darstellungen hinterlegt. Mitglieder pflegen sie in ihrem Profil."
            : "Kein Treffer."}
        </p>
      )}

      <div className="space-y-2">
        {filtered.map((p: PersonaRow & { owner: string }) => (
          <div key={p.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {p.portrayal || "Ohne Bezeichnung"}
                <span className="font-normal text-muted-foreground"> · {p.owner}</span>
              </p>
              <p className="text-xs text-muted-foreground">
                {p.period || "Zeitstellung offen"}
                {p.images?.length ? ` · ${p.images.length} Bild(er)` : ""}
              </p>
              {p.expertise && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.expertise}</p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`inline-flex items-center gap-1 text-xs ${
                  p.is_public ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"
                }`}
              >
                {p.is_public ? <Globe size={13} /> : <Lock size={13} />}
                {p.is_public ? "öffentlich" : "intern"}
              </span>
              {busy === p.id ? (
                <Loader2 className="animate-spin h-4 w-4 text-muted-foreground" />
              ) : (
                <Switch
                  checked={!!p.is_public}
                  onCheckedChange={(next) => publish.mutate({ persona: p, next })}
                  aria-label={`Darstellung „${p.portrayal || "ohne Bezeichnung"}" veröffentlichen`}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
