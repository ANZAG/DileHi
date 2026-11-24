import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus, Trash2, Eye, EyeOff, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  aendereMenuepunkt, ladeMenuezeilen, legeMenuepunktAn, loescheMenuepunkt, websiteSchluessel,
} from "@/daten/website";
import { aendereEinstellungen, einstellungSchluessel, useEinstellungen } from "@/daten/einstellungen";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import { useWoerter } from "@/hooks/useBranding";
import { einsetzen } from "@/lib/organisationsform";
import { ladeSeiten, type SitePage } from "@/daten/seiten";
import type { MenuBereich } from "@/hooks/useSiteMenu";

interface Eintrag {
  id: string;
  label: string;
  page_id: string | null;
  href: string | null;
  parent_id: string | null;
  sort_order: number;
  is_visible: boolean;
  opens_new: boolean;
  area: MenuBereich | null;
}


/**
 * Die beiden Listen, die eine Vereinsseite braucht. Mehr Bereiche wären
 * schnell hinzugefügt, aber jeder weitere ist eine Entscheidung, die der
 * Siteadmin treffen muss – und der Fußbereich hat nun einmal zwei Spalten.
 */
const BEREICHE: {
  id: MenuBereich;
  reiter: string;
  hinweis: string;
  /** Spalte in app_settings, in der die Überschrift im Fußbereich steht. */
  spalte: "footer_navigation_label" | "footer_legal_label";
  ueberschriftHinweis: string;
  /** Untermenüs ergeben nur oben Sinn – der Fußbereich stellt alles flach dar. */
  untermenues: boolean;
}[] = [
  {
    id: "header",
    reiter: "Kopfzeile",
    hinweis: "Die Punkte oben auf der Seite. Eine Ebene Untermenü ist möglich. Dieselben Punkte stehen im Fußbereich noch einmal als Spalte.",
    spalte: "footer_navigation_label",
    ueberschriftHinweis: "Überschrift dieser Spalte im Fußbereich",
    untermenues: true,
  },
  {
    id: "footer_legal",
    reiter: "Fußbereich: Rechtliches",
    hinweis: "Die rechte Spalte unten. Impressum und Datenschutz gehören hierhin; {satzung} oder eine Barrierefreiheitserklärung können dazukommen.",
    spalte: "footer_legal_label",
    ueberschriftHinweis: "Überschrift dieser Spalte im Fußbereich",
    untermenues: false,
  },
];

/**
 * Das Menü der öffentlichen Seite.
 *
 * Stand bis vor Kurzem als Array im Code. Jetzt in der Datenbank – aber ohne
 * diese Oberfläche liess es sich nur per SQL ändern, was für die Zielgruppe
 * dasselbe ist wie „gar nicht".
 *
 * Bewusst mit Pfeilen statt Ziehen und Ablegen: Ein Menü hat sieben Einträge,
 * die man einmal im Jahr umsortiert. Dafür lohnt keine Ziehmechanik, und
 * Pfeile funktionieren auch auf dem Handy und mit der Tastatur.
 */
export default function MenueAdmin() {
  const { toast } = useToast();
  // Die Beispiele im Hinweistext tragen Platzhalter: „{satzung}" heisst bei
  // einer Interessengemeinschaft „Absprachen".
  const woerter = useWoerter();
  const queryClient = useQueryClient();
  const [bereich, setBereich] = useState<MenuBereich>("header");
  const [neuOffen, setNeuOffen] = useState(false);
  const [neuLabel, setNeuLabel] = useState("");
  const [neuZiel, setNeuZiel] = useState("");
  const [neuUnter, setNeuUnter] = useState("");

  const aktiv = BEREICHE.find((b) => b.id === bereich) ?? BEREICHE[0];

  const { data: alle = [], isLoading } = useQuery({
    queryKey: websiteSchluessel.menuezeilen(),
    // Der Bereich ist in der Datenbank Text mit festem Wertevorrat.
    queryFn: async (): Promise<Eintrag[]> =>
      (await ladeMenuezeilen()).map((e) => ({ ...e, area: e.area as MenuBereich })),
  });

  const { data: seiten = [] } = useQuery({ queryKey: websiteSchluessel.seiten(), queryFn: ladeSeiten });

  // Nur die Einträge des offenen Reiters. Fehlt die Spalte noch (Migration
  // nicht eingespielt), zählt alles zur Kopfzeile – wie vorher.
  const eintraege = alle.filter((e) => (e.area ?? "header") === bereich);

  const frisch = () => {
    // Die Zeilen der Verwaltung und das fertige Menü der Seite.
    queryClient.invalidateQueries({ queryKey: websiteSchluessel.menue() });
  };

  const aendern = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<"site_menu"> }) => aendereMenuepunkt(id, patch),
    onSuccess: frisch,
    onError: (err: Error) => toast({ title: "Ging nicht", description: err.message, variant: "destructive" }),
  });

  const anlegen = useMutation({
    mutationFn: async () => {
      // Ein Eintrag zeigt entweder auf eine Seite oder auf eine freie Adresse –
      // die Prüfbedingung in der Datenbank lässt nichts anderes zu.
      const istSeite = neuZiel.startsWith("seite:");
      const oben = eintraege.filter((e) => !e.parent_id);
      await legeMenuepunktAn({
        label: neuLabel.trim(),
        page_id: istSeite ? neuZiel.slice(6) : null,
        href: istSeite ? null : neuZiel.trim(),
        parent_id: aktiv.untermenues ? neuUnter || null : null,
        area: bereich,
        sort_order: (oben[oben.length - 1]?.sort_order ?? 0) + 10,
      });
    },
    onSuccess: () => {
      setNeuOffen(false);
      setNeuLabel("");
      setNeuZiel("");
      setNeuUnter("");
      frisch();
    },
    onError: (err: Error) =>
      toast({ title: "Nicht angelegt", description: err.message, variant: "destructive" }),
  });

  const entfernen = useMutation({
    mutationFn: loescheMenuepunkt,
    onSuccess: frisch,
  });

  /** Tauscht die Reihenfolge mit dem Nachbarn – nur innerhalb derselben Ebene. */
  const verschieben = (eintrag: Eintrag, richtung: -1 | 1) => {
    const geschwister = eintraege
      .filter((e) => e.parent_id === eintrag.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const i = geschwister.findIndex((e) => e.id === eintrag.id);
    const nachbar = geschwister[i + richtung];
    if (!nachbar) return;
    aendern.mutate({ id: eintrag.id, patch: { sort_order: nachbar.sort_order } });
    aendern.mutate({ id: nachbar.id, patch: { sort_order: eintrag.sort_order } });
  };

  const zielText = (e: Eintrag) => {
    if (e.href) return e.href;
    const seite = seiten.find((s: SitePage) => s.id === e.page_id);
    return seite ? `/${seite.slug}` : "— Seite gelöscht —";
  };

  const oben = eintraege.filter((e) => !e.parent_id).sort((a, b) => a.sort_order - b.sort_order);

  const reiterWechseln = (id: MenuBereich) => {
    setBereich(id);
    // Ein halb ausgefülltes Formular für die andere Liste stehen zu lassen,
    // legt den Eintrag am Ende im falschen Bereich an.
    setNeuOffen(false);
    setNeuUnter("");
  };

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-serif text-lg font-semibold">Menü</h2>
        <p className="text-sm text-muted-foreground">
          Was in der Kopfzeile und unten im Fußbereich steht.
        </p>
      </div>

      {/* Gleiche Reiter wie in der Verwaltung darüber – zwei Listen, eine
          Bedienung. */}
      <div className="mb-4 flex flex-wrap gap-1 border-b">
        {BEREICHE.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => reiterWechseln(b.id)}
            aria-current={b.id === bereich ? "true" : undefined}
            className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              b.id === bereich
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {b.reiter}
          </button>
        ))}
      </div>

      <FussUeberschrift spalte={aktiv.spalte} hinweis={aktiv.ueberschriftHinweis} />

      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <p className="text-sm text-muted-foreground max-w-prose">{einsetzen(aktiv.hinweis, woerter)}</p>
        {!neuOffen && (
          <Button size="sm" onClick={() => setNeuOffen(true)}>
            <Plus size={15} className="mr-1" /> Punkt hinzufügen
          </Button>
        )}
      </div>

      {neuOffen && (
        <div className="rounded-lg border bg-card p-4 mb-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="menue-label" className="text-sm">Beschriftung</Label>
              <Input
                id="menue-label" value={neuLabel} autoFocus
                onChange={(e) => setNeuLabel(e.target.value)}
                placeholder="z. B. Über uns"
              />
            </div>
            <div>
              <Label className="text-sm">Ziel</Label>
              <Select value={neuZiel} onValueChange={setNeuZiel}>
                <SelectTrigger><SelectValue placeholder="Seite oder Adresse wählen" /></SelectTrigger>
                <SelectContent>
                  {seiten.map((s: SitePage) => (
                    <SelectItem key={s.id} value={`seite:${s.id}`}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-1"
                value={neuZiel.startsWith("seite:") ? "" : neuZiel}
                onChange={(e) => setNeuZiel(e.target.value)}
                placeholder="oder eigene Adresse, z. B. /kontakt"
              />
            </div>
          </div>
          {aktiv.untermenues && (
            <div>
              <Label className="text-sm">Untermenü von (optional)</Label>
              <Select value={neuUnter} onValueChange={setNeuUnter}>
                <SelectTrigger><SelectValue placeholder="Nichts, eigener Punkt" /></SelectTrigger>
                <SelectContent>
                  {oben.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNeuOffen(false)}>Abbrechen</Button>
            <Button
              disabled={!neuLabel.trim() || !neuZiel.trim() || anlegen.isPending}
              onClick={() => anlegen.mutate()}
            >
              Hinzufügen
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Lade Menü …</p>
      ) : oben.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Noch kein Eintrag. Solange keiner da ist, zeigt die Seite die mitgelieferte Liste.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card overflow-hidden">
          {oben.flatMap((e) => [
            <MenueZeile
              key={e.id} eintrag={e} ziel={zielText(e)}
              onHoch={() => verschieben(e, -1)}
              onRunter={() => verschieben(e, 1)}
              onSichtbar={() => aendern.mutate({ id: e.id, patch: { is_visible: !e.is_visible } })}
              onEntfernen={() => {
                if (confirm(`Menüpunkt „${e.label}" entfernen?`)) entfernen.mutate(e.id);
              }}
            />,
            ...eintraege
              .filter((k) => k.parent_id === e.id)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((k) => (
                <MenueZeile
                  key={k.id} eintrag={k} ziel={zielText(k)} untergeordnet
                  onHoch={() => verschieben(k, -1)}
                  onRunter={() => verschieben(k, 1)}
                  onSichtbar={() => aendern.mutate({ id: k.id, patch: { is_visible: !k.is_visible } })}
                  onEntfernen={() => {
                    if (confirm(`Menüpunkt „${k.label}" entfernen?`)) entfernen.mutate(k.id);
                  }}
                />
              )),
          ])}
        </ul>
      )}
    </div>
  );
}

/**
 * Die Überschrift der Fußspalte.
 *
 * Sie steht in app_settings und nicht in site_menu – die Spalte gibt es auch
 * dann, wenn kein Eintrag darin liegt. Trotzdem gehört das Feld hierher und
 * nicht ins Erscheinungsbild: Wer die Liste umbenennt, sucht sie dort, wo er
 * ihre Einträge pflegt.
 */
function FussUeberschrift({ spalte, hinweis }: {
  spalte: "footer_navigation_label" | "footer_legal_label";
  hinweis: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [wert, setWert] = useState("");

  const { data } = useEinstellungen();

  const gespeichert = data?.[spalte] ?? "";
  useEffect(() => setWert(gespeichert), [gespeichert, spalte]);

  const speichern = useMutation({
    mutationFn: () => {
      const text = wert.trim();
      return aendereEinstellungen(
        spalte === "footer_navigation_label" ? { footer_navigation_label: text } : { footer_legal_label: text },
      );
    },
    onSuccess: () => {
      toast({ title: "Gespeichert" });
      queryClient.invalidateQueries({ queryKey: einstellungSchluessel.vereinsangaben() });
      queryClient.invalidateQueries({ queryKey: einstellungSchluessel.erscheinungsbild() });
    },
    onError: (err: Error) =>
      toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  return (
    <div className="rounded-lg border bg-muted/30 p-3 mb-4 flex flex-wrap items-end gap-3">
      <div className="min-w-[14rem] flex-1">
        <Label htmlFor={`fuss-${spalte}`} className="text-sm">{hinweis}</Label>
        <Input
          id={`fuss-${spalte}`}
          value={wert}
          onChange={(e) => setWert(e.target.value)}
          placeholder="z. B. Navigation"
        />
      </div>
      <Button
        variant="outline" size="sm"
        disabled={!wert.trim() || wert.trim() === gespeichert || speichern.isPending}
        onClick={() => speichern.mutate()}
      >
        Übernehmen
      </Button>
    </div>
  );
}

function MenueZeile({ eintrag, ziel, untergeordnet, onHoch, onRunter, onSichtbar, onEntfernen }: {
  eintrag: Eintrag;
  ziel: string;
  untergeordnet?: boolean;
  onHoch: () => void;
  onRunter: () => void;
  onSichtbar: () => void;
  onEntfernen: () => void;
}) {
  return (
    // Auf schmalen Bildschirmen rutschen die vier Knöpfe unter den Text, statt
    // ihn auf zwei Zeichen zusammenzuquetschen.
    <li className={`flex flex-wrap items-center gap-2 p-3 ${eintrag.is_visible ? "" : "opacity-50"}`}>
      {untergeordnet && <CornerDownRight size={14} className="text-muted-foreground ml-4 shrink-0" />}
      <span className="min-w-0 flex-1 basis-full sm:basis-auto">
        <span className="font-medium text-sm break-words">{eintrag.label}</span>
        <span className="block text-xs text-muted-foreground break-all">{ziel}</span>
      </span>

      <Button variant="ghost" size="icon" aria-label="Nach oben" onClick={onHoch}>
        <ChevronUp size={15} />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Nach unten" onClick={onRunter}>
        <ChevronDown size={15} />
      </Button>
      <Button
        variant="ghost" size="icon"
        aria-label={eintrag.is_visible ? "Ausblenden" : "Einblenden"}
        title={eintrag.is_visible ? "Ausblenden" : "Einblenden"}
        onClick={onSichtbar}
      >
        {eintrag.is_visible ? <Eye size={15} /> : <EyeOff size={15} />}
      </Button>
      <Button variant="ghost" size="icon" aria-label="Entfernen" onClick={onEntfernen}>
        <Trash2 size={15} className="text-destructive" />
      </Button>
    </li>
  );
}
