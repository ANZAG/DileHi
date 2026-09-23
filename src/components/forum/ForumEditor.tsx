import { useEffect, useRef, useState } from "react";
import { useEditor, useEditorState, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Blockquote from "@tiptap/extension-blockquote";
import Placeholder from "@tiptap/extension-placeholder";
import Image from "@tiptap/extension-image";
import Mention from "@tiptap/extension-mention";
import Typography from "@tiptap/extension-typography";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { mergeAttributes } from "@tiptap/core";
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, ListChecks,
  Quote, Link as LinkIcon, Undo, Redo, ImagePlus, Table as TableIcon,
  Loader2, Rows3, Columns3, Trash2, Palette,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { FARBPALETTE, Smileys, Textfarbe } from "./cleverExtensions";
import { createMentionSuggestion, type MentionMember } from "./mentionSuggestion";
import { signForumImages, uploadForumImage } from "./forumImages";
import "./forum-content.css";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Kompakte Leiste für Antworten, volle für neue Themen. */
  compact?: boolean;
  /**
   * Wie viel Werkzeug angeboten wird. „knapp" ist die Fassung fürs
   * Kontaktformular: Ein Gast, der eine Anfrage schreibt, braucht keine
   * Tabellen und keine Aufgabenlisten – er braucht Absätze, eine Aufzählung
   * und vielleicht eine Hervorhebung.
   */
  umfang?: "voll" | "knapp";
  /** Namensliste für „@" – ohne sie bleibt die Erwähnung einfach aus. */
  members?: MentionMember[];
  /** Von außen eingefügter Text (Zitat). `nonce` erzwingt das erneute Einfügen. */
  insert?: { html: string; nonce: number };
}

/**
 * Zitat mit Bezug: ein Blockquote, das sich merkt, von wem es stammt.
 *
 * Der Name steht nicht als Text im Zitat, sondern als Eigenschaft daran – so
 * lässt er sich beim Anzeigen einheitlich davorsetzen und niemand kann ihn
 * versehentlich mitlöschen oder überschreiben.
 */
const QuoteWithSource = Blockquote.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      author: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-quote-author"),
        renderHTML: (attrs) =>
          attrs.author ? { "data-quote-author": attrs.author as string } : {},
      },
    };
  },
});

/** Bild, das sich seinen Ablageort merkt – siehe forumImages.ts. */
const ForumImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      path: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-path"),
        renderHTML: (attrs) => (attrs.path ? { "data-path": attrs.path as string } : {}),
      },
    };
  },
});

const EDITOR_CLASS =
  "forum-content prose prose-sm dark:prose-invert max-w-none min-h-[8rem] px-3 py-2.5 " +
  "focus:outline-none prose-p:my-1.5 prose-headings:font-serif prose-a:text-primary";

/**
 * Editor mit sichtbarem Ergebnis.
 *
 * Die alte Fassung war ein Textfeld mit Markdown-Knöpfen: Man tippte
 * `**fett**` und sah erst nach dem Absenden, ob es stimmt. Für Mitglieder, die
 * nicht täglich mit Technik zu tun haben, ist das die eigentliche Hürde – und
 * der Grund, warum Beiträge lieber in WhatsApp landen.
 */
export default function ForumEditor({
  value,
  onChange,
  placeholder,
  compact = false,
  umfang = "voll",
  members,
  insert,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // Die Namensliste kommt asynchron, der Editor wird einmal gebaut. Über die
  // Referenz sieht die Vorschlagsliste immer den aktuellen Stand, ohne dass der
  // Editor dafür neu entstehen muss (das würde den Text verwerfen).
  const membersRef = useRef<MentionMember[]>(members ?? []);
  membersRef.current = members ?? [];

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // H1 gehört eigentlich der Seitenüberschrift; im Beitrag ist es aber
        // die Größe, nach der Leute greifen, wenn sie etwas abheben wollen.
        // Angezeigt wird es deshalb kleiner als der Thementitel.
        heading: { levels: [1, 2, 3] },
        codeBlock: false,
        horizontalRule: false,
        // Eigene Fassung mit Herkunftsangabe.
        blockquote: false,
        link: { openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] },
      }),
      QuoteWithSource,
      Placeholder.configure({ placeholder: placeholder ?? "Schreib etwas …" }),
      TaskList,
      TaskItem.configure({ nested: false }),
      ForumImage.configure({ inline: false, allowBase64: false }),
      TableKit.configure({ table: { resizable: false } }),
      // „Clever Editor": „--" wird zum Gedankenstrich, „..." zu
      // Auslassungspunkten, Anführungszeichen werden typografisch – dazu
      // Farbwörter und Smileys. Nichts davon muss man lernen, es passiert
      // beim Tippen.
      Typography,
      Textfarbe,
      Smileys,
      Mention.configure({
        HTMLAttributes: { class: "forum-mention" },
        // data-mention-id ist die Fassung, die der Datenbank-Trigger ausliest;
        // data-id bleibt daneben stehen, damit Tiptap den Beitrag beim
        // Bearbeiten wieder einlesen kann.
        renderHTML: ({ node }) =>
          [
            "span",
            mergeAttributes(
              { class: "forum-mention", "data-type": "mention" },
              {
                "data-id": node.attrs.id,
                "data-mention-id": node.attrs.id,
                "data-label": node.attrs.label,
              }
            ),
            `@${node.attrs.label ?? node.attrs.id}`,
          ] as const,
        renderText: ({ node }) => `@${node.attrs.label ?? node.attrs.id}`,
        suggestion: createMentionSuggestion(() => membersRef.current),
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: { attributes: { class: EDITOR_CLASS } },
  });

  // In Tiptap 3 wird die Komponente nicht mehr bei jeder Änderung neu gezeichnet.
  // Ohne das hier bliebe die Werkzeugleiste stumm – ein „Fett"-Knopf, der nie
  // aufleuchtet, wirkt kaputt.
  const state = useEditorState({
    editor,
    selector: ({ editor }) => {
      if (!editor) return null;
      return {
        bold: editor.isActive("bold"),
        italic: editor.isActive("italic"),
        underline: editor.isActive("underline"),
        strike: editor.isActive("strike"),
        bulletList: editor.isActive("bulletList"),
        orderedList: editor.isActive("orderedList"),
        taskList: editor.isActive("taskList"),
        blockquote: editor.isActive("blockquote"),
        link: editor.isActive("link"),
        inTable: editor.isActive("table"),
        farbe: (editor.getAttributes("textfarbe").farbe as string | undefined) ?? null,
        heading: editor.isActive("heading", { level: 1 })
          ? "1"
          : editor.isActive("heading", { level: 2 })
            ? "2"
            : editor.isActive("heading", { level: 3 })
              ? "3"
              : "p",
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo(),
      };
    },
  });

  // Ein schon abgebauter Editor kommt hier tatsächlich an: Tiptap baut einen
  // neuen Editor nach einer Millisekunde wieder ab, wenn die Komponente bis
  // dahin nicht eingehängt ist. Auf der Themenseite dauert der erste Aufbau mit
  // allen Beiträgen länger; useEditor legt dann im selben Durchgang einen
  // frischen Editor an, die Effekte hier sehen aber noch den alten. Sein Schema
  // ist weg, getHTML() wirft, und die ganze Seite fällt in die Fehlerseite.
  // Mit dem frischen Editor laufen die Effekte gleich danach noch einmal.

  // Von außen geleerter Inhalt (nach dem Absenden) muss ankommen.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (value === "" && editor.getHTML() !== "<p></p>") editor.commands.clearContent();
  }, [value, editor]);

  // Zitat aus einem Beitrag übernehmen.
  useEffect(() => {
    if (!editor || editor.isDestroyed || !insert) return;
    editor.chain().focus("end").insertContent(insert.html).run();
    // Absichtlich nur auf den Zähler hören: derselbe Text darf zweimal
    // eingefügt werden, wenn zweimal auf „Zitieren" geklickt wird.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insert?.nonce, editor]);

  // Bereits gespeicherte Bilder tragen eine abgelaufene Adresse. Beim
  // Bearbeiten eines älteren Beitrags werden sie hier frisch signiert.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const paths: string[] = [];
    editor.state.doc.descendants((node) => {
      const p = node.attrs?.path as string | undefined;
      if (node.type.name === "image" && p) paths.push(p);
    });
    if (paths.length === 0) return;

    let cancelled = false;
    signForumImages(paths)
      .then((map) => {
        if (cancelled || editor.isDestroyed) return;
        editor.state.doc.descendants((node, pos) => {
          const p = node.attrs?.path as string | undefined;
          if (node.type.name === "image" && p && map[p] && node.attrs.src !== map[p]) {
            // Nicht in den Verlauf: Ein „Rückgängig" soll den eigenen Text
            // zurückholen, nicht eine technische Adressänderung.
            editor.view.dispatch(
              editor.state.tr.setNodeAttribute(pos, "src", map[p]).setMeta("addToHistory", false)
            );
          }
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [editor]);

  const knapp = umfang === "knapp";

  if (!editor || !state) return null;

  const tool = (
    label: string,
    icon: React.ReactNode,
    action: () => void,
    active = false,
    disabled = false
  ) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={action}
      className={`h-8 w-8 rounded-md ${active ? "bg-muted text-foreground" : "text-muted-foreground"}`}
    >
      {icon}
    </Button>
  );

  const addLink = () => {
    const previous = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Adresse des Links", previous ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const pickImage = async (file: File | undefined) => {
    if (!file || !user) return;
    setUploading(true);
    try {
      const { path, url } = await uploadForumImage(file, user.id);
      editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      // Der Ablageort muss mit; die signierte Adresse läuft ab.
      const { state: s } = editor;
      s.doc.descendants((node, pos) => {
        if (node.type.name === "image" && node.attrs.src === url && !node.attrs.path) {
          editor.view.dispatch(editor.state.tr.setNodeAttribute(pos, "path", path));
        }
      });
      onChange(editor.getHTML());
    } catch (err) {
      toast({
        title: "Bild konnte nicht hochgeladen werden",
        description: err instanceof Error ? err.message : "Unbekannter Fehler",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const setBlock = (v: string) => {
    if (v === "p") editor.chain().focus().setParagraph().run();
    else editor.chain().focus().setHeading({ level: Number(v) as 1 | 2 | 3 }).run();
  };

  return (
    <div className="rounded-lg border bg-background focus-within:border-primary transition-colors">
      <div className="flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1">
        {knapp ? (
          <>
            {tool("Fett", <Bold size={15} />, () => editor.chain().focus().toggleBold().run(), state.bold)}
            {tool("Kursiv", <Italic size={15} />, () => editor.chain().focus().toggleItalic().run(), state.italic)}
            {tool("Aufzählung", <List size={15} />, () => editor.chain().focus().toggleBulletList().run(), state.bulletList)}
            {tool("Link", <LinkIcon size={15} />, addLink, state.link)}
            <span className="ml-auto flex gap-0.5">
              {tool("Rückgängig", <Undo size={15} />, () => editor.chain().focus().undo().run(), false, !state.canUndo)}
              {tool("Wiederherstellen", <Redo size={15} />, () => editor.chain().focus().redo().run(), false, !state.canRedo)}
            </span>
          </>
        ) : (
        <>
        {/* Auch in Antworten sichtbar: Wer eine Zwischenüberschrift braucht,
            braucht sie auch dort – und was man nicht sieht, gibt es nicht.
            Die Beschriftung nennt die Größe statt „H1", weil kaum jemand
            außerhalb der Technik weiß, was H1 bedeutet. */}
        <select
          aria-label="Schriftgröße"
          value={state.heading}
          onChange={(e) => setBlock(e.target.value)}
          className="h-8 rounded-md border-0 bg-transparent px-1.5 text-sm text-muted-foreground
            focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
        >
          <option value="p">Normal</option>
          <option value="1">Überschrift groß</option>
          <option value="2">Überschrift mittel</option>
          <option value="3">Überschrift klein</option>
        </select>

        {tool("Fett", <Bold size={15} />, () => editor.chain().focus().toggleBold().run(), state.bold)}
        {tool("Kursiv", <Italic size={15} />, () => editor.chain().focus().toggleItalic().run(), state.italic)}
        {tool("Unterstrichen", <Underline size={15} />, () => editor.chain().focus().toggleUnderline().run(), state.underline)}
        {tool("Durchgestrichen", <Strikethrough size={15} />, () => editor.chain().focus().toggleStrike().run(), state.strike)}

        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

        {tool("Aufzählung", <List size={15} />, () => editor.chain().focus().toggleBulletList().run(), state.bulletList)}
        {tool("Nummerierung", <ListOrdered size={15} />, () => editor.chain().focus().toggleOrderedList().run(), state.orderedList)}
        {tool("Aufgabenliste", <ListChecks size={15} />, () => editor.chain().focus().toggleTaskList().run(), state.taskList)}
        {tool("Zitat", <Quote size={15} />, () => editor.chain().focus().toggleBlockquote().run(), state.blockquote)}

        <span className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

        {tool("Link", <LinkIcon size={15} />, addLink, state.link)}
        {tool(
          "Bild einfügen",
          uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />,
          () => fileInput.current?.click(),
          false,
          uploading || !user
        )}
        {tool("Tabelle einfügen", <TableIcon size={15} />, () =>
          editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
        )}

        {/* Farbe für beliebigen Text. Die Automatik beim Tippen bleibt – aber
            sie erwischt nur Farbwörter, und „rot" färben zu wollen ist nicht
            dasselbe wie „Achtung" färben zu wollen. */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Textfarbe"
              title="Textfarbe"
              className={`h-8 w-8 rounded-md ${state.farbe ? "bg-muted text-foreground" : "text-muted-foreground"}`}
            >
              <Palette size={15} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-2" align="start">
            <div className="grid grid-cols-7 gap-1">
              {FARBPALETTE.map((f) => (
                <button
                  key={f.wert}
                  type="button"
                  aria-label={f.name}
                  title={f.name}
                  onClick={() => editor.chain().focus().setTextfarbe(f.wert).run()}
                  className={`h-7 w-7 rounded-md border flex items-center justify-center text-base font-bold
                    hover:bg-muted forum-content ${state.farbe === f.wert ? "ring-2 ring-ring" : ""}`}
                >
                  {/* Das A trägt die Farbe selbst – so ist die Vorschau
                      dieselbe Darstellung wie später im Beitrag. */}
                  <span data-farbe={f.wert}>A</span>
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-2 w-full text-xs text-muted-foreground"
              onClick={() => editor.chain().focus().unsetTextfarbe().run()}
            >
              Farbe entfernen
            </Button>
          </PopoverContent>
        </Popover>

        <span className="ml-auto flex gap-0.5">
          {tool("Rückgängig", <Undo size={15} />, () => editor.chain().focus().undo().run(), false, !state.canUndo)}
          {tool("Wiederherstellen", <Redo size={15} />, () => editor.chain().focus().redo().run(), false, !state.canRedo)}
        </span>
        </>
        )}
      </div>

      {/* Tabellenwerkzeuge erscheinen nur, wenn der Cursor in einer Tabelle
          steht – sonst stehen sieben Knöpfe herum, die fast nie gebraucht
          werden. */}
      {!knapp && state.inTable && (
        <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 px-1.5 py-1">
          <span className="text-xs text-muted-foreground px-1">Tabelle:</span>
          {tool("Zeile darunter", <Rows3 size={15} />, () => editor.chain().focus().addRowAfter().run())}
          {tool("Spalte rechts", <Columns3 size={15} />, () => editor.chain().focus().addColumnAfter().run())}
          <Button
            type="button" variant="ghost" size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => editor.chain().focus().deleteRow().run()}
          >
            Zeile weg
          </Button>
          <Button
            type="button" variant="ghost" size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => editor.chain().focus().deleteColumn().run()}
          >
            Spalte weg
          </Button>
          {tool("Tabelle entfernen", <Trash2 size={15} />, () => editor.chain().focus().deleteTable().run())}
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="sr-only"
        onChange={(e) => {
          void pickImage(e.target.files?.[0]);
          // Zurücksetzen, sonst löst dieselbe Datei kein zweites Mal aus.
          e.target.value = "";
        }}
      />

      <div className="overflow-x-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
