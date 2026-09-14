import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/functionError";
import {
  dateiLesen, FELDER, zeilenPruefen, zuordnungRaten, VORLAGE_CSV,
  type Feld, type ImportStatus, type Pruefung,
} from "@/lib/import";

type Ergebnis =
  | { email: string; status: "created"; userId: string; warning?: string }
  | { email: string; status: "exists" }
  | { email: string; status: "error"; message: string };

const NICHT = "__nicht__";
const TEIL = 25;

const STATUS: Record<ImportStatus, { label: string; farbe: string }> = {
  neu: { label: "Wird angelegt", farbe: "bg-green-100 text-green-800" },
  vorhanden: { label: "Schon da", farbe: "bg-muted text-muted-foreground" },
  doppelt: { label: "Doppelt", farbe: "bg-amber-100 text-amber-800" },
  fehler: { label: "Fehler", farbe: "bg-red-100 text-red-800" },
};

/**
 * Mitglieder aus einer Datei übernehmen, in drei Schritten: Datei wählen,
 * Spalten zuordnen, Vorschau prüfen. Erst danach entsteht ein Konto.
 */
export default function MitgliederImport({ rollen, standardRolle }: { rollen: { key: string; label: string }[]; standardRolle: string }) {
  const qc = useQueryClient();
  const [offen, setOffen] = useState(false);
  const [schritt, setSchritt] = useState<"datei" | "zuordnung" | "vorschau" | "fertig">("datei");
  const [dateiname, setDateiname] = useState("");
  const [roh, setRoh] = useState<string[][]>([]);
  const [mitKopf, setMitKopf] = useState(true);
  const [zuordnung, setZuordnung] = useState<(Feld | "")[]>([]);
  const [rolle, setRolle] = useState(standardRolle);
  const [einladen, setEinladen] = useState(false);
  const [lesefehler, setLesefehler] = useState<string | null>(null);
  const [liest, setLiest] = useState(false);
  const [laeuft, setLaeuft] = useState(false);
  const [erledigt, setErledigt] = useState(0);
  const [ergebnisse, setErgebnisse] = useState<Ergebnis[]>([]);

  const { data: mitgliedsarten = [] } = useQuery({
    queryKey: ["import", "mitgliedsarten"],
    queryFn: async () => {
      const { data } = await (supabase as unknown as { from: (t: string) => any })
        .from("contribution_categories").select("key, label").eq("is_active", true).order("sort_order");
      return (data ?? []) as { key: string; label: string }[];
    },
    enabled: offen,
  });

  const { data: vorhanden, isLoading: adressenLaden } = useQuery({
    queryKey: ["import", "vorhandene-adressen"],
    queryFn: async () => {
      const r = await invokeFunction<Record<string, string>>("manage-member", { body: { action: "get_emails", userIds: [] } });
      return new Set(Object.values(r).map((e) => e.toLowerCase()));
    },
    enabled: offen && schritt !== "datei",
  });

  const spalten = Math.max(0, ...roh.map((r) => r.length));
  const kopf = Array.from({ length: spalten }, (_, i) => (mitKopf ? roh[0]?.[i] || `Spalte ${i + 1}` : `Spalte ${i + 1}`));
  const daten = useMemo(() => (mitKopf ? roh.slice(1) : roh), [roh, mitKopf]);

  const pruefung: Pruefung[] = useMemo(
    () => zeilenPruefen(daten, zuordnung, { vorhanden: vorhanden ?? new Set(), mitgliedsarten, ersteZeileNummer: mitKopf ? 2 : 1 }),
    [daten, zuordnung, vorhanden, mitgliedsarten, mitKopf]
  );
  const anzahl = (s: ImportStatus) => pruefung.filter((p) => p.status === s).length;
  const neu = pruefung.filter((p) => p.status === "neu");

  const ohneEmail = !zuordnung.includes("email");
  const ohneName = !zuordnung.some((f) => f === "first_name" || f === "last_name" || f === "full_name");

  const zuruecksetzen = () => {
    setSchritt("datei");
    setRoh([]);
    setZuordnung([]);
    setDateiname("");
    setLesefehler(null);
    setErgebnisse([]);
    setErledigt(0);
    setEinladen(false);
    setRolle(standardRolle);
  };

  const dateiWaehlen = async (datei: File | undefined) => {
    if (!datei) return;
    setLesefehler(null);
    setLiest(true);
    try {
      const zeilen = await dateiLesen(datei);
      if (zeilen.length === 0) throw new Error("In der Datei stehen keine Zeilen.");
      setDateiname(datei.name);
      setRoh(zeilen);
      setMitKopf(true);
      setZuordnung(zuordnungRaten(zeilen[0]));
      setSchritt("zuordnung");
    } catch (e) {
      setLesefehler(e instanceof Error ? e.message : String(e));
    } finally {
      setLiest(false);
    }
  };

  const vorlageHerunterladen = () => {
    const url = URL.createObjectURL(new Blob([VORLAGE_CSV], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "Mitglieder-Vorlage.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const importieren = async () => {
    setLaeuft(true);
    const alle: Ergebnis[] = [];
    for (let i = 0; i < neu.length; i += TEIL) {
      const teil = neu.slice(i, i + TEIL);
      try {
        const r = await invokeFunction<{ results: Ergebnis[] }>("import-members", {
          body: { rows: teil.map((p) => p.zeile), role: rolle, invite: einladen },
        });
        alle.push(...r.results);
      } catch (e) {
        const message = e instanceof Error ? e.message : String(e);
        alle.push(...teil.map((p) => ({ email: p.zeile.email, status: "error" as const, message })));
      }
      setErledigt(Math.min(neu.length, i + TEIL));
      setErgebnisse([...alle]);
    }
    setLaeuft(false);
    setSchritt("fertig");
    qc.invalidateQueries({ queryKey: ["members"] });
  };

  const angelegt = ergebnisse.filter((e) => e.status === "created");
  const fehlgeschlagen = ergebnisse.filter((e): e is Extract<Ergebnis, { status: "error" }> => e.status === "error");
  const mitWarnung = ergebnisse.filter((e): e is Extract<Ergebnis, { status: "created" }> => e.status === "created" && !!e.warning);

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOffen(true)}>
        <FileSpreadsheet size={15} className="mr-1" /> Aus Datei importieren
      </Button>

      <Dialog
        open={offen}
        onOpenChange={(v) => {
          if (laeuft) return;
          setOffen(v);
          if (!v) zuruecksetzen();
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mitglieder importieren</DialogTitle>
            <DialogDescription>
              {schritt === "datei" && "Eine Mitgliederliste als Excel-Datei (.xlsx) oder CSV – etwa aus einer Tabelle oder aus der bisherigen Vereinssoftware."}
              {schritt === "zuordnung" && `${dateiname}: ${daten.length} Zeilen. Welche Spalte ist was? Erkannte Spalten sind schon eingetragen.`}
              {schritt === "vorschau" && "Noch ist nichts angelegt. So sähe es aus:"}
              {schritt === "fertig" && "Fertig."}
            </DialogDescription>
          </DialogHeader>

          {schritt === "datei" && (
            <div className="space-y-4">
              <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center cursor-pointer hover:bg-muted/40">
                {liest ? <Loader2 className="animate-spin text-muted-foreground" /> : <Upload className="text-muted-foreground" />}
                <span className="text-sm font-medium">Datei auswählen</span>
                <span className="text-xs text-muted-foreground">.xlsx oder .csv</span>
                <input
                  type="file"
                  accept=".xlsx,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  className="sr-only"
                  onChange={(e) => dateiWaehlen(e.target.files?.[0])}
                />
              </label>
              {lesefehler && (
                <p className="text-sm text-destructive flex gap-2"><AlertTriangle size={16} className="shrink-0 mt-0.5" /> {lesefehler}</p>
              )}
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  Aus anderer Vereinssoftware: dort die Mitglieder als Excel oder CSV exportieren. Spaltennamen wie
                  „Name“, „Str.“ oder „Mitglied seit“ werden erkannt.
                </p>
                <p>
                  Noch keine Liste?{" "}
                  <button type="button" className="underline hover:text-foreground" onClick={vorlageHerunterladen}>
                    Vorlage herunterladen
                  </button>{" "}
                  und in Excel ausfüllen.
                </p>
              </div>
            </div>
          )}

          {schritt === "zuordnung" && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-primary"
                  checked={mitKopf}
                  onChange={(e) => {
                    setMitKopf(e.target.checked);
                    setZuordnung(e.target.checked ? zuordnungRaten(roh[0] ?? []) : Array(spalten).fill(""));
                  }}
                />
                Die erste Zeile enthält die Spaltennamen
              </label>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Spalte in der Datei</th>
                      <th className="px-3 py-2 font-medium">Beispiele</th>
                      <th className="px-3 py-2 font-medium">In DING</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {kopf.map((name, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2 whitespace-nowrap font-medium">{name}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground max-w-[16rem] truncate">
                          {daten.map((z) => z[i]).filter(Boolean).slice(0, 3).join(" · ")}
                        </td>
                        <td className="px-3 py-2 min-w-[12rem]">
                          <Select
                            value={zuordnung[i] || NICHT}
                            onValueChange={(v) =>
                              setZuordnung((alt) => {
                                const neu = [...alt];
                                // Jedes Feld nur einmal: eine frühere Zuordnung wird frei.
                                if (v !== NICHT) neu.forEach((f, j) => { if (f === v) neu[j] = ""; });
                                neu[i] = v === NICHT ? "" : (v as Feld);
                                return neu;
                              })
                            }
                          >
                            <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NICHT}>– nicht übernehmen –</SelectItem>
                              {FELDER.map((f) => <SelectItem key={f.key} value={f.key}>{f.label}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {(ohneEmail || ohneName) && (
                <p className="text-sm text-amber-800 flex gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  {ohneEmail ? "Ohne Spalte für die E-Mail-Adresse geht es nicht weiter – sie ist der Zugang." : "Bitte eine Spalte für den Namen zuordnen."}
                </p>
              )}
            </div>
          )}

          {schritt === "vorschau" && (
            <div className="space-y-4">
              {adressenLaden ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Vergleiche mit den vorhandenen Mitgliedern …</p>
              ) : (
                <div className="flex flex-wrap gap-2 text-xs">
                  {(Object.keys(STATUS) as ImportStatus[]).map((s) => (
                    <span key={s} className={`px-2 py-1 rounded ${STATUS[s].farbe}`}>{STATUS[s].label}: {anzahl(s)}</span>
                  ))}
                </div>
              )}
              <div className="overflow-auto max-h-80 rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-left text-xs text-muted-foreground sticky top-0">
                    <tr>
                      <th className="px-2 py-2 font-medium">Zeile</th>
                      <th className="px-2 py-2 font-medium">Name</th>
                      <th className="px-2 py-2 font-medium">E-Mail</th>
                      <th className="px-2 py-2 font-medium">Ort</th>
                      <th className="px-2 py-2 font-medium">Stand</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {pruefung.map((p) => (
                      <tr key={p.nummer} className="align-top">
                        <td className="px-2 py-1.5 text-muted-foreground">{p.nummer}</td>
                        <td className="px-2 py-1.5 whitespace-nowrap">{[p.zeile.first_name, p.zeile.last_name].filter(Boolean).join(" ")}</td>
                        <td className="px-2 py-1.5">{p.zeile.email}</td>
                        <td className="px-2 py-1.5">{[p.zeile.zip, p.zeile.city].filter(Boolean).join(" ")}</td>
                        <td className="px-2 py-1.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded whitespace-nowrap ${STATUS[p.status].farbe}`}>{STATUS[p.status].label}</span>
                          {p.meldungen.map((m) => <span key={m} className="block text-xs text-muted-foreground mt-0.5">{m}</span>)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <span className="text-xs font-medium">Rolle für alle neuen Mitglieder</span>
                  <Select value={rolle} onValueChange={setRolle}>
                    <SelectTrigger className="h-9 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {rollen.map((r) => <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-start gap-2 text-sm cursor-pointer">
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-primary" checked={einladen} onChange={(e) => setEinladen(e.target.checked)} />
                  <span>
                    Einladung per Mail gleich verschicken
                    <span className="block text-xs text-muted-foreground">
                      Ohne Häkchen entstehen nur die Konten. Mitglieder setzen ihr Passwort dann selbst über
                      „Passwort vergessen“ – praktisch, wenn der Verein vorher Bescheid geben will.
                    </span>
                  </span>
                </label>
              </div>
              {laeuft && (
                <div className="space-y-1">
                  <div className="h-2 rounded bg-muted overflow-hidden">
                    <div className="h-full bg-primary transition-all" style={{ width: `${neu.length ? (erledigt / neu.length) * 100 : 0}%` }} />
                  </div>
                  <p className="text-xs text-muted-foreground">{erledigt} von {neu.length} – bitte das Fenster offen lassen.</p>
                </div>
              )}
            </div>
          )}

          {schritt === "fertig" && (
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2"><CheckCircle2 size={18} className="text-green-600" /> {angelegt.length} Mitglieder angelegt{einladen && angelegt.length > 0 ? " und eingeladen" : ""}.</p>
              {ergebnisse.some((e) => e.status === "exists") && (
                <p className="text-muted-foreground">{ergebnisse.filter((e) => e.status === "exists").length} waren inzwischen schon vorhanden und wurden übersprungen.</p>
              )}
              {(fehlgeschlagen.length > 0 || mitWarnung.length > 0) && (
                <ul className="rounded-lg border divide-y">
                  {fehlgeschlagen.map((e) => <li key={e.email} className="px-3 py-2"><span className="font-medium">{e.email}</span>: <span className="text-destructive">{e.message}</span></li>)}
                  {mitWarnung.map((e) => <li key={e.email} className="px-3 py-2"><span className="font-medium">{e.email}</span>: <span className="text-amber-800">{e.warning}</span></li>)}
                </ul>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {schritt === "zuordnung" && (
              <>
                <Button variant="outline" onClick={zuruecksetzen}>Andere Datei</Button>
                <Button onClick={() => setSchritt("vorschau")} disabled={ohneEmail || ohneName}>Weiter zur Vorschau</Button>
              </>
            )}
            {schritt === "vorschau" && (
              <>
                <Button variant="outline" onClick={() => setSchritt("zuordnung")} disabled={laeuft}>Zurück</Button>
                <Button onClick={importieren} disabled={laeuft || adressenLaden || neu.length === 0}>
                  {laeuft && <Loader2 size={14} className="mr-1 animate-spin" />}
                  {neu.length === 1 ? "1 Mitglied anlegen" : `${neu.length} Mitglieder anlegen`}
                </Button>
              </>
            )}
            {schritt === "fertig" && (
              <>
                <Button variant="outline" onClick={zuruecksetzen}>Weitere Datei</Button>
                <Button onClick={() => { setOffen(false); zuruecksetzen(); }}>Schließen</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
