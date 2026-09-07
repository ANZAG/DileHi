import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect } from "react";
import {
  Bold, Italic, List, ListOrdered, Quote, Link as LinkIcon, Undo, Redo, Heading2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Kompakte Leiste für Antworten, volle für neue Themen. */
  compact?: boolean;
}

/**
 * Editor mit sichtbarem Ergebnis.
 *
 * Die alte Fassung war ein Textfeld mit Markdown-Knöpfen: Man tippte
 * `**fett**` und sah erst nach dem Absenden, ob es stimmt. Für Mitglieder, die
 * nicht täglich mit Technik zu tun haben, ist das die eigentliche Hürde – und
 * der Grund, warum Beiträge lieber in WhatsApp landen.
 */
export default function ForumEditor({ value, onChange, placeholder, compact = false }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: compact ? false : { levels: [2, 3] },
        codeBlock: false,
        horizontalRule: false,
      }),
      Link.configure({ openOnClick: false, autolink: true, protocols: ["http", "https", "mailto"] }),
      Placeholder.configure({ placeholder: placeholder ?? "Schreib etwas …" }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm dark:prose-invert max-w-none min-h-[8rem] px-3 py-2.5 focus:outline-none " +
          "prose-p:my-1.5 prose-headings:font-serif prose-a:text-primary",
      },
    },
  });

  // Von außen geleerter Inhalt (nach dem Absenden) muss ankommen.
  useEffect(() => {
    if (editor && value === "" && editor.getHTML() !== "<p></p>") editor.commands.clearContent();
  }, [value, editor]);

  if (!editor) return null;

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

  return (
    <div className="rounded-lg border bg-background focus-within:border-primary transition-colors">
      <div className="flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1">
        {tool("Fett", <Bold size={15} />, () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
        {tool("Kursiv", <Italic size={15} />, () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}
        {!compact &&
          tool("Zwischenüberschrift", <Heading2 size={15} />,
            () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
        {tool("Aufzählung", <List size={15} />, () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
        {tool("Nummerierung", <ListOrdered size={15} />, () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
        {tool("Zitat", <Quote size={15} />, () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}
        {tool("Link", <LinkIcon size={15} />, addLink, editor.isActive("link"))}
        <span className="ml-auto flex gap-0.5">
          {tool("Rückgängig", <Undo size={15} />, () => editor.chain().focus().undo().run(), false, !editor.can().undo())}
          {tool("Wiederherstellen", <Redo size={15} />, () => editor.chain().focus().redo().run(), false, !editor.can().redo())}
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
