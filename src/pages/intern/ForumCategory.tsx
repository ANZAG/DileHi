import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Pin, Lock, Plus, MessageSquare, Archive } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import ForumEditor from "@/components/forum/ForumEditor";
import { createThread, fetchCategories, fetchThreads } from "@/components/forum/api";
import { supabase } from "@/integrations/supabase/client";

export default function ForumCategory() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: categories = [] } = useQuery({ queryKey: ["forum-categories"], queryFn: fetchCategories });
  const category = categories.find((c) => c.slug === slug);

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["forum-threads", category?.id],
    queryFn: () => fetchThreads(category!.id),
    enabled: !!category?.id,
  });

  // Wer im Forum liest, kennt die Namen – hier reicht eine schlanke Liste.
  const { data: names = {} } = useQuery({
    queryKey: ["forum-names"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_member_directory");
      const map: Record<string, string> = {};
      ((data ?? []) as { id: string; display_name: string }[]).forEach((m) => { map[m.id] = m.display_name; });
      return map;
    },
  });

  const create = useMutation({
    mutationFn: () =>
      createThread({ categoryId: category!.id, title, body, userId: user!.id }),
    onSuccess: (thread) => {
      queryClient.invalidateQueries({ queryKey: ["forum-threads", category?.id] });
      queryClient.invalidateQueries({ queryKey: ["forum-category-stats"] });
      setComposing(false); setTitle(""); setBody("");
      navigate(`/intern/forum/thema/${thread.id}`);
    },
    onError: (err: Error) =>
      toast({ title: "Thema konnte nicht angelegt werden", description: err.message, variant: "destructive" }),
  });

  const bodyIsEmpty = body.replace(/<[^>]*>/g, "").trim() === "";

  if (!category) {
    return (
      <div className="container py-16 text-center max-w-lg px-4">
        <p className="text-muted-foreground">Diese Rubrik gibt es nicht – oder sie ist für dich nicht sichtbar.</p>
        <Button variant="outline" className="mt-4" asChild><Link to="/intern/forum">Zum Forum</Link></Button>
      </div>
    );
  }

  return (
    <div className="container py-8 sm:py-12 max-w-4xl px-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" asChild aria-label="Zurück">
            <Link to="/intern/forum"><ArrowLeft size={20} /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-serif text-xl sm:text-2xl font-bold truncate">{category.name}</h1>
            {category.description && (
              <p className="text-sm text-muted-foreground">{category.description}</p>
            )}
          </div>
          {!composing && (
            <Button size="sm" onClick={() => setComposing(true)}>
              <Plus size={15} className="mr-1" /> Neues Thema
            </Button>
          )}
        </div>

        {composing && (
          <div className="rounded-lg border bg-card p-4 mb-6 space-y-3">
            <div>
              <Label htmlFor="thread-title" className="text-sm">Worum geht es?</Label>
              <Input
                id="thread-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Kurzer, sprechender Titel"
                autoFocus
              />
            </div>
            <ForumEditor value={body} onChange={setBody} placeholder="Beschreibe dein Anliegen …" />
            <div className="flex flex-wrap gap-2 justify-end">
              <Button variant="ghost" onClick={() => { setComposing(false); setTitle(""); setBody(""); }}>
                Abbrechen
              </Button>
              <Button
                onClick={() => create.mutate()}
                disabled={!title.trim() || bodyIsEmpty || create.isPending}
              >
                {create.isPending ? "Wird angelegt …" : "Thema eröffnen"}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <p className="py-16 text-center text-sm text-muted-foreground">Lade Themen …</p>
        ) : threads.length === 0 ? (
          <div className="py-16 text-center border rounded-lg bg-card">
            <MessageSquare className="mx-auto mb-3 text-muted-foreground" size={30} />
            <p className="text-sm text-muted-foreground">
              Noch kein Thema. Fang gern an – so bleibt es nicht leer.
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-lg border bg-card overflow-hidden">
            {threads.map((t) => (
              <li key={t.id}>
                <Link
                  to={`/intern/forum/thema/${t.id}`}
                  className="flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors group"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 flex-wrap">
                      {t.is_pinned && <Pin size={13} className="text-primary shrink-0" aria-label="Angeheftet" />}
                      {t.is_locked && <Lock size={13} className="text-muted-foreground shrink-0" aria-label="Geschlossen" />}
                      {t.is_archived && <Archive size={13} className="text-muted-foreground shrink-0" aria-label="Archiviert" />}
                      <span className="font-medium group-hover:text-primary transition-colors">{t.title}</span>
                    </span>
                    <span className="block text-xs text-muted-foreground mt-0.5">
                      {names[t.created_by] ?? "Mitglied"} · letzter Beitrag{" "}
                      {formatDistanceToNow(parseISO(t.last_post_at), { locale: de, addSuffix: true })}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                    {t.post_count} {t.post_count === 1 ? "Beitrag" : "Beiträge"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  );
}
