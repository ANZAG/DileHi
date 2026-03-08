import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Upload, Trash2, FileText, Download, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const CATEGORIES = [
  { value: "satzung", label: "Satzung & Ordnungen" },
  { value: "protokoll", label: "Protokolle" },
  { value: "sonstiges", label: "Sonstiges" },
];

const Documents = () => {
  const { isVorstand } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("sonstiges");
  const [file, setFile] = useState<File | null>(null);

  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${crypto.randomUUID()}.${ext}`;

    const { error: storageError } = await supabase.storage
      .from("documents")
      .upload(path, file);

    if (storageError) {
      toast({ title: "Upload fehlgeschlagen", variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("documents").insert({
      title: title.trim(),
      category,
      storage_path: path,
      file_name: file.name,
      uploaded_by: user!.id,
    });

    setUploading(false);
    if (error) {
      toast({ title: "Fehler beim Speichern", variant: "destructive" });
    } else {
      toast({ title: "Dokument hochgeladen" });
      setTitle("");
      setCategory("sonstiges");
      setFile(null);
      qc.invalidateQueries({ queryKey: ["documents"] });
    }
  };

  const deleteMutation = useMutation({
    mutationFn: async (doc: { id: string; storage_path: string }) => {
      await supabase.storage.from("documents").remove([doc.storage_path]);
      const { error } = await supabase.from("documents").delete().eq("id", doc.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["documents"] });
      toast({ title: "Dokument gelöscht" });
    },
  });

  const handleDownload = async (storagePath: string, fileName: string) => {
    const { data, error } = await supabase.storage
      .from("documents")
      .download(storagePath);
    if (error || !data) return;
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const grouped = CATEGORIES.map((cat) => ({
    ...cat,
    docs: docs.filter((d: any) => d.category === cat.value),
  })).filter((g) => g.docs.length > 0);

  return (
    <div className="container py-8 sm:py-12 max-w-3xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>

        <h1 className="font-serif text-2xl sm:text-3xl font-bold mb-6">Vereinsdokumente</h1>

        {isVorstand && (
          <form onSubmit={handleUpload} className="p-4 rounded-lg border bg-card mb-8 space-y-4">
            <h2 className="font-semibold text-sm">Dokument hochladen</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="doc-title">Titel</Label>
                <Input id="doc-title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200} />
              </div>
              <div className="space-y-1">
                <Label>Kategorie</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="doc-file">Datei</Label>
              <Input
                id="doc-file"
                type="file"
                accept=".pdf,.doc,.docx,.odt,.txt"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
              />
            </div>
            <Button type="submit" disabled={uploading || !file || !title.trim()} size="sm">
              <Upload size={16} className="mr-1" />
              {uploading ? "Wird hochgeladen…" : "Hochladen"}
            </Button>
          </form>
        )}

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Lade Dokumente…</p>
        ) : grouped.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FolderOpen size={40} className="mx-auto mb-3 opacity-50" />
            <p>Noch keine Dokumente vorhanden.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {grouped.map((group) => (
              <div key={group.value}>
                <h2 className="font-serif text-lg font-semibold mb-3">{group.label}</h2>
                <div className="space-y-2">
                  {group.docs.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText size={18} className="text-primary shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">{doc.file_name} · {new Date(doc.created_at).toLocaleDateString("de-DE")}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => handleDownload(doc.storage_path, doc.file_name)}>
                          <Download size={16} />
                        </Button>
                        {isVorstand && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 size={16} className="text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Dokument löschen?</AlertDialogTitle>
                                <AlertDialogDescription>„{doc.title}" wird unwiderruflich gelöscht.</AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(doc)}>Löschen</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Documents;
