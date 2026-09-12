import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useKategorien } from "@/hooks/useKategorien";
import { invokeFunction } from "@/lib/functionError";

const db = supabase as unknown as { from: (t: string) => any };

type Storage = "supabase" | "sharepoint";

interface Status {
  ok: boolean;
  fehler?: string;
  website?: string;
  bibliothek?: string;
  ordner?: string;
}

/**
 * Wohin die Dateien der Quellensammlung gehen.
 *
 * Supabase ist die Vorgabe und braucht nichts weiter. SharePoint lohnt sich
 * für einen Verein mit Microsoft 365: viel Platz, keine Grenze von 50 MB je
 * Datei. Titel, Epoche, Ordner und wer was sehen darf bleiben in DING; nur
 * die Datei liegt dort.
 */
export default function FileStorageAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["file-storage-settings"],
    queryFn: async () => {
      const { data, error } = await db.from("app_settings").select("file_storage, sharepoint_site_url").maybeSingle();
      if (error) throw new Error(error.message);
      return data as { file_storage: Storage; sharepoint_site_url: string | null };
    },
  });

  const [storage, setStorage] = useState<Storage>("supabase");
  const [siteUrl, setSiteUrl] = useState("");
  useEffect(() => {
    if (!settings) return;
    setStorage(settings.file_storage);
    setSiteUrl(settings.sharepoint_site_url ?? "");
  }, [settings]);

  const [status, setStatus] = useState<Status | null>(null);
  const [pruefe, setPruefe] = useState(false);
  const [speichere, setSpeichere] = useState(false);

  const pruefen = async () => {
    setPruefe(true);
    setStatus(null);
    try {
      setStatus(await invokeFunction<Status>("sharepoint-files", { body: { action: "status", siteUrl } }));
    } catch (err) {
      setStatus({ ok: false, fehler: (err as Error).message });
    } finally {
      setPruefe(false);
    }
  };

  const speichern = async () => {
    setSpeichere(true);
    try {
      await invokeFunction("sharepoint-files", { body: { action: "settings", fileStorage: storage, siteUrl } });
      queryClient.invalidateQueries({ queryKey: ["file-storage-settings"] });
      queryClient.invalidateQueries({ queryKey: ["file-storage"] });
      toast({ title: "Gespeichert" });
    } catch (err) {
      toast({ title: "Nicht gespeichert", description: (err as Error).message, variant: "destructive" });
    } finally {
      setSpeichere(false);
    }
  };

  const geaendert =
    !!settings && (storage !== settings.file_storage || siteUrl.trim() !== (settings.sharepoint_site_url ?? ""));

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="font-serif text-lg font-semibold">Dateiablage</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Wohin die Dateien der Quellensammlung gehen. Titel, Epoche, Ordner und wer was sehen darf,
          bleiben immer hier; nur die Datei selbst liegt woanders.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium mb-2">Neue Dateien speichern in</legend>
        <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
          <input type="radio" name="ablage" checked={storage === "supabase"} onChange={() => setStorage("supabase")} className="mt-1" />
          <span>
            <span className="font-medium text-sm">Supabase</span>
            <span className="block text-xs text-muted-foreground">
              Die Vorgabe. Braucht nichts weiter. Im kostenlosen Tarif höchstens 50 MB je Datei und 1 GB insgesamt.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
          <input type="radio" name="ablage" checked={storage === "sharepoint"} onChange={() => setStorage("sharepoint")} className="mt-1" />
          <span>
            <span className="font-medium text-sm">SharePoint (Microsoft 365)</span>
            <span className="block text-xs text-muted-foreground">
              Für grosse Scans. Die Dateien liegen im Ordner „Quellensammlung" einer SharePoint-Website des Vereins.
            </span>
          </span>
        </label>
      </fieldset>

      {storage === "sharepoint" && (
        <div className="space-y-3">
          <div>
            <Label htmlFor="sp-url" className="text-sm">Adresse der SharePoint-Website</Label>
            <Input
              id="sp-url"
              value={siteUrl}
              onChange={(e) => { setSiteUrl(e.target.value); setStatus(null); }}
              placeholder="https://verein.sharepoint.com/sites/Vereinsablage"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Die Adresse der Website, so wie sie im Browser steht, ohne alles hinter dem Namen der Website.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" onClick={pruefen} disabled={pruefe || !siteUrl.trim()}>
              {pruefe && <Loader2 size={15} className="mr-1 animate-spin" />} Verbindung prüfen
            </Button>
            {status && (
              <p className={`text-sm flex items-start gap-1.5 ${status.ok ? "text-green-700" : "text-destructive"}`}>
                {status.ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0" /> : <XCircle size={15} className="mt-0.5 shrink-0" />}
                <span>
                  {status.ok
                    ? `Verbunden: Website „${status.website}", Bibliothek „${status.bibliothek}", Ordner „${status.ordner}".`
                    : status.fehler}
                </span>
              </p>
            )}
          </div>
          <Einrichtung />
        </div>
      )}

      <Button onClick={speichern} disabled={!geaendert || speichere}>
        {speichere && <Loader2 size={15} className="mr-1 animate-spin" />} Speichern
      </Button>

      {settings?.file_storage === "sharepoint" && <Verschieben />}
      {settings?.file_storage === "sharepoint" && <Posteingang />}
    </div>
  );
}

/** Kurz, was vorher in Microsoft 365 einzurichten ist. Ausführlich: docs/sharepoint.md. */
function Einrichtung() {
  return (
    <details className="rounded-lg border bg-muted/30 p-3 text-sm">
      <summary className="cursor-pointer font-medium">SharePoint einrichten</summary>
      <ol className="mt-3 space-y-2 text-muted-foreground list-decimal pl-5">
        <li>In SharePoint eine Website für den Verein anlegen, etwa „Vereinsablage". Ihre Adresse kommt oben ins Feld.</li>
        <li>
          Im Microsoft Entra Admin Center eine App registrieren, etwa „DING Dateiablage". Unter
          API-Berechtigungen: Microsoft Graph → Anwendungsberechtigung <code>Sites.Selected</code>, dann
          Administratorzustimmung erteilen. Einen geheimen Clientschlüssel anlegen.
        </li>
        <li>
          Dieser App im Graph Explorer die eine Website freigeben (Schreibrecht). Ohne diesen Schritt sieht die App
          nichts – das ist gewollt.
        </li>
        <li>
          In Supabase unter Edge Functions → Secrets eintragen: <code>SHAREPOINT_CLIENT_ID</code>,{" "}
          <code>SHAREPOINT_CLIENT_SECRET</code> und <code>SHAREPOINT_TENANT_ID</code> – letzteres nur, wenn der
          Mailversand über Microsoft noch nicht eingerichtet ist; sonst gilt <code>MS_TENANT_ID</code>.
        </li>
        <li>Hier „Verbindung prüfen", dann SharePoint wählen und speichern.</li>
      </ol>
    </details>
  );
}

interface Ergebnis {
  verschoben: number;
  fehlt: number;
  fehler: string[];
}

/**
 * Was schon im Supabase-Speicher liegt, nach SharePoint tragen.
 *
 * Eine Datei nach der anderen: Die Edge Function lädt sie aus dem Speicher
 * und legt sie in SharePoint ab, danach erst wird sie im Speicher gelöscht.
 * Bricht der Vorgang ab, lässt er sich einfach neu starten – was schon
 * drüben ist, wird übersprungen.
 */
function Verschieben() {
  const queryClient = useQueryClient();
  const { data: offen = [], refetch } = useQuery({
    queryKey: ["sources-in-supabase"],
    queryFn: async () => {
      const { data, error } = await db.from("sources")
        .select("id, title").is("drive_item_id", null).not("file_path", "is", null).eq("file_missing", false);
      if (error) throw new Error(error.message);
      return (data ?? []) as { id: string; title: string }[];
    },
  });

  const [laeuft, setLaeuft] = useState(false);
  const [erledigt, setErledigt] = useState(0);
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null);

  const starten = async () => {
    setLaeuft(true);
    setErledigt(0);
    const e: Ergebnis = { verschoben: 0, fehlt: 0, fehler: [] };
    for (const [i, s] of offen.entries()) {
      try {
        const r = await invokeFunction<{ ergebnis: string }>("sharepoint-files", { body: { action: "move", sourceId: s.id } });
        if (r.ergebnis === "fehlt") e.fehlt++;
        else e.verschoben++;
      } catch (err) {
        e.fehler.push(`${s.title}: ${(err as Error).message}`);
      }
      setErledigt(i + 1);
    }
    setErgebnis(e);
    setLaeuft(false);
    refetch();
    queryClient.invalidateQueries({ queryKey: ["sources"] });
  };

  return (
    <div className="space-y-3 border-t pt-6">
      <h3 className="font-medium">Vorhandene Dateien verschieben</h3>
      <p className="text-sm text-muted-foreground">
        {offen.length === 0
          ? "Alle Dateien der Quellensammlung liegen in SharePoint."
          : `${offen.length} Datei${offen.length === 1 ? " liegt" : "en liegen"} noch im Supabase-Speicher.`}
      </p>
      {offen.length > 0 && (
        <Button variant="outline" onClick={starten} disabled={laeuft}>
          {laeuft && <Loader2 size={15} className="mr-1 animate-spin" />} Nach SharePoint verschieben
        </Button>
      )}
      {laeuft && (
        <div className="space-y-1">
          <Progress value={(erledigt / Math.max(offen.length, 1)) * 100} className="h-1.5" />
          <p className="text-xs text-muted-foreground">{erledigt} von {offen.length}</p>
        </div>
      )}
      {ergebnis && (
        <div className="text-sm space-y-1">
          <p>{ergebnis.verschoben} verschoben.</p>
          {ergebnis.fehlt > 0 && (
            <p className="text-amber-700">
              {ergebnis.fehlt} Datei{ergebnis.fehlt === 1 ? "" : "en"} waren im Speicher nicht zu finden. Die Quellen
              stehen in der Quellensammlung mit „Die Datei fehlt" – dort lässt sich die Datei nachreichen.
            </p>
          )}
          {ergebnis.fehler.map((f) => <p key={f} className="text-destructive break-words">{f}</p>)}
        </div>
      )}
    </div>
  );
}

interface Eingang {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string | null;
}

interface OhneDatei {
  id: string;
  title: string;
  epoch: string;
  file_missing: boolean;
}

const mb = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

/**
 * Der Eingangskorb.
 *
 * Grosse Scans über den Browser hochzuladen ist muehsam. Wer den Ordner der
 * SharePoint-Website mit dem Explorer verbindet, legt sie einfach hinein –
 * hier tauchen sie dann auf und werden einer Quelle zugeordnet. Beim
 * Zuordnen wandert die Datei in die Quellensammlung, damit der Korb leer
 * bleibt und jede Datei an ihrem Platz liegt.
 *
 * Gesucht wird in der ganzen Bibliothek ausserhalb der Quellensammlung, nicht
 * nur im Ordner „Posteingang": Wer seine Dateien woanders abgelegt hat, soll
 * sie trotzdem finden.
 */
function Posteingang() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const kategorien = useKategorien();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["sharepoint-inbox"],
    queryFn: () => invokeFunction<{ ordner: string; dateien: Eingang[] }>("sharepoint-files", { body: { action: "inbox" } }),
  });

  // Alles ohne Datei in SharePoint – auch die Quellen, die noch auf eine
  // verlorene Datei zeigen und in der Quellensammlung „Die Datei fehlt"
  // anzeigen. Gerade die warten ja auf einen Nachschub aus dem Korb.
  const { data: ohneDatei = [], error: quellenFehler } = useQuery({
    queryKey: ["sources-ohne-datei"],
    queryFn: async () => {
      const { data, error } = await db.from("sources")
        .select("id, title, epoch, file_missing").is("drive_item_id", null).order("title");
      if (error) throw new Error(error.message);
      return (data ?? []) as OhneDatei[];
    },
  });

  const dateien = data?.dateien ?? [];
  // Wessen Datei verloren ging, steht oben: Danach sucht man hier zuerst.
  const fehlende = ohneDatei.filter((q) => q.file_missing);
  const leere = ohneDatei.filter((q) => !q.file_missing);

  const [wahl, setWahl] = useState<Record<string, string>>({});
  const [laeuft, setLaeuft] = useState(false);
  const [erledigt, setErledigt] = useState(0);
  const [fehler, setFehler] = useState<string[]>([]);

  const gewaehlt = dateien.filter((d) => wahl[d.id]).length;

  /**
   * Alle getroffenen Zuordnungen auf einmal.
   *
   * Eine nach der anderen, nicht alle gleichzeitig: Jede verschiebt eine
   * Datei in SharePoint, und Graph nimmt es übel, wenn zwanzig Anfragen
   * zugleich denselben Ordner anlegen wollen. Was scheitert, hält den Rest
   * nicht auf und steht danach in der Liste.
   */
  const zuordnen = async () => {
    const offen = dateien.filter((d) => wahl[d.id]);
    if (offen.length === 0) return;
    setLaeuft(true);
    setErledigt(0);
    setFehler([]);
    const gescheitert: string[] = [];
    const geschafft: string[] = [];

    for (const [i, datei] of offen.entries()) {
      const ziel = wahl[datei.id];
      try {
        await invokeFunction("sharepoint-files", {
          body: ziel.startsWith("neu:")
            ? { action: "claim", driveItemId: datei.id, epoch: ziel.slice(4), title: datei.name }
            : { action: "claim", driveItemId: datei.id, sourceId: ziel },
        });
        geschafft.push(datei.id);
      } catch (err) {
        gescheitert.push(`${datei.name}: ${(err as Error).message}`);
      }
      setErledigt(i + 1);
    }

    // Nur die erledigten aus der Auswahl nehmen – was scheiterte, bleibt
    // eingestellt, damit man es gleich noch einmal versuchen kann.
    setWahl((w) => {
      const rest = { ...w };
      for (const id of geschafft) delete rest[id];
      return rest;
    });
    setFehler(gescheitert);
    setLaeuft(false);
    if (geschafft.length > 0) {
      toast({
        title: geschafft.length === 1 ? "Eine Datei zugeordnet" : `${geschafft.length} Dateien zugeordnet`,
      });
    }
    refetch();
    queryClient.invalidateQueries({ queryKey: ["sources-ohne-datei"] });
    queryClient.invalidateQueries({ queryKey: ["sources"] });
  };

  return (
    <div className="space-y-3 border-t pt-6">
      <h3 className="font-medium">Eingangskorb</h3>
      <p className="text-sm text-muted-foreground">
        Dateien, die in der SharePoint-Website liegen, aber zu keiner Quelle gehören. Grosse Scans legst du am
        besten mit dem Explorer in den Ordner „{data?.ordner ?? "Posteingang"}" – dann brauchst du den Browser
        zum Hochladen nicht. Beim Zuordnen wandert die Datei in die Quellensammlung.
      </p>

      {isLoading && <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 size={15} className="animate-spin" /> Sehe nach …</p>}
      {error && <p className="text-sm text-destructive break-words">{(error as Error).message}</p>}
      {quellenFehler && (
        <p className="text-sm text-destructive break-words">
          Die Quellen liessen sich nicht laden: {(quellenFehler as Error).message}
        </p>
      )}
      {!isLoading && !error && dateien.length === 0 && (
        <p className="text-sm text-muted-foreground">Der Eingangskorb ist leer.</p>
      )}

      {/* Erst alle Zuordnungen einstellen, dann ein Knopf für alle: Bei
          vierzig Büchern ist jeder einzelne Klick einer zu viel. */}
      {dateien.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 sticky top-0 bg-background py-2 z-10">
          <Button onClick={zuordnen} disabled={gewaehlt === 0 || laeuft}>
            {laeuft && <Loader2 size={15} className="mr-1 animate-spin" />}
            {gewaehlt === 0
              ? "Nichts ausgewählt"
              : gewaehlt === 1 ? "Eine Datei zuordnen" : `${gewaehlt} Dateien zuordnen`}
          </Button>
          {laeuft && <span className="text-sm text-muted-foreground">{erledigt} von {gewaehlt}</span>}
        </div>
      )}

      {fehler.length > 0 && (
        <div className="text-sm space-y-1">
          {fehler.map((f) => <p key={f} className="text-destructive break-words">{f}</p>)}
        </div>
      )}

      <ul className="space-y-2">
        {dateien.map((d) => (
          <li key={d.id} className="rounded-lg border p-3 space-y-2 min-w-0">
            <p className="font-medium text-sm break-words">{d.name}</p>
            <p className="text-xs text-muted-foreground break-all">{mb(d.size)} · {d.path}</p>
            <select
              className="h-9 w-full block rounded-md border bg-background px-2 text-sm"
              aria-label={`Wohin gehört ${d.name}?`}
              value={wahl[d.id] ?? ""}
              disabled={laeuft}
              onChange={(e) => setWahl((w) => ({ ...w, [d.id]: e.target.value }))}
            >
              <option value="">Wohin gehört die Datei?</option>
              {fehlende.length > 0 && (
                <optgroup label="Quelle, deren Datei fehlt">
                  {fehlende.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
                </optgroup>
              )}
              {leere.length > 0 && (
                <optgroup label="Quelle ohne Datei">
                  {leere.map((q) => <option key={q.id} value={q.id}>{q.title}</option>)}
                </optgroup>
              )}
              <optgroup label="Neue Quelle anlegen">
                {kategorien.map((k) => <option key={k.value} value={`neu:${k.value}`}>Neue Quelle in „{k.label}"</option>)}
              </optgroup>
            </select>
          </li>
        ))}
      </ul>
    </div>
  );
}
