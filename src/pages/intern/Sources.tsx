import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Search, ExternalLink, Trash2, Folder, FolderPlus, Upload, FileText, ArrowUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const EPOCHS = [
  { value: "mittelalter", label: "Spätmittelalter" },
  { value: "1815", label: "Napoleonik" },
  { value: "wk1", label: "Erster Weltkrieg" },
];

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
      // Cascade delete is handled by DB constraint
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

  const uploadSourceFile = async (file: File) => {
    try {
      const path = `sources/${activeEpoch}/${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("internal-files").upload(path, file);
      if (uploadErr) throw uploadErr;
      const { error: dbErr } = await supabase.from("sources").insert({
        epoch: activeEpoch,
        title: file.name,
        content: `Datei: ${file.name}`,
        file_path: path,
        folder_id: currentFolderId,
        created_by: user!.id,
      });
      if (dbErr) throw dbErr;
      queryClient.invalidateQueries({ queryKey: ["sources"] });
      toast({ title: "Datei hochgeladen" });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
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
              <Upload size={16} /> Datei
              <input type="file" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadSourceFile(file); e.target.value = ""; }} />
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

        <div className="flex gap-2 mb-6 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input placeholder="Suchen..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full h-10 rounded-md border border-input bg-background pl-9 pr-3 text-sm" />
          </div>
          <div className="flex gap-1">
            {EPOCHS.map((e) => (
              <button
                key={e.value}
                onClick={() => { setEpochFilter(e.value); setCurrentFolderId(null); }}
                className={`px-3 py-2 text-xs rounded-md border ${(epochFilter || "mittelalter") === e.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </div>

        {searchResults ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{searchResults.length} Ergebnis{searchResults.length !== 1 ? "se" : ""}</p>
            {searchResults.map((s) => (
              <SourceItem key={s.id} source={s} user={user} onDelete={(id) => deleteSource.mutate(id)} onDownload={downloadSourceFile} />
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
                        <button onClick={() => setCurrentFolderId(f.id)} className="flex items-center gap-2 text-sm font-medium">
                          <Folder size={18} className="text-primary" /> {f.name}
                        </button>
                        {(f.created_by === user?.id || isVorstand) && (
                          <button onClick={() => setFolderDeleteConfirm(f.id)} className="text-muted-foreground hover:text-destructive p-1">
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
                    <SourceItem key={s.id} source={s} user={user} onDelete={(id) => deleteSource.mutate(id)} onDownload={downloadSourceFile} />
                  ))
                )}
              </div>
            )}
          </>
        )}
      </motion.div>
    </div>
  );
};

const SourceItem = ({ source: s, user, onDelete, onDownload }: { source: any; user: any; onDelete: (id: string) => void; onDownload: (path: string, name: string) => void }) => (
  <div className="p-4 rounded-lg border bg-card flex items-start justify-between gap-4">
    <div>
      <div className="flex items-center gap-2">
        {s.file_path ? <FileText size={14} className="text-primary" /> : null}
        <h3 className="font-semibold">{s.title}</h3>
      </div>
      {s.content && <p className="text-sm text-muted-foreground mt-1">{s.content}</p>}
      {s.url && (
        <a href={s.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
          <ExternalLink size={12} /> Link öffnen
        </a>
      )}
      {s.file_path && (
        <button onClick={() => onDownload(s.file_path, s.title)} className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline">
          <FileText size={12} /> Herunterladen
        </button>
      )}
    </div>
    {s.created_by === user?.id && (
      <button onClick={() => onDelete(s.id)} className="text-muted-foreground hover:text-destructive p-1">
        <Trash2 size={16} />
      </button>
    )}
  </div>
);

export default Sources;
