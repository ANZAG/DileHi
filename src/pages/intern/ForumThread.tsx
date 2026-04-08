import { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Reply, Pencil, Trash2, Pin, Lock } from "lucide-react";
import MarkdownContent from "@/components/forum/MarkdownContent";
import MarkdownToolbar from "@/components/forum/MarkdownToolbar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const ForumThread = () => {
  const { threadId } = useParams<{ threadId: string }>();
  const { user, hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [content, setContent] = useState("");
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
  const canModerate = hasPermission("forum.moderate");

  const { data: thread } = useQuery({
    queryKey: ["forum-thread", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_threads")
        .select("*, forum_categories(slug, name)")
        .eq("id", threadId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!threadId,
  });

  const { data: posts = [] } = useQuery({
    queryKey: ["forum-posts", threadId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_posts")
        .select("*")
        .eq("thread_id", threadId!)
        .order("created_at");
      if (error) throw error;
      return data;
    },
    enabled: !!threadId,
  });

  // Profiles
  const authorIds = [...new Set(posts.map((p) => p.created_by))];
  if (thread) authorIds.push(thread.created_by);
  const { data: profiles = [] } = useQuery({
    queryKey: ["forum-profiles", authorIds],
    queryFn: async () => {
      if (authorIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("id, display_name").in("id", [...new Set(authorIds)]);
      return data || [];
    },
    enabled: authorIds.length > 0,
  });
  const nameMap = new Map(profiles.map((p) => [p.id, p.display_name]));

  // Mark as read
  useEffect(() => {
    if (!user || !threadId) return;
    supabase
      .from("forum_read_status")
      .upsert({ user_id: user.id, thread_id: threadId, last_read_at: new Date().toISOString() }, { onConflict: "user_id,thread_id" })
      .then();
  }, [user, threadId, posts.length]);

  // Realtime
  useEffect(() => {
    if (!threadId) return;
    const channel = supabase
      .channel(`forum-thread-${threadId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_posts", filter: `thread_id=eq.${threadId}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["forum-posts", threadId] });
        queryClient.invalidateQueries({ queryKey: ["forum-thread", threadId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [threadId, queryClient]);

  // Quote helper: inserts a blockquote into the textarea
  const insertQuote = (authorName: string, postContent: string) => {
    const quotedLines = postContent.split("\n").map((l) => `> ${l}`).join("\n");
    const quote = `> **${authorName}:**\n${quotedLines}\n\n`;
    setContent((prev) => quote + prev);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      const len = quote.length;
      textareaRef.current?.setSelectionRange(len + content.length, len + content.length);
    });
  };

  const sendPost = useMutation({
    mutationFn: async () => {
      if (!user || !threadId || !content.trim()) return;
      const { error } = await supabase.from("forum_posts").insert({
        thread_id: threadId,
        content: content.trim(),
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setContent("");
      queryClient.invalidateQueries({ queryKey: ["forum-posts", threadId] });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    },
    onError: () => toast({ title: "Fehler", description: "Beitrag konnte nicht gesendet werden.", variant: "destructive" }),
  });

  const updatePost = useMutation({
    mutationFn: async ({ postId, newContent }: { postId: string; newContent: string }) => {
      const { error } = await supabase.from("forum_posts").update({ content: newContent, is_edited: true }).eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingPost(null);
      setEditContent("");
      queryClient.invalidateQueries({ queryKey: ["forum-posts", threadId] });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from("forum_posts").delete().eq("id", postId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-posts", threadId] }),
  });

  const togglePin = useMutation({
    mutationFn: async () => {
      if (!thread) return;
      await supabase.from("forum_threads").update({ is_pinned: !thread.is_pinned }).eq("id", thread.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-thread", threadId] }),
  });

  const toggleLock = useMutation({
    mutationFn: async () => {
      if (!thread) return;
      await supabase.from("forum_threads").update({ is_locked: !thread.is_locked }).eq("id", thread.id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-thread", threadId] }),
  });

  const deleteThread = useMutation({
    mutationFn: async () => {
      if (!thread) return;
      await supabase.from("forum_threads").delete().eq("id", thread.id);
    },
    onSuccess: () => {
      const catSlug = (thread as any)?.forum_categories?.slug;
      navigate(catSlug ? `/intern/forum/${catSlug}` : "/intern/forum", { replace: true });
    },
  });

  if (!thread) return null;

  const catSlug = (thread as any)?.forum_categories?.slug || "";
  const catName = (thread as any)?.forum_categories?.name || "Forum";

  return (
    <div className="container py-8 sm:py-12 max-w-4xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-4">
          <Link to={`/intern/forum/${catSlug}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> {catName}
          </Link>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {thread.is_pinned && <Pin size={16} className="text-primary" />}
            {thread.is_locked && <Lock size={16} className="text-muted-foreground" />}
            <h1 className="font-serif text-xl sm:text-2xl font-bold">{thread.title}</h1>
          </div>
          {canModerate && (
            <div className="flex flex-wrap gap-1">
              <Button variant="outline" size="sm" onClick={() => togglePin.mutate()}>
                <Pin size={14} className="mr-1" /> {thread.is_pinned ? "Lösen" : "Pinnen"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => toggleLock.mutate()}>
                <Lock size={14} className="mr-1" /> {thread.is_locked ? "Entsperren" : "Sperren"}
              </Button>
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { if (confirm("Thread wirklich löschen?")) deleteThread.mutate(); }}>
                <Trash2 size={14} className="mr-1" /> Löschen
              </Button>
            </div>
          )}
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {posts.map((post, idx) => {
            const isOpening = idx === 0;
            const isOwn = post.created_by === user?.id;
            const authorName = nameMap.get(post.created_by) || "Unbekannt";

            return (
              <div
                key={post.id}
                className={`p-4 rounded-lg border ${isOpening ? "bg-primary/5 border-primary/20" : "bg-card"}`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{authorName}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(post.created_at), "d. MMM yyyy, HH:mm", { locale: de })}
                    </span>
                    {post.is_edited && <span className="text-xs text-muted-foreground italic">(bearbeitet)</span>}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {!thread.is_locked && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => insertQuote(authorName, post.content)}
                      >
                        <Reply size={13} className="mr-1" /> Zitieren
                      </Button>
                    )}
                    {isOwn && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditingPost(post.id); setEditContent(post.content); }}>
                        <Pencil size={13} className="mr-1" /> Bearbeiten
                      </Button>
                    )}
                    {(isOwn && !isOpening) || canModerate ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Beitrag löschen?")) deletePost.mutate(post.id); }}
                      >
                        <Trash2 size={13} className="mr-1" /> Löschen
                      </Button>
                    ) : null}
                    {canModerate && !isOwn && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditingPost(post.id); setEditContent(post.content); }}>
                        <Pencil size={13} className="mr-1" /> Bearbeiten
                      </Button>
                    )}
                  </div>
                </div>

                {editingPost === post.id ? (
                  <div className="space-y-2">
                    <MarkdownToolbar textareaRef={editTextareaRef} value={editContent} onChange={setEditContent} />
                    <Textarea ref={editTextareaRef} value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={4} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => updatePost.mutate({ postId: post.id, newContent: editContent })}>Speichern</Button>
                      <Button size="sm" variant="outline" onClick={() => setEditingPost(null)}>Abbrechen</Button>
                    </div>
                  </div>
                ) : (
                  <MarkdownContent content={post.content} />
                )}
              </div>
            );
          })}
        </div>

        <div ref={bottomRef} />

        {/* Reply box */}
        {!thread.is_locked ? (
          <div className="mt-6 sticky bottom-4 bg-background border rounded-lg p-4 shadow-lg">
            <MarkdownToolbar textareaRef={textareaRef} value={content} onChange={setContent} />
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                placeholder="Nachricht schreiben… (Markdown wird unterstützt)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={3}
                className="flex-1 resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    sendPost.mutate();
                  }
                }}
              />
              <Button onClick={() => sendPost.mutate()} disabled={!content.trim() || sendPost.isPending} className="self-end">
                <Send size={16} />
              </Button>
            </div>
          </div>
        ) : (
          <p className="mt-6 text-center text-sm text-muted-foreground">Dieses Thema ist gesperrt.</p>
        )}
      </motion.div>
    </div>
  );
};

export default ForumThread;
