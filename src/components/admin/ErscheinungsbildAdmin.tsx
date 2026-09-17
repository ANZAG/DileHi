import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ImagePlus, Loader2, Save, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBranding, useWoerter } from "@/hooks/useBranding";
import { useAuth } from "@/hooks/useAuth";
import Beitragsstufen from "@/components/beitraege/Beitragsstufen";
import { ZWEISPALTIG } from "@/lib/layout";
import { datumDe, plusMonate, tageBis } from "@/lib/datum";
import { TEXT_SCHRIFTEN, UEBERSCHRIFT_SCHRIFTEN } from "@/lib/schriften";
import { flaechenfarben, hexToHsl, lesbareSchrift } from "@/lib/farben";
import { invokeFunction, readFunctionError } from "@/lib/functionError";
import DateiablageWahl from "./DateiablageWahl";
import OrganisationsformWahl from "./OrganisationsformWahl";
import MailAnleitung from "./MailAnleitung";

interface Einstellungen {
  org_name: string;
  org_short_name: string;
  org_tagline: string | null;
  org_street: string | null;
  org_zip: string | null;
  org_city: string | null;
  org_email: string | null;
  org_phone: string | null;
  website_url: string | null;
  logo_path: string | null;
  favicon_path: string | null;
  logo_in_header: boolean;
  color_primary: string;
  color_surface: string;
  color_dark: string;
  font_headings: string;
  font_body: string;
  seo_description: string | null;
  mail_from_address: string | null;
  mail_from_name: string | null;
  mail_reply_to: string | null;
  mail_transport: string;
  file_storage: "supabase" | "sharepoint";
  sharepoint_site_url: string | null;
  is_nonprofit: boolean;
  tax_office: string | null;
  tax_number: string | null;
  exemption_notice_kind: "exemption" | "assessment_60a" | null;
  exemption_notice_date: string | null;
  exemption_notice_period: string | null;
  tax_purposes: string | null;
  fees_deductible: boolean;
  volunteer_allowance: number;
  trainer_allowance: number;
  calendar_timezone: string;
  contribution_model: string;
  contribution_retention_years: number;
  bank_recipient: string | null;
  bank_iban: string | null;
  bank_bic: string | null;
}

const db = supabase as unknown as { from: (t: string) => any };

/**
 * Die Felder, die diese Maske pflegt — und nur die.
 *
 * Vorher ging der ganze Entwurf in das `update`. Der kommt aus `select("*")`
 * und enthält damit jede Spalte der Zeile, auch die, die hier niemand sieht:
 * die Organisationsform und den Stand des Einrichtungsdurchlaufs. Wer die Form
 * woanders umstellte und danach hier auf „Speichern" drückte, schrieb den
 * alten Wert zurück — ohne dass irgendwo etwas davon stand.
 *
 * Eine Maske speichert, was sie zeigt. Alles andere gehört ihr nicht.
 */
const FELDER: (keyof Einstellungen)[] = [
  "org_name", "org_short_name", "org_tagline",
  "org_street", "org_zip", "org_city", "org_email", "org_phone", "website_url",
  "logo_path", "favicon_path", "logo_in_header",
  "color_primary", "color_surface", "color_dark", "font_headings", "font_body",
  "seo_description",
  "mail_from_address", "mail_from_name", "mail_reply_to", "mail_transport",
  "is_nonprofit", "tax_office", "tax_number",
  "exemption_notice_kind", "exemption_notice_date", "exemption_notice_period",
  "tax_purposes", "fees_deductible", "volunteer_allowance", "trainer_allowance",
  "calendar_timezone",
  "contribution_model", "contribution_retention_years",
  "bank_recipient", "bank_iban", "bank_bic",
];

/**
 * Vereinsdaten und Erscheinungsbild.
 *
 * Alles hier stand schon in der Datenbank – nur gab es keine Stelle, an der man
 * es ändern konnte. Für eine Installation, die ein anderer Verein aufsetzt, ist
 * das der Unterschied zwischen „Software" und „unsere Software mit ihrem
 * Namen darauf".
 */
export default function ErscheinungsbildAdmin({ teil = "erscheinungsbild" }: {
  /**
   * Die Beitragseinstellungen stehen seit September 2026 im Mitgliederbereich
   * der Verwaltung, der Rest bleibt hier. Beide schreiben in dieselbe Zeile
   * `app_settings`, deshalb eine Komponente mit zwei Ansichten statt zwei
   * Formularen, die sich gegenseitig überschreiben.
   */
  teil?: "erscheinungsbild" | "beitraege";
}) {
  const { hasPermission } = useAuth();
  const { toast } = useToast();
  const woerter = useWoerter();
  // Die Form kommt aus dem Branding, nicht aus dem Entwurf dieser Maske: Sie
  // wird nebenan sofort gespeichert, und was hier im Entwurf liegt, wäre eine
  // Minute später falsch.
  const marke = useBranding();
  const queryClient = useQueryClient();
  const [entwurf, setEntwurf] = useState<Einstellungen | null>(null);
  const [laedtBild, setLaedtBild] = useState<"logo" | "favicon" | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async () => {
      const { data, error } = await db.from("app_settings").select("*").maybeSingle();
      if (error) throw new Error(error.message);
      return data as Einstellungen;
    },
  });

  useEffect(() => {
    if (data) setEntwurf(data);
  }, [data]);

  const speichern = useMutation({
    mutationFn: async (werte: Einstellungen) => {
      const { file_storage, sharepoint_site_url, ...rest } = werte;
      // Die Dateiablage nicht direkt in die Tabelle schreiben: Die Edge
      // Function prüft beim Umschalten auf SharePoint erst die Verbindung.
      // Sonst stünde „SharePoint" in den Einstellungen, und erst das nächste
      // Hochladen würde merken, dass es nicht geht. Zuerst, damit bei einem
      // Fehler auch der Rest nicht halb gespeichert ist.
      const ablageGeaendert =
        !!data &&
        (file_storage !== data.file_storage || (sharepoint_site_url ?? "") !== (data.sharepoint_site_url ?? ""));
      if (ablageGeaendert) {
        await invokeFunction("sharepoint-files", {
          body: { action: "settings", fileStorage: file_storage, siteUrl: sharepoint_site_url ?? "" },
        });
      }
      // Aus dem Entwurf nur die eigenen Felder – siehe FELDER oben. Die
      // Dateiablage ist schon oben durch die Edge Function gegangen.
      const patch = Object.fromEntries(
        FELDER.filter((f) => f !== "file_storage" && f !== "sharepoint_site_url")
          .map((f) => [f, (rest as Einstellungen)[f]])
      );
      const { error } = await db.from("app_settings").update(patch).eq("id", true);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Gespeichert" });
      // Das Erscheinungsbild hängt an einer eigenen Abfrage – ohne das bleibt
      // die alte Farbe stehen, bis jemand neu lädt.
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      queryClient.invalidateQueries({ queryKey: ["branding"] });
      // Die Aufbewahrungsfrist bestimmt, ab wann eine Beitragsstufe endgueltig
      // weg darf – die Verwaltung zeigt diese Jahreszahl an.
      queryClient.invalidateQueries({ queryKey: ["beitragsstufen-status"] });
      // Quellensammlung und Eingangskorb fragen die Dateiablage getrennt ab.
      queryClient.invalidateQueries({ queryKey: ["file-storage-settings"] });
      queryClient.invalidateQueries({ queryKey: ["file-storage"] });
      // Die Gemeinnützigkeit schaltet Bereiche frei oder ab.
      queryClient.invalidateQueries({ queryKey: ["module"] });
      queryClient.invalidateQueries({ queryKey: ["bescheid"] });
    },
    onError: (err: Error) =>
      toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  const bildHochladen = async (art: "logo" | "favicon", datei: File | undefined) => {
    if (!datei || !entwurf) return;
    setLaedtBild(art);
    try {
      // Weder Logo noch Favicon werden umgewandelt.
      //
      // Beim Favicon war das immer schon so: Ein .ico oder ein SVG verliert
      // dabei genau das, was es zum Favicon macht. Beim Logo lag hier ein
      // convertToWebP – mit zwei Folgen. Erstens braucht ein Logo die
      // Ersparnis nicht, es ist keine Fotostrecke. Zweitens kann pdf-lib nur
      // PNG und JPEG einbetten: Ein hochgeladenes PNG landete als WebP im
      // Speicher und stand damit auf dem Aufnahmeantrag nicht zur Verfügung.
      const pfad = `branding/${art}-${Date.now()}_${datei.name}`;
      const { error } = await supabase.storage
        .from("gallery")
        .upload(pfad, datei, { contentType: datei.type || undefined });
      if (error) throw new Error(error.message);

      const spalte = art === "logo" ? "logo_path" : "favicon_path";
      setEntwurf({ ...entwurf, [spalte]: pfad });

      // Sofort sichern und nicht auf „Speichern" warten.
      //
      // Ein Hochladen fühlt sich an wie ein abgeschlossener Vorgang – das Bild
      // steht ja da. Wer die Seite danach verließ, ohne unten zu speichern,
      // fand die Datei im Speicher, den Verweis darauf aber nirgends. Genau
      // eine Spalte wird geschrieben, damit andere offene Änderungen im
      // Formular davon unberührt bleiben.
      const { error: speicherFehler } = await db
        .from("app_settings").update({ [spalte]: pfad }).eq("id", true);
      if (speicherFehler) throw new Error(speicherFehler.message);

      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      queryClient.invalidateQueries({ queryKey: ["branding"] });
      toast({ title: art === "logo" ? "Logo gespeichert" : "Symbol gespeichert" });
    } catch (err) {
      toast({
        title: "Hochladen fehlgeschlagen",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setLaedtBild(null);
    }
  };

  /** Entfernen wirkt sofort – aus demselben Grund wie das Hochladen. */
  const bildEntfernen = async (art: "logo" | "favicon") => {
    if (!entwurf) return;
    const spalte = art === "logo" ? "logo_path" : "favicon_path";
    setEntwurf({ ...entwurf, [spalte]: null });
    const { error } = await db.from("app_settings").update({ [spalte]: null }).eq("id", true);
    if (error) {
      toast({ title: "Nicht entfernt", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    queryClient.invalidateQueries({ queryKey: ["branding"] });
  };

  if (isLoading || !entwurf) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Lade Einstellungen …</p>;
  }

  const setze = (patch: Partial<Einstellungen>) => setEntwurf({ ...entwurf, ...patch });
  // Der Probeversand liest die Einstellungen aus der Datenbank, nicht aus
  // diesem Formular. Ohne den Hinweis testet man den alten Stand und wundert
  // sich, dass die Aenderung nichts bewirkt.
  const ungespeichert = JSON.stringify(entwurf) !== JSON.stringify(data);
  const bildAdresse = (pfad: string | null) =>
    pfad ? supabase.storage.from("gallery").getPublicUrl(pfad).data.publicUrl : null;

  return (
    /*
     * Zweispaltig ab dem grossen Bildschirm, dieselbe Loesung wie im Profil.
     *
     * Sieben Abschnitte untereinander in einer Spalte hiessen: Wer den
     * Mailversand einstellen will, scrollt an Logo, Farben und Schriften
     * vorbei. `columns` und kein Raster, damit die Aufteilung sich von selbst
     * ausgleicht.
     *
     * Die Reihenfolge im Quelltext ist die auf dem Handy und zugleich die
     * Lesereihenfolge am Desktop: erst wer der Verein ist, dann wie er
     * aussieht, dann was er verwaltet.
     */
    <div>
    <div className={ZWEISPALTIG}>
      {teil === "erscheinungsbild" && (<>
      {/* ── Die Form ─────────────────────────────────────────────────────────
          Ganz oben, weil alles Weitere daran hängt: was es in dieser
          Installation überhaupt gibt und wie die Oberfläche darüber spricht.
          Bis zum Probelauf stand diese Frage nur im geführten Durchlauf — wer
          den nicht zu sehen bekam, konnte seine Form nirgends einstellen. */}
      <Abschnitt
        titel="Was seid ihr?"
        hinweis="Danach richtet sich, welche Bereiche es bei euch gibt und mit welchen Wörtern DING darüber spricht."
      >
        <OrganisationsformWahl wert={marke.org_form} />
      </Abschnitt>

      {/* ── Verein ───────────────────────────────────────────────────────── */}
      <Abschnitt titel={woerter.organisationBestimmt} hinweis="Name und Anschrift, wie sie auf der Seite und in Mails erscheinen.">
        <div className="grid sm:grid-cols-2 gap-3">
          <Feld label="Name (vollständig)" wert={entwurf.org_name} setze={(v) => setze({ org_name: v })} />
          <Feld label="Kurzform (Kopfzeile)" wert={entwurf.org_short_name} setze={(v) => setze({ org_short_name: v })} />
          <Feld label="Untertitel" wert={entwurf.org_tagline ?? ""} setze={(v) => setze({ org_tagline: v })} />
          <Feld label="Website" wert={entwurf.website_url ?? ""} setze={(v) => setze({ website_url: v })} />
          <Feld label="Straße" wert={entwurf.org_street ?? ""} setze={(v) => setze({ org_street: v })} />
          <div className="grid grid-cols-3 gap-2">
            <Feld label="PLZ" wert={entwurf.org_zip ?? ""} setze={(v) => setze({ org_zip: v })} />
            <div className="col-span-2">
              <Feld label="Ort" wert={entwurf.org_city ?? ""} setze={(v) => setze({ org_city: v })} />
            </div>
          </div>
          <Feld label="E-Mail" wert={entwurf.org_email ?? ""} setze={(v) => setze({ org_email: v })} />
          <Feld label="Telefon" wert={entwurf.org_phone ?? ""} setze={(v) => setze({ org_phone: v })} />
        </div>
      </Abschnitt>

      {/* ── Gemeinnützigkeit ─────────────────────────────────────────────── */}
      <Abschnitt
        titel="Gemeinnützigkeit"
        hinweis={`Ist ${woerter.organisationBestimmt.toLowerCase()} vom Finanzamt als gemeinnützig anerkannt? Dann bietet DING zusätzlich Bereiche an, die nur dafür gebraucht werden, etwa Fristen und Zuwendungsbestätigungen. Ohne das Häkchen bleiben sie unsichtbar.`}
      >
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={entwurf.is_nonprofit}
            onChange={(e) => setze({ is_nonprofit: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-input shrink-0 accent-primary"
          />
          <span className="text-sm">
            {woerter.organisationBestimmt} ist als gemeinnützig anerkannt
            <span className="block text-xs text-muted-foreground">
              Mit Freistellungsbescheid oder Feststellung nach § 60a AO.
            </span>
          </span>
        </label>

        {entwurf.is_nonprofit && (
          <div className="mt-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <Feld label="Finanzamt" wert={entwurf.tax_office ?? ""} setze={(v) => setze({ tax_office: v })} />
              <Feld label="Steuernummer" wert={entwurf.tax_number ?? ""} setze={(v) => setze({ tax_number: v })} />
              <div>
                <Label className="text-sm">Art des Bescheids</Label>
                <Select
                  value={entwurf.exemption_notice_kind ?? "exemption"}
                  onValueChange={(v) => setze({ exemption_notice_kind: v as "exemption" | "assessment_60a" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exemption">Freistellungsbescheid</SelectItem>
                    <SelectItem value="assessment_60a">Feststellung nach § 60a AO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm">Datum des Bescheids</Label>
                <Input
                  type="date"
                  value={entwurf.exemption_notice_date ?? ""}
                  onChange={(e) => setze({ exemption_notice_date: e.target.value || null })}
                />
              </div>
              {(entwurf.exemption_notice_kind ?? "exemption") === "exemption" && (
                <Feld
                  label="Letzter Veranlagungszeitraum laut Bescheid"
                  wert={entwurf.exemption_notice_period ?? ""}
                  setze={(v) => setze({ exemption_notice_period: v })}
                />
              )}
              <div className="sm:col-span-2">
                <Feld
                  label="Steuerbegünstigte Zwecke laut Bescheid"
                  wert={entwurf.tax_purposes ?? ""}
                  setze={(v) => setze({ tax_purposes: v })}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  So, wie es in der Zuwendungsbestätigung hinter „wegen Förderung“ passt, etwa „der Heimatpflege und
                  Heimatkunde“.
                </p>
              </div>
            </div>
            <BescheidHinweis art={entwurf.exemption_notice_kind ?? "exemption"} datum={entwurf.exemption_notice_date} />
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={entwurf.fees_deductible}
                onChange={(e) => setze({ fees_deductible: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-input shrink-0 accent-primary"
              />
              <span className="text-sm">
                Mitgliedsbeiträge sind steuerlich abziehbar
                <span className="block text-xs text-muted-foreground">
                  Nicht abziehbar sind Beiträge an Vereine, die Sport, kulturelle Betätigungen der
                  Freizeitgestaltung, Heimatpflege und Heimatkunde oder traditionelles Brauchtum fördern
                  (§ 10b Abs. 1 Satz 8 EStG) – das betrifft viele Reenactment-Vereine. Spenden sind davon nicht
                  betroffen. Im Zweifel die Steuerberatung fragen.
                </span>
              </span>
            </label>
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div>
                <Label className="text-sm">Ehrenamtspauschale je Jahr (€)</Label>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={entwurf.volunteer_allowance ?? 960}
                  onChange={(e) => setze({ volunteer_allowance: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-sm">Übungsleiterfreibetrag je Jahr (€)</Label>
                <Input
                  type="number"
                  min={0}
                  step="1"
                  value={entwurf.trainer_allowance ?? 3300}
                  onChange={(e) => setze({ trainer_allowance: Number(e.target.value) || 0 })}
                />
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                § 3 Nr. 26a und Nr. 26 EStG, voreingestellt auf den Stand 2026. Gebraucht bei den Pauschalen unter
                Auslagen; ändert der Gesetzgeber die Beträge, hier anpassen.
              </p>
            </div>
          </div>
        )}
      </Abschnitt>

      {/* ── Aussehen ─────────────────────────────────────────────────────── */}
      <Abschnitt
        titel="Aussehen"
        hinweis="Logo, Farben und Schriften. Was hier steht, gilt auf der öffentlichen Seite und im Mitgliederbereich."
      >
        <div>
          <h4 className="text-sm font-medium mb-1">Logo und Symbol</h4>
          <p className="text-sm text-muted-foreground mb-3">Das Logo steht in der Kopfzeile, das Symbol im Browsertab.</p>
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Beide zeigen, was gerade wirkt – nicht „leer". Das Favicon liegt
              als Datei im Projekt und ist da, auch wenn in der Datenbank
              nichts steht; ein Logo gibt es bisher gar nicht, die Kopfzeile
              zeigt den Namen als Text. Ein leerer Kasten hätte den
              Eindruck erweckt, etwas sei kaputt. */}
          <BildKasten
            titel="Logo"
            adresse={bildAdresse(entwurf.logo_path)}
            ersatz={null}
            ersatzHinweis="Ohne Logo steht der Name als Text in der Kopfzeile."
            laedt={laedtBild === "logo"}
            hinweis="Am besten breit und mit durchsichtigem Hintergrund. PNG oder JPEG, nur diese erscheinen auch auf dem Aufnahmeantrag."
            formate="image/png,image/jpeg,image/svg+xml"
            onDatei={(d) => void bildHochladen("logo", d)}
            onEntfernen={() => void bildEntfernen("logo")}
          />
          <BildKasten
            titel="Symbol (Favicon)"
            adresse={bildAdresse(entwurf.favicon_path)}
            ersatz="/favicon.ico"
            ersatzHinweis="Zurzeit die mitgelieferte Datei aus dem Projekt."
            laedt={laedtBild === "favicon"}
            hinweis="Quadratisch, mindestens 64 × 64. Wird nicht umgewandelt."
            onDatei={(d) => void bildHochladen("favicon", d)}
            onEntfernen={() => void bildEntfernen("favicon")}
          />
        </div>

        {/* Ein eigener Schalter statt „Logo entfernen": Das Logo bleibt
            hinterlegt und wird weiterhin auf dem Aufnahmeantrag gedruckt. Ein
            breites Wappen neben einem langen Namen lässt auf dem Handy sonst
            nichts mehr übrig. */}
        <label className="flex items-start gap-2.5 mt-4 cursor-pointer">
          <input
            type="checkbox"
            checked={entwurf.logo_in_header}
            onChange={(e) => setze({ logo_in_header: e.target.checked })}
            className="mt-0.5 h-4 w-4 rounded border-input shrink-0 accent-primary"
          />
          <span className="text-sm">
            Logo in der Kopfzeile anzeigen
            <span className="block text-xs text-muted-foreground">
              Ausgeschaltet steht dort nur der Name. Auf dem Aufnahmeantrag
              erscheint das Logo weiterhin.
            </span>
          </span>
        </label>
      
        </div>

        <div className="pt-5 mt-5 border-t">
          <h4 className="text-sm font-medium mb-1">Farben</h4>
          <p className="text-sm text-muted-foreground mb-3">Eure Farbe zieht sich durch die ganze Seite: Knöpfe, Links und Hervorhebungen.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <Farbwahl
            label="Eure Farbe"
            wert={entwurf.color_primary}
            setze={(v) => setze({ color_primary: v })}
          />
          <Farbwahl
            label="Dunkler Ton"
            wert={entwurf.color_dark}
            setze={(v) => setze({ color_dark: v })}
            hinweis="Wird nur übernommen, wenn er wirklich dunkel ist."
          />
          <Farbwahl
            label="Kästen"
            wert={entwurf.color_surface}
            setze={(v) => setze({ color_surface: v })}
            hinweis="Die Flächen, auf denen Inhalte liegen. Seitengrund und Rahmen ergeben sich daraus."
            vorschau="flaeche"
          />
        </div>
      
        </div>

        <div className="pt-5 mt-5 border-t">
          <h4 className="text-sm font-medium mb-1">Schriften</h4>
          <p className="text-sm text-muted-foreground mb-3">Alle Schriften stehen unter einer freien Lizenz.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm">Überschriften</Label>
            <Select value={entwurf.font_headings} onValueChange={(v) => setze({ font_headings: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {UEBERSCHRIFT_SCHRIFTEN.map((s) => (
                  <SelectItem key={s.name} value={s.name}>
                    {s.name} – {s.beschreibung}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm">Fließtext</Label>
            <Select value={entwurf.font_body} onValueChange={(v) => setze({ font_body: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEXT_SCHRIFTEN.map((s) => (
                  <SelectItem key={s.name} value={s.name}>
                    {s.name} – {s.beschreibung}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Die Schrift wird erst nach dem Speichern und Neuladen sichtbar.
        </p>
      
        </div>
      </Abschnitt>

      </>)}

      {teil === "beitraege" && (<>
      {/* ── Beiträge ─────────────────────────────────────────────────────── */}
      <Abschnitt
        titel="Beiträge"
        hinweis="Bestimmt, was im Aufnahmeantrag zum Beitrag steht und ob dort überhaupt etwas steht."
      >
        <div className="max-w-md">
          <Label className="text-sm">Wie wird der Beitrag erhoben?</Label>
          <Select
            value={entwurf.contribution_model}
            onValueChange={(v) => setze({ contribution_model: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="fest">Fester Beitragssatz</SelectItem>
              <SelectItem value="umlage">Anteil an den Unkosten des Jahres</SelectItem>
              <SelectItem value="keiner">Kein Beitrag</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-2">
            {entwurf.contribution_model === "fest" &&
              "Je Mitgliedsart ein Betrag pro Jahr, etwa regulär, Student oder Rentner. Die Stufen stehen daneben, die Beträge je Jahr im Bereich Beiträge."}
            {entwurf.contribution_model === "umlage" &&
              "Kein Betrag im Voraus. Die Mitglieder verpflichten sich, sich anteilig an den Unkosten zu beteiligen; die Höhe steht erst nach der Abrechnung fest."}
            {entwurf.contribution_model === "keiner" &&
              "Im Antrag steht kein Betrag und kein Zahlungsrhythmus. Wer den Bereich Beiträge gar nicht braucht, schaltet zusätzlich das Modul ab."}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Der zugehörige Satz in der Erklärung des Aufnahmeantrags steht unter
            Textvorlagen → Aufnahmeantrag.
          </p>
        </div>

        {/* Die Bankverbindung stand bis eben als eigener Abschnitt weit
            darunter. Sie gehoert hierher: Sie taucht an genau zwei Stellen auf,
            im Beitragsbereich und auf dem Aufnahmeantrag. */}
        <div className="pt-5 mt-5 border-t">
          <h4 className="text-sm font-medium mb-1">Bankverbindung</h4>
          <p className="text-sm text-muted-foreground mb-3">
            Steht im Beitragsbereich, damit Mitglieder wissen, wohin sie überweisen.
            Ohne IBAN erscheint der Kasten dort gar nicht.
          </p>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2">
            <Feld
              label="Empfänger"
              wert={entwurf.bank_recipient ?? ""}
              setze={(v) => setze({ bank_recipient: v })}
            />
          </div>
          <Feld label="IBAN" wert={entwurf.bank_iban ?? ""} setze={(v) => setze({ bank_iban: v })} />
          <Feld label="BIC (optional)" wert={entwurf.bank_bic ?? ""} setze={(v) => setze({ bank_bic: v })} />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Ein Lastschrifteinzug findet nicht statt. Bankdaten von Mitgliedern
          werden nirgends erhoben.
        </p>
        </div>

        <div className="max-w-md mt-6">
          <Label htmlFor="aufbewahrung" className="text-sm">
            Beitragsunterlagen aufbewahren
          </Label>
          <div className="flex items-center gap-2 mt-1.5">
            <Input
              id="aufbewahrung"
              type="number"
              min={1}
              max={30}
              className="w-24"
              value={entwurf.contribution_retention_years ?? 5}
              onChange={(e) =>
                setze({ contribution_retention_years: Math.min(30, Math.max(1, Number(e.target.value) || 1)) })
              }
            />
            <span className="text-sm text-muted-foreground">Jahre</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Bestimmt, ab wann eine ausgelaufene Beitragsstufe endgültig gelöscht
            werden darf. Steuerlich sind für Unterlagen der Beitragsverwaltung
            meist zehn Jahre üblich; welche Frist für euch gilt, klärt
            {" "}{woerter.leitungsgruppe}. Achtet darauf, dass die Angabe zur
            Datenschutzerklärung passt.
          </p>
        </div>
      </Abschnitt>

      {hasPermission("contributions.manage") && (
        <Abschnitt
          titel="Beitragsstufen"
          hinweis="Wer wie viel zahlt: regulär, ermässigt, Familie. Die Stufen stehen im Aufnahmeantrag zur Auswahl; die Beträge je Jahr trägt die Kasse im Bereich Beiträge ein."
        >
          <Beitragsstufen />
        </Abschnitt>
      )}
      </>)}

      {teil === "erscheinungsbild" && (<>
      {/* ── E-Mail ───────────────────────────────────────────────────────── */}
      <Abschnitt
        titel="E-Mail-Versand"
        hinweis={`Einladungen, Passwort-Zurücksetzen, Kontaktanfragen und die Abendzusammenfassung gehen über diesen Weg. Solange er nicht steht, legt die Mitgliederverwaltung bei jeder Einladung den Link zum Weitergeben hin — niemand bleibt deshalb ohne Zugang. Was sonst noch fehlt, sagt die Kachel „Einrichtung".`}
      >
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-sm">Versandweg</Label>
            <Select value={entwurf.mail_transport} onValueChange={(v) => setze({ mail_transport: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="microsoft_graph">Microsoft 365 (Graph)</SelectItem>
                <SelectItem value="smtp">SMTP (normaler Mailserver)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <MailAnleitung weg={entwurf.mail_transport} />
          </div>
          <Feld label="Absenderadresse" wert={entwurf.mail_from_address ?? ""} setze={(v) => setze({ mail_from_address: v })} />
          <Feld label="Absendername" wert={entwurf.mail_from_name ?? ""} setze={(v) => setze({ mail_from_name: v })} />
          <Feld label="Antwort an" wert={entwurf.mail_reply_to ?? ""} setze={(v) => setze({ mail_reply_to: v })} />
          <div className="sm:col-span-2">
            <Probeversand ungespeichert={ungespeichert} />
          </div>
        </div>
      </Abschnitt>

      {hasPermission("system.integrations") && (
        <Abschnitt
          titel="Dateiablage"
          hinweis="Wohin die Dateien der Quellensammlung gehen. Titel, Epoche und wer was sehen darf, bleiben immer in DING; nur die Datei selbst liegt woanders."
        >
          <DateiablageWahl
            storage={entwurf.file_storage}
            siteUrl={entwurf.sharepoint_site_url ?? ""}
            setze={setze}
          />
        </Abschnitt>
      )}
      </>)}
    </div>

      {/* Der Knopf bleibt beim Scrollen sichtbar – die Seite ist lang, und ein
          Speichern-Knopf, den man erst suchen muss, wird vergessen. */}
      <div className="flex justify-end sticky bottom-4 z-10 mt-4 lg:mt-0">
        <Button
          className="shadow-lg"
          disabled={speichern.isPending}
          onClick={() => speichern.mutate(entwurf)}
        >
          {speichern.isPending ? <Loader2 size={15} className="mr-1 animate-spin" /> : <Save size={15} className="mr-1" />}
          Speichern
        </Button>
      </div>
    </div>
  );
}

function Abschnitt({ titel, hinweis, children }: {
  titel: string; hinweis?: string; children: React.ReactNode;
}) {
  return (
    <section className="p-5 rounded-lg border bg-card">
      <h3 className="font-serif text-base font-semibold">{titel}</h3>
      {hinweis && <p className="text-sm text-muted-foreground mb-3">{hinweis}</p>}
      {children}
    </section>
  );
}

function Feld({ label, wert, setze }: { label: string; wert: string; setze: (v: string) => void }) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <Input value={wert} onChange={(e) => setze(e.target.value)} />
    </div>
  );
}

/**
 * Farbwahl mit Vorschau.
 *
 * Die Vorschau zeigt einen echten Knopf in der gewählten Farbe, mit der
 * Schrift, die später darauf steht. Ohne das wählt man eine Farbe, findet sie
 * schön, und merkt erst auf der fertigen Seite, dass die Beschriftung darauf
 * nicht zu lesen ist.
 */
function Farbwahl({ label, wert, setze, hinweis, vorschau = "knopf" }: {
  label: string; wert: string; setze: (v: string) => void; hinweis?: string;
  /** Was die Vorschau zeigen soll: einen Knopf oder eine Fläche mit Rahmen. */
  vorschau?: "knopf" | "flaeche";
}) {
  const gueltig = hexToHsl(wert) !== null;
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={gueltig ? wert : "#000000"}
          onChange={(e) => setze(e.target.value)}
          className="h-9 w-12 rounded border cursor-pointer bg-background"
          aria-label={label}
        />
        <Input value={wert} onChange={(e) => setze(e.target.value)} className="font-mono" />
      </div>
      {gueltig && vorschau === "flaeche" ? (
        // Bei der Flächenfarbe zeigt ein Knopf nichts Nützliches. Gebraucht
        // wird der Abstand zwischen Grund, Kasten und Rahmen – genau der lässt
        // sich falsch einstellen.
        <div
          className="mt-2 rounded-md p-3"
          style={{ background: `hsl(${flaechenfarben(wert)?.["--background"]})` }}
        >
          <div
            className="rounded-md border px-3 py-2 text-sm"
            style={{
              background: `hsl(${flaechenfarben(wert)?.["--card"]})`,
              borderColor: `hsl(${flaechenfarben(wert)?.["--border"]})`,
              color: `hsl(${lesbareSchrift(wert)})`,
            }}
          >
            So sieht ein Kasten aus
          </div>
        </div>
      ) : gueltig ? (
        <div
          className="mt-2 inline-flex items-center rounded-md px-4 py-2 text-sm font-medium"
          style={{ background: wert, color: `hsl(${lesbareSchrift(wert)})` }}
        >
          So sieht ein Knopf aus
        </div>
      ) : (
        <p className="mt-2 text-xs text-destructive">Keine gültige Farbe (z. B. #dd9933).</p>
      )}
      {hinweis && <p className="text-xs text-muted-foreground mt-1">{hinweis}</p>}
    </div>
  );
}

function BildKasten({ titel, adresse, ersatz, ersatzHinweis, laedt, hinweis, formate, onDatei, onEntfernen }: {
  titel: string;
  adresse: string | null;
  /** Was ohne eigenes Bild tatsächlich angezeigt wird, falls es so etwas gibt. */
  ersatz: string | null;
  ersatzHinweis: string;
  laedt: boolean;
  hinweis: string;
  /** Welche Dateitypen die Auswahl anbietet. */
  formate?: string;
  onDatei: (d: File | undefined) => void;
  onEntfernen: () => void;
}) {
  const zeigt = adresse ?? ersatz;
  return (
    <div>
      <Label className="text-sm">{titel}</Label>
      <div className="mt-1 flex items-center gap-3">
        <div className="h-16 w-16 rounded border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
          {zeigt ? (
            <img src={zeigt} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-xs text-muted-foreground text-center px-1">kein Bild</span>
          )}
        </div>
        <div className="min-w-0">
          <label className="inline-flex items-center gap-1.5 text-sm text-primary cursor-pointer hover:underline">
            {laedt ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
            {laedt ? "Wird hochgeladen …" : "Datei wählen"}
            <input
              type="file"
              accept={formate ?? "image/*"}
              className="sr-only"
              disabled={laedt}
              onChange={(e) => { onDatei(e.target.files?.[0]); e.target.value = ""; }}
            />
          </label>
          {adresse && (
            <button
              type="button"
              onClick={onEntfernen}
              className="block text-xs text-muted-foreground hover:text-destructive mt-1"
            >
              Entfernen
            </button>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            {adresse ? hinweis : ersatzHinweis}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Probeversand an die eigene Adresse.
 *
 * Die Meldung des Mailservers steht danach im Klartext da. Genau daran
 * scheitert die Einrichtung sonst: „Es kommt nichts an" ist keine Auskunft,
 * „535 Authentication credentials invalid" schon.
 */
function Probeversand({ ungespeichert }: { ungespeichert: boolean }) {
  const [laeuft, setLaeuft] = useState(false);
  const [ergebnis, setErgebnis] = useState<{ ok: boolean; text: string } | null>(null);

  const senden = async () => {
    setLaeuft(true);
    setErgebnis(null);
    try {
      const { data, error } = await supabase.functions.invoke("mail-test");
      // Bei einem Fehlerstatus steckt die eigentliche Meldung im Rumpf der
      // Antwort, nicht in `error` – sonst stuende hier nur „non-2xx status".
      const rumpf = (data ?? {}) as { ok?: boolean; weg?: string; an?: string; fehler?: string };
      if (rumpf.ok) {
        setErgebnis({ ok: true, text: `Über ${rumpf.weg} an ${rumpf.an} verschickt.` });
      } else {
        const ausRumpf = rumpf.fehler ?? (await readFunctionError(error));
        setErgebnis({ ok: false, text: ausRumpf || "Unbekannter Fehler" });
      }
    } catch (err) {
      setErgebnis({ ok: false, text: err instanceof Error ? err.message : String(err) });
    } finally {
      setLaeuft(false);
    }
  };

  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={senden} disabled={laeuft}>
          {laeuft ? <Loader2 size={15} className="mr-1 animate-spin" /> : <Send size={15} className="mr-1" />}
          Probeversand an mich
        </Button>
        <p className="text-xs text-muted-foreground">
          Geht an die Adresse, mit der du angemeldet bist.
          {ungespeichert && " Bitte erst speichern. Geprüft wird der gespeicherte Stand."}
        </p>
      </div>
      {ergebnis && (
        <p
          className={`mt-2 flex items-start gap-1.5 text-sm ${
            ergebnis.ok ? "text-foreground" : "text-destructive"
          }`}
        >
          {ergebnis.ok
            ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
            : <XCircle size={15} className="mt-0.5 shrink-0" />}
          <span className="break-words">{ergebnis.text}</span>
        </p>
      )}
    </div>
  );
}

/**
 * Wie lange der Bescheid noch für Zuwendungsbestätigungen reicht.
 *
 * Ein Freistellungsbescheid höchstens fünf Jahre, eine Feststellung nach
 * § 60a AO höchstens drei Jahre (§ 63 Abs. 5 AO). Danach darf der Verein keine
 * Zuwendungsbestätigungen mehr ausstellen – das merkt man sonst erst, wenn
 * jemand eine braucht.
 */
function BescheidHinweis({ art, datum }: { art: "exemption" | "assessment_60a"; datum: string | null }) {
  if (!datum) return null;
  const jahre = art === "assessment_60a" ? 3 : 5;
  const bis = plusMonate(datum, jahre * 12);
  const tage = tageBis(bis);
  const farbe = tage < 0 ? "text-destructive" : tage < 180 ? "text-amber-700" : "text-muted-foreground";
  return (
    <p className={`text-xs ${farbe}`}>
      {tage < 0
        ? `Der Bescheid ist älter als ${jahre} Jahre. Zuwendungsbestätigungen darf der Verein erst mit einem neuen Bescheid wieder ausstellen.`
        : `Für Zuwendungsbestätigungen reicht der Bescheid bis ${datumDe(bis)} (§ 63 Abs. 5 AO).`}
    </p>
  );
}
