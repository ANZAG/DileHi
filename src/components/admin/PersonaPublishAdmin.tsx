import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PERIOD_OPTIONS } from "@/components/personas/constants";

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
    queryKey: ["personas-publish"],
    queryFn: async () => {
      const [{ data: rows, error }, { data: profiles }] = await Promise.all([
        supabase.from("member_personas").select("*").order("period"),
        supabase.from("profiles").select("id, display_name, first_name, last_name"),
      ]);
      if (error) throw error;
      const nameById = new Map(
        (profiles ?? []).map((p) => [
          p.id,
          [p.first_name, p.last_name].filter(Boolean).join(" ") || p.display_name || "Unbekannt",
        ])
      );
      return ((rows ?? []) as PersonaRow[]).map((r) => ({
        ...r,
        owner: nameById.get(r.user_id) ?? "Unbekannt",
      }));
    },
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

      const { error } = await (supabase.rpc as unknown as (
        fn: string, args: Record<string, unknown>
      ) => Promise<{ error: { message: string } | null }>)("set_persona_public", {
        _persona_id: persona.id,
        _is_public: next,
        _public_images: publicPaths,
      });
      if (error) throw new Error(error.message);
    },
    onMutate: ({ persona }) => setBusy(persona.id),
    onSettled: () => {
      setBusy(null);
      queryClient.invalidateQueries({ queryKey: ["personas-publish"] });
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
          placeholder="Nach Person, Epoche oder Kenntnis suchen…"
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
                {PERIOD_OPTIONS.includes(p.period as (typeof PERIOD_OPTIONS)[number])
                  ? p.period
                  : p.period || "Epoche offen"}
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
