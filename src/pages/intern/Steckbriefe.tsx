import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, ScrollText, Search, Trash2, UserRound } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSignedImages } from "@/components/personas/useSignedImages";
import type { MemberPersona } from "@/components/personas/constants";

interface PersonaWithOwner extends MemberPersona {
  owner: string;
}

const Steckbriefe = () => {
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const canModerate = hasPermission("members.manage");

  const { data: personas = [], isLoading } = useQuery({
    queryKey: ["member-personas"],
    queryFn: async () => {
      const [{ data: rows }, { data: profiles }] = await Promise.all([
        supabase.from("member_personas").select("*").order("sort_order"),
        supabase.from("profiles").select("id, display_name, first_name, last_name"),
      ]);
      const nameById = new Map(
        (profiles ?? []).map((p) => [
          p.id,
          [p.first_name, p.last_name].filter(Boolean).join(" ") || p.display_name || "Unbekannt",
        ])
      );
      return ((rows ?? []) as MemberPersona[]).map((r) => ({
        ...r,
        owner: nameById.get(r.user_id) ?? "Unbekannt",
      })) as PersonaWithOwner[];
    },
  });

  const signed = useSignedImages(personas.flatMap((p) => p.images));

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? personas.filter((p) =>
          [p.owner, p.period, p.portrayal, p.expertise].join(" ").toLowerCase().includes(q)
        )
      : personas;
    const map = new Map<string, PersonaWithOwner[]>();
    filtered.forEach((p) => {
      const list = map.get(p.user_id) ?? [];
      list.push(p);
      map.set(p.user_id, list);
    });
    return [...map.entries()].sort((a, b) => a[1][0].owner.localeCompare(b[1][0].owner, "de"));
  }, [personas, search]);

  const remove = async (persona: PersonaWithOwner) => {
    const { error } = await supabase.from("member_personas").delete().eq("id", persona.id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    if (persona.images.length > 0) {
      await supabase.storage.from("internal-files").remove(persona.images);
    }
    queryClient.invalidateQueries({ queryKey: ["member-personas"] });
    queryClient.invalidateQueries({ queryKey: ["persona-owners"] });
    toast({ title: "Steckbrief gelöscht" });
  };

  return (
    <div className="container py-8 sm:py-12 max-w-4xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link
          to="/intern"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft size={16} /> Zurück
        </Link>
        <h1 className="font-serif text-2xl font-bold mb-2 flex items-center gap-2">
          <ScrollText size={22} className="text-primary" /> Darstellungssteckbriefe
        </h1>
        <p className="text-sm text-muted-foreground mb-5">
          Wer stellt was dar? Schwerpunkte und Kenntnisse unserer Mitglieder – nur intern sichtbar.
          Deinen eigenen Steckbrief pflegst du im{" "}
          <Link to="/intern/profil" className="text-primary underline font-medium">Profil</Link>.
        </p>

        <div className="relative mb-6">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nach Name, Epoche oder Kenntnis suchen …"
            className="pl-9"
            aria-label="Steckbriefe durchsuchen"
          />
        </div>

        {isLoading ? (
          <p className="text-center text-muted-foreground py-12">Steckbriefe werden geladen…</p>
        ) : grouped.length === 0 ? (
          <div className="text-center py-14 space-y-2">
            <ScrollText size={30} className="mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">Noch keine Steckbriefe vorhanden.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(([userId, items]) => (
              <section
                key={userId}
                id={`mitglied-${userId}`}
                className="rounded-lg border bg-card overflow-hidden scroll-mt-24"
              >
                <header className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b bg-muted/40">
                  <UserRound size={16} className="text-primary shrink-0" />
                  <h2 className="font-serif text-base sm:text-lg font-semibold break-words">
                    {items[0].owner}
                  </h2>
                  {userId === user?.id && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded shrink-0">Ich</span>
                  )}
                </header>
                <div className="divide-y">
                  {items.map((persona) => (
                    <article key={persona.id} className="p-4 sm:p-5 space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-wide text-primary">{persona.period}</p>
                          <h3 className="font-medium break-words">{persona.portrayal}</h3>
                        </div>
                        {(canModerate || userId === user?.id) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            aria-label="Steckbrief löschen"
                            onClick={() => remove(persona)}
                          >
                            <Trash2 size={14} className="text-destructive" />
                          </Button>
                        )}
                      </div>
                      {persona.expertise && (
                        <p className="text-sm text-muted-foreground whitespace-pre-line break-words">
                          {persona.expertise}
                        </p>
                      )}
                      {persona.images.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {persona.images.map((path) => (
                            <a
                              key={path}
                              href={signed[path]}
                              target="_blank"
                              rel="noreferrer"
                              className="block"
                            >
                              <img
                                src={signed[path]}
                                alt={`${items[0].owner} – ${persona.portrayal}`}
                                loading="lazy"
                                className="w-full h-32 sm:h-40 rounded-md object-cover border"
                              />
                            </a>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Steckbriefe;
