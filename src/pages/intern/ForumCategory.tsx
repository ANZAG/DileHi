import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, Pin, Lock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ForumSubscribeButton from "@/components/forum/ForumSubscribeButton";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

const ForumCategory = () => {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: category } = useQuery({
    queryKey: ["forum-category", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_categories")
        .select("*")
        .eq("slug", slug!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: threads = [] } = useQuery({
    queryKey: ["forum-threads", category?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_threads")
        .select("*")
        .eq("category_id", category!.id)
        .order("is_pinned", { ascending: false })
        .order("last_post_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!category?.id,
  });

  // Realtime: auto-refresh when threads change in this category
  useEffect(() => {
    if (!category?.id) return;
    const channel = supabase
      .channel(`forum-cat-${category.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_threads", filter: `category_id=eq.${category.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["forum-threads", category.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [category?.id, queryClient]);

  // Get display names
  const creatorIds = [...new Set(threads.map((t) => t.created_by).concat(threads.map((t) => t.last_post_by).filter(Boolean) as string[]))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["forum-profiles", creatorIds],
    queryFn: async () => {
      if (creatorIds.length === 0) return [];
      const { data } = await supabase.from("profiles").select("id, display_name").in("id", creatorIds);
      return data || [];
    },
    enabled: creatorIds.length > 0,
  });
  const nameMap = new Map(profiles.map((p) => [p.id, p.display_name]));

  // Read status
  const { data: readStatus = [] } = useQuery({
    queryKey: ["forum-read-status", user?.id, category?.id],
    queryFn: async () => {
      if (!user) return [];
      const threadIds = threads.map((t) => t.id);
      if (threadIds.length === 0) return [];
      const { data } = await supabase
        .from("forum_read_status")
        .select("thread_id, last_read_at")
        .eq("user_id", user.id)
        .in("thread_id", threadIds);
      return data || [];
    },
    enabled: !!user && threads.length > 0,
  });
  const readMap = new Map(readStatus.map((r) => [r.thread_id, r.last_read_at]));

  if (!category) return null;

  const pinnedThreads = threads.filter((t) => t.is_pinned);
  const normalThreads = threads.filter((t) => !t.is_pinned);

  const renderThread = (thread: typeof threads[0]) => {
    const lastRead = readMap.get(thread.id);
    const isUnread = !lastRead || (thread.last_post_at && new Date(thread.last_post_at) > new Date(lastRead));
    return (
      <Link
        key={thread.id}
        to={`/intern/forum/thread/${thread.id}`}
        className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {thread.is_pinned && <Pin size={14} className="text-primary shrink-0" />}
            {thread.is_locked && <Lock size={14} className="text-muted-foreground shrink-0" />}
            <span className={`font-medium truncate ${isUnread ? "text-foreground" : "text-muted-foreground"}`}>
              {thread.title}
            </span>
            {isUnread && <Badge variant="default" className="text-[10px] px-1.5 py-0">Neu</Badge>}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            von {nameMap.get(thread.created_by) || "Unbekannt"} · {thread.post_count} {thread.post_count === 1 ? "Beitrag" : "Beiträge"}
          </p>
        </div>
        <div className="text-xs text-muted-foreground text-right shrink-0">
          {thread.last_post_at && (
            <>
              <span className="block">
                {formatDistanceToNow(new Date(thread.last_post_at), { addSuffix: true, locale: de })}
              </span>
              {thread.last_post_by && (
                <span className="block">{nameMap.get(thread.last_post_by) || ""}</span>
              )}
            </>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="container py-8 sm:py-12 max-w-4xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <Link to="/intern/forum" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft size={16} /> Forum
            </Link>
            <h1 className="font-serif text-2xl font-bold">{category.name}</h1>
          </div>
          <ForumSubscribeButton categoryId={category.id} />
        </div>

        <div className="mb-4">
          <Link to={`/intern/forum/neu/${slug}`}>
            <Button size="sm">
              <Plus size={16} className="mr-1" /> Neues Thema
            </Button>
          </Link>
        </div>

        {threads.length === 0 ? (
          <p className="text-muted-foreground text-center py-12">Noch keine Themen in dieser Kategorie.</p>
        ) : (
          <div className="space-y-4">
            {/* Pinned threads */}
            {pinnedThreads.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Angepinnt</p>
                <div className="divide-y border rounded-lg bg-card">
                  {pinnedThreads.map(renderThread)}
                </div>
              </div>
            )}

            {/* Normal threads */}
            {normalThreads.length > 0 && (
              <div>
                {pinnedThreads.length > 0 && (
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-1">Themen</p>
                )}
                <div className="divide-y border rounded-lg bg-card">
                  {normalThreads.map(renderThread)}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ForumCategory;
