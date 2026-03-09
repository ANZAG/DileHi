import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Search, ExternalLink, Trash2, Folder, FolderPlus, Upload, FileText, ArrowUp, Loader2, CheckCircle2, Pencil, Eye, FolderInput } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const EPOCHS = [
  { value: "mittelalter", label: "Spätmittelalter" },
  { value: "1815", label: "Napoleonik" },
  { value: "wk1", label: "Erster Weltkrieg" },
];

const sanitizeFileName = (name: string) =>
  name.replace(/[^a-zA-Z0-9._-]/g, "_");

const getFileExtension = (path: string) => {
  const ext = path.split(".").pop()?.toLowerCase() || "";
  return ext;
};

const isPreviewable = (path: string) => {
  const ext = getFileExtension(path);
  return ["pdf", "png", "jpg", "jpeg", "gif", "webp", "svg", "bmp"].includes(ext);
};

interface UploadProgress {
  fileName: string;
  progress: number;
  status: "uploading" | "done" | "error";
  error?: string;
}

const Sources = () => {
  const { user, isVorstand } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [epochFilter, setEpochFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [form, setForm] = useState({ epoch: "mittelalter", title: "", content: "", url: "" });
  const [folderDeleteConfirm, setFolderDeleteConfirm] = useState<string | null>(null);
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [uploadTitles, setUploadTitles] = useState<Record<string, string>>({});
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [editingSource, setEditingSource] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");

  const activeEpoch = epochFilter || "mittelalter";

  const { data: folders = [] } = useQuery({
    queryKey: ["source_folders", activeEpoch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("source_folders")
        .select("*")
        .eq("epoch", activeEpoch)
        .order("name", { ascending: true });
      if (error) return [];
      return data;
    },
  });

  const { data: sources = [], isLoading } = useQuery({
    queryKey: ["sources", activeEpoch],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sources")
        .select("*")
        .eq("epoch", activeEpoch)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const currentFolders = folders.filter((f) =>
    currentFolderId ? f.parent_id === currentFolderId : !f.parent_id
  );

  const currentSources = sources.filter((s) =>
    currentFolderId ? s.folder_id === currentFolderId : !s.folder_id
  );

  const parentFolder = currentFolderId
    ? folders.find((f) => f.id === currentFolderId)
    : null;

  const addSource = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sources").insert({
        epoch: activeEpoch,
        title: form.title,
        content: form.content || null,
        url: form.url || null,
        folder_id: currentFolderId,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      setShowForm(false);
      setForm({ epoch: activeEpoch, title: "", content: "", url: "" });
      toast({ title: "Quelle hinzugefügt" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const createFolder = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("source_folders").insert({
        epoch: activeEpoch,
        name: folderName,
        parent_id: currentFolderId,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["source_folders"] });
      setShowFolderForm(false);
      setFolderName("");
      toast({ title: "Ordner erstellt" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const deleteSource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sources").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      toast({ title: "Quelle gelöscht" });
    },
  });

  const deleteFolder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("source_folders").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["source_folders"] });
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      setFolderDeleteConfirm(null);
      toast({ title: "Ordner und Inhalt gelöscht" });
    },
  });

  const updateSourceTitle = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase.from("sources").update({ title }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      setEditingSource(null);
      toast({ title: "Titel aktualisiert" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const moveSource = useMutation({
    mutationFn: async ({ id, folder_id }: { id: string; folder_id: string | null }) => {
      const { error } = await supabase.from("sources").update({ folder_id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      toast({ title: "Quelle verschoben" });
    },
    onError: () => toast({ title: "Fehler beim Verschieben", variant: "destructive" }),
  });

  const handleFilesSelected = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;
    const titles: Record<string, string> = {};
    fileArray.forEach((f) => {
      // Use filename without extension as default title
      const nameWithoutExt = f.name.replace(/\.[^/.]+$/, "");
      titles[f.name] = nameWithoutExt;
    });
    setUploadTitles(titles);
    setPendingFiles(fileArray);
    setShowUploadDialog(true);
  };

  const uploadSourceFiles = async () => {
    setShowUploadDialog(false);
    const fileArray = pendingFiles;
    if (fileArray.length === 0) return;

    const newUploads: UploadProgress[] = fileArray.map((f) => ({
      fileName: f.name,
      progress: 0,
      status: "uploading" as const,
    }));
    setUploads((prev) => [...prev, ...newUploads]);

    for (let i = 0; i < fileArray.length; i++) {
      const file = fileArray[i];
      const safeName = sanitizeFileName(file.name);
      const path = `sources/${activeEpoch}/${Date.now()}_${safeName}`;

      try {
        setUploads((prev) =>
          prev.map((u) =>
            u.fileName === file.name && u.status === "uploading"
              ? { ...u, progress: 50 }
              : u
          )
        );

        const { error: uploadErr } = await supabase.storage
          .from("internal-files")
          .upload(path, file);
        if (uploadErr) throw uploadErr;

        const customTitle = uploadTitles[file.name] || file.name;
        const { error: dbErr } = await supabase.from("sources").insert({
          epoch: activeEpoch,
          title: customTitle,
          content: `Datei: ${file.name}`,
          file_path: path,
          folder_id: currentFolderId,
          created_by: user!.id,
        });
        if (dbErr) throw dbErr;

        setUploads((prev) =>
          prev.map((u) =>
            u.fileName === file.name && u.status === "uploading"
              ? { ...u, progress: 100, status: "done" }
              : u
          )
        );
      } catch (err: any) {
        setUploads((prev) =>
          prev.map((u) =>
            u.fileName === file.name && u.status === "uploading"
              ? { ...u, status: "error", error: err.message }
              : u
          )
        );
      }
    }

    queryClient.invalidateQueries({ queryKey: ["sources"] });
    setPendingFiles([]);
    setUploadTitles({});
    const successCount = fileArray.length;
    toast({ title: `${successCount} Datei${successCount !== 1 ? "en" : ""} hochgeladen` });

    setTimeout(() => {
      setUploads((prev) => prev.filter((u) => u.status === "uploading"));
    }, 3000);
  };

  const previewSourceFile = async (filePath: string, title: string) => {
    const { data, error } = await supabase.storage.from("internal-files").createSignedUrl(filePath, 300);
    if (error || !data?.signedUrl) {
      toast({ title: "Vorschau-Fehler", variant: "destructive" });
      return;
    }
    setPreviewTitle(title);
    setPreviewUrl(data.signedUrl);
  };

  const downloadSourceFile = async (filePath: string, title: string) => {
    const { data, error } = await supabase.storage.from("internal-files").download(filePath);
    if (error || !data) {
      toast({ title: "Download-Fehler", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = title;
    a.click();
    URL.revokeObjectURL(url);
  };

  const searchResults = search
    ? sources.filter(
        (s) => s.title.toLowerCase().includes(search.toLowerCase()) || s.content?.toLowerCase().includes(search.toLowerCase())
      )
    : null;

  return (
    <div className="container py-8 sm:py-12 max-w-4xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <h1 className="font-serif text-2xl font-bold">Quellensammlung</h1>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowFolderForm(!showFolderForm)} className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted">
              <FolderPlus size={16} /> Ordner
            </button>
            <button onClick={() => setShowForm(!showForm)} className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus size={16} /> Quelle
            </button>
            <label className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted cursor-pointer">
              <Upload size={16} /> Dateien
              <input type="file" className="hidden" multiple onChange={(e) => { if (e.target.files?.length) handleFilesSelected(e.target.files); e.target.value = ""; }} />
            </label>
          </div>
        </div>

        {showFolderForm && (
          <div className="p-4 rounded-lg border bg-card mb-4 flex gap-2">
            <input placeholder="Ordnername *" value={folderName} onChange={(e) => setFolderName(e.target.value)} className="flex-1 h-10 rounded-md border border-input bg-background px-3 text-sm" />
            <button onClick={() => folderName && createFolder.mutate()} disabled={!folderName || createFolder.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              Erstellen
            </button>
          </div>
        )}

        {showForm && (
          <div className="p-4 rounded-lg border bg-card mb-4 space-y-3">
            <input placeholder="Titel *" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" />
            <textarea placeholder="Beschreibung / Inhalt" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]" />
            <input placeholder="URL (optional)" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" />
            <button onClick={() => form.title && addSource.mutate()} disabled={!form.title || addSource.isPending} className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              Speichern
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <div className="relative flex-1 min-w-0">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background pl-9 pr-3 text-sm" />
          </div>
          <div className="grid grid-cols-3 sm:flex gap-1">
            {EPOCHS.map((e) => (
              <button
                key={e.value}
                onClick={() => { setEpochFilter(e.value); setCurrentFolderId(null); }}
                className={`px-3 py-2 text-xs rounded-md border text-center ${(epochFilter || "mittelalter") === e.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload progress */}
        {uploads.length > 0 && (
          <div className="mb-4 space-y-2 p-3 rounded-lg border bg-card">
            <p className="text-xs font-medium text-muted-foreground mb-1">Upload-Fortschritt</p>
            {uploads.map((u, i) => (
              <div key={`${u.fileName}-${i}`} className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  {u.status === "uploading" && <Loader2 size={12} className="animate-spin text-primary shrink-0" />}
                  {u.status === "done" && <CheckCircle2 size={12} className="text-green-600 shrink-0" />}
                  {u.status === "error" && <span className="text-destructive shrink-0">✕</span>}
                  <span className="truncate flex-1 min-w-0">{u.fileName}</span>
                  <span className="text-muted-foreground shrink-0">{u.progress}%</span>
                </div>
                <Progress value={u.progress} className="h-1" />
                {u.error && <p className="text-xs text-destructive">{u.error}</p>}
              </div>
            ))}
          </div>
        )}

        {searchResults ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{searchResults.length} Ergebnis{searchResults.length !== 1 ? "se" : ""}</p>
            {searchResults.map((s) => (
              <SourceItem key={s.id} source={s} user={user} onDelete={(id) => deleteSource.mutate(id)} onDownload={downloadSourceFile} onPreview={previewSourceFile} onEdit={(id, title) => { setEditingSource(id); setEditTitle(title); }} editingId={editingSource} editTitle={editTitle} onEditTitleChange={setEditTitle} onEditSave={(id) => updateSourceTitle.mutate({ id, title: editTitle })} onEditCancel={() => setEditingSource(null)} />
            ))}
          </div>
        ) : (
          <>
            {currentFolderId && (
              <button onClick={() => setCurrentFolderId(parentFolder?.parent_id || null)} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                <ArrowUp size={14} /> Übergeordneter Ordner
              </button>
            )}

            {isLoading ? (
              <div className="text-center text-muted-foreground py-12">Laden...</div>
            ) : (
              <div className="space-y-2">
                {currentFolders.map((f) => (
                  <div key={f.id} className="p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                    {folderDeleteConfirm === f.id ? (
                      <div className="space-y-2">
                        <p className="text-sm text-destructive font-medium">
                          Ordner „{f.name}" und alle Inhalte wirklich löschen?
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => deleteFolder.mutate(f.id)}
                            disabled={deleteFolder.isPending}
                            className="px-3 py-1.5 text-sm rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
                          >
                            Ja, löschen
                          </button>
                          <button onClick={() => setFolderDeleteConfirm(null)} className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted">
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <button onClick={() => setCurrentFolderId(f.id)} className="flex items-center gap-2 text-sm font-medium min-w-0">
                          <Folder size={18} className="text-primary shrink-0" /> <span className="truncate">{f.name}</span>
                        </button>
                        {(f.created_by === user?.id || isVorstand) && (
                          <button onClick={() => setFolderDeleteConfirm(f.id)} className="text-muted-foreground hover:text-destructive p-1 shrink-0">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {currentSources.length === 0 && currentFolders.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">Keine Quellen in diesem Ordner.</div>
                ) : (
                  currentSources.map((s) => (
                    <SourceItem key={s.id} source={s} user={user} onDelete={(id) => deleteSource.mutate(id)} onDownload={downloadSourceFile} onPreview={previewSourceFile} onEdit={(id, title) => { setEditingSource(id); setEditTitle(title); }} editingId={editingSource} editTitle={editTitle} onEditTitleChange={setEditTitle} onEditSave={(id) => updateSourceTitle.mutate({ id, title: editTitle })} onEditCancel={() => setEditingSource(null)} />
                  ))
                )}
              </div>
            )}
          </>
        )}

        {/* Upload title dialog */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Dateien hochladen</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              {pendingFiles.map((f) => (
                <div key={f.name} className="space-y-1">
                  <label className="text-xs text-muted-foreground truncate block">{f.name}</label>
                  <input
                    value={uploadTitles[f.name] || ""}
                    onChange={(e) => setUploadTitles((prev) => ({ ...prev, [f.name]: e.target.value }))}
                    placeholder="Titel eingeben"
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
              ))}
            </div>
            <button
              onClick={uploadSourceFiles}
              className="w-full mt-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {pendingFiles.length} Datei{pendingFiles.length !== 1 ? "en" : ""} hochladen
            </button>
          </DialogContent>
        </Dialog>

        {/* File preview dialog */}
        <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="truncate">{previewTitle}</DialogTitle>
            </DialogHeader>
            {previewUrl && (
              previewUrl.match(/\.(png|jpg|jpeg|gif|webp|svg|bmp)/i) ? (
                <img src={previewUrl} alt={previewTitle} className="max-w-full max-h-[70vh] object-contain mx-auto" />
              ) : (
                <iframe src={previewUrl} className="w-full h-[70vh] border rounded" title={previewTitle} />
              )
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
};

interface SourceItemProps {
  source: any;
  user: any;
  onDelete: (id: string) => void;
  onDownload: (path: string, name: string) => void;
  onPreview: (path: string, name: string) => void;
  onEdit: (id: string, title: string) => void;
  editingId: string | null;
  editTitle: string;
  onEditTitleChange: (val: string) => void;
  onEditSave: (id: string) => void;
  onEditCancel: () => void;
}

const SourceItem = ({ source: s, user, onDelete, onDownload, onPreview, onEdit, editingId, editTitle, onEditTitleChange, onEditSave, onEditCancel }: SourceItemProps) => (
  <div className="p-4 rounded-lg border bg-card flex items-start justify-between gap-3 overflow-hidden">
    <div className="min-w-0 flex-1">
      {editingId === s.id ? (
        <div className="flex items-center gap-2">
          <input
            value={editTitle}
            onChange={(e) => onEditTitleChange(e.target.value)}
            className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm min-w-0"
            onKeyDown={(e) => { if (e.key === "Enter") onEditSave(s.id); if (e.key === "Escape") onEditCancel(); }}
            autoFocus
          />
          <button onClick={() => onEditSave(s.id)} className="text-xs text-primary hover:underline shrink-0">Speichern</button>
          <button onClick={onEditCancel} className="text-xs text-muted-foreground hover:underline shrink-0">Abbrechen</button>
        </div>
      ) : (
        <div className="flex items-center gap-2 min-w-0">
          {s.file_path && <FileText size={14} className="text-primary shrink-0" />}
          <h3 className="font-semibold truncate">{s.title}</h3>
          {s.created_by === user?.id && (
            <button onClick={() => onEdit(s.id, s.title)} className="text-muted-foreground hover:text-foreground p-0.5 shrink-0">
              <Pencil size={12} />
            </button>
          )}
        </div>
      )}
      {s.content && <p className="text-sm text-muted-foreground mt-1 truncate">{s.content}</p>}
      <div className="flex flex-wrap gap-3 mt-2">
        {s.url && (
          <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <ExternalLink size={12} /> Link öffnen
          </a>
        )}
        {s.file_path && isPreviewable(s.file_path) && (
          <button onClick={() => onPreview(s.file_path, s.title)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <Eye size={12} /> Vorschau
          </button>
        )}
        {s.file_path && (
          <button onClick={() => onDownload(s.file_path, s.title)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
            <FileText size={12} /> Herunterladen
          </button>
        )}
      </div>
    </div>
    {s.created_by === user?.id && (
      <button onClick={() => onDelete(s.id)} className="text-muted-foreground hover:text-destructive p-1 shrink-0">
        <Trash2 size={16} />
      </button>
    )}
  </div>
);

export default Sources;
