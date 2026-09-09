import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Pencil, Check, X } from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { useKategorien } from "@/hooks/useKategorien";

const VisitorHighlightsAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const kategorien = useKategorien();
  const [gewaehlt, setGewaehlt] = useState("");
  const selectedEpoch = gewaehlt || kategorien[0]?.value || "";
  const setSelectedEpoch = setGewaehlt;
  const [newText, setNewText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["epoch_visitor_items_admin", selectedEpoch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("epoch_visitor_items" as any)
        .select("*")
        .eq("epoch", selectedEpoch)
        .order("sort_order", { ascending: true });
      if (error) return [];
      return data as any[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = items.length > 0 ? Math.max(...items.map((s: any) => s.sort_order)) + 1 : 1;
      const { error } = await supabase
        .from("epoch_visitor_items" as any)
        .insert({ epoch: selectedEpoch, text: newText, sort_order: maxOrder, created_by: user?.id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      setNewText("");
      invalidate();
      toast({ title: "Stichpunkt hinzugefügt" });
    },
    onError: () => toast({ title: "Fehler", description: "Stichpunkt konnte nicht gespeichert werden.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("epoch_visitor_items" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Stichpunkt gelöscht" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, text }: { id: string; text: string }) => {
      const { error } = await supabase.from("epoch_visitor_items" as any).update({ text } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
      toast({ title: "Stichpunkt aktualisiert" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const reorderMutation = useMutation({
    mutationFn: async (reordered: { id: string; sort_order: number }[]) => {
      for (const item of reordered) {
        const { error } = await supabase
          .from("epoch_visitor_items" as any)
          .update({ sort_order: item.sort_order } as any)
          .eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => invalidate(),
    onError: () => toast({ title: "Fehler beim Sortieren", variant: "destructive" }),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["epoch_visitor_items_admin", selectedEpoch] });
    queryClient.invalidateQueries({ queryKey: ["epoch_visitor_items", selectedEpoch] });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const list = Array.from(items);
    const [moved] = list.splice(result.source.index, 1);
    list.splice(result.destination.index, 0, moved);
    const reordered = list.map((item: any, idx: number) => ({ id: item.id, sort_order: idx + 1 }));
    queryClient.setQueryData(["epoch_visitor_items_admin", selectedEpoch], list.map((item: any, idx: number) => ({ ...item, sort_order: idx + 1 })));
    reorderMutation.mutate(reordered);
  };

  const startEdit = (s: any) => { setEditingId(s.id); setEditText(s.text); };
  const cancelEdit = () => { setEditingId(null); setEditText(""); };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-6">
        {kategorien.map((ep) => (
          <button
            key={ep.value}
            onClick={() => setSelectedEpoch(ep.value)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors text-center ${
              selectedEpoch === ep.value
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {ep.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 mb-6">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="z. B. Einblicke in Kleidung und Mode des 13. Jahrhunderts"
          className="w-full px-3 py-2 rounded-md border bg-background text-sm"
        />
        <button
          onClick={() => addMutation.mutate()}
          disabled={!newText.trim() || addMutation.isPending}
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50 flex items-center gap-1 shrink-0 self-start"
        >
          <Plus size={16} /> Hinzufügen
        </button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laden…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Stichpunkte für diese Epoche vorhanden.</p>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="visitor-items-list">
            {(provided) => (
              <ul className="space-y-2" ref={provided.innerRef} {...provided.droppableProps}>
                {items.map((s: any, index: number) => (
                  <Draggable key={s.id} draggableId={s.id} index={index}>
                    {(provided, snapshot) => (
                      <li
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`flex items-start gap-2 p-3 rounded-md border bg-card text-sm transition-shadow ${
                          snapshot.isDragging ? "shadow-lg" : ""
                        }`}
                      >
                        <div {...provided.dragHandleProps} className="mt-0.5 touch-none cursor-grab active:cursor-grabbing shrink-0">
                          <GripVertical size={14} className="text-muted-foreground/40" />
                        </div>
                        {editingId === s.id ? (
                          <div className="flex-1 flex flex-col gap-2">
                            <input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="w-full px-2 py-1 rounded border bg-background text-sm"
                              autoFocus
                            />
                            <div className="flex gap-1">
                              <button
                                onClick={() => updateMutation.mutate({ id: s.id, text: editText })}
                                disabled={!editText.trim() || updateMutation.isPending}
                                className="text-primary hover:text-primary/80 p-1"
                              >
                                <Check size={16} />
                              </button>
                              <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground p-1">
                                <X size={16} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="flex-1 text-foreground break-words min-w-0">{s.text}</span>
                            <button onClick={() => startEdit(s)} className="text-muted-foreground hover:text-foreground shrink-0" aria-label="Bearbeiten">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => deleteMutation.mutate(s.id)} className="text-destructive hover:text-destructive/80 shrink-0" aria-label="Löschen">
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
};

export default VisitorHighlightsAdmin;
