import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Trash2, Copy, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { FIELD_TYPES, type FormField } from "./types";
import { describeVisibility } from "./conditions";
import FieldEditor from "./FieldEditor";
import FieldTypePicker from "./FieldTypePicker";
import { useState } from "react";

interface Props {
  fields: FormField[];
  onChange: (fields: FormField[]) => void;
  activeId: string | null;
  onActiveChange: (id: string | null) => void;
}

export function makeField(type: string, sortOrder: number): FormField {
  return {
    id: `new-${crypto.randomUUID()}`,
    type,
    label: "",
    description: null,
    required: false,
    sort_order: sortOrder,
    options: ["select", "multi_select"].includes(type) ? ["Option 1", "Option 2"] : [],
    settings: {},
  };
}

/** Fragenliste mit Inline-Bearbeitung, Umsortieren und Duplizieren */
export default function FieldListEditor({ fields, onChange, activeId, onActiveChange }: Props) {
  const [showPicker, setShowPicker] = useState(false);

  const typeLabel = (type: string) => FIELD_TYPES.find((f) => f.value === type)?.label || type;

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const reordered = [...fields];
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    onChange(reordered.map((f, i) => ({ ...f, sort_order: i })));
  };

  const patchField = (id: string, updated: FormField) =>
    onChange(fields.map((f) => (f.id === id ? updated : f)));

  const removeField = (id: string) => {
    onChange(fields.filter((f) => f.id !== id).map((f, i) => ({ ...f, sort_order: i })));
    if (activeId === id) onActiveChange(null);
  };

  const duplicateField = (field: FormField) => {
    const index = fields.findIndex((f) => f.id === field.id);
    const copy: FormField = {
      ...field,
      id: `new-${crypto.randomUUID()}`,
      label: field.label ? `${field.label} (Kopie)` : "",
    };
    const next = [...fields];
    next.splice(index + 1, 0, copy);
    onChange(next.map((f, i) => ({ ...f, sort_order: i })));
    onActiveChange(copy.id);
  };

  const addField = (type: string) => {
    const created = makeField(type, fields.length);
    onChange([...fields, created]);
    onActiveChange(created.id);
  };

  return (
    <div className="space-y-2">
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="fields">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
              {fields.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground text-sm">
                  Noch keine Fragen. Füge unten die erste Frage hinzu.
                </div>
              )}
              {fields.map((field, index) => {
                const isOpen = activeId === field.id;
                const condition = describeVisibility(field);
                return (
                  <Draggable key={field.id} draggableId={field.id} index={index}>
                    {(dp, snapshot) => (
                      <div
                        ref={dp.innerRef}
                        {...dp.draggableProps}
                        className={`rounded-lg border bg-card transition-shadow ${
                          snapshot.isDragging ? "shadow-lg" : ""
                        } ${isOpen ? "border-primary shadow-sm" : ""} ${
                          field.type === "section" ? "bg-muted/60" : ""
                        }`}
                      >
                        <div className="flex items-start gap-2 p-3">
                          <div {...dp.dragHandleProps} className="cursor-grab text-muted-foreground pt-0.5">
                            <GripVertical size={16} />
                          </div>
                          <button
                            type="button"
                            className="flex-1 min-w-0 text-left"
                            onClick={() => onActiveChange(isOpen ? null : field.id)}
                          >
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`text-sm ${
                                  field.type === "section" ? "font-serif font-bold text-base" : "font-medium"
                                }`}
                              >
                                {field.label || <span className="text-muted-foreground italic">Ohne Bezeichnung</span>}
                              </span>
                              {field.required && field.type !== "section" && (
                                <Badge variant="destructive" className="text-[10px] px-1 py-0">Pflicht</Badge>
                              )}
                              {condition && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0" title={condition}>
                                  Bedingt
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground">{typeLabel(field.type)}</span>
                            {condition && (
                              <span className="block text-[11px] text-muted-foreground/90 mt-0.5 break-words">
                                {condition}
                              </span>
                            )}
                          </button>
                          <div className="flex items-center gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Duplizieren"
                              onClick={() => duplicateField(field)}
                            >
                              <Copy size={13} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              title="Löschen"
                              onClick={() => removeField(field.id)}
                            >
                              <Trash2 size={13} className="text-destructive" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => onActiveChange(isOpen ? null : field.id)}
                            >
                              {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            </Button>
                          </div>
                        </div>

                        {isOpen && (
                          <div className="border-t px-3 pb-4">
                            <FieldEditor
                              field={field}
                              allFields={fields}
                              onChange={(updated) => patchField(field.id, updated)}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      <Button variant="outline" className="w-full" onClick={() => setShowPicker(true)}>
        <Plus size={16} className="mr-1" /> Frage oder Abschnitt hinzufügen
      </Button>

      <FieldTypePicker open={showPicker} onOpenChange={setShowPicker} onSelect={addField} />
    </div>
  );
}
