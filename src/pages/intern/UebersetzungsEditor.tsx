import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Puck, type Data } from "@puckeditor/core";
import { ArrowLeft, CheckCheck, Eye, Languages, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { configFuer, rechteFuer } from "@/components/sitebuilder/puckConfig";
import { WOERTERBUCH } from "@/components/sitebuilder/woerterbuch";
import { fetchPageById, LEERE_SEITE } from "@/components/sitebuilder/api";
import {
  deleteUebersetzung, fetchUebersetzung, saveUebersetzung, sprachstand, SPRACHSTAND_WORTE,
} from "@/components/sitebuilder/uebersetzungen";
import { invokeFunction } from "@/lib/functionError";
import { SPRACHNAMEN, ZUSATZSPRACHEN, sprachPfad, type Zusatzsprache } from "@/lib/sprachen.mjs";
import { pfadVon } from "@/lib/auffindbarkeit.mjs";
import "@puckeditor/core/puck.css";

/** Zurück zur Seitenliste – dort steht der Stand aller Sprachen. */
const ZURUECK = "/intern/verwaltung?reiter=sitepages";

/**
 * Eine Seite in einer anderen Sprache bearbeiten – mit demselben Baukasten
 * wie das Original.
 *
 * Die Sprachfassung ist eine übersetzte Kopie der deutschen Seite: dieselben
 * Bausteine, andere Worte. Gibt es noch keine, beginnt der Editor mit dem
 * Deutschen, und man überschreibt Text für Text – oder lässt die Maschine
 * vorarbeiten.
 *
 * Anders als beim Original gibt es keinen Entwurf: Was gesichert ist, ist
 * online. Dafür zwei Arten zu sichern – „Sichern" lässt die Fassung als
 * ungeprüft stehen, „Geprüft" sagt: Das hat jemand gelesen, der die Sprache
 * kann.
 */
export default function UebersetzungsEditor() {
  const { pageId, sprache: roh } = useParams<{ pageId: string; sprache: string }>();
  const sprache = ZUSATZSPRACHEN.find((s) => s === roh);
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const darfInhalt = hasPermission("site.content_edit");
  const darfLayout = hasPermission("site.layout_edit");
  const darf = darfInhalt || darfLayout;

  const { data: page, isLoading: seiteLaedt } = useQuery({
    queryKey: ["site-page", pageId],
    queryFn: () => fetchPageById(pageId!),
    enabled: !!pageId && darf,
  });
  const { data: fassung, isLoading: fassungLaedt } = useQuery({
    queryKey: ["site-page-translation", pageId, sprache],
    queryFn: () => fetchUebersetzung(pageId!, sprache as Zusatzsprache),
    enabled: !!pageId && !!sprache && darf,
  });

  // Puck arbeitet unkontrolliert: Es bekommt den Stand einmal und führt ihn
  // dann selbst. Nach einer maschinellen Übersetzung muss es neu beginnen –
  // dafür der Zähler als `key`.
  const [stand, setStand] = useState<Data | null>(null);
  const [lauf, setLauf] = useState(0);
  const [titel, setTitel] = useState("");
  const [suchtitel, setSuchtitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");

  // Nach dem eigenen Sichern steht im Editor schon, was gesichert wurde. Ihn
  // dann neu aufzubauen, nähme nur Auswahl und Schreibmarke weg.
  const selbstGesichert = useRef(false);

  useEffect(() => {
    if (!page || fassungLaedt) return;
    if (selbstGesichert.current) {
      selbstGesichert.current = false;
      return;
    }
    // Ohne Fassung das Deutsche als Ausgangspunkt: Aufbau und Bilder stimmen
    // dann schon, nur die Worte fehlen.
    setStand(fassung?.content ?? page.content ?? page.draft_content ?? LEERE_SEITE);
    setTitel(fassung?.title ?? page.title);
    setSuchtitel(fassung?.seo_title ?? "");
    setBeschreibung(fassung?.seo_description ?? "");
    setLauf((n) => n + 1);
  }, [page, fassung, fassungLaedt]);

  const frisch = () => {
    queryClient.invalidateQueries({ queryKey: ["site-page-translation", pageId, sprache] });
    queryClient.invalidateQueries({ queryKey: ["site-page-translations"] });
    queryClient.invalidateQueries({ queryKey: ["site-languages"] });
  };

  const sichern = useMutation({
    mutationFn: ({ daten, geprueft }: { daten: Data; geprueft: boolean }) =>
      saveUebersetzung(pageId!, sprache as Zusatzsprache, {
        title: titel.trim() || page!.title,
        content: daten,
        seo_title: suchtitel.trim() || null,
        seo_description: beschreibung.trim() || null,
      }, geprueft),
    onSuccess: (_nichts, { geprueft }) => {
      toast({ title: geprueft ? "Gesichert und als geprüft vermerkt" : "Gesichert – die Fassung ist online" });
      selbstGesichert.current = true;
      frisch();
    },
    onError: (err: Error) => toast({ title: "Nicht gesichert", description: err.message, variant: "destructive" }),
  });

  const maschine = useMutation({
    mutationFn: () => invokeFunction("translate-page", { body: { art: "seite", pageId, sprachen: [sprache] } }),
    onSuccess: () => {
      toast({ title: "Übersetzt", description: "Die Fassung der Maschine steht im Editor. Bitte durchsehen." });
      frisch();
    },
    // Fehlt der DeepL-Schlüssel, sagt die Funktion das – und was zu tun ist.
    onError: (err: Error) => toast({ title: "Nicht übersetzt", description: err.message, variant: "destructive" }),
  });

  const entfernen = useMutation({
    mutationFn: () => deleteUebersetzung(pageId!, sprache as Zusatzsprache),
    onSuccess: () => {
      toast({ title: "Sprachfassung gelöscht", description: "Unter dieser Adresse erscheint wieder die deutsche Seite." });
      frisch();
    },
    onError: (err: Error) => toast({ title: "Nicht gelöscht", description: err.message, variant: "destructive" }),
  });

  if (!darf) return <Navigate to="/intern" replace />;
  if (!sprache) return <Navigate to={ZURUECK} replace />;

  if (seiteLaedt || fassungLaedt || (page && !stand)) {
    return <p className="container py-16 text-center text-sm text-muted-foreground">Lade Seite …</p>;
  }

  if (!page || !stand) {
    return (
      <div className="container py-16 text-center max-w-lg px-4">
        <p className="text-muted-foreground">Diese Seite gibt es nicht.</p>
        <Button variant="outline" className="mt-4" asChild>
          <Link to={ZURUECK}>Zur Verwaltung</Link>
        </Button>
      </div>
    );
  }

  const zustand = sprachstand(fassung);
  const name = SPRACHNAMEN[sprache];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="border-b bg-muted/30 px-4 py-3 space-y-2">
        <p className="text-sm">
          <strong>{name}</strong> – Sprachfassung von „{page.title}“.{" "}
          <span className="text-muted-foreground">
            Stand: {SPRACHSTAND_WORTE[zustand]}.{" "}
            {zustand === "fehlt" && "Im Editor steht das Deutsche als Ausgangspunkt; online geht die Fassung mit dem ersten Sichern."}
            {zustand === "veraltet" && "Das Deutsche wurde seither geändert. Vergleichen, anpassen und neu sichern – oder neu übersetzen lassen."}
            {zustand !== "fehlt" && zustand !== "veraltet" && "Was hier gesichert wird, ist sofort online; einen Entwurf gibt es für Sprachfassungen nicht."}
          </span>
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          <div>
            <Label htmlFor="fassung-titel" className="text-xs">Titel ({name})</Label>
            <Input id="fassung-titel" lang={sprache} value={titel} onChange={(e) => setTitel(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="fassung-suchtitel" className="text-xs">Titel in der Trefferliste</Label>
            <Input id="fassung-suchtitel" lang={sprache} value={suchtitel} onChange={(e) => setSuchtitel(e.target.value)} placeholder={page.seo_title ?? "leer = nach Muster"} />
          </div>
          <div>
            <Label htmlFor="fassung-beschreibung" className="text-xs">Beschreibung für Suchmaschinen</Label>
            <Input id="fassung-beschreibung" lang={sprache} value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} placeholder={page.seo_description ?? "leer = erster Absatz"} />
          </div>
        </div>
      </div>
      <div className="flex-1 min-h-0" lang={sprache}>
        <Puck
          key={lauf}
          config={configFuer(darfLayout)}
          data={stand}
          dictionary={WOERTERBUCH}
          permissions={rechteFuer(darfLayout)}
          headerTitle={`${titel} (${sprache.toUpperCase()})`}
          headerPath={sprachPfad(pfadVon(page.slug), sprache)}
          onChange={setStand}
          onPublish={(daten) => sichern.mutate({ daten, geprueft: false })}
          renderHeaderActions={({ state }) => (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link to={ZURUECK}><ArrowLeft size={15} className="mr-1" /> Zurück</Link>
              </Button>

              <Button
                variant="outline" size="sm"
                disabled={maschine.isPending}
                onClick={() => {
                  // Die Maschine überschreibt, was da ist – auch Geprüftes.
                  if (!fassung || confirm(`Die vorhandene Fassung (${name}) wird durch eine neue maschinelle Übersetzung des Deutschen ersetzt. Fortfahren?`)) {
                    maschine.mutate();
                  }
                }}
              >
                <Languages size={15} className="mr-1" />
                {maschine.isPending ? "Übersetzt …" : "Maschinell übersetzen"}
              </Button>

              <Button
                variant="outline" size="sm"
                disabled={sichern.isPending}
                onClick={() => sichern.mutate({ daten: state.data as Data, geprueft: false })}
              >
                <Save size={15} className="mr-1" /> Sichern
              </Button>

              <Button
                size="sm"
                disabled={sichern.isPending}
                onClick={() => sichern.mutate({ daten: state.data as Data, geprueft: true })}
              >
                <CheckCheck size={15} className="mr-1" /> Sichern und als geprüft vermerken
              </Button>

              {fassung && (
                <Button variant="ghost" size="sm" asChild>
                  <a href={sprachPfad(pfadVon(page.slug), sprache)} target="_blank" rel="noreferrer">
                    <Eye size={15} className="mr-1" /> Ansehen
                  </a>
                </Button>
              )}

              {fassung && (
                <Button
                  variant="ghost" size="sm" className="text-muted-foreground"
                  disabled={entfernen.isPending}
                  onClick={() => {
                    if (confirm(`Die Sprachfassung (${name}) löschen? Unter ihrer Adresse erscheint dann wieder die deutsche Seite.`)) entfernen.mutate();
                  }}
                >
                  <Trash2 size={15} className="mr-1" /> Löschen
                </Button>
              )}
            </div>
          )}
        />
      </div>
    </div>
  );
}
