import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Plus, Trash2, Archive, Eye, MessageSquare, PenLine, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  deleteCategory, fetchCategories, fetchCategoryRights, saveCategory, setCategoryRight,
  type CategoryStatus, type ForumCategory,
} from "@/components/forum/api";

const STATUS_LABEL: Record<CategoryStatus, string> = {
  vorgeschlagen: "Vorgeschlagen",
  aktiv: "Aktiv",
  archiviert: "Archiviert",
};

const RIGHTS = [
  { key: "can_view" as const, label: "Sehen", icon: Eye, hint: "Die Rubrik erscheint überhaupt." },
  { key: "can_reply" as const, label: "Antworten", icon: MessageSquare, hint: "Auf Themen antworten." },
  { key: "can_start" as const, label: "Eröffnen", icon: PenLine, hint: "Neue Themen anlegen." },
  { key: "is_moderator" as const, label: "Moderieren", icon: Shield, hint: "Anheften, schließen, entfernen – nur hier." },
];

/**
 * Rubriken und ihre Rechte.
 *
 * Drei getrennte Rechte statt einer Moderationsflagge, weil die üblichen Fälle
 * sonst nicht abbildbar sind: „Vorstandsintern“ für andere unsichtbar,
 * „Ankündigungen“ für alle lesbar aber nur vom Vorstand befüllbar, „Plauderei“
 * offen für alle.
 */
export default function ForumCategoriesAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ name: string; description: string } | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["forum-categories"], queryFn: fetchCategories,
  });
  const { data: rights = [] } = useQuery({
    queryKey: ["forum-category-rights"], queryFn: fetchCategoryRights,
  });
  const { data: roles = [] } = useQuery({
    queryKey: ["role_catalog_admin"],
    queryFn: async () => {
      const { data } = await supabase.rpc("get_role_catalog");
      return (data ?? []) as { key: string; label: string }[];
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["forum-categories"] });
    queryClient.invalidateQueries({ queryKey: ["forum-category-rights"] });
  };

  const save = useMutation({
    mutationFn: (c: Partial<ForumCategory> & { id?: string }) => saveCategory(c),
    onSuccess: () => { invalidate(); setDraft(null); },
    onError: (e: Error) => toast({ title: "Nicht gespeichert", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteCategory(id),
    onSuccess: () => { invalidate(); toast({ title: "Rubrik gelöscht" }); },
    onError: (e: Error) => toast({ title: "Nicht gelöscht", description: e.message, variant: "destructive" }),
  });

  const toggleRight = useMutation({
    mutationFn: ({ categoryId, role, patch }: {
      categoryId: string; role: string; patch: Record<string, boolean>;
    }) => setCategoryRight(categoryId, role, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-category-rights"] }),
    onError: (e: Error) => toast({ title: "Recht nicht geändert", description: e.message, variant: "destructive" }),
  });

  const rightFor = (categoryId: string, role: string) =>
    rights.find((r) => r.category_id === categoryId && r.role === role);

  if (isLoading) {
    return <div className="flex justify-center py-12"><Loader2 className="animate-spin h-6 w-6 text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-lg font-semibold">Forum-Rubriken</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Mitglieder können Rubriken vorschlagen – freigegeben werden sie hier. Die Rechte gelten je
          Rubrik und Rolle.
        </p>
      </div>

      {categories.map((c) => (
        <div key={c.id} className="rounded-lg border">
          <div className="flex flex-wrap items-center gap-2 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">
                {c.name}
                {c.is_event_room && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    · Rubrik für Veranstaltungs-Threads
                  </span>
                )}
              </p>
              {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
            </div>

            <Select
              value={c.status}
              onValueChange={(v) => save.mutate({ id: c.id, ...c, status: v as CategoryStatus })}
            >
              <SelectTrigger className="h-8 w-full sm:w-40 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as CategoryStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline" size="sm"
              onClick={() => setExpanded(expanded === c.id ? null : c.id)}
            >
              Rechte
            </Button>

            {/* Der Platz für die Tonne bleibt auch dann stehen, wenn es keine
                gibt. Sonst rutscht die Zeile der Veranstaltungs-Rubrik – die
                als einzige nicht gelöscht werden darf – gegenüber allen
                anderen nach rechts, und die Spalten stehen nicht mehr
                untereinander. */}
            <div className="w-10 shrink-0 flex justify-center">
              {!c.is_event_room && (
                <Button
                  variant="ghost" size="icon"
                  aria-label={`Rubrik „${c.name}" löschen`}
                  onClick={() => {
                    if (confirm(`Rubrik „${c.name}" mit allen Themen und Beiträgen löschen?`)) remove.mutate(c.id);
                  }}
                >
                  <Trash2 size={15} className="text-destructive" />
                </Button>
              )}
            </div>
          </div>

          {expanded === c.id && (
            <div className="border-t p-3 overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="text-xs text-muted-foreground">
                    <th className="text-left font-medium py-1.5 pr-3">Rolle</th>
                    {RIGHTS.map((r) => (
                      <th key={r.key} className="font-medium py-1.5 px-2" title={r.hint}>
                        <span className="inline-flex items-center gap-1"><r.icon size={12} /> {r.label}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {roles.map((role) => {
                    const current = rightFor(c.id, role.key);
                    return (
                      <tr key={role.key} className="border-t">
                        <td className="py-1.5 pr-3">{role.label}</td>
                        {RIGHTS.map((r) => (
                          <td key={r.key} className="py-1.5 px-2 text-center">
                            <Checkbox
                              checked={!!current?.[r.key]}
                              aria-label={`${role.label}: ${r.label}`}
                              onCheckedChange={(v) =>
                                toggleRight.mutate({
                                  categoryId: c.id,
                                  role: role.key,
                                  patch: {
                                    can_view: !!current?.can_view,
                                    can_reply: !!current?.can_reply,
                                    can_start: !!current?.can_start,
                                    is_moderator: !!current?.is_moderator,
                                    [r.key]: v === true,
                                  },
                                })
                              }
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-xs text-muted-foreground mt-2">
                „Moderieren" gilt nur für diese Rubrik. Wer überall moderieren soll, bekommt das
                Recht <code>forum.moderate</code> in der Rechteverwaltung.
              </p>
            </div>
          )}
        </div>
      ))}

      {draft ? (
        <div className="rounded-lg border p-3 space-y-2">
          <div>
            <Label htmlFor="new-cat" className="text-sm">Name</Label>
            <Input id="new-cat" value={draft.name} autoFocus
              onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="new-cat-desc" className="text-sm">Kurzbeschreibung</Label>
            <Input id="new-cat-desc" value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDraft(null)}>Abbrechen</Button>
            <Button
              disabled={!draft.name.trim()}
              onClick={() => save.mutate({
                name: draft.name.trim(),
                description: draft.description.trim() || null,
                status: "aktiv",
                sort_order: (categories.at(-1)?.sort_order ?? 0) + 10,
                created_by: user?.id,
              })}
            >
              <Check size={15} className="mr-1" /> Anlegen
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="outline" size="sm" onClick={() => setDraft({ name: "", description: "" })}>
          <Plus size={15} className="mr-1" /> Rubrik anlegen
        </Button>
      )}

      {categories.some((c) => c.status === "archiviert") && (
        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Archive size={12} /> Archivierte Rubriken bleiben lesbar, aber niemand kann dort schreiben.
        </p>
      )}
    </div>
  );
}
