import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical } from "lucide-react";

const EPOCH_OPTIONS = [
  { value: "mittelalter", label: "Spätmittelalter" },
  { value: "1815", label: "Napoleonik" },
  { value: "wk1", label: "Erster Weltkrieg" },
];

const SourcesAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedEpoch, setSelectedEpoch] = useState("mittelalter");
  const [newText, setNewText] = useState("");

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["epoch_sources_admin", selectedEpoch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("epoch_sources" as any)
        .select("*")
        .eq("epoch", selectedEpoch)
        .order("sort_order", { ascending: true });
      if (error) return [];
      return data as any[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = sources.length > 0 ? Math.max(...sources.map((s: any) => s.sort_order)) + 1 : 1;
      const { error } = await supabase
        .from("epoch_sources" as any)
        .insert({ epoch: selectedEpoch, text: newText, sort_order: maxOrder, created_by: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setNewText("");
      queryClient.invalidateQueries({ queryKey: ["epoch_sources_admin", selectedEpoch] });
      queryClient.invalidateQueries({ queryKey: ["epoch_sources", selectedEpoch] });
      toast({ title: "Quelle hinzugefügt" });
    },
    onError: () => toast({ title: "Fehler", description: "Quelle konnte nicht gespeichert werden.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("epoch_sources" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["epoch_sources_admin", selectedEpoch] });
      queryClient.invalidateQueries({ queryKey: ["epoch_sources", selectedEpoch] });
      toast({ title: "Quelle gelöscht" });
    },
  });

  return (
    <div>
      <h2 className="font-serif text-xl font-semibold mb-4">Quellen verwalten</h2>

      {/* Epoch selector */}
      <div className="flex gap-2 mb-6">
        {EPOCH_OPTIONS.map((ep) => (
          <button
            key={ep.value}
            onClick={() => setSelectedEpoch(ep.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              selectedEpoch === ep.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {ep.label}
          </button>
        ))}
      </div>

      {/* Add form */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="z. B. Bumke, Joachim: Höfische Kultur, München 1986"
          className="flex-1 px-3 py-2 rounded-md border bg-background text-sm"
        />
        <button
          onClick={() => addMutation.mutate()}
          disabled={!newText.trim() || addMutation.isPending}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1"
        >
          <Plus size={16} /> Hinzufügen
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laden…</p>
      ) : sources.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Quellen für diese Epoche vorhanden.</p>
      ) : (
        <ul className="space-y-2">
          {sources.map((s: any) => (
            <li key={s.id} className="flex items-center gap-3 p-3 rounded-md border bg-card text-sm">
              <GripVertical size={14} className="text-muted-foreground/40 shrink-0" />
              <span className="flex-1 text-foreground">{s.text}</span>
              <button
                onClick={() => deleteMutation.mutate(s.id)}
                className="text-destructive hover:text-destructive/80 shrink-0"
                aria-label="Löschen"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SourcesAdmin;
