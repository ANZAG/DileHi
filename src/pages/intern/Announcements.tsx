import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Trash2, Paperclip, ChevronDown, ChevronRight, Send, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Announcements = () => {
  const { user, isVorstand } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", content: "" });
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [uploadingFile, setUploadingFile] = useState<string | null>(null);

  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ["announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcements")
        .select("*, announcement_files(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: replies = [] } = useQuery({
    queryKey: ["announcement_replies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("announcement_replies" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) return [];
      return data as any[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_all"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, display_name");
      return data || [];
    },
  });

  const getName = (userId: string) =>
    profiles.find((p) => p.id === userId)?.display_name || "Unbekannt";

  // Auto-expand the newest announcement
  const newestId = announcements[0]?.id;

  const isExpanded = (id: string) => {
    if (expandedIds.has(id)) return true;
    if (id === newestId && !expandedIds.has("__collapsed_" + id)) return true;
    return false;
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (isExpanded(id)) {
        next.delete(id);
        if (id === newestId) next.add("__collapsed_" + id);
      } else {
        next.add(id);
        next.delete("__collapsed_" + id);
      }
      return next;
    });
  };

  const addAnnouncement = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("announcements").insert({
        title: form.title,
        content: form.content,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      setShowForm(false);
      setForm({ title: "", content: "" });
      toast({ title: "Ankündigung erstellt" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const deleteAnnouncement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("announcements").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "Gelöscht" });
    },
  });

  const addReply = useMutation({
    mutationFn: async (announcementId: string) => {
      const text = replyTexts[announcementId]?.trim();
      if (!text) return;
      const { error } = await (supabase.from("announcement_replies" as any) as any).insert({
        announcement_id: announcementId,
        content: text,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: (_, announcementId) => {
      queryClient.invalidateQueries({ queryKey: ["announcement_replies"] });
      setReplyTexts((prev) => ({ ...prev, [announcementId]: "" }));
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const uploadFile = async (announcementId: string, file: File) => {
    setUploadingFile(announcementId);
    try {
      const path = `announcements/${announcementId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("internal-files")
        .upload(path, file);
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from("announcement_files").insert({
        announcement_id: announcementId,
        name: file.name,
        storage_path: path,
      });
      if (dbError) throw dbError;

      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      toast({ title: "Datei hochgeladen" });
    } catch (err: any) {
      toast({ title: "Upload-Fehler", description: err.message, variant: "destructive" });
    }
    setUploadingFile(null);
  };

  const downloadFile = async (storagePath: string, fileName: string) => {
    const { data, error } = await supabase.storage.from("internal-files").download(storagePath);
    if (error || !data) {
      toast({ title: "Download-Fehler", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getReplies = (announcementId: string) =>
    replies.filter((r: any) => r.announcement_id === announcementId);

  return (
    <div className="container py-12 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-2xl font-bold">Versammlungen</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} /> Neue Ankündigung
          </button>
        </div>

        {showForm && (
          <div className="p-4 rounded-lg border bg-card mb-6 space-y-3">
            <input
              placeholder="Titel *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
            <textarea
              placeholder="Inhalt *"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[120px]"
            />
            <button
              onClick={() => form.title && form.content && addAnnouncement.mutate()}
              disabled={!form.title || !form.content || addAnnouncement.isPending}
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Veröffentlichen
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Laden...</div>
        ) : announcements.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">Noch keine Ankündigungen.</div>
        ) : (
          <div className="space-y-3">
            {announcements.map((a) => {
              const expanded = isExpanded(a.id);
              const announcementReplies = getReplies(a.id);

              return (
                <div key={a.id} className="rounded-lg border bg-card overflow-hidden">
                  {/* Collapsible header */}
                  <button
                    onClick={() => toggleExpanded(a.id)}
                    className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <h3 className="font-serif text-lg font-semibold">{a.title}</h3>
                      <span className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "long", year: "numeric" })}
                      </span>
                      {announcementReplies.length > 0 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          {announcementReplies.length} {announcementReplies.length === 1 ? "Antwort" : "Antworten"}
                        </span>
                      )}
                    </div>
                    {isVorstand && (
                      <span
                        onClick={(e) => { e.stopPropagation(); deleteAnnouncement.mutate(a.id); }}
                        className="text-muted-foreground hover:text-destructive p-1"
                      >
                        <Trash2 size={16} />
                      </span>
                    )}
                  </button>

                  {/* Expanded content */}
                  {expanded && (
                    <div className="px-5 pb-5 space-y-4">
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.content}</p>

                      {/* Files */}
                      {a.announcement_files && a.announcement_files.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {a.announcement_files.map((f: { id: string; name: string; storage_path: string }) => (
                            <button
                              key={f.id}
                              onClick={() => downloadFile(f.storage_path, f.name)}
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            >
                              <Paperclip size={12} /> {f.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Upload file button */}
                      <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer">
                        <Upload size={14} />
                        {uploadingFile === a.id ? "Wird hochgeladen..." : "Datei anhängen"}
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) uploadFile(a.id, file);
                            e.target.value = "";
                          }}
                        />
                      </label>

                      {/* Replies */}
                      {announcementReplies.length > 0 && (
                        <div className="space-y-2 border-t pt-3">
                          {announcementReplies.map((reply: any) => (
                            <div key={reply.id} className="pl-3 border-l-2 border-primary/20">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium">{getName(reply.created_by)}</span>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(reply.created_at).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">{reply.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Reply form */}
                      <div className="flex gap-2 pt-1">
                        <input
                          placeholder="Antwort schreiben..."
                          value={replyTexts[a.id] || ""}
                          onChange={(e) => setReplyTexts((prev) => ({ ...prev, [a.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && replyTexts[a.id]?.trim()) addReply.mutate(a.id);
                          }}
                          className="flex-1 h-9 rounded-md border border-input bg-background px-3 text-sm"
                        />
                        <button
                          onClick={() => replyTexts[a.id]?.trim() && addReply.mutate(a.id)}
                          disabled={!replyTexts[a.id]?.trim() || addReply.isPending}
                          className="p-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Announcements;
