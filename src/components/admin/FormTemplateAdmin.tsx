import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Save, RotateCcw } from "lucide-react";
import FieldListEditor from "@/components/event-forms/FieldListEditor";
import FormPreview from "@/components/event-forms/FormPreview";
import { fetchDefaultTemplate, saveDefaultTemplate } from "@/components/event-forms/templateStore";
import { DEFAULT_TEMPLATE_FIELDS } from "@/components/event-forms/defaultTemplate";
import type { FormField } from "@/components/event-forms/types";

/** Verwaltung → Umfrage-Vorlage: Standardvorlage für Veranstaltungsformulare pflegen */
export default function FormTemplateAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: template, isLoading } = useQuery({
    queryKey: ["form_template_default"],
    queryFn: fetchDefaultTemplate,
  });

  const [title, setTitle] = useState("Anmeldung");
  const [description, setDescription] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!template) return;
    setTitle(template.title);
    setDescription(template.description || "");
    setFields(template.fields);
    setDirty(false);
  }, [template]);

  const save = useMutation({
    mutationFn: async () => {
      await saveDefaultTemplate(
        { id: template?.id ?? null, title, description: description || null, fields },
        user!.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["form_template_default"] });
      setDirty(false);
      toast({ title: "Vorlage gespeichert", description: "Neue Formulare übernehmen diese Vorlage." });
    },
    onError: (e: any) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const resetToBuiltIn = () => {
    setFields(
      (DEFAULT_TEMPLATE_FIELDS as any[]).map((f, i) => ({
        id: `new-${crypto.randomUUID()}`,
        type: f.type,
        label: f.label,
        description: f.description ?? null,
        required: !!f.required,
        sort_order: i,
        options: f.options || [],
        settings: f.settings || {},
      }))
    );
    setDirty(true);
  };

  const updateFields = (next: FormField[]) => {
    setFields(next);
    setDirty(true);
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Vorlage wird geladen …</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-bold">Standardvorlage für Anmeldungen</h2>
          <p className="text-sm text-muted-foreground">
            Diese Vorlage wird geladen, wenn im Veranstaltungsformular „Vorlage laden" gewählt wird.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetToBuiltIn}>
            <RotateCcw size={14} className="mr-1" /> Auf Werksvorlage zurücksetzen
          </Button>
          <Button size="sm" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
            <Save size={14} className="mr-1" /> Speichern
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <div className="rounded-lg border p-3 space-y-3">
            <div>
              <Label className="text-sm">Titel der Vorlage</Label>
              <Input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setDirty(true);
                }}
              />
            </div>
            <div>
              <Label className="text-sm">Einleitungstext (optional)</Label>
              <Textarea
                rows={2}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setDirty(true);
                }}
              />
            </div>
          </div>

          <FieldListEditor
            fields={fields}
            onChange={updateFields}
            activeId={activeId}
            onActiveChange={setActiveId}
          />
        </div>

        <div className="lg:sticky lg:top-20 self-start w-full">
          <FormPreview
            title={title}
            description={description}
            fields={fields}
            eventStartDate={new Date().toISOString().slice(0, 10)}
            eventEndDate={new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10)}
            highlightFieldId={activeId}
          />
        </div>
      </div>
    </div>
  );
}
