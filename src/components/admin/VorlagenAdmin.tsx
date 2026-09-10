import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ForumEditor from "@/components/forum/ForumEditor";

interface MailVorlage {
  key: string;
  label: string;
  hinweis: string | null;
  betreff: string;
  kennzeile: string;
  ueberschrift: string;
  inhalt: string;
  knopf: string;
  fussnote: string;
  platzhalter: string[];
  standard: Record<string, string>;
  sort_order: number;
}

interface PdfVorlage {
  key: string;
  label: string;
  hinweis: string | null;
  titel: string;
  inhalt: string;
  platzhalter: string[];
  standard: Record<string, string>;
  sort_order: number;
}

const db = supabase as unknown as { from: (t: string) => any };

/** Welche Felder eine Mailvorlage hat und wie sie erklärt werden. */
const MAILFELDER: { feld: keyof MailVorlage; label: string; hinweis: string }[] = [
  { feld: "betreff", label: "Betreff", hinweis: "Steht in der Übersicht des Postfachs." },
  { feld: "kennzeile", label: "Kennzeile", hinweis: "Die kleine Zeile über der Überschrift. Darf leer bleiben." },
  { feld: "ueberschrift", label: "Überschrift", hinweis: "Die große Zeile in der Mail. Darf leer bleiben." },
  { feld: "knopf", label: "Beschriftung des Knopfes", hinweis: "Leer = kein Knopf. Wohin er führt, entscheidet die Anwendung." },
  { feld: "fussnote", label: "Fußnote", hinweis: "Kleingedrucktes unter dem Text." },
];

/**
 * Die Texte der E-Mails und des Aufnahmeantrags.
 *
 * Beides stand fest im Code der Edge Functions – bis hin zum Hinweis auf
 * unsere WhatsApp-Gruppe in der Willkommensmail und der Satzungserklärung im
 * Antrag. Für eine Installation, die ein anderer Verein aufsetzt, war das
 * unbrauchbar.
 *
 * Bewusst keine Felder mit rohem HTML: Eine Mail, die in Outlook wie in Gmail
 * gleich aussieht, braucht Formatierung an jedem Absatz. Die macht weiterhin
 * die Anwendung. Hier steht nur, was drinsteht.
 */
/**
 * Die Texte der versendeten E-Mails.
 *
 * Bewusst keine Felder mit rohem HTML: Eine Mail, die in Outlook wie in Gmail
 * gleich aussieht, braucht Formatierung an jedem Absatz. Die macht weiterhin
 * die Anwendung. Hier steht nur, was drinsteht.
 *
 * Die Texte des Aufnahmeantrags standen früher ebenfalls hier. Sie sind zu den
 * Feldern des Antrags gewandert: Wer den Antrag ändert, will beides in einer
 * Maske – nicht die Felder unter „Mitglieder" und die Sätze darüber unter
 * „System".
 */
export default function VorlagenAdmin() {
  return (
    <div>
      <div className="mb-4">
        <h2 className="font-serif text-lg font-semibold">E-Mail-Vorlagen</h2>
        <p className="text-sm text-muted-foreground">
          Was in den E-Mails der Anwendung steht. Vereinsname, Anschrift und
          Farben kommen aus dem Erscheinungsbild.
        </p>
      </div>
      <Mailvorlagen />
    </div>
  );
}

// ── E-Mails ─────────────────────────────────────────────────────────────────

function Mailvorlagen() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [offen, setOffen] = useState<string | null>(null);
  const [entwurf, setEntwurf] = useState<MailVorlage | null>(null);

  const { data: vorlagen = [], isLoading } = useQuery({
    queryKey: ["mail-templates"],
    queryFn: async () => {
      const { data, error } = await db.from("mail_templates").select("*").order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as MailVorlage[];
    },
  });

  const gewaehlt = useMemo(
    () => vorlagen.find((v) => v.key === (offen ?? vorlagen[0]?.key)),
    [vorlagen, offen]
  );

  useEffect(() => {
    if (gewaehlt) setEntwurf(gewaehlt);
  }, [gewaehlt]);

  const speichern = useMutation({
    mutationFn: async (v: MailVorlage) => {
      const { error } = await db.from("mail_templates").update({
        betreff: v.betreff, kennzeile: v.kennzeile, ueberschrift: v.ueberschrift,
        inhalt: v.inhalt, knopf: v.knopf, fussnote: v.fussnote,
      }).eq("key", v.key);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Gespeichert" });
      queryClient.invalidateQueries({ queryKey: ["mail-templates"] });
    },
    onError: (err: Error) =>
      toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Lade Vorlagen …</p>;
  }
  if (vorlagen.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Keine Vorlagen gefunden. Ist die Migration eingespielt?
      </p>
    );
  }
  if (!entwurf || !gewaehlt) return null;

  const geaendert = JSON.stringify(entwurf) !== JSON.stringify(gewaehlt);

  return (
    <div className="grid lg:grid-cols-[16rem_1fr] gap-4">
      <Liste
        eintraege={vorlagen}
        offen={gewaehlt.key}
        waehlen={(k) => setOffen(k)}
        gesperrt={geaendert}
      />

      <div className="space-y-4">
        <Kopf label={gewaehlt.label} hinweis={gewaehlt.hinweis} platzhalter={gewaehlt.platzhalter} />

        {MAILFELDER.slice(0, 3).map(({ feld, label, hinweis }) => (
          <Zeile key={feld} label={label} hinweis={hinweis}>
            <Input
              value={(entwurf[feld] as string) ?? ""}
              onChange={(e) => setEntwurf({ ...entwurf, [feld]: e.target.value })}
            />
          </Zeile>
        ))}

        <Zeile label="Text" hinweis="Absätze, Fettung, Aufzählungen und Links.">
          <div className="rounded-md border">
            {/* Der Schlüssel ist hier kein Beiwerk: Der Editor übernimmt seinen
                Inhalt beim Anlegen und hört danach nicht mehr auf `value` –
                das ist im Forum richtig so, wo ein Beitrag genau ein Dokument
                ist. Beim Wechsel der Vorlage blieb dadurch der Text der
                vorigen stehen, während Betreff und Überschrift längst
                umgesprungen waren. Eine andere Vorlage ist ein anderes
                Dokument, also ein neuer Editor. */}
            <ForumEditor
              key={entwurf.key}
              value={entwurf.inhalt}
              onChange={(html) => setEntwurf({ ...entwurf, inhalt: html })}
              umfang="knapp"
              compact
              placeholder="Text der E-Mail …"
            />
          </div>
        </Zeile>

        {MAILFELDER.slice(3).map(({ feld, label, hinweis }) => (
          <Zeile key={feld} label={label} hinweis={hinweis}>
            <Input
              value={(entwurf[feld] as string) ?? ""}
              onChange={(e) => setEntwurf({ ...entwurf, [feld]: e.target.value })}
            />
          </Zeile>
        ))}

        <Fuss
          geaendert={geaendert}
          laeuft={speichern.isPending}
          zuruecksetzen={() => setEntwurf({ ...entwurf, ...gewaehlt.standard })}
          speichern={() => speichern.mutate(entwurf)}
        />
      </div>
    </div>
  );
}

// ── Aufnahmeantrag ──────────────────────────────────────────────────────────

export function Antragstexte() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [offen, setOffen] = useState<string | null>(null);
  const [entwurf, setEntwurf] = useState<PdfVorlage | null>(null);

  const { data: texte = [], isLoading } = useQuery({
    queryKey: ["pdf-texts"],
    queryFn: async () => {
      const { data, error } = await db.from("pdf_texts").select("*").order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as PdfVorlage[];
    },
  });

  const gewaehlt = useMemo(
    () => texte.find((t) => t.key === (offen ?? texte[0]?.key)),
    [texte, offen]
  );

  useEffect(() => {
    if (gewaehlt) setEntwurf(gewaehlt);
  }, [gewaehlt]);

  const speichern = useMutation({
    mutationFn: async (t: PdfVorlage) => {
      const { error } = await db.from("pdf_texts")
        .update({ titel: t.titel, inhalt: t.inhalt }).eq("key", t.key);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast({ title: "Gespeichert" });
      queryClient.invalidateQueries({ queryKey: ["pdf-texts"] });
    },
    onError: (err: Error) =>
      toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Lade Texte …</p>;
  }
  if (texte.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Keine Texte gefunden. Ist die Migration eingespielt?
      </p>
    );
  }
  if (!entwurf || !gewaehlt) return null;

  const geaendert = JSON.stringify(entwurf) !== JSON.stringify(gewaehlt);

  return (
    <div className="grid lg:grid-cols-[16rem_1fr] gap-4">
      <Liste
        eintraege={texte}
        offen={gewaehlt.key}
        waehlen={(k) => setOffen(k)}
        gesperrt={geaendert}
      />

      <div className="space-y-4">
        <Kopf label={gewaehlt.label} hinweis={gewaehlt.hinweis} platzhalter={gewaehlt.platzhalter} />

        <Zeile label="Abschnittsüberschrift" hinweis="Steht auf dem gedruckten Antrag über dem Text. Darf leer bleiben.">
          <Input
            value={entwurf.titel}
            onChange={(e) => setEntwurf({ ...entwurf, titel: e.target.value })}
          />
        </Zeile>

        <Zeile label="Text" hinweis="Jede Zeile ist ein eigener Absatz beziehungsweise eine eigene Angabe. Derselbe Wortlaut erscheint im Webformular und auf dem PDF.">
          <Textarea
            rows={8}
            value={entwurf.inhalt}
            onChange={(e) => setEntwurf({ ...entwurf, inhalt: e.target.value })}
          />
        </Zeile>

        <Fuss
          geaendert={geaendert}
          laeuft={speichern.isPending}
          zuruecksetzen={() => setEntwurf({ ...entwurf, ...gewaehlt.standard })}
          speichern={() => speichern.mutate(entwurf)}
        />
      </div>
    </div>
  );
}

// ── Gemeinsame Teile ────────────────────────────────────────────────────────

function Liste({ eintraege, offen, waehlen, gesperrt }: {
  eintraege: { key: string; label: string }[];
  offen: string;
  waehlen: (key: string) => void;
  gesperrt: boolean;
}) {
  return (
    <ul className="rounded-lg border bg-card divide-y overflow-hidden h-fit">
      {eintraege.map((e) => (
        <li key={e.key}>
          <button
            type="button"
            onClick={() => {
              // Ungespeichertes ginge beim Wechsel verloren – und zwar
              // unbemerkt, weil der neue Text sofort dasteht.
              if (gesperrt && !confirm("Ungespeicherte Änderungen verwerfen?")) return;
              waehlen(e.key);
            }}
            aria-current={e.key === offen ? "true" : undefined}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              e.key === offen ? "bg-primary/5 text-primary font-medium" : "hover:bg-muted"
            }`}
          >
            {e.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

function Kopf({ label, hinweis, platzhalter }: {
  label: string; hinweis: string | null; platzhalter: string[];
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <p className="font-medium text-sm">{label}</p>
      {hinweis && <p className="text-sm text-muted-foreground mt-0.5">{hinweis}</p>}
      {platzhalter.length > 0 && (
        <p className="text-xs text-muted-foreground mt-2">
          Platzhalter:{" "}
          {platzhalter.map((p) => (
            <code key={p} className="mr-1 rounded bg-background px-1 py-0.5">{`{{${p}}}`}</code>
          ))}
          <span className="block mt-1">
            Sie werden beim Versand ersetzt. <code>{"{{block}}"}</code> ist eine von der
            Anwendung erzeugte Liste oder Tabelle.
          </span>
        </p>
      )}
    </div>
  );
}

function Zeile({ label, hinweis, children }: {
  label: string; hinweis: string; children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-sm">{label}</Label>
      <p className="text-xs text-muted-foreground mb-1">{hinweis}</p>
      {children}
    </div>
  );
}

function Fuss({ geaendert, laeuft, zuruecksetzen, speichern }: {
  geaendert: boolean; laeuft: boolean; zuruecksetzen: () => void; speichern: () => void;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-2 pt-2">
      <Button
        variant="ghost" size="sm"
        onClick={() => {
          if (confirm("Diese Vorlage auf den Auslieferungszustand zurücksetzen?")) zuruecksetzen();
        }}
      >
        <RotateCcw size={15} className="mr-1" /> Auslieferungszustand
      </Button>
      <Button size="sm" disabled={!geaendert || laeuft} onClick={speichern}>
        {laeuft ? <Loader2 size={15} className="mr-1 animate-spin" /> : <Save size={15} className="mr-1" />}
        Speichern
      </Button>
    </div>
  );
}
