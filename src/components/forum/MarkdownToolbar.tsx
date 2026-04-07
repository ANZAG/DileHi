import { Bold, Italic, Link, Code, Quote, Table, List, Heading } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (value: string) => void;
}

type ToolAction = {
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  action: (text: string, selStart: number, selEnd: number) => { text: string; cursorStart: number; cursorEnd: number };
};

const wrap = (before: string, after: string) => (text: string, selStart: number, selEnd: number) => {
  const selected = text.slice(selStart, selEnd);
  const placeholder = selected || "Text";
  const newText = text.slice(0, selStart) + before + placeholder + after + text.slice(selEnd);
  return {
    text: newText,
    cursorStart: selStart + before.length,
    cursorEnd: selStart + before.length + placeholder.length,
  };
};

const prefixLine = (prefix: string, placeholder: string) => (text: string, selStart: number, selEnd: number) => {
  const selected = text.slice(selStart, selEnd) || placeholder;
  const needsNewline = selStart > 0 && text[selStart - 1] !== "\n";
  const pre = needsNewline ? "\n" : "";
  const newText = text.slice(0, selStart) + pre + prefix + selected + text.slice(selEnd);
  const offset = pre.length + prefix.length;
  return {
    text: newText,
    cursorStart: selStart + offset,
    cursorEnd: selStart + offset + selected.length,
  };
};

const tools: ToolAction[] = [
  { icon: Bold, label: "Fett", shortcut: "Ctrl+B", action: wrap("**", "**") },
  { icon: Italic, label: "Kursiv", shortcut: "Ctrl+I", action: wrap("*", "*") },
  { icon: Heading, label: "Überschrift", action: prefixLine("### ", "Überschrift") },
  { icon: Link, label: "Link", action: (text, selStart, selEnd) => {
    const selected = text.slice(selStart, selEnd) || "Linktext";
    const insert = `[${selected}](url)`;
    const newText = text.slice(0, selStart) + insert + text.slice(selEnd);
    return { text: newText, cursorStart: selStart + selected.length + 3, cursorEnd: selStart + selected.length + 6 };
  }},
  { icon: Quote, label: "Zitat", action: prefixLine("> ", "Zitat") },
  { icon: Code, label: "Code", action: wrap("`", "`") },
  { icon: List, label: "Liste", action: prefixLine("- ", "Eintrag") },
  { icon: Table, label: "Tabelle", action: (text, selStart) => {
    const tpl = "\n| Spalte 1 | Spalte 2 |\n|----------|----------|\n| Zelle    | Zelle    |\n";
    const newText = text.slice(0, selStart) + tpl + text.slice(selStart);
    return { text: newText, cursorStart: selStart + tpl.length, cursorEnd: selStart + tpl.length };
  }},
];

const MarkdownToolbar = ({ textareaRef, value, onChange }: MarkdownToolbarProps) => {
  const applyTool = (tool: ToolAction) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const selStart = ta.selectionStart;
    const selEnd = ta.selectionEnd;
    const result = tool.action(value, selStart, selEnd);
    onChange(result.text);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(result.cursorStart, result.cursorEnd);
    });
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap gap-0.5 border-b pb-1.5 mb-1.5">
        {tools.map((tool) => (
          <Tooltip key={tool.label}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => applyTool(tool)}
              >
                <tool.icon size={15} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {tool.label}{tool.shortcut ? ` (${tool.shortcut})` : ""}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
};

export default MarkdownToolbar;
