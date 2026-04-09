import { useState, useRef, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImagePlus, Send } from "lucide-react";
import MarkdownToolbar from "./MarkdownToolbar";
import MarkdownContent from "./MarkdownContent";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface ForumEditorProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  submitLabel?: string;
  submitIcon?: React.ReactNode;
  placeholder?: string;
  rows?: number;
  disabled?: boolean;
  isPending?: boolean;
  showSubmitButton?: boolean;
  className?: string;
}

const ForumEditor = ({
  value,
  onChange,
  onSubmit,
  submitLabel,
  submitIcon = <Send size={16} />,
  placeholder = "Nachricht schreiben… (Markdown wird unterstützt)",
  rows = 4,
  disabled = false,
  isPending = false,
  showSubmitButton = true,
  className = "",
}: ForumEditorProps) => {
  const { user } = useAuth();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [tab, setTab] = useState<string>("write");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadImage = useCallback(
    async (file: File) => {
      if (!user) return;
      if (!file.type.startsWith("image/")) {
        toast({ title: "Fehler", description: "Nur Bilddateien sind erlaubt.", variant: "destructive" });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: "Fehler", description: "Maximale Dateigröße: 5 MB.", variant: "destructive" });
        return;
      }

      setUploading(true);
      try {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("forum-images").upload(path, file);
        if (error) throw error;

        const { data: urlData } = supabase.storage.from("forum-images").getPublicUrl(path);
        const markdown = `![${file.name}](${urlData.publicUrl})`;

        const ta = textareaRef.current;
        if (ta) {
          const pos = ta.selectionStart;
          const newValue = value.slice(0, pos) + markdown + "\n" + value.slice(pos);
          onChange(newValue);
        } else {
          onChange(value + "\n" + markdown + "\n");
        }
      } catch {
        toast({ title: "Fehler", description: "Bild konnte nicht hochgeladen werden.", variant: "destructive" });
      } finally {
        setUploading(false);
      }
    },
    [user, value, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) uploadImage(file);
    },
    [uploadImage]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) uploadImage(file);
          return;
        }
      }
    },
    [uploadImage]
  );

  return (
    <div className={`space-y-2 ${className}`}>
      <Tabs value={tab} onValueChange={setTab}>
        <div className="flex items-center justify-between">
          <TabsList className="h-8">
            <TabsTrigger value="write" className="text-xs px-3 py-1">Schreiben</TabsTrigger>
            <TabsTrigger value="preview" className="text-xs px-3 py-1">Vorschau</TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <ImagePlus size={14} className="mr-1" />
              {uploading ? "Lädt…" : "Bild"}
            </Button>
          </div>
        </div>

        <TabsContent value="write" className="mt-2">
          <MarkdownToolbar textareaRef={textareaRef} value={value} onChange={onChange} />
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="relative"
          >
            <Textarea
              ref={textareaRef}
              placeholder={placeholder}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onPaste={handlePaste}
              rows={rows}
              className="resize-none"
              disabled={disabled}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && onSubmit) {
                  e.preventDefault();
                  onSubmit();
                }
              }}
            />
            {uploading && (
              <div className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-md">
                <span className="text-sm text-muted-foreground animate-pulse">Bild wird hochgeladen…</span>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="preview" className="mt-2">
          <div className="min-h-[100px] p-3 border rounded-md bg-muted/30">
            {value.trim() ? (
              <MarkdownContent content={value} />
            ) : (
              <p className="text-sm text-muted-foreground italic">Keine Vorschau verfügbar.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {showSubmitButton && onSubmit && (
        <div className="flex justify-end">
          <Button
            onClick={onSubmit}
            disabled={!value.trim() || isPending || disabled}
            size="sm"
          >
            {submitIcon}
            {submitLabel && <span className="ml-1">{submitLabel}</span>}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ForumEditor;
