import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, GripVertical, Save, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const ICONS = ["MessageSquare", "Shield", "Swords", "Target", "Calendar", "BookOpen", "Users", "Lightbulb", "Wrench"];
const CATEGORY_TYPES = [
  { value: "diskussion", label: "Diskussion" },
  { value: "wissen", label: "Wissen" },
  { value: "organisation", label: "Organisation" },
] as const;

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  icon: string;
  category_type: "diskussion" | "wissen" | "organisation";
  sort_order: number;
}

const emptyForm: CategoryForm = {
  name: "",
  slug: "",
  description: "",
  icon: "MessageSquare",
  category_type: "diskussion",
  sort_order: 0,
};

const ForumCategoriesAdmin = () => {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const upsert = useMutation({
    mutationFn: async () => {
      const slug = form.slug || form.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const payload = { ...form, slug };

      if (editingId) {
        const { error } = await supabase.from("forum_categories").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("forum_categories").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-categories"] });
      setDialogOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      toast({ title: editingId ? "Kategorie aktualisiert" : "Kategorie erstellt" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("forum_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-categories"] });
      toast({ title: "Kategorie gelöscht" });
    },
  });

  const startEdit = (cat: typeof categories[0]) => {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      icon: cat.icon || "MessageSquare",
      category_type: cat.category_type || "diskussion",
      sort_order: cat.sort_order || 0,
    });
    setDialogOpen(true);
  };

  const typeLabel = (t: string) => CATEGORY_TYPES.find((ct) => ct.value === t)?.label || t;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold">Forum-Kategorien</h2>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { setEditingId(null); setForm(emptyForm); } }}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus size={14} className="mr-1" /> Neue Kategorie</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Kategorie bearbeiten" : "Neue Kategorie"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="z.B. Allgemein" className="mt-1" />
              </div>
              <div>
                <Label>Slug (URL)</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="wird automatisch erzeugt" className="mt-1" />
              </div>
              <div>
                <Label>Beschreibung</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="mt-1" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Typ</Label>
                  <Select value={form.category_type} onValueChange={(v: "diskussion" | "wissen" | "organisation") => setForm({ ...form, category_type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CATEGORY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Icon</Label>
                  <Select value={form.icon} onValueChange={(v) => setForm({ ...form, icon: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ICONS.map((ic) => (
                        <SelectItem key={ic} value={ic}>{ic}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label>Sortierung</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} className="mt-1 w-24" />
              </div>
              <div className="flex gap-2 pt-2">
                <Button onClick={() => upsert.mutate()} disabled={!form.name.trim() || upsert.isPending}>
                  <Save size={14} className="mr-1" /> Speichern
                </Button>
                <Button variant="outline" onClick={() => { setDialogOpen(false); setEditingId(null); setForm(emptyForm); }}>
                  <X size={14} className="mr-1" /> Abbrechen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="divide-y border rounded-lg">
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground p-4 text-center">Noch keine Kategorien vorhanden.</p>
        ) : (
          categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 px-4 py-3">
              <GripVertical size={16} className="text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{cat.name}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                    {typeLabel(cat.category_type || "diskussion")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">{cat.description}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(cat)}>
                  <Pencil size={13} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => { if (confirm("Kategorie wirklich löschen? Alle Themen darin werden ebenfalls gelöscht.")) deleteCategory.mutate(cat.id); }}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ForumCategoriesAdmin;
