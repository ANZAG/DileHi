import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Search, ExternalLink, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const EPOCHS = [
  { value: "mittelalter", label: "1290–1310" },
  { value: "wk1", label: "1916/17" },
  { value: "1815", label: "1815" },
];

const Sources = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ epoch: "mittelalter", title: "", content: "", url: "" });

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["sources", filter],
    queryFn: async () => {
      let q = supabase.from("sources").select("*").order("created_at", { ascending: false });
      if (filter) q = q.eq("epoch", filter);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  const addSource = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sources").insert({
        epoch: form.epoch,
        title: form.title,
        content: form.content || null,
        url: form.url || null,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      setShowForm(false);
      setForm({ epoch: "mittelalter", title: "", content: "", url: "" });
      toast({ title: "Quelle hinzugefügt" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const deleteSource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      toast({ title: "Quelle gelöscht" });
    },
  });

  const filtered = sources.filter(
    (s) => !search || s.title.toLowerCase().includes(search.toLowerCase()) || s.content?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container py-12 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-2xl font-bold">Quellensammlung</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} /> Neue Quelle
          </button>
        </div>

        {showForm && (
          <div className="p-4 rounded-lg border bg-card mb-6 space-y-3">
            <select
              value={form.epoch}
              onChange={(e) => setForm({ ...form, epoch: e.target.value })}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {EPOCHS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
            </select>
            <input
              placeholder="Titel *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
            <textarea
              placeholder="Beschreibung / Inhalt"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
            />
            <input
              placeholder="URL (optional)"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
            <button
              onClick={() => form.title && addSource.mutate()}
              disabled={!form.title || addSource.isPending}
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Speichern
            </button>
          </div>
        )}

        <div className="flex gap-2 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background pl-9 pr-3 text-sm"
            />
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => setFilter("")}
              className={`px-3 py-2 text-xs rounded-md border ${!filter ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
            >
              Alle
            </button>
            {EPOCHS.map((e) => (
              <button
                key={e.value}
                onClick={() => setFilter(e.value)}
                className={`px-3 py-2 text-xs rounded-md border ${filter === e.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Laden...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">Keine Quellen gefunden.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => (
              <div key={s.id} className="p-4 rounded-lg border bg-card flex items-start justify-between gap-4">
                <div>
                  <span className="text-xs font-medium text-primary">{EPOCHS.find((e) => e.value === s.epoch)?.label ?? s.epoch}</span>
                  <h3 className="font-semibold mt-0.5">{s.title}</h3>
                  {s.content && <p className="text-sm text-muted-foreground mt-1">{s.content}</p>}
                  {s.url && (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
                      <ExternalLink size={12} /> Link öffnen
                    </a>
                  )}
                </div>
                {s.created_by === user?.id && (
                  <button onClick={() => deleteSource.mutate(s.id)} className="text-muted-foreground hover:text-destructive p-1">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Sources;
