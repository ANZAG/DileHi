import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Globe, FileText, ExternalLink, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Hilfe } from "@/components/Hilfe";
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
  const [einstellungen, setEinstellungen] = useState<SitePage | null>(null);

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

  const meta = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof updatePageMeta>[1] }) =>
      updatePageMeta(id, patch),
    onSuccess: () => { setEinstellungen(null); frisch(); },
    onError: (err: Error) =>
      toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-serif text-lg font-semibold">Seiten</h2>
        </div>
        {darfLayout && !anlegen && (
          <Button data-tour="knopf-seite-anlegen" size="sm" onClick={() => setAnlegen(true)}>
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
          {seiten.map((s: SitePage, i: number) => (
            <li key={s.id}>
              <div className="flex flex-wrap items-center gap-2 p-3">
              <span className="min-w-0 flex-1 basis-full sm:basis-auto">
                <span className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-sm break-words">{s.title}</span>
                  {s.is_published ? (
                    <Globe size={13} className="text-primary shrink-0" aria-label="Veröffentlicht" />
                  ) : (
                    <span className="text-xs px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                      Entwurf
                    </span>
                  )}
                </span>
                <span className="block text-xs text-muted-foreground break-all">/{s.slug}</span>
              </span>

              {s.is_published && (
                <Button variant="ghost" size="icon" asChild title="Ansehen">
                  <a href={`/${s.slug}`} target="_blank" rel="noreferrer">
                    <ExternalLink size={15} />
                  </a>
                </Button>
              )}

              {darfLayout && (
                <Button
                  variant="ghost" size="icon"
                  data-tour={i === 0 ? "seite-einstellungen" : undefined}
                  aria-label={`Einstellungen von „${s.title}"`}
                  title="Adresse, Beschreibung, Sichtbarkeit"
                  onClick={() => setEinstellungen(einstellungen?.id === s.id ? null : s)}
                >
                  <Settings2 size={15} />
                </Button>
              )}

              <Button variant="outline" size="sm" asChild data-tour={i === 0 ? "seite-bearbeiten" : undefined}>
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
              </div>

              {einstellungen?.id === s.id && (
                <SeitenEinstellungen
                  seite={s}
                  pending={meta.isPending}
                  onAbbrechen={() => setEinstellungen(null)}
                  onSpeichern={(patch) => meta.mutate({ id: s.id, patch })}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Adresse, Beschreibung und Sichtbarkeit einer Seite.
 *
 * Die Adresse bestimmt den Link: Eine Seite mit dem Kürzel
 * `epochen/mittelalter` ist unter /epochen/mittelalter erreichbar. Schrägstriche
 * sind erlaubt, damit sich eine Gliederung abbilden lässt – das ist die ganze
 * Linkstruktur, es gibt keine zweite Ebene dahinter.
 *
 * Ändert man sie, ändert sich der Link. Alte Adressen laufen danach ins Leere;
 * deshalb der Hinweis, und deshalb steht das nicht direkt in der Liste.
 */
/**
 * Warnt, wenn „Der Verein selbst" schon woanders steht.
 *
 * Der Verein ist eine Sache, nicht drei. Wer ihn auf mehreren Seiten als
 * eigenstaendige Organisation ausweist, gibt Suchmaschinen mehrere Kandidaten
 * fuer dieselbe Frage – welcher gewinnt, ist Gluecksache, und keiner sammelt
 * die Merkmale der anderen. Verboten wird es nicht: Es gibt Faelle, in denen
 * jemand weiss, was er tut.
 */
function OrganisationHinweis({ eigeneId, gewaehlt }: { eigeneId: string; gewaehlt: string }) {
  const { data: seiten = [] } = useQuery({
    queryKey: ["seo-organisation"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("seo_organization_pages" as never);
      if (error) throw new Error(error.message);
      return (data ?? []) as { id: string; title: string; slug: string }[];
    },
    enabled: gewaehlt === "organisation",
  });

  if (gewaehlt !== "organisation") return null;
  const andere = seiten.filter((s) => s.id !== eigeneId);
  if (andere.length === 0) return null;

  return (
    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
      Steht bereits auf {andere.map((s) => `„${s.title}"`).join(", ")}. Für den
      Verein selbst sollte es genau eine Seite geben, meist die Startseite.
      Für die übrigen passt „Eine Seite über den Verein".
    </p>
  );
}

function SeitenEinstellungen({ seite, pending, onAbbrechen, onSpeichern }: {
  seite: SitePage;
  pending: boolean;
  onAbbrechen: () => void;
  onSpeichern: (patch: {
    title?: string; slug?: string; seo_description?: string; noindex?: boolean;
    seo_title?: string | null; seo_type?: string;
  }) => void;
}) {
  const [titel, setTitel] = useState(seite.title);
  const [adresse, setAdresse] = useState(seite.slug);
  const [beschreibung, setBeschreibung] = useState(seite.seo_description ?? "");
  const [versteckt, setVersteckt] = useState(seite.noindex);
  const [suchtitel, setSuchtitel] = useState(seite.seo_title ?? "");
  const [datenart, setDatenart] = useState(seite.seo_type ?? "keine");

  const adresseGeaendert = adresse !== seite.slug;

  return (
    <div className="border-t bg-muted/20 p-4 space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-sm">Titel</Label>
          <Input value={titel} onChange={(e) => setTitel(e.target.value)} />
        </div>
        <div>
          <Label className="text-sm">Adresse</Label>
          <div className="flex items-center gap-1">
            <span className="text-sm text-muted-foreground">/</span>
            <Input value={adresse} onChange={(e) => setAdresse(slugify(e.target.value))} />
          </div>
          {adresseGeaendert && (
            <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
              Die bisherige Adresse /{seite.slug} führt danach ins Leere. Menüpunkte, die auf die
              Seite zeigen, ziehen automatisch mit; Links von aussen nicht.
            </p>
          )}
        </div>
      </div>

      <div>
        <Label className="text-sm">Titel in der Trefferliste</Label>
        <Input
          value={suchtitel}
          onChange={(e) => setSuchtitel(e.target.value)}
          placeholder={`${titel} | Kurzname des Vereins`}
        />
        <p className="text-xs text-muted-foreground mt-1">
          Leer lassen genügt meistens. Ein eigener Satz ist besser als ein
          Muster. Er steht in der Trefferliste und entscheidet über den Klick.
        </p>
      </div>

      <div>
        <Label className="text-sm">Angaben für Suchmaschinen</Label>
        <Select value={datenart} onValueChange={setDatenart}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="keine">Keine besonderen</SelectItem>
            <SelectItem value="organisation">Der Verein selbst (nur eine Seite)</SelectItem>
            <SelectItem value="ueber_uns">Eine Seite über den Verein</SelectItem>
            <SelectItem value="angebot">Was der Verein anbietet</SelectItem>
            <SelectItem value="artikel">Ein Thema oder Beitrag</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground mt-1">
          Erzeugt einen maschinenlesbaren Block. Was darin steht, also Name,
          Anschrift und Web-Adresse, kommt aus den Vereinsangaben.
        </p>
        <OrganisationHinweis eigeneId={seite.id} gewaehlt={datenart} />
      </div>

      <div>
        <Label className="text-sm">Beschreibung für Suchmaschinen</Label>
        <Input
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          placeholder="Ein bis zwei Sätze, die in der Trefferliste stehen."
        />
      </div>

      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={versteckt}
          onChange={(e) => setVersteckt(e.target.checked)}
          className="h-4 w-4"
        />
        Nicht in Suchmaschinen aufnehmen
      </label>
      <Hilfe k="seite_versteckt" />

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onAbbrechen}>Abbrechen</Button>
        <Button
          disabled={!titel.trim() || !adresse.trim() || pending}
          onClick={() => onSpeichern({
            seo_title: suchtitel.trim() || null,
            seo_type: datenart,
            title: titel.trim(),
            slug: adresse.trim(),
            seo_description: beschreibung.trim() || null,
            noindex: versteckt,
          } as never)}
        >
          Speichern
        </Button>
      </div>
    </div>
  );
}
