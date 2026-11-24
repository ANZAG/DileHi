import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import NotFound from "@/pages/NotFound";
import SeitenRenderer, { type SeitenDaten } from "@/components/sitebuilder/SeitenRenderer";
import type { SitePage } from "@/daten/seiten";
import { ladeSeiteInSprache, sprachSchluessel, type SeiteInSprache } from "@/daten/sprachen";
import { useBranding } from "@/hooks/useBranding";
import { useRahmentexte, useSprache } from "@/hooks/useSprache";
import { pfadVon, seitenBeschreibung, seitenTitel, strukturierteDaten } from "@/lib/auffindbarkeit.mjs";
import { zieleUmrechnen } from "@/lib/seitentexte";
import { ZUSATZSPRACHEN, istSprache, pfadOhneSprache, sprachPfad, type Sprache } from "@/lib/sprachen.mjs";
import { vorabzug } from "@/lib/vorabzug";

/**
 * Der Stand vom Bauen, wenn er zu dieser Adresse passt (scripts/vorabzug.mjs).
 *
 * Das fertige HTML einer übersetzten Seite trägt die Seite schon in ihrer
 * Sprache. Unter /en/… ohne englische Fassung liefert der Server das deutsche
 * HTML aus; dann steht darin, dass es keine englische gibt, und die deutsche
 * Seite ist bereits die richtige Antwort.
 */
function ausVorabzug(slug: string, sprache: Sprache): SeiteInSprache | undefined {
  const vorab = vorabzug()?.seite;
  if (vorab?.slug !== slug) return undefined;
  const textSprache = istSprache(vorab.sprache) ? vorab.sprache : "de";
  const sprachen = ZUSATZSPRACHEN.filter((s) => vorab.sprachen?.includes(s));
  if (textSprache !== sprache && !(textSprache === "de" && !(sprachen as Sprache[]).includes(sprache))) return undefined;
  return { page: vorab as unknown as SitePage, textSprache, sprachen };
}

/**
 * Eine im Editor gebaute Seite, öffentlich.
 *
 * Rendert dieselben Bausteine wie der Editor – es gibt keine zweite Fassung
 * fürs Anzeigen, die auseinanderlaufen könnte. Was im Editor steht, steht auch
 * hier.
 *
 * Unter /en/… und /fr/… erscheint die Übersetzung der Seite. Gibt es keine,
 * erscheint die deutsche Seite im Rahmen der gewählten Sprache: als deutsch
 * ausgezeichnet, mit der deutschen Adresse als der massgeblichen, und ohne
 * sich Suchmaschinen als Sprachfassung anzubieten.
 */
export default function SeiteAnzeigen({ slug: fest }: { slug?: string } = {}) {
  const { "*": pfad } = useParams();
  const { sprache, t } = useSprache();
  // Die Startseite hat keinen Namen in der Adresse und bekommt ihn deshalb
  // mitgegeben. Die Sammelroute nennt den ganzen Pfad – unter /en/* schon
  // ohne das Kürzel, unter * mit allem.
  const slug = fest ?? pfadOhneSprache(`/${pfad ?? ""}`).replace(/^\/+|\/+$/g, "");

  const { data, isLoading } = useQuery({
    queryKey: sprachSchluessel.seite(slug, sprache),
    queryFn: () => ladeSeiteInSprache(slug, sprache),
    enabled: slug !== "",
    // Im fertigen HTML einer Seite steht sie selbst schon (scripts/vorabzug.mjs).
    // Damit zeigt die Anwendung sie sofort, statt erst die Datenbank zu
    // fragen; die Abfrage läuft im Hintergrund trotzdem (Zeitpunkt 0).
    initialData: () => ausVorabzug(slug, sprache),
    initialDataUpdatedAt: 0,
  });

  const roh = useBranding();
  const rahmen = useRahmentexte();
  const page = data?.page;
  const textSprache = data?.textSprache ?? "de";

  // Verweise bleiben in der Sprache der Adresse – auch auf einer Seite, die
  // mangels Übersetzung deutsch dasteht: Der Besucher hat Englisch gewählt
  // und soll nicht mit jedem Klick herausfallen.
  const inhalt = useMemo(
    () => (sprache === "de" || !page?.content
      ? page?.content
      : zieleUmrechnen(page.content, (ziel) => sprachPfad(ziel, sprache))),
    [page?.content, sprache],
  );

  if (isLoading) {
    // Bewusst leer statt „Lädt": Ein kurzes Aufblitzen von Text und dann etwas
    // anderes wirkt kaputter als ein Moment Ruhe. Bildschirmhoch, damit der
    // Fuss unten bleibt und nicht erst mitten im Bild steht und dann springt.
    return <div className="min-h-screen" />;
  }

  // Unveröffentlichtes ist über die Policy für Besucher ohnehin nicht sichtbar;
  // wer bearbeiten darf, bekommt es und sieht den Hinweis.
  if (!page || !page.content) return <NotFound />;

  // Untertitel und Beschreibung des Vereins gehen in Titel und Beschreibung
  // der Seite ein – in der Sprache, in der die Seite dasteht.
  const marke = textSprache === "de" ? roh : {
    ...roh,
    org_tagline: rahmen["settings:org_tagline"] ?? roh.org_tagline,
    seo_description: rahmen["settings:seo_description"] ?? roh.seo_description,
  };

  return (
    <>
      <SEO
        // Titel, Beschreibung und strukturierte Daten kommen aus derselben
        // Datei wie beim Bauen (scripts/vorabzug.mjs). Was eine Suchmaschine
        // vor dem Laden liest, steht nach dem Laden genauso da.
        title={seitenTitel(page, marke)}
        description={seitenBeschreibung(page, marke)}
        // Ohne Übersetzung ist die deutsche Adresse die massgebliche.
        url={sprachPfad(pfadVon(page.slug), textSprache)}
        type={page.seo_type === "organisation" ? "website" : "article"}
        noindex={page.noindex || !page.is_published}
        jsonLd={strukturierteDaten(page, marke, textSprache)}
        lang={textSprache}
        sprachen={data?.sprachen}
      />

      {!page.is_published && (
        <div className="bg-amber-500 text-amber-950 text-center py-2 px-4 text-sm font-semibold">
          Vorschau: Diese Seite ist noch nicht veröffentlicht.
        </div>
      )}

      {textSprache !== sprache && (
        <p lang={sprache} className="bg-muted text-muted-foreground text-center py-2 px-4 text-sm">
          {t.nurAufDeutsch}
        </p>
      )}

      <SeitenRenderer daten={inhalt as unknown as SeitenDaten} />
    </>
  );
}
