import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, MessageSquare, Shield, Swords, Target, Calendar, BookOpen, Users, Lightbulb, Wrench, Search } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ForumSearch from "@/components/forum/ForumSearch";

const iconMap: Record<string, React.ElementType> = {
  MessageSquare,
  Shield,
  Swords,
  Target,
  Calendar,
  BookOpen,
  Users,
  Lightbulb,
  Wrench,
};

const typeLabels: Record<string, string> = {
  diskussion: "Diskussion",
  wissen: "Wissen",
  organisation: "Organisation",
};

const Forum = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showSearch, setShowSearch] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: threadCounts = {} } = useQuery({
    queryKey: ["forum-thread-counts"],
    queryFn: async () => {
      // Select only the two columns we need instead of full rows.
      // PostgREST doesn't support GROUP BY directly; we aggregate client-side,
      // but at least we avoid fetching all columns.
      const { data, error } = await supabase
        .from("forum_threads")
        .select("category_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      data.forEach((t) => { counts[t.category_id] = (counts[t.category_id] || 0) + 1; });
      return counts;
    },
  });

  const { data: unreadCounts = {} } = useQuery({
    queryKey: ["forum-unread-counts", user?.id],
    queryFn: async () => {
      if (!user) return {};
      // Fetch threads and the user's read-status in parallel for speed.
      // We compare last_post_at > last_read_at to detect unread threads.
      const [{ data: threads }, { data: readStatus }] = await Promise.all([
        supabase.from("forum_threads").select("id, category_id, last_post_at"),
        supabase.from("forum_read_status").select("thread_id, last_read_at").eq("user_id", user.id),
      ]);
      if (!threads) return {};
      // Map for O(1) lookups instead of O(n) array.find per thread
      const readMap = new Map(readStatus?.map((r) => [r.thread_id, r.last_read_at]) || []);
      const counts: Record<string, number> = {};
      threads.forEach((t) => {
        const lastRead = readMap.get(t.id);
        if (!lastRead || new Date(t.last_post_at!) > new Date(lastRead)) {
          counts[t.category_id] = (counts[t.category_id] || 0) + 1;
        }
      });
      return counts;
    },
    enabled: !!user,
  });

  // Realtime: refresh when any thread is added/deleted
  useEffect(() => {
    const channel = supabase
      .channel("forum-overview")
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_threads" }, () => {
        queryClient.invalidateQueries({ queryKey: ["forum-thread-counts"] });
        queryClient.invalidateQueries({ queryKey: ["forum-unread-counts"] });
        queryClient.invalidateQueries({ queryKey: ["forum-categories"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  return (
    <div className="container py-8 sm:py-12 max-w-4xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-4 mb-6">
          <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Zurück
          </Link>
          <h1 className="font-serif text-2xl font-bold">Forum</h1>
          <div className="ml-auto">
            <Button variant="outline" size="sm" onClick={() => setShowSearch(!showSearch)}>
              <Search size={16} className="mr-1" /> Suche
            </Button>
          </div>
        </div>

        {showSearch && (
          <div className="mb-6">
            <ForumSearch />
          </div>
        )}

        <div className="grid gap-3">
          {categories.map((cat) => {
            const Icon = iconMap[cat.icon || "MessageSquare"] || MessageSquare;
            const count = threadCounts[cat.id] || 0;
            const unread = unreadCounts[cat.id] || 0;
            return (
              <Link
                key={cat.id}
                to={`/intern/forum/${cat.slug}`}
                className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
              >
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-serif font-semibold">{cat.name}</h2>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {typeLabels[cat.category_type] || cat.category_type}
                    </span>
                    {unread > 0 && (
                      <Badge variant="default" className="text-xs">{unread}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">{cat.description}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">
                  {count} {count === 1 ? "Thema" : "Themen"}
                </span>
              </Link>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default Forum;
