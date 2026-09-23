import { useEffect, useMemo, useRef, useState } from "react";
import { RichTextMenu } from "@puckeditor/core";
import { NodeViewWrapper, useEditorState, type NodeViewProps } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import {
  BetweenHorizontalEnd, BetweenVerticalEnd, Columns2, ImageMinus, ImagePlus, ImageUp, PanelLeft, PanelRight,
  SeparatorHorizontal, Table2, TextCursorInput, Trash2, Ungroup,
} from "lucide-react";
import { useSiteImages } from "@/hooks/useSiteImage";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BildFeld from "./BildFeld";
import { platzhalterBild } from "./bildplaetze";
import {
  BILDGROESSEN, bildAendern, bildAusrichten, bildBreite, bildEinfuegen, bildEntfernen, bildgroesse,
  gewaehltesBild, istIn, leerzeileEinfuegen, spaltenAufloesen, spaltenEinfuegen, tabelleEinfuegen,
  tabelleLoeschen, type Ausrichtung, type Bildgroesse,
} from "./editorErweiterungen";

/**
 * Die Zusatzknöpfe des Fliesstext-Editors: Bilder, Tabellen und Spalten
 * ohne Quelltext.
 *
 * Pucks Editor bleibt die Grundlage – seine Leiste steht unverändert vorn.
 * Dahinter kommen die Knöpfe für das, was er von sich aus nicht kann, und
 * Bilder erscheinen im Editor als Bilder statt gar nicht.
 */

/** Ein Bild im Editor: das hinterlegte Bild oder der Platzhalter der Seite. */
export function BildplatzAnsicht({ node, selected }: NodeViewProps) {
  const { data: bilder } = useSiteImages();
  const { bild, src, alt, width, height, klasse } = node.attrs as {
    bild: string | null; src: string | null; alt: string; width: number | null; height: number | null;
    klasse: string | null;
  };
  const ganz = bildgroesse(node.attrs) === "ganz";
  const adresse = (bild && bilder?.[bild]?.src) || src
    || platzhalterBild(width ?? 0, height ?? 0, alt || bild || "Bild");
  return (
    <NodeViewWrapper as="span" className={`inline-block max-w-full align-middle ${ganz ? "w-full" : ""}`}>
      <img
        src={adresse}
        alt={alt}
        width={width ?? undefined}
        height={height ?? undefined}
        draggable={false}
        className={`inline-block h-auto max-w-full ${klasse ?? ""} ${selected ? "outline outline-2 outline-offset-2 outline-primary" : ""}`}
      />
    </NodeViewWrapper>
  );
}

/** Knöpfe, die nur dort erscheinen, wo sie etwas tun. */
function Zusatzleiste({ editor, readOnly }: { editor: Editor | null; readOnly: boolean }) {
  const [dialog, setDialog] = useState<BildModus | null>(null);
  const zustand = useEditorState({
    editor,
    selector: ({ editor: e }) => (e ? {
      bild: gewaehltesBild(e),
      tabelle: istIn(e, "table"),
      spalten: istIn(e, "spalten"),
    } : null),
  });
  if (!editor || !zustand) return null;
  const aus = readOnly;
  const bild = zustand.bild;

  return (
    <>
      <RichTextMenu.Group>
        <RichTextMenu.Control title="Bild einfügen" icon={<ImagePlus size={16} />} disabled={aus} onClick={() => setDialog({ art: "neu" })} />
        <RichTextMenu.Control title="Tabelle einfügen" icon={<Table2 size={16} />} disabled={aus || zustand.tabelle} onClick={() => tabelleEinfuegen(editor)} />
        <RichTextMenu.Control title="Zwei Spalten einfügen" icon={<Columns2 size={16} />} disabled={aus || zustand.spalten} onClick={() => spaltenEinfuegen(editor)} />
        <RichTextMenu.Control title="Leerzeile einfügen" icon={<SeparatorHorizontal size={16} />} disabled={aus} onClick={() => leerzeileEinfuegen(editor)} />
      </RichTextMenu.Group>

      {bild && (
        <RichTextMenu.Group>
          <RichTextMenu.Control
            title="Bild austauschen, Lage und Größe"
            icon={<ImageUp size={16} />}
            disabled={aus}
            onClick={() => setDialog({
              art: "bearbeiten",
              bild: String(bild.node.attrs.bild ?? ""),
              ausrichtung: bild.ausrichtung,
              groesse: bildgroesse(bild.node.attrs),
              breite: Number(bild.node.attrs.width) || 0,
            })}
          />
          <RichTextMenu.Control title="Bild im Text" icon={<TextCursorInput size={16} />} active={bild.ausrichtung === "text"} disabled={aus} onClick={() => bildAusrichten(editor, "text")} />
          <RichTextMenu.Control title="Bild links, Text fliesst rechts daneben" icon={<PanelLeft size={16} />} active={bild.ausrichtung === "links"} disabled={aus} onClick={() => bildAusrichten(editor, "links")} />
          <RichTextMenu.Control title="Bild rechts, Text fliesst links daneben" icon={<PanelRight size={16} />} active={bild.ausrichtung === "rechts"} disabled={aus} onClick={() => bildAusrichten(editor, "rechts")} />
          <RichTextMenu.Control title="Bild entfernen" icon={<ImageMinus size={16} />} disabled={aus} onClick={() => bildEntfernen(editor)} />
        </RichTextMenu.Group>
      )}
      {bild && (
        <RichTextMenu.Group>
          <span className="flex items-center gap-1">
            <GroesseWahl editor={editor} groesse={bildgroesse(bild.node.attrs)} ohneGanz={zustand.tabelle} disabled={aus} />
            <BreiteFeld editor={editor} breite={Number(bild.node.attrs.width) || 0} disabled={aus} />
          </span>
        </RichTextMenu.Group>
      )}

      {zustand.tabelle && (
        <RichTextMenu.Group>
          <RichTextMenu.Control title="Zeile darunter einfügen" icon={<BetweenHorizontalEnd size={16} />} disabled={aus} onClick={() => editor.chain().focus().addRowAfter().run()} />
          <RichTextMenu.Control title="Spalte rechts einfügen" icon={<BetweenVerticalEnd size={16} />} disabled={aus} onClick={() => editor.chain().focus().addColumnAfter().run()} />
          <RichTextMenu.Control title="Zeile löschen" icon={<Trash2 size={16} className="rotate-90" />} disabled={aus} onClick={() => editor.chain().focus().deleteRow().run()} />
          <RichTextMenu.Control title="Spalte löschen" icon={<Trash2 size={16} />} disabled={aus} onClick={() => editor.chain().focus().deleteColumn().run()} />
          <RichTextMenu.Control title="Ganze Tabelle löschen" icon={<Table2 size={16} className="opacity-50" />} disabled={aus} onClick={() => tabelleLoeschen(editor)} />
        </RichTextMenu.Group>
      )}

      {zustand.spalten && (
        <RichTextMenu.Group>
          <RichTextMenu.Control title="Spalten auflösen (Inhalt bleibt, untereinander)" icon={<Ungroup size={16} />} disabled={aus} onClick={() => spaltenAufloesen(editor)} />
        </RichTextMenu.Group>
      )}

      <BildDialog modus={dialog} schliessen={() => setDialog(null)} editor={editor} inTabelle={zustand.tabelle} />
    </>
  );
}

/**
 * Erst den Fokus in den Text, dann die Änderung.
 *
 * Puck merkt sich den Fokus erst im nächsten Durchlauf; eine Änderung im
 * selben Augenblick ginge an ihm vorbei.
 */
function nachFokus(editor: Editor, tun: () => void) {
  editor.commands.focus();
  window.setTimeout(tun, 0);
}

const GROESSEN_TEXT: Record<Exclude<Bildgroesse, "eigen">, string> = {
  klein: `Klein (${BILDGROESSEN.klein} px)`,
  mittel: `Mittel (${BILDGROESSEN.mittel} px)`,
  gross: `Groß (${BILDGROESSEN.gross} px)`,
  ganz: "Ganze Breite",
};

/** Dasselbe knapp, für die schmale Leiste – die Pixel stehen im Feld daneben. */
const GROESSEN_KURZ: Record<Exclude<Bildgroesse, "eigen">, string> = {
  klein: "Klein", mittel: "Mittel", gross: "Groß", ganz: "Ganze Breite",
};

/** Die Grösse des ausgewählten Bildes in einem Griff, wie bei WordPress. */
function GroesseWahl({ editor, groesse, ohneGanz, disabled }: {
  editor: Editor; groesse: Bildgroesse; ohneGanz: boolean; disabled: boolean;
}) {
  return (
    <select
      value={groesse}
      disabled={disabled}
      onChange={(e) => {
        const g = e.target.value as Bildgroesse;
        if (g === "eigen") return;
        nachFokus(editor, () => bildAendern(editor, { breite: g === "ganz" ? "ganz" : BILDGROESSEN[g] }));
      }}
      className="h-7 rounded border bg-background px-1 text-xs"
      aria-label="Bildgröße"
      title="Bildgröße"
    >
      {(Object.keys(GROESSEN_KURZ) as (keyof typeof GROESSEN_KURZ)[]).filter((g) => g !== "ganz" || !ohneGanz || groesse === "ganz").map((g) => (
        <option key={g} value={g}>{GROESSEN_KURZ[g]}</option>
      ))}
      <option value="eigen" disabled>Eigene</option>
    </select>
  );
}

/** Breite des ausgewählten Bildes in Pixeln; die Höhe folgt im Verhältnis. */
function BreiteFeld({ editor, breite, disabled }: { editor: Editor; breite: number; disabled: boolean }) {
  const [wert, setWert] = useState(String(breite || ""));
  useEffect(() => setWert(String(breite || "")), [breite]);
  return (
    <label className="flex items-center gap-1 pr-1 text-xs text-muted-foreground" title="Breite des Bildes in Pixeln">
      <input
        type="number"
        min={20}
        max={1200}
        value={wert}
        disabled={disabled}
        onChange={(e) => setWert(e.target.value)}
        onBlur={() => nachFokus(editor, () => bildBreite(editor, Number(wert)))}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); nachFokus(editor, () => bildBreite(editor, Number(wert))); } }}
        className="h-7 w-14 rounded border bg-background px-1 text-xs"
        aria-label="Breite in Pixeln"
      />
      px
    </label>
  );
}

/** Wofür der Bilddialog offen ist: ein neues Bild oder das ausgewählte. */
type BildModus =
  | { art: "neu" }
  | { art: "bearbeiten"; bild: string; ausrichtung: Ausrichtung; groesse: Bildgroesse; breite: number };

/** Die Masse der Bilddatei, sobald sie geladen ist. */
function useBildmass(adresse: string | undefined) {
  const [mass, setMass] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    setMass(null);
    if (!adresse) return;
    let aktuell = true;
    const probe = new Image();
    probe.onload = () => { if (aktuell) setMass({ w: probe.naturalWidth, h: probe.naturalHeight }); };
    probe.src = adresse;
    return () => { aktuell = false; };
  }, [adresse]);
  return mass;
}

/**
 * Ein Bild einfügen – oder das ausgewählte austauschen und einstellen.
 *
 * Wie bei WordPress an einer Stelle: welches Bild (samt Beschreibung für
 * alle, die es nicht sehen), wo es steht und wie gross. Die Bilder kommen aus
 * derselben Bilderverwaltung wie im Bildfeld der Bausteine; ein neues lässt
 * sich hier hochladen.
 *
 * Die Datei muss dafür nicht passend zugeschnitten sein: Die Seite zeigt sie
 * in der gewählten Breite, die Höhe folgt aus dem Bild.
 */
function BildDialog({ modus, schliessen, editor, inTabelle }: {
  modus: BildModus | null; schliessen: () => void; editor: Editor; inTabelle: boolean;
}) {
  const [platz, setPlatz] = useState("");
  const [ausrichtung, setAusrichtung] = useState<Ausrichtung>("links");
  const [groesse, setGroesse] = useState<Bildgroesse>("mittel");
  const [eigeneBreite, setEigeneBreite] = useState("");
  const { data: bilder } = useSiteImages();
  const adresse = platz ? bilder?.[platz]?.src : undefined;
  const mass = useBildmass(adresse);
  // Eingefügt wird erst, wenn der Dialog zu ist: Solange er offen ist, hält er
  // den Fokus fest, und ohne Fokus im Textfeld verwirft Puck die Änderung.
  const ausstehend = useRef<(() => void) | null>(null);

  // Beim Öffnen mit dem ausgewählten Bild beginnen – oder leer.
  useEffect(() => {
    if (!modus) return;
    const b = modus.art === "bearbeiten" ? modus : null;
    setPlatz(b?.bild ?? "");
    setAusrichtung(b?.ausrichtung ?? "links");
    setGroesse(b?.groesse ?? "mittel");
    setEigeneBreite(b?.breite ? String(b.breite) : "");
  }, [modus]);

  const breite: number | "ganz" | null = groesse === "ganz" ? "ganz"
    : groesse === "eigen" ? (Number(eigeneBreite) > 0 ? Number(eigeneBreite) : null)
    : BILDGROESSEN[groesse];
  const unscharf = mass && typeof breite === "number" && breite > mass.w;

  const uebernehmen = () => {
    if (!platz || !modus || breite === null) return;
    const verhaeltnis = mass ? mass.h / mass.w : null;
    const wo = ausrichtung;
    // Die Beschreibung gehört zum Bild und wird in der Bildauswahl oben
    // gepflegt. Ein neues Bild bekommt im Text keine eigene; die Seite setzt
    // beim Anzeigen die aus der Bilderverwaltung ein (bildplaetze.ts). Bleibt
    // das Bild dasselbe, bleibt auch eine Beschreibung stehen, die schon im
    // Text war – bei übernommenen Seiten steht sie oft nur dort.
    const text = "";
    if (modus.art === "neu") {
      const bild = typeof breite === "number"
        ? { bild: platz, alt: text, width: breite, height: verhaeltnis ? Math.round(breite * verhaeltnis) : null }
        : { bild: platz, alt: text, klasse: "bild-ganz" };
      ausstehend.current = () => bildEinfuegen(editor, bild, wo);
    } else {
      const neuesBild = platz !== modus.bild;
      ausstehend.current = () => {
        bildAendern(editor, neuesBild ? { bild: platz, alt: text, breite, verhaeltnis } : { breite, verhaeltnis });
        bildAusrichten(editor, wo);
      };
    }
    schliessen();
  };

  const lagen: { wert: Ausrichtung; text: string }[] = useMemo(() => [
    { wert: "links", text: "Links, Text daneben" },
    { wert: "rechts", text: "Rechts, Text daneben" },
    { wert: "text", text: "Im Text" },
  ], []);
  const groessen: { wert: Bildgroesse; text: string }[] = useMemo(() => [
    // In einer Tabellenzelle gibt es keine „ganze Breite": Die Spalte richtet
    // sich nach ihrem Inhalt, und ein Bild mit 100 % davon fiele zusammen.
    ...(Object.keys(GROESSEN_TEXT) as (keyof typeof GROESSEN_TEXT)[])
      .filter((g) => g !== "ganz" || !inTabelle)
      .map((g) => ({ wert: g, text: GROESSEN_TEXT[g] })),
    { wert: "eigen", text: "Eigene Breite" },
  ], [inTabelle]);

  return (
    <Dialog open={!!modus} onOpenChange={(o) => { if (!o) schliessen(); }}>
      <DialogContent
        className="max-w-2xl max-h-[92vh] overflow-y-auto gap-3"
        onCloseAutoFocus={(e) => {
          // Statt zum Knopf zurück geht der Fokus in den Text – und dort
          // landet das Bild.
          const tun = ausstehend.current;
          ausstehend.current = null;
          if (tun) {
            e.preventDefault();
            nachFokus(editor, tun);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{modus?.art === "bearbeiten" ? "Bild bearbeiten" : "Bild einfügen"}</DialogTitle>
        </DialogHeader>
        {modus?.art === "bearbeiten" && (
          <p className="text-sm text-muted-foreground -mt-2">
            Ein anderes Bild auswählen oder hochladen tauscht es an dieser Stelle aus.
          </p>
        )}
        <BildFeld value={platz} onChange={setPlatz} seitentitel="Seiten" />

        <fieldset className="mt-2">
          <legend className="text-sm font-medium mb-1">Wo steht das Bild?</legend>
          <div className="flex flex-wrap gap-3">
            {lagen.map((w) => (
              <label key={w.wert} className="flex items-center gap-1.5 text-sm">
                <input type="radio" name="ausrichtung" checked={ausrichtung === w.wert} onChange={() => setAusrichtung(w.wert)} />
                {w.text}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-2">
          <legend className="text-sm font-medium mb-1">Wie groß?</legend>
          <div className="flex flex-wrap items-center gap-3">
            {groessen.map((g) => (
              <label key={g.wert} className="flex items-center gap-1.5 text-sm">
                <input type="radio" name="groesse" checked={groesse === g.wert} onChange={() => setGroesse(g.wert)} />
                {g.text}
              </label>
            ))}
            {groesse === "eigen" && (
              <label className="flex items-center gap-1 text-sm">
                <Input
                  type="number" min={20} max={2000} value={eigeneBreite}
                  onChange={(e) => setEigeneBreite(e.target.value)}
                  className="h-8 w-20" aria-label="Eigene Breite in Pixeln"
                />
                px
              </label>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {mass ? `Die Datei ist ${mass.w} × ${mass.h} px. ` : ""}
            Die Höhe folgt aus dem Bild. Auf schmalen Bildschirmen wird jedes Bild höchstens so breit wie der Text.
            {unscharf && <span className="text-destructive"> So groß wirkt diese Datei unscharf – besser eine größere hochladen.</span>}
          </p>
        </fieldset>

        <DialogFooter>
          <Button variant="outline" onClick={schliessen}>Abbrechen</Button>
          <Button onClick={uebernehmen} disabled={!platz || breite === null}>
            {modus?.art === "bearbeiten" ? "Übernehmen" : "Einfügen"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Pucks Leiste unverändert, dahinter die Zusatzknöpfe. */
export function FliesstextMenue({ children, editor, readOnly }: {
  children: React.ReactNode; editor: Editor | null; readOnly: boolean;
}) {
  return (
    <RichTextMenu>
      {children}
      <Zusatzleiste editor={editor} readOnly={readOnly} />
    </RichTextMenu>
  );
}
