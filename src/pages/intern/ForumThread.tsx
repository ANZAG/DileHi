import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Pin, Archive, Pencil, CalendarDays, BarChart3, Quote, Trash2, RotateCcw } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import ForumEditor from "@/components/forum/ForumEditor";
import PostBody from "@/components/forum/PostBody";
import {
  createPost, createPollPost, fetchPosts, fetchThread, markRead,
  removePost, restorePost, updatePost,
} from "@/components/forum/api";
import ForumPoll, { type PollPayload } from "@/components/forum/ForumPoll";
import PollComposer, { type PollDraft } from "@/components/forum/PollComposer";
import { buildQuote } from "@/components/forum/quote";
import ThreadModeration from "@/components/forum/ThreadModeration";

interface Member { id: string; display_name: string }

export default function ForumThread() {
  const { threadId } = useParams<{ threadId: string }>();
  const { user, hasPermission } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reply, setReply] = useState("");
  const [composingPoll, setComposingPoll] = useState(false);
  // Der Zähler sorgt dafür, dass zweimal „Zitieren" auch zweimal einfügt.
  const [quote, setQuote] = useState<{ html: string; nonce: number }>();
  // Welcher Beitrag gerade bearbeitet wird, und womit.
  const [editing, setEditing] = useState<{ id: string; original: string } | null>(null);
  const [editBody, setEditBody] = useState("");
  const editorAnchor = useRef<HTMLDivElement>(null);

  const canModerate = hasPermission("forum.moderate");

  const { data: thread } = useQuery({
    queryKey: ["forum-thread", threadId],
    queryFn: () => fetchThread(threadId!),
    enabled: !!threadId,
  });

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["forum-posts", threadId],
    queryFn: () => fetchPosts(threadId!),
    enabled: !!threadId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["forum-members"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_member_directory");
      return (data ?? []) as Member[];
    },
  });
  const nameOf = (id: string) => members.find((m) => m.id === id)?.display_name ?? "Mitglied";

  // Lesestand setzen, sobald der Thread offen ist – sonst bleibt die Zählung
  // ungelesener Themen auf der Übersicht stehen.
  useEffect(() => {
    if (threadId && user) {
      markRead(threadId, user.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ["forum-category-stats"] });
      });
    }
  }, [threadId, user, queryClient, posts.length]);

  const post = useMutation({
    mutationFn: () => createPost({ threadId: threadId!, body: reply, userId: user!.id }),
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["forum-posts", threadId] });
      queryClient.invalidateQueries({ queryKey: ["forum-thread", threadId] });
    },
    onError: (err: Error) =>
      toast({ title: "Beitrag konnte nicht gespeichert werden", description: err.message, variant: "destructive" }),
  });

  const poll = useMutation({
    mutationFn: (draft: PollDraft) =>
      createPollPost({
        threadId: threadId!,
        userId: user!.id,
        kind: draft.kind,
        payload: {
          frage: draft.frage,
          optionen: draft.optionen,
          mehrfach: draft.mehrfach,
          frist: draft.frist,
          anonym: draft.anonym,
        },
      }),
    onSuccess: () => {
      setComposingPoll(false);
      queryClient.invalidateQueries({ queryKey: ["forum-posts", threadId] });
    },
    onError: (err: Error) =>
      toast({ title: "Konnte nicht angelegt werden", description: err.message, variant: "destructive" }),
  });

  const bearbeiten = useMutation({
    mutationFn: () =>
      updatePost({
        postId: editing!.id,
        body: editBody,
        userId: user!.id,
        originalBody: editing!.original,
      }),
    onSuccess: () => {
      setEditing(null);
      setEditBody("");
      queryClient.invalidateQueries({ queryKey: ["forum-posts", threadId] });
    },
    onError: (err: Error) =>
      toast({ title: "Änderung nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  const entfernen = useMutation({
    mutationFn: ({ id, zurueck }: { id: string; zurueck: boolean }) =>
      zurueck ? restorePost(id) : removePost(id, user!.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-posts", threadId] }),
    onError: (err: Error) =>
      toast({ title: "Ging nicht", description: err.message, variant: "destructive" }),
  });

  const replyIsEmpty = reply.replace(/<[^>]*>/g, "").trim() === "";
  const closed = !!thread?.is_locked || !!thread?.is_archived;

  const quotePost = (author: string, body: string) => {
    setQuote({ html: buildQuote(author, body), nonce: Date.now() });
    editorAnchor.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (!thread && !isLoading) {
    return (
      <div className="container py-16 text-center max-w-lg px-4">
        <p className="text-muted-foreground">Dieses Thema gibt es nicht, oder es ist für dich nicht sichtbar.</p>
        <Button variant="outline" className="mt-4" asChild><Link to="/intern/forum">Zum Forum</Link></Button>
      </div>
    );
  }

  return (
    <div className="container py-8 sm:py-12 max-w-3xl px-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start gap-3 mb-6">
          <Button variant="ghost" size="icon" asChild aria-label="Zurück" className="shrink-0">
            <Link to="/intern/forum"><ArrowLeft size={20} /></Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-xl sm:text-2xl font-bold break-words">{thread?.title}</h1>
            <p className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-1">
              {thread?.is_pinned && <span className="inline-flex items-center gap-1"><Pin size={12} /> angeheftet</span>}
              {thread?.is_locked && <span className="inline-flex items-center gap-1"><Lock size={12} /> geschlossen</span>}
              {thread?.is_archived && <span className="inline-flex items-center gap-1"><Archive size={12} /> archiviert</span>}
              {/* Der Link zeigte vorher nur allgemein auf die Übersicht – man
                  musste den Termin dort selbst suchen. Jetzt klappt er ihn auf.
                  Ist der Termin gelöscht, bleibt nur der Hinweis: Ein Link ins
                  Nichts ist schlimmer als keiner. */}
              {thread?.event_id ? (
                <Link
                  to={`/intern/veranstaltungen?termin=${thread.event_id}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <CalendarDays size={12} /> zur Veranstaltung
                </Link>
              ) : thread?.event_ends_on ? (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays size={12} /> Der zugehörige Termin wurde gelöscht.
                </span>
              ) : null}
            </p>
          </div>
        </div>

        {canModerate && thread && <ThreadModeration thread={thread} />}

        <div className="space-y-3">
          {posts.map((p, i) => (
            <article
              key={p.id}
              className={`rounded-lg border bg-card p-4 ${i === 0 ? "border-primary/30" : ""}`}
            >
              <header className="flex items-baseline justify-between gap-2 mb-2">
                <span className="font-medium text-sm">{nameOf(p.created_by)}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  {format(parseISO(p.created_at), "d. MMM yyyy, HH:mm", { locale: de })}
                  {p.edited_at && (
                    <span className="inline-flex items-center gap-0.5 ml-1.5" title="Nachträglich bearbeitet">
                      <Pencil size={10} /> bearbeitet
                    </span>
                  )}
                </span>
              </header>

              {p.deleted_at ? (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground italic">
                    Dieser Beitrag wurde entfernt.
                  </p>
                  {canModerate && (
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={() => entfernen.mutate({ id: p.id, zurueck: true })}
                    >
                      <RotateCcw size={13} className="mr-1" /> Zurückholen
                    </Button>
                  )}
                </div>
              ) : p.kind === "umfrage" || p.kind === "mitbringliste" ? (
                <ForumPoll
                  postId={p.id}
                  kind={p.kind}
                  payload={(p.payload ?? {}) as PollPayload}
                />
              ) : editing?.id === p.id ? (
                <div className="space-y-2">
                  <ForumEditor
                    value={editBody}
                    onChange={setEditBody}
                    members={members}
                    placeholder="Beitrag bearbeiten …"
                    compact
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Abbrechen</Button>
                    <Button
                      size="sm"
                      disabled={bearbeiten.isPending || editBody.replace(/<[^>]*>/g, "").trim() === ""}
                      onClick={() => bearbeiten.mutate()}
                    >
                      Speichern
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <PostBody html={p.body} />
                  <div className="mt-2 -mb-1 flex justify-end gap-1">
                    {(p.created_by === user?.id || canModerate) && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => {
                          setEditing({ id: p.id, original: p.body });
                          setEditBody(p.body);
                        }}
                      >
                        <Pencil size={13} className="mr-1" /> Bearbeiten
                      </Button>
                    )}
                    {canModerate && (
                      <Button
                        variant="ghost" size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => {
                          if (confirm("Beitrag entfernen? Er bleibt als „entfernt“ sichtbar.")) {
                            entfernen.mutate({ id: p.id, zurueck: false });
                          }
                        }}
                      >
                        <Trash2 size={13} className="mr-1" /> Entfernen
                      </Button>
                    )}
                    {!closed && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs text-muted-foreground"
                        onClick={() => quotePost(nameOf(p.created_by), p.body)}
                      >
                        <Quote size={13} className="mr-1" /> Zitieren
                      </Button>
                    )}
                  </div>
                </>
              )}
            </article>
          ))}

          {isLoading && <p className="py-8 text-center text-sm text-muted-foreground">Lade Beiträge …</p>}
        </div>

        <div className="mt-6" ref={editorAnchor}>
          {closed ? (
            <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg border-dashed">
              {thread?.is_archived
                ? "Dieses Thema ist archiviert und wird nicht mehr fortgeführt."
                : "Dieses Thema ist geschlossen."}
              {canModerate && " Als Moderation kannst du es oben wieder öffnen."}
            </p>
          ) : (
            <>
              {composingPoll ? (
                <PollComposer
                  pending={poll.isPending}
                  onCancel={() => setComposingPoll(false)}
                  onSubmit={(draft) => poll.mutate(draft)}
                />
              ) : (
                <>
                  <ForumEditor
                    value={reply}
                    onChange={setReply}
                    placeholder="Antworten … (@ erwähnt jemanden)"
                    compact
                    members={members}
                    insert={quote}
                  />
                  <div className="flex flex-wrap justify-between gap-2 mt-2">
                    <Button variant="outline" onClick={() => setComposingPoll(true)}>
                      <BarChart3 size={15} className="mr-1" /> Umfrage oder Liste
                    </Button>
                    <Button onClick={() => post.mutate()} disabled={replyIsEmpty || post.isPending}>
                      {post.isPending ? "Wird gesendet …" : "Antworten"}
                    </Button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
