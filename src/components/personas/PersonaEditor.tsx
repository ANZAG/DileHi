import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, ImagePlus, Loader2, Pencil, X, ScrollText } from "lucide-react";
import { MAX_PERSONA_IMAGES, PERIOD_OPTIONS, type MemberPersona } from "./constants";
import { useSignedImages } from "./useSignedImages";

interface DraftState {
  id: string | null;
  period: string;
  portrayal: string;
  expertise: string;
  images: string[];
}

const emptyDraft: DraftState = { id: null, period: "", portrayal: "", expertise: "", images: [] };

/** Editor für die eigenen Darstellungssteckbriefe (im Profil). */
const PersonaEditor = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<DraftState | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: personas = [] } = useQuery({
    queryKey: ["my-personas", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("member_personas")
        .select("*")
        .eq("user_id", user!.id)
        .order("sort_order")
        .order("created_at");
      return (data ?? []) as MemberPersona[];
    },
  });

  const allPaths = [...personas.flatMap((p) => p.images), ...(draft?.images ?? [])];
  const signed = useSignedImages(allPaths);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["my-personas"] });
    queryClient.invalidateQueries({ queryKey: ["member-personas"] });
    queryClient.invalidateQueries({ queryKey: ["persona-owners"] });
  };

  const handleUpload = async (file: File) => {
    if (!user || !draft) return;
    if (file.size > 4 * 1024 * 1024) {
      toast({ title: "Bild zu groß", description: "Bitte maximal 4 MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `personas/${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("internal-files").upload(path, file);
    setUploading(false);
    if (error) {
      toast({ title: "Upload fehlgeschlagen", description: error.message, variant: "destructive" });
      return;
    }
    setDraft({ ...draft, images: [...draft.images, path] });
  };

  const removeImage = async (path: string) => {
    if (!draft) return;
    setDraft({ ...draft, images: draft.images.filter((p) => p !== path) });
    await supabase.storage.from("internal-files").remove([path]);
  };

  const saveDraft = async () => {
    if (!user || !draft) return;
    if (!draft.period || !draft.portrayal.trim()) {
      toast({ title: "Bitte Zeitstellung und Darstellung angeben", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload = {
      user_id: user.id,
      period: draft.period,
      portrayal: draft.portrayal.trim().slice(0, 500),
      expertise: draft.expertise.trim().slice(0, 2000),
      images: draft.images,
    };
    const { error } = draft.id
      ? await supabase.from("member_personas").update(payload).eq("id", draft.id)
      : await supabase.from("member_personas").insert({ ...payload, sort_order: personas.length });
    setSaving(false);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    setDraft(null);
    refresh();
    toast({ title: "Steckbrief gespeichert" });
  };

  const deletePersona = async (persona: MemberPersona) => {
    const { error } = await supabase.from("member_personas").delete().eq("id", persona.id);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    if (persona.images.length > 0) {
      await supabase.storage.from("internal-files").remove(persona.images);
    }
    refresh();
    toast({ title: "Steckbrief gelöscht" });
  };

  return (
    <div className="p-6 rounded-lg border bg-card space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
            <ScrollText size={18} /> Darstellungssteckbrief
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Nur für angemeldete Mitglieder sichtbar. Du kannst mehrere Darstellungen anlegen.
          </p>
        </div>
        {!draft && (
          <Button variant="outline" size="sm" onClick={() => setDraft({ ...emptyDraft })}>
            <Plus size={14} className="mr-1" /> Darstellung
          </Button>
        )}
      </div>

      {personas.length === 0 && !draft && (
        <p className="text-sm text-muted-foreground">
          Noch keine Darstellung hinterlegt. Erzähle den anderen Mitgliedern, wen oder was du darstellst.
        </p>
      )}

      {personas.map((persona) => (
        <div key={persona.id} className="p-3 rounded border bg-background space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium break-words">{persona.portrayal}</p>
              <p className="text-xs text-primary">{persona.period}</p>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Bearbeiten"
                onClick={() =>
                  setDraft({
                    id: persona.id,
                    period: persona.period,
                    portrayal: persona.portrayal,
                    expertise: persona.expertise,
                    images: persona.images,
                  })
                }
              >
                <Pencil size={14} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                aria-label="Löschen"
                onClick={() => deletePersona(persona)}
              >
                <Trash2 size={14} className="text-destructive" />
              </Button>
            </div>
          </div>
          {persona.expertise && (
            <p className="text-xs text-muted-foreground whitespace-pre-line break-words">{persona.expertise}</p>
          )}
          {persona.images.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {persona.images.map((path) => (
                <img
                  key={path}
                  src={signed[path]}
                  alt={`Darstellung ${persona.portrayal}`}
                  loading="lazy"
                  className="h-16 w-16 rounded object-cover border"
                />
              ))}
            </div>
          )}
        </div>
      ))}

      {draft && (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
          <div>
            <Label className="text-sm">Zeitstellung</Label>
            <Select value={draft.period} onValueChange={(v) => setDraft({ ...draft, period: v })}>
              <SelectTrigger><SelectValue placeholder="Epoche wählen" /></SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm" htmlFor="persona-portrayal">Darstellung</Label>
            <Input
              id="persona-portrayal"
              value={draft.portrayal}
              maxLength={500}
              onChange={(e) => setDraft({ ...draft, portrayal: e.target.value })}
              placeholder="z.B. Nassauischer Landsknecht um 1480"
            />
          </div>
          <div>
            <Label className="text-sm" htmlFor="persona-expertise">Themenschwerpunkt / Kenntnisse</Label>
            <Textarea
              id="persona-expertise"
              value={draft.expertise}
              maxLength={2000}
              rows={4}
              onChange={(e) => setDraft({ ...draft, expertise: e.target.value })}
              placeholder="z.B. Schmiedehandwerk, Lagerküche, Bogenbau, Quellenarbeit …"
            />
          </div>
          <div>
            <Label className="text-sm">Bilder (max. {MAX_PERSONA_IMAGES})</Label>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {draft.images.map((path) => (
                <div key={path} className="relative">
                  <img
                    src={signed[path]}
                    alt="Vorschau der Darstellung"
                    className="h-20 w-20 rounded object-cover border"
                  />
                  <button
                    type="button"
                    aria-label="Bild entfernen"
                    onClick={() => removeImage(path)}
                    className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              {draft.images.length < MAX_PERSONA_IMAGES && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="h-20 w-20 rounded border border-dashed flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors"
                >
                  {uploading ? <Loader2 size={18} className="animate-spin" /> : <ImagePlus size={18} />}
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
                e.target.value = "";
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={saveDraft} disabled={saving}>
              {saving && <Loader2 size={14} className="mr-1 animate-spin" />} Speichern
            </Button>
            <Button size="sm" variant="outline" onClick={() => setDraft(null)}>Abbrechen</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonaEditor;
