import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  aendereEpochenquelle, epochenSchluessel, ladeEpochenquellen, legeEpochenquelleAn, loescheEpochenquelle, sortiereEpochenquellen,
} from "@/daten/epochen";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, GripVertical, Pencil, Check, X } from "lucide-react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { useKategorien } from "@/hooks/useKategorien";

const SourcesAdmin = () => {
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

  const { data: sources = [], isLoading } = useQuery({
    queryKey: epochenSchluessel.quellen(selectedEpoch),
    queryFn: () => ladeEpochenquellen(selectedEpoch),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const maxOrder = sources.length > 0 ? Math.max(...sources.map((s) => s.sort_order)) + 1 : 1;
      await legeEpochenquelleAn({ epoch: selectedEpoch, text: newText, sort_order: maxOrder, created_by: user?.id });
    },
    onSuccess: () => {
      setNewText("");
      invalidate();
      toast({ title: "Quelle hinzugefügt" });
    },
    onError: () => toast({ title: "Fehler", description: "Quelle konnte nicht gespeichert werden.", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: loescheEpochenquelle,
    onSuccess: () => {
      invalidate();
      toast({ title: "Quelle gelöscht" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => aendereEpochenquelle(id, text),
    onSuccess: () => {
      setEditingId(null);
      invalidate();
      toast({ title: "Quelle aktualisiert" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const reorderMutation = useMutation({
    mutationFn: sortiereEpochenquellen,
    onSuccess: () => {
      invalidate();
    },
    onError: () => toast({ title: "Fehler beim Sortieren", variant: "destructive" }),
  });

  const invalidate = () => {
    // Öffentliche Seite und Verwaltung lesen dieselbe Liste.
    queryClient.invalidateQueries({ queryKey: epochenSchluessel.quellen(selectedEpoch) });
    queryClient.invalidateQueries({ queryKey: epochenSchluessel.alleQuellen() });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || result.source.index === result.destination.index) return;
    const items = Array.from(sources);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    const reordered = items.map((item, idx) => ({ id: item.id, sort_order: idx + 1 }));
    // Optimistic update
    queryClient.setQueryData(epochenSchluessel.quellen(selectedEpoch), items.map((item, idx) => ({ ...item, sort_order: idx + 1 })));
    reorderMutation.mutate(reordered);
  };

  const startEdit = (s: { id: string; text: string }) => {
    setEditingId(s.id);
    setEditText(s.text);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  return (
    <div className="space-y-4">
      {/* Epoch selector */}
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

      {/* Add form */}
      <div className="flex flex-col gap-2 mb-6">
        <input
          type="text"
          value={newText}
          onChange={(e) => setNewText(e.target.value)}
          placeholder="z. B. Bumke, Joachim: Höfische Kultur, München 1986"
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

      {/* List */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laden…</p>
      ) : sources.length === 0 ? (
        <p className="text-sm text-muted-foreground">Für diese Kategorie ist noch keine Quelle hinterlegt. Trag oben die erste ein.</p>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="sources-list">
            {(provided) => (
              <ul className="space-y-2" ref={provided.innerRef} {...provided.droppableProps}>
                {sources.map((s, index) => (
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
                            <button
                              onClick={() => startEdit(s)}
                              className="text-muted-foreground hover:text-foreground shrink-0"
                              aria-label="Bearbeiten"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => deleteMutation.mutate(s.id)}
                              className="text-destructive hover:text-destructive/80 shrink-0"
                              aria-label="Löschen"
                            >
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

export default SourcesAdmin;
