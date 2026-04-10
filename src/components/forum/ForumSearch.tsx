import { useState } from "react";
import { Search, X, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";

interface SearchResult {
  post_id: string;
  thread_id: string;
  thread_title: string;
  content_snippet: string;
  author_name: string;
  category_slug: string;
  created_at: string;
}

const ForumSearch = () => {
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [authorFilter, setAuthorFilter] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["forum-categories-search"],
    queryFn: async () => {
      const { data } = await supabase.from("forum_categories").select("id, name, slug").order("sort_order");
      return data || [];
    },
  });

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["forum-search", searchTerm, categoryFilter, authorFilter],
    queryFn: async () => {
      if (!searchTerm.trim()) return [];

      // Build tsquery from search term
      const words = searchTerm.trim().split(/\s+/).filter(Boolean);
      const tsQuery = words.map(w => `${w}:*`).join(" & ");

      let postQuery = supabase
        .from("forum_posts")
        .select("id, content, created_at, created_by, thread_id")
        .textSearch("content", tsQuery, { type: "websearch", config: "german" })
        .order("created_at", { ascending: false })
        .limit(50);

      const { data: posts } = await postQuery;
      if (!posts || posts.length === 0) {
        // Also search thread titles
        const { data: threads } = await supabase
          .from("forum_threads")
          .select("id, title, created_at, created_by, category_id")
          .textSearch("title", tsQuery, { type: "websearch", config: "german" })
          .limit(20);

        if (!threads || threads.length === 0) return [];

        const catIds = [...new Set(threads.map(t => t.category_id))];
        const { data: cats } = await supabase.from("forum_categories").select("id, slug").in("id", catIds);
        const catMap = new Map(cats?.map(c => [c.id, c.slug]) || []);

        const authorIds = [...new Set(threads.map(t => t.created_by))];
        const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", authorIds);
        const nameMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);

        return threads
          .filter(t => categoryFilter === "all" || catMap.get(t.category_id) === categoryFilter)
          .filter(t => authorFilter === "all" || t.created_by === authorFilter)
          .map(t => ({
            post_id: t.id,
            thread_id: t.id,
            thread_title: t.title,
            content_snippet: t.title,
            author_name: nameMap.get(t.created_by) || "Unbekannt",
            category_slug: catMap.get(t.category_id) || "",
            created_at: t.created_at,
          }));
      }

      // Get thread info for matched posts
      const threadIds = [...new Set(posts.map(p => p.thread_id))];
      const { data: threads } = await supabase.from("forum_threads").select("id, title, category_id").in("id", threadIds);
      const threadMap = new Map(threads?.map(t => [t.id, t]) || []);

      const catIds = [...new Set(threads?.map(t => t.category_id) || [])];
      const { data: cats } = await supabase.from("forum_categories").select("id, slug").in("id", catIds);
      const catMap = new Map(cats?.map(c => [c.id, c.slug]) || []);

      const authorIds = [...new Set(posts.map(p => p.created_by))];
      const { data: profiles } = await supabase.from("profiles").select("id, display_name").in("id", authorIds);
      const nameMap = new Map(profiles?.map(p => [p.id, p.display_name]) || []);

      return posts
        .filter(p => {
          const thread = threadMap.get(p.thread_id);
          if (!thread) return false;
          if (categoryFilter !== "all" && catMap.get(thread.category_id) !== categoryFilter) return false;
          if (authorFilter !== "all" && p.created_by !== authorFilter) return false;
          return true;
        })
        .map(p => {
          const thread = threadMap.get(p.thread_id)!;
          // Extract snippet around match
          const lowerContent = p.content.toLowerCase();
          const lowerQuery = searchTerm.toLowerCase();
          const idx = lowerContent.indexOf(lowerQuery);
          let snippet: string;
          if (idx >= 0) {
            const start = Math.max(0, idx - 60);
            const end = Math.min(p.content.length, idx + searchTerm.length + 60);
            snippet = (start > 0 ? "…" : "") + p.content.slice(start, end) + (end < p.content.length ? "…" : "");
          } else {
            snippet = p.content.slice(0, 150) + (p.content.length > 150 ? "…" : "");
          }
          return {
            post_id: p.id,
            thread_id: p.thread_id,
            thread_title: thread.title,
            content_snippet: snippet,
            author_name: nameMap.get(p.created_by) || "Unbekannt",
            category_slug: catMap.get(thread.category_id) || "",
            created_at: p.created_at,
          } as SearchResult;
        });
    },
    enabled: searchTerm.length >= 2,
  });

  // Get unique authors for filter
  const { data: allProfiles = [] } = useQuery({
    queryKey: ["forum-authors"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_member_directory");
      return data || [];
    },
  });

  const handleSearch = () => {
    if (query.trim().length >= 2) setSearchTerm(query.trim());
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            placeholder="Forum durchsuchen…"
            className="pl-9"
          />
          {query && (
            <button onClick={() => { setQuery(""); setSearchTerm(""); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X size={14} />
            </button>
          )}
        </div>
        <Button onClick={handleSearch} size="sm" disabled={query.trim().length < 2}>
          Suchen
        </Button>
        <Button variant="outline" size="icon" className="shrink-0" onClick={() => setShowFilters(!showFilters)}>
          <Filter size={16} />
        </Button>
      </div>

      {showFilters && (
        <div className="flex gap-2 flex-wrap">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue placeholder="Kategorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Kategorien</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.slug}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={authorFilter} onValueChange={setAuthorFilter}>
            <SelectTrigger className="w-[180px] h-9 text-sm">
              <SelectValue placeholder="Autor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Autoren</SelectItem>
              {allProfiles.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {searchTerm && (
        <div className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-4">Suche…</p>
          ) : results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Keine Ergebnisse für „{searchTerm}"</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">{results.length} Ergebnis{results.length !== 1 ? "se" : ""}</p>
              <div className="divide-y border rounded-lg bg-card">
                {results.map((r) => (
                  <Link
                    key={r.post_id}
                    to={`/intern/forum/thread/${r.thread_id}`}
                    className="block p-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{r.thread_title}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{r.content_snippet}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {r.author_name} · {formatDistanceToNow(new Date(r.created_at), { addSuffix: true, locale: de })}
                    </p>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ForumSearch;
