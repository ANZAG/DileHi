import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Globe, FileText, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  createPage, deletePage, fetchPages, slugify, updatePageMeta, type SitePage,
} from "@/components/sitebuilder/api";

/**
 * Übersicht der selbst gebauten Seiten.
 *
 * Die acht alten Seiten liegen weiterhin als Code im Projekt; hier stehen nur
 * die, die im Editor entstanden sind. Beim Umstellen wandert jede Seite nach
 * und nach herüber – ein Bruch wäre unnötig riskant.
 */
export default function SitePagesAdmin() {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [anlegen, setAnlegen] = useState(false);
  const [titel, setTitel] = useState("");
  const [adresse, setAdresse] = useState("");

  const darfLayout = hasPermission("site.layout_edit");

  const { data: seiten = [], isLoading } = useQuery({
    queryKey: ["site-pages"],
    queryFn: fetchPages,
  });

  const frisch = () => queryClient.invalidateQueries({ queryKey: ["site-pages"] });

  const neu = useMutation({
    mutationFn: () => createPage({ title: titel.trim(), slug: adresse.trim() || slugify(titel) }),
    onSuccess: () => {
      setAnlegen(false);
      setTitel("");
      setAdresse("");
      frisch();
    },
    onError: (err: Error) =>
      toast({ title: "Seite nicht angelegt", description: err.message, variant: "destructive" }),
  });

  const entfernen = useMutation({
    mutationFn: (id: string) => deletePage(id),
    onSuccess: frisch,
    onError: (err: Error) =>
      toast({ title: "Nicht gelöscht", description: err.message, variant: "destructive" }),
  });

  const umbenennen = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => updatePageMeta(id, { title }),
    onSuccess: frisch,
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-serif text-lg font-semibold">Seiten</h2>
        </div>
        {darfLayout && !anlegen && (
          <Button size="sm" onClick={() => setAnlegen(true)}>
            <Plus size={15} className="mr-1" /> Seite anlegen
          </Button>
        )}
      </div>

      {anlegen && (
        <div className="rounded-lg border bg-card p-4 mb-4 space-y-3">
          <div>
            <Label htmlFor="seite-titel" className="text-sm">Titel</Label>
            <Input
              id="seite-titel"
              value={titel}
              autoFocus
              onChange={(e) => {
                setTitel(e.target.value);
                // Die Adresse folgt dem Titel, solange niemand sie von Hand
                // angefasst hat. Wer sie ändert, behält seine Fassung.
                if (!adresse || adresse === slugify(titel)) setAdresse(slugify(e.target.value));
              }}
              placeholder="z. B. Ernährung im 13. Jahrhundert"
            />
          </div>
          <div>
            <Label htmlFor="seite-adresse" className="text-sm">Adresse</Label>
            <div className="flex items-center gap-1">
              <span className="text-sm text-muted-foreground">/</span>
              <Input
                id="seite-adresse"
                value={adresse}
                onChange={(e) => setAdresse(slugify(e.target.value))}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              So sieht später die Adresse aus. Kurz und ohne Umlaute ist am besten.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setAnlegen(false)}>Abbrechen</Button>
            <Button disabled={!titel.trim() || neu.isPending} onClick={() => neu.mutate()}>
              {neu.isPending ? "Wird angelegt …" : "Anlegen und bearbeiten"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Lade Seiten …</p>
      ) : seiten.length === 0 ? (
        <div className="py-12 text-center border rounded-lg bg-card">
          <FileText className="mx-auto mb-3 text-muted-foreground" size={28} />
          <p className="text-sm text-muted-foreground">
            Noch keine selbst gebaute Seite. Die bestehenden Seiten der Website liegen weiterhin im
            Code und werden nach und nach hierher überführt.
          </p>
        </div>
      ) : (
        <ul className="divide-y rounded-lg border bg-card overflow-hidden">
          {seiten.map((s: SitePage) => (
            <li key={s.id} className="flex items-center gap-3 p-3">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-sm">{s.title}</span>
                  {s.is_published ? (
                    <Globe size={13} className="text-primary shrink-0" aria-label="Veröffentlicht" />
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Entwurf
                    </span>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground">/{s.slug}</span>
              </span>

              {s.is_published && (
                <Button variant="ghost" size="icon" asChild title="Ansehen">
                  <a href={`/${s.slug}`} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} />
                  </a>
                </Button>
              )}

              <Button variant="outline" size="sm" asChild>
                <Link to={`/intern/seiten/${s.id}`}>
                  <Pencil size={14} className="mr-1" /> Bearbeiten
                </Link>
              </Button>

              {/* Der Platz bleibt stehen, damit die Zeilen fluchten. */}
              <span className="w-10 shrink-0 flex justify-center">
                {darfLayout && !s.is_system && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Seite „${s.title}" löschen`}
                    onClick={() => {
                      if (confirm(`Seite „${s.title}" mit allen Inhalten löschen?`)) entfernen.mutate(s.id);
                    }}
                  >
                    <Trash2 size={15} className="text-destructive" />
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
