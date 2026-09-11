import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Puck, type Data } from "@puckeditor/core";
import { ArrowLeft, Eye, EyeOff, Globe, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NeuHier } from "@/components/onboarding/NeuHier";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { configFuer, rechteFuer } from "@/components/sitebuilder/puckConfig";
import { WOERTERBUCH } from "@/components/sitebuilder/woerterbuch";
import {
  fetchPageById, LEERE_SEITE, publish, saveDraft, unpublish,
} from "@/components/sitebuilder/api";
import "@puckeditor/core/puck.css";

/**
 * Der Seiteneditor.
 *
 * Bisher steckte jede öffentliche Seite als React-Datei im Code – wer etwas
 * ändern wollte, brauchte einen Entwickler. Im eigenen Verein konnte das
 * genau eine Person, und für eine Installation bei einem anderen Verein wäre
 * es ein Ausschlusskriterium gewesen.
 *
 * Wer nur Inhalte pflegen darf, kann Texte und Bilder ändern, aber nichts
 * verschieben, einfügen oder löschen – die Seite lässt sich damit nicht
 * versehentlich zerlegen. Das regelt Puck selbst über die Rechte, nicht wir
 * über ausgeblendete Knöpfe.
 */
/** Zurück dorthin, wo man hergekommen ist: zu den Seiten, nicht zu den Mitgliedern. */
const ZURUECK = "/intern/verwaltung?reiter=sitepages";

export default function SeitenEditor() {
  const { pageId } = useParams<{ pageId: string }>();
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const darfInhalt = hasPermission("site.content_edit");
  const darfLayout = hasPermission("site.layout_edit");

  const { data: page, isLoading } = useQuery({
    queryKey: ["site-page", pageId],
    queryFn: () => fetchPageById(pageId!),
    enabled: !!pageId,
  });

  // Der aktuelle Stand im Editor. Puck arbeitet unkontrolliert weiter, deshalb
  // halten wir ihn hier nur mit, um speichern zu können.
  const [stand, setStand] = useState<Data | null>(null);
  useEffect(() => {
    if (page) setStand(page.draft_content ?? page.content ?? LEERE_SEITE);
  }, [page]);

  const entwurf = useMutation({
    mutationFn: (daten: Data) => saveDraft(pageId!, daten),
    onSuccess: () => toast({ title: "Entwurf gesichert" }),
    onError: (err: Error) =>
      toast({ title: "Nicht gesichert", description: err.message, variant: "destructive" }),
  });

  const veroeffentlichen = useMutation({
    mutationFn: (daten: Data) => publish(pageId!, daten),
    onSuccess: () => {
      toast({ title: "Seite ist online" });
      queryClient.invalidateQueries({ queryKey: ["site-page", pageId] });
      queryClient.invalidateQueries({ queryKey: ["site-pages"] });
    },
    onError: (err: Error) =>
      toast({ title: "Nicht veröffentlicht", description: err.message, variant: "destructive" }),
  });

  const zurueckziehen = useMutation({
    mutationFn: () => unpublish(pageId!),
    onSuccess: () => {
      toast({ title: "Seite ist nicht mehr öffentlich" });
      queryClient.invalidateQueries({ queryKey: ["site-page", pageId] });
    },
  });

  if (!darfInhalt && !darfLayout) return <Navigate to="/intern" replace />;

  if (isLoading || !stand) {
    return <p className="container py-16 text-center text-sm text-muted-foreground">Lade Seite …</p>;
  }

  if (!page) {
    return (
      <div className="container py-16 text-center max-w-lg px-4">
        <p className="text-muted-foreground">Diese Seite gibt es nicht.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to={ZURUECK}>Zur Verwaltung</Link>
        </Button>
      </div>
    );
  }

  return (
    // Streifen ueber dem Editor, Puck fuellt den Rest. Ohne die Spalte
    // rutschte Puck unter den Bildschirmrand, sobald der Streifen da ist.
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="px-4 pt-4 empty:hidden">
        <NeuHier
          tour="seiten"
          text="Zum ersten Mal im Baukasten? Kurz gezeigt, wie eine Seite entsteht."
        />
      </div>
      <div className="flex-1 min-h-0">
      <Puck
        config={configFuer(darfLayout)}
        data={stand}
        dictionary={WOERTERBUCH}
        permissions={rechteFuer(darfLayout)}
        headerTitle={page.title}
        headerPath={`/${page.slug}`}
        onChange={setStand}
        onPublish={(daten) => veroeffentlichen.mutate(daten)}
        // Der eigene Kopf: Puck bietet sonst nur „Publish". Ein Entwurf, der
        // sich nicht sichern lässt, ohne gleich online zu gehen, ist genau die
        // Falle, in die man einmal tappt und dann nie wieder etwas anfasst.
        renderHeaderActions={({ state }) => (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to={ZURUECK}>
                <ArrowLeft size={15} className="mr-1" /> Zurück
              </Link>
            </Button>

            <Button
              data-tour="knopf-entwurf"
              variant="outline"
              size="sm"
              disabled={entwurf.isPending}
              onClick={() => entwurf.mutate(state.data as Data)}
            >
              <Save size={15} className="mr-1" /> Entwurf sichern
            </Button>

            {/*
              Mit dem eigenen Kopf war Pucks Knopf „Publish" verschwunden –
              bis zum 11.09.2026 liess sich eine Seite im Editor nur noch als
              Entwurf sichern, nie mehr veröffentlichen. Auch nicht nach dem
              Zurückziehen.
            */}
            <Button
              data-tour="knopf-veroeffentlichen"
              size="sm"
              disabled={veroeffentlichen.isPending}
              onClick={() => veroeffentlichen.mutate(state.data as Data)}
            >
              <Globe size={15} className="mr-1" />
              {page.is_published ? "Änderungen veröffentlichen" : "Veröffentlichen"}
            </Button>

            {page.is_published && darfLayout && (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                disabled={zurueckziehen.isPending}
                onClick={() => {
                  if (confirm("Die Seite ist dann für Besucher nicht mehr erreichbar. Fortfahren?")) {
                    zurueckziehen.mutate();
                  }
                }}
              >
                <EyeOff size={15} className="mr-1" /> Zurückziehen
              </Button>
            )}

            {page.is_published && (
              <Button variant="ghost" size="sm" asChild>
                <a href={`/${page.slug}`} target="_blank" rel="noreferrer">
                  <Eye size={15} className="mr-1" /> Ansehen
                </a>
              </Button>
            )}
          </div>
        )}
      />
      </div>
    </div>
  );
}
