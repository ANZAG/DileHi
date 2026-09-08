import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ImagePlus, Loader2, Save, Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { convertToWebP } from "@/lib/imageConversion";
import { TEXT_SCHRIFTEN, UEBERSCHRIFT_SCHRIFTEN } from "@/lib/schriften";
import { hexToHsl, lesbareSchrift } from "@/lib/farben";

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
  color_primary: string;
  color_dark: string;
  font_headings: string;
  font_body: string;
  seo_description: string | null;
  mail_from_address: string | null;
  mail_from_name: string | null;
  mail_reply_to: string | null;
  mail_transport: string;
  calendar_timezone: string;
}

const db = supabase as unknown as { from: (t: string) => any };

/**
 * Vereinsdaten und Erscheinungsbild.
 *
 * Alles hier stand schon in der Datenbank – nur gab es keine Stelle, an der man
 * es ändern konnte. Für eine Installation, die ein anderer Verein aufsetzt, ist
 * das der Unterschied zwischen „Software" und „unsere Software mit ihrem
 * Namen darauf".
 */
export default function ErscheinungsbildAdmin() {
  const { toast } = useToast();
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
      const { error } = await db.from("app_settings").update(werte).eq("id", true);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Gespeichert" });
      // Das Erscheinungsbild hängt an einer eigenen Abfrage – ohne das bleibt
      // die alte Farbe stehen, bis jemand neu lädt.
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
      queryClient.invalidateQueries({ queryKey: ["branding"] });
    },
    onError: (err: Error) =>
      toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  const bildHochladen = async (art: "logo" | "favicon", datei: File | undefined) => {
    if (!datei || !entwurf) return;
    setLaedtBild(art);
    try {
      // Favicons dürfen nicht umgewandelt werden: Ein .ico oder ein SVG
      // verliert dabei genau das, was es zum Favicon macht.
      const hochzuladen = art === "logo" ? await convertToWebP(datei) : datei;
      const pfad = `branding/${art}-${Date.now()}_${hochzuladen.name}`;
      const { error } = await supabase.storage
        .from("gallery")
        .upload(pfad, hochzuladen, { contentType: hochzuladen.type || undefined });
      if (error) throw new Error(error.message);
      setEntwurf({ ...entwurf, [art === "logo" ? "logo_path" : "favicon_path"]: pfad });
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
    <div className="space-y-8">
      {/* ── Verein ───────────────────────────────────────────────────────── */}
      <Abschnitt titel="Verein" hinweis="Name und Anschrift, wie sie auf der Seite und in Mails erscheinen.">
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

      {/* ── Logo und Favicon ─────────────────────────────────────────────── */}
      <Abschnitt titel="Logo und Symbol" hinweis="Das Logo steht in der Kopfzeile, das Symbol im Browsertab.">
        <div className="grid sm:grid-cols-2 gap-6">
          {/* Beide zeigen, was gerade wirkt – nicht „leer". Das Favicon liegt
              als Datei im Projekt und ist da, auch wenn in der Datenbank
              nichts steht; ein Logo gibt es bisher gar nicht, die Kopfzeile
              zeigt den Vereinsnamen als Text. Ein leerer Kasten hätte den
              Eindruck erweckt, etwas sei kaputt. */}
          <BildKasten
            titel="Logo"
            adresse={bildAdresse(entwurf.logo_path)}
            ersatz={null}
            ersatzHinweis="Ohne Logo steht der Vereinsname als Text in der Kopfzeile."
            laedt={laedtBild === "logo"}
            hinweis="Am besten breit und mit durchsichtigem Hintergrund (PNG oder WebP)."
            onDatei={(d) => void bildHochladen("logo", d)}
            onEntfernen={() => setze({ logo_path: null })}
          />
          <BildKasten
            titel="Symbol (Favicon)"
            adresse={bildAdresse(entwurf.favicon_path)}
            ersatz="/favicon.ico"
            ersatzHinweis="Zurzeit die mitgelieferte Datei aus dem Projekt."
            laedt={laedtBild === "favicon"}
            hinweis="Quadratisch, mindestens 64 × 64. Wird nicht umgewandelt."
            onDatei={(d) => void bildHochladen("favicon", d)}
            onEntfernen={() => setze({ favicon_path: null })}
          />
        </div>
      </Abschnitt>

      {/* ── Farben ───────────────────────────────────────────────────────── */}
      <Abschnitt
        titel="Farben"
        hinweis="Die Vereinsfarbe zieht sich durch die ganze Seite – Knöpfe, Links, Hervorhebungen."
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <Farbwahl
            label="Vereinsfarbe"
            wert={entwurf.color_primary}
            setze={(v) => setze({ color_primary: v })}
          />
          <Farbwahl
            label="Dunkler Ton"
            wert={entwurf.color_dark}
            setze={(v) => setze({ color_dark: v })}
            hinweis="Wird nur übernommen, wenn er wirklich dunkel ist."
          />
        </div>
      </Abschnitt>

      {/* ── Schriften ────────────────────────────────────────────────────── */}
      <Abschnitt titel="Schriften" hinweis="Alle Schriften stehen unter einer freien Lizenz.">
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
      </Abschnitt>

      {/* ── E-Mail ───────────────────────────────────────────────────────── */}
      <Abschnitt
        titel="E-Mail-Versand"
        hinweis="Einladungen, Passwort-Zurücksetzen, Kontaktanfragen und die Abendzusammenfassung gehen über diesen Weg."
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

      {/* Der Knopf bleibt beim Scrollen sichtbar – die Seite ist lang, und ein
          Speichern-Knopf, den man erst suchen muss, wird vergessen. */}
      <div className="flex justify-end sticky bottom-4 z-10">
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
    <section>
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
function Farbwahl({ label, wert, setze, hinweis }: {
  label: string; wert: string; setze: (v: string) => void; hinweis?: string;
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
      {gueltig ? (
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

function BildKasten({ titel, adresse, ersatz, ersatzHinweis, laedt, hinweis, onDatei, onEntfernen }: {
  titel: string;
  adresse: string | null;
  /** Was ohne eigenes Bild tatsächlich angezeigt wird, falls es so etwas gibt. */
  ersatz: string | null;
  ersatzHinweis: string;
  laedt: boolean;
  hinweis: string;
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
              accept="image/*"
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
 * Was jemand tun muss, damit der Mailversand läuft.
 *
 * Die Zugangsdaten gehören nicht in diese Tabelle – sie ist für jedes Mitglied
 * lesbar. Sie stehen als Secrets beim Backend. Nur weiss das niemand, der zum
 * ersten Mal hier sitzt, und ohne die Namen der Secrets sucht man sich dumm.
 * Deshalb stehen sie hier, samt der Reihenfolge, in der man vorgeht.
 */
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
        const ausRumpf = rumpf.fehler ?? (await leseFehler(error));
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
          {ungespeichert && " Erst speichern – geprüft wird der gespeicherte Stand."}
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

/** Die Fehlermeldung aus der Antwort der Edge Function, falls vorhanden. */
async function leseFehler(error: unknown): Promise<string> {
  const antwort = (error as { context?: Response } | null)?.context;
  if (!antwort) return error instanceof Error ? error.message : "";
  try {
    const rumpf = await antwort.json();
    return rumpf?.fehler ?? "";
  } catch {
    return error instanceof Error ? error.message : "";
  }
}

function MailAnleitung({ weg }: { weg: string }) {
  const graph = weg === "microsoft_graph";
  return (
    <details className="rounded-lg border bg-muted/30 p-3 text-sm">
      <summary className="cursor-pointer font-medium">
        {graph ? "Microsoft 365 einrichten" : "SMTP einrichten"}
      </summary>

      {graph ? (
        <div className="mt-3 space-y-2 text-muted-foreground">
          <p>
            Sinnvoll, wenn der Verein ohnehin Microsoft 365 hat. Mails gehen dann aus dem echten
            Postfach heraus und landen seltener im Spam.
          </p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Im Microsoft-Entra-Portal unter „App-Registrierungen" eine neue Anwendung anlegen.</li>
            <li>
              Unter „API-Berechtigungen" die Anwendungsberechtigung <code>Mail.Send</code> hinzufügen
              und als Administrator bestätigen.
            </li>
            <li>Unter „Zertifikate &amp; Geheimnisse" ein neues Geheimnis erzeugen und sofort kopieren – es wird nur einmal angezeigt.</li>
            <li>Die vier Werte beim Backend als Secrets hinterlegen:</li>
          </ol>
          <ul className="ml-5 space-y-0.5 font-mono text-xs">
            <li>MS_TENANT_ID</li>
            <li>MS_CLIENT_ID</li>
            <li>MS_CLIENT_SECRET</li>
            <li>MS_SENDER_EMAIL</li>
          </ul>
          <p>
            Die Absenderadresse muss ein echtes Postfach in derselben Organisation sein.
            Ist <code>MS_SENDER_EMAIL</code> gesetzt, gilt dieser Wert; sonst wird die
            Absenderadresse aus diesem Formular verwendet.
          </p>
          <p>
            Der Absendername ändert nur die Anzeige – verschickt wird immer aus dem Postfach
            oben. Eine fremde Absenderadresse verlangt in Microsoft 365 gesonderte Rechte.
          </p>
        </div>
      ) : (
        <div className="mt-3 space-y-2 text-muted-foreground">
          <p>
            Der einfache Weg: Es reicht, was jeder Mailanbieter mitgibt – Serveradresse, Benutzername
            und Passwort. Am besten ein eigenes Postfach für die Anwendung, damit ein geändertes
            Passwort nicht die halbe Website lahmlegt.
          </p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Beim Mailanbieter ein Postfach anlegen, etwa <code>noreply@verein.de</code>.</li>
            <li>Die Zugangsdaten beim Backend als Secrets hinterlegen:</li>
          </ol>
          <ul className="ml-5 space-y-0.5 font-mono text-xs">
            <li>SMTP_HOST</li>
            <li>SMTP_PORT (587 mit STARTTLS, 465 mit SSL – ohne Angabe 587)</li>
            <li>SMTP_USER</li>
            <li>SMTP_PASSWORD</li>
          </ul>
          <ol className="list-decimal ml-5 space-y-1" start={3}>
            <li>Oben „SMTP" wählen, Absenderadresse eintragen und speichern.</li>
            <li>Mit dem Probeversand prüfen, ob es klappt.</li>
          </ol>
          <p>
            Das Passwort gehört zu den Secrets und nicht in dieses Formular: Die tägliche
            Sicherung schreibt alle Tabellen nach GitHub – ein hier eingetragenes Passwort läge
            in jeder Sicherungsdatei.
          </p>
          <p>
            Bleibt die Absenderadresse leer, wird <code>SMTP_USER</code> als Absender genommen.
            Viele Anbieter lassen ohnehin nur Adressen des eigenen Postfachs zu.
          </p>
        </div>
      )}
    </details>
  );
}
