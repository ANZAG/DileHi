import { useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { invokeFunction } from "@/lib/functionError";
import { useWoerter } from "@/hooks/useBranding";
import SharePointAnleitung from "./SharePointAnleitung";

type Storage = "supabase" | "sharepoint";

interface Status {
  ok: boolean;
  fehler?: string;
  website?: string;
  bibliothek?: string;
  ordner?: string;
}

/**
 * Wohin die Dateien der Quellensammlung gehen – ein Abschnitt im Erscheinungsbild.
 *
 * Stand bis zum 14. September als eigene Kachel im Mitgliederbereich. Die
 * Einrichtung gehört aber neben den Mailversand: Beides verbindet DING mit
 * Microsoft 365, beides braucht dieselbe Verzeichnis-ID, und wer das eine
 * einrichtet, hat das andere gleich vor Augen. Im Mitgliederbereich bleibt nur
 * der Eingangskorb, den man im Alltag braucht.
 *
 * Gespeichert wird mit dem Knopf des Erscheinungsbilds. Schaltet jemand auf
 * SharePoint um, prüft die Edge Function dabei die Verbindung – sonst scheiterte
 * erst das nächste Hochladen.
 */
export default function DateiablageWahl({ storage, siteUrl, setze }: {
  storage: Storage;
  siteUrl: string;
  setze: (patch: { file_storage?: Storage; sharepoint_site_url?: string | null }) => void;
}) {
  const woerter = useWoerter();
  const [status, setStatus] = useState<Status | null>(null);
  const [pruefe, setPruefe] = useState(false);

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

  return (
    <div className="space-y-4">
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium mb-2">Neue Dateien speichern in</legend>
        <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
          <input
            type="radio"
            name="ablage"
            checked={storage === "supabase"}
            onChange={() => setze({ file_storage: "supabase" })}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-sm">Supabase</span>
            <span className="block text-xs text-muted-foreground">
              Die Vorgabe. Braucht nichts weiter. Im kostenlosen Tarif höchstens 50 MB je Datei und 1 GB insgesamt.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer">
          <input
            type="radio"
            name="ablage"
            checked={storage === "sharepoint"}
            onChange={() => setze({ file_storage: "sharepoint" })}
            className="mt-1"
          />
          <span>
            <span className="font-medium text-sm">SharePoint (Microsoft 365)</span>
            <span className="block text-xs text-muted-foreground">
              Für grosse Scans. Die Dateien liegen im Ordner „Quellensammlung" einer SharePoint-Website {woerter.organisationGenitiv}.
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
              onChange={(e) => { setze({ sharepoint_site_url: e.target.value }); setStatus(null); }}
              placeholder="https://beispiel.sharepoint.com/sites/Ablage"
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
                <span className="break-words">
                  {status.ok
                    ? `Verbunden: Website „${status.website}", Bibliothek „${status.bibliothek}", Ordner „${status.ordner}".`
                    : status.fehler}
                </span>
              </p>
            )}
          </div>
          <SharePointAnleitung siteUrl={siteUrl} />
        </div>
      )}
    </div>
  );
}
