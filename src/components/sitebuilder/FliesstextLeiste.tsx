import { useEffect, useMemo, useRef, useState } from "react";
import { RichTextMenu } from "@puckeditor/core";
import { NodeViewWrapper, useEditorState, type NodeViewProps } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import {
  BetweenHorizontalEnd, BetweenVerticalEnd, Columns2, ImagePlus, PanelLeft, PanelRight,
  SeparatorHorizontal, Table2, TextCursorInput, Trash2, Ungroup,
} from "lucide-react";
import { useSiteImages } from "@/hooks/useSiteImage";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import BildFeld from "./BildFeld";
import { platzhalterBild } from "./bildplaetze";
import {
  bildAusrichten, bildBreite, bildEinfuegen, gewaehltesBild,
  istIn, leerzeileEinfuegen, spaltenAufloesen, spaltenEinfuegen, tabelleEinfuegen, tabelleLoeschen,
  type Ausrichtung,
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
  const { bild, src, alt, width, height } = node.attrs as {
    bild: string | null; src: string | null; alt: string; width: number | null; height: number | null;
  };
  const adresse = (bild && bilder?.[bild]?.src) || src
    || platzhalterBild(width ?? 0, height ?? 0, alt || bild || "Bild");
  return (
    <NodeViewWrapper as="span" className="inline-block max-w-full align-middle">
      <img
        src={adresse}
        alt={alt}
        width={width ?? undefined}
        height={height ?? undefined}
        draggable={false}
        className={`inline-block h-auto max-w-full ${selected ? "outline outline-2 outline-offset-2 outline-primary" : ""}`}
      />
    </NodeViewWrapper>
  );
}

/** Knöpfe, die nur dort erscheinen, wo sie etwas tun. */
function Zusatzleiste({ editor, readOnly }: { editor: Editor | null; readOnly: boolean }) {
  const [dialog, setDialog] = useState(false);
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
        <RichTextMenu.Control title="Bild einfügen" icon={<ImagePlus size={16} />} disabled={aus} onClick={() => setDialog(true)} />
        <RichTextMenu.Control title="Tabelle einfügen" icon={<Table2 size={16} />} disabled={aus || zustand.tabelle} onClick={() => tabelleEinfuegen(editor)} />
        <RichTextMenu.Control title="Zwei Spalten einfügen" icon={<Columns2 size={16} />} disabled={aus || zustand.spalten} onClick={() => spaltenEinfuegen(editor)} />
        <RichTextMenu.Control title="Leerzeile einfügen" icon={<SeparatorHorizontal size={16} />} disabled={aus} onClick={() => leerzeileEinfuegen(editor)} />
      </RichTextMenu.Group>

      {bild && (
        <RichTextMenu.Group>
          <RichTextMenu.Control title="Bild im Text" icon={<TextCursorInput size={16} />} active={bild.ausrichtung === "text"} disabled={aus} onClick={() => bildAusrichten(editor, "text")} />
          <RichTextMenu.Control title="Bild links, Text fliesst rechts daneben" icon={<PanelLeft size={16} />} active={bild.ausrichtung === "links"} disabled={aus} onClick={() => bildAusrichten(editor, "links")} />
          <RichTextMenu.Control title="Bild rechts, Text fliesst links daneben" icon={<PanelRight size={16} />} active={bild.ausrichtung === "rechts"} disabled={aus} onClick={() => bildAusrichten(editor, "rechts")} />
          <BreiteFeld editor={editor} breite={Number(bild.node.attrs.width) || 0} disabled={aus} />
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

      <BildDialog offen={dialog} schliessen={() => setDialog(false)} editor={editor} />
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

/** Breite des ausgewählten Bildes in Pixeln; die Höhe folgt im Verhältnis. */
function BreiteFeld({ editor, breite, disabled }: { editor: Editor; breite: number; disabled: boolean }) {
  const [wert, setWert] = useState(String(breite || ""));
  useEffect(() => setWert(String(breite || "")), [breite]);
  return (
    <label className="ml-1 flex items-center gap-1 text-xs text-muted-foreground" title="Breite des Bildes in Pixeln">
      <input
        type="number"
        min={20}
        max={1200}
        value={wert}
        disabled={disabled}
        onChange={(e) => setWert(e.target.value)}
        onBlur={() => nachFokus(editor, () => bildBreite(editor, Number(wert)))}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); nachFokus(editor, () => bildBreite(editor, Number(wert))); } }}
        className="h-7 w-16 rounded border bg-background px-1 text-xs"
        aria-label="Breite in Pixeln"
      />
      px
    </label>
  );
}

/**
 * Ein Bild auswählen oder hochladen und einfügen.
 *
 * Dieselbe Auswahl wie im Bildfeld der Bausteine – die Bilder liegen in
 * derselben Bilderverwaltung. Die Grösse wird aus dem Bild selbst gelesen und
 * auf höchstens 300 px Breite begrenzt; ändern lässt sie sich danach in der
 * Leiste.
 */
function BildDialog({ offen, schliessen, editor }: { offen: boolean; schliessen: () => void; editor: Editor }) {
  const [platz, setPlatz] = useState("");
  const [ausrichtung, setAusrichtung] = useState<Ausrichtung>("links");
  const { data: bilder } = useSiteImages();
  const adresse = platz ? bilder?.[platz]?.src : undefined;
  // Eingefügt wird erst, wenn der Dialog zu ist: Solange er offen ist, hält er
  // den Fokus fest, und ohne Fokus im Textfeld verwirft Puck die Änderung.
  const ausstehend = useRef<(() => void) | null>(null);

  const einfuegen = async () => {
    if (!platz) return;
    const mass = await new Promise<{ w: number; h: number } | null>((fertig) => {
      if (!adresse) return fertig(null);
      const probe = new Image();
      probe.onload = () => fertig({ w: probe.naturalWidth, h: probe.naturalHeight });
      probe.onerror = () => fertig(null);
      probe.src = adresse;
    });
    const breite = mass ? Math.min(300, mass.w) : 300;
    const hoehe = mass ? Math.round((mass.h * breite) / mass.w) : 200;
    const bild = { bild: platz, alt: bilder?.[platz]?.alt ?? "", width: breite, height: hoehe };
    const wo = ausrichtung;
    ausstehend.current = () => bildEinfuegen(editor, bild, wo);
    setPlatz("");
    schliessen();
  };

  const wahl: { wert: Ausrichtung; text: string }[] = useMemo(() => [
    { wert: "links", text: "Links, Text daneben" },
    { wert: "rechts", text: "Rechts, Text daneben" },
    { wert: "text", text: "Im Text" },
  ], []);

  return (
    <Dialog open={offen} onOpenChange={(o) => { if (!o) schliessen(); }}>
      <DialogContent
        className="max-w-2xl"
        onCloseAutoFocus={(e) => {
          // Statt zum Knopf zurück geht der Fokus in den Text – und dort
          // landet das Bild.
          const einfuegen = ausstehend.current;
          ausstehend.current = null;
          if (einfuegen) {
            e.preventDefault();
            nachFokus(editor, einfuegen);
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Bild einfügen</DialogTitle>
        </DialogHeader>
        <BildFeld value={platz} onChange={setPlatz} seitentitel="Seiten" />
        <fieldset className="mt-2">
          <legend className="text-sm font-medium mb-1">Wo steht das Bild?</legend>
          <div className="flex flex-wrap gap-3">
            {wahl.map((w) => (
              <label key={w.wert} className="flex items-center gap-1.5 text-sm">
                <input type="radio" name="ausrichtung" checked={ausrichtung === w.wert} onChange={() => setAusrichtung(w.wert)} />
                {w.text}
              </label>
            ))}
          </div>
        </fieldset>
        <DialogFooter>
          <Button variant="outline" onClick={schliessen}>Abbrechen</Button>
          <Button onClick={einfuegen} disabled={!platz}>Einfügen</Button>
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
