import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Pin, Lock, Plus, MessageSquare, Archive, ChevronDown } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import ForumEditor from "@/components/forum/ForumEditor";
import { createThread, fetchCategories, fetchReadState, fetchThreads, istUngelesen } from "@/components/forum/api";
import { supabase } from "@/integrations/supabase/client";
import { SEITE } from "@/lib/layout";

export default function ForumCategory() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [composing, setComposing] = useState(false);
  const [zeigeArchiv, setZeigeArchiv] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const { data: categories = [] } = useQuery({ queryKey: ["forum-categories"], queryFn: fetchCategories });
  const category = categories.find((c) => c.slug === slug);

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["forum-threads", category?.id],
    queryFn: () => fetchThreads(category!.id),
    enabled: !!category?.id,
  });

  const { data: gelesen = {} } = useQuery({
    queryKey: ["forum-read-state", user?.id],
    queryFn: () => fetchReadState(user!.id),
    enabled: !!user,
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

  // Archiviertes steht nicht zwischen den laufenden Themen, sondern darunter
  // und zugeklappt. Weggeworfen wird nichts – Vereine schlagen erstaunlich oft
  // nach, wie es im letzten Jahr lief.
  const laufend = threads.filter((t) => !t.is_archived);
  const archiviert = threads.filter((t) => t.is_archived);

  if (!category) {
    return (
      <div className="container py-16 text-center max-w-lg px-4">
        <p className="text-muted-foreground">Diese Rubrik gibt es nicht, oder sie ist für dich nicht sichtbar.</p>
        <Button variant="outline" className="mt-4" asChild><Link to="/intern/forum">Zum Forum</Link></Button>
      </div>
    );
  }

  return (
    <div className={SEITE}>
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
          {/* In der Terminrubrik entsteht jedes Thema aus einer Veranstaltung.
              Ein Knopf, der dort nur eine Fehlermeldung erzeugt, gehoert weg –
              die Regel selbst steht in der Datenbank. */}
          {!composing && !category.only_auto_threads && (
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
            <ForumEditor
              value={body}
              onChange={setBody}
              placeholder="Beschreibe dein Anliegen … (@ erwähnt jemanden)"
              members={Object.entries(names).map(([id, display_name]) => ({ id, display_name }))}
            />
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
              {category.only_auto_threads
                ? "Hier erscheint zu jeder Veranstaltung eine Absprache, sobald ein Termin angelegt wird."
                : "Noch kein Thema. Fang gern an, so bleibt es nicht leer."}
            </p>
          </div>
        ) : (
          <ul className="divide-y rounded-lg border bg-card overflow-hidden">
            {laufend.map((t) => {
              // Vorher stand nur an der Rubrik „3 neu", und man musste raten,
              // welche drei. Jetzt trägt jedes neue Thema die Markierung selbst.
              const neu = istUngelesen(t, gelesen[t.id]);
              return (
              <li key={t.id}>
                <Link
                  to={`/intern/forum/thema/${t.id}`}
                  className={`flex items-center gap-3 p-4 hover:bg-muted/40 transition-colors group ${neu ? "bg-primary/5" : ""}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5 flex-wrap">
                      {neu && <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-hidden />}
                      {t.is_pinned && <Pin size={13} className="text-primary shrink-0" aria-label="Angeheftet" />}
                      {t.is_locked && <Lock size={13} className="text-muted-foreground shrink-0" aria-label="Geschlossen" />}
                      {t.is_archived && <Archive size={13} className="text-muted-foreground shrink-0" aria-label="Archiviert" />}
                      <span className={`${neu ? "font-semibold" : "font-medium"} group-hover:text-primary transition-colors`}>{t.title}</span>
                      {neu && (
                        <span className="text-xs font-medium bg-primary text-primary-foreground rounded-full px-2 py-0.5">neu</span>
                      )}
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
              );
            })}
          </ul>
        )}

        {archiviert.length > 0 && (
          <div className="mt-6">
            <button
              type="button"
              aria-expanded={zeigeArchiv}
              onClick={() => setZeigeArchiv(!zeigeArchiv)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <Archive size={14} />
              Archiv ({archiviert.length})
              <ChevronDown size={14} className={`transition-transform ${zeigeArchiv ? "rotate-180" : ""}`} />
            </button>

            {zeigeArchiv && (
              <ul className="divide-y rounded-lg border bg-card overflow-hidden mt-2 opacity-80">
                {archiviert.map((t) => (
                  <li key={t.id}>
                    <Link
                      to={`/intern/forum/thema/${t.id}`}
                      className="flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors group"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 flex-wrap">
                          <Archive size={13} className="text-muted-foreground shrink-0" />
                          <span className="text-sm group-hover:text-primary transition-colors">{t.title}</span>
                        </span>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          letzter Beitrag{" "}
                          {formatDistanceToNow(parseISO(t.last_post_at), { locale: de, addSuffix: true })}
                        </span>
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0 tabular-nums">
                        {t.post_count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
