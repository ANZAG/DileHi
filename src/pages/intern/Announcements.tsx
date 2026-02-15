import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Trash2, Paperclip } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Announcements = () => {
  const { user, isVorstand } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*, announcement_files(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addAnnouncement = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert({
        title: form.title,
        content: form.content,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setShowForm(false);
      setForm({ title: "", content: "" });
      toast({ title: "Ankündigung erstellt" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "Gelöscht" });
    },
  });

  return (
    <div className="container py-12 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-2xl font-bold">Pinnwand</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} /> Neue Ankündigung
          </button>
        </div>

        {showForm && (
          <div className="p-4 rounded-lg border bg-card mb-6 space-y-3">
            <input
              placeholder="Titel *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
            <textarea
              placeholder="Inhalt *"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]"
            />
            <button
              onClick={() => form.title && form.content && addAnnouncement.mutate()}
              disabled={!form.title || !form.content || addAnnouncement.isPending}
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Veröffentlichen
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Laden...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">Noch keine Ankündigungen.</div>
        ) : (
          <div className="space-y-4">
            {announcements.map((a) => (
              <div key={a.id} className="p-5 rounded-lg border bg-card">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-serif text-lg font-semibold">{a.title}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(a.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {isVorstand && (
                    <button onClick={() => deleteAnnouncement.mutate(a.id)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-3 whitespace-pre-wrap">{a.content}</p>
                {a.announcement_files && a.announcement_files.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {a.announcement_files.map((f: { id: string; name: string; storage_path: string }) => (
                      <a
                        key={f.id}
                        href="#"
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      >
                        <Paperclip size={12} /> {f.name}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Announcements;
