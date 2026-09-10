import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, ChevronLeft, ChevronRight, Pencil, Check, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { convertToWebP } from "@/lib/imageConversion";

import { useKategorien } from "@/hooks/useKategorien";

const IMAGES_PER_PAGE = 6;

interface GalleryImage {
  id: string;
  storage_path: string;
  alt_text: string;
  epoch: string;
  show_subtitle: boolean;
  publicUrl: string;
}

/** Converts any image File to WebP using the Canvas API */

const GalleryAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const kategorien = useKategorien();
  const [gewaehlt, setGewaehlt] = useState("");
  const selectedEpoch = gewaehlt || kategorien[0]?.value || "";
  const setSelectedEpoch = setGewaehlt;
  const [altText, setAltText] = useState("");
  const [filterEpoch, setFilterEpoch] = useState("alle");
  const [page, setPage] = useState(0);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAltText, setEditAltText] = useState("");

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["gallery_images_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("gallery_images")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return [];
      return data.map((img) => {
        const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(img.storage_path);
        return { ...img, publicUrl: urlData.publicUrl };
      });
    },
  });

  const filtered = filterEpoch === "alle" ? images : images.filter((img: GalleryImage) => img.epoch === filterEpoch);
  const totalPages = Math.max(1, Math.ceil(filtered.length / IMAGES_PER_PAGE));
  const currentPage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(currentPage * IMAGES_PER_PAGE, (currentPage + 1) * IMAGES_PER_PAGE);

  const uploadImage = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      // Convert to WebP for better performance
      const webpFile = await convertToWebP(file);
      const path = `${Date.now()}_${webpFile.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("gallery")
        .upload(path, webpFile, { contentType: "image/webp" });
      if (uploadErr) throw uploadErr;

      const { error: dbErr } = await supabase.from("gallery_images").insert({
        storage_path: path,
        alt_text: altText || file.name.replace(/\.[^/.]+$/, ""),
        epoch: selectedEpoch,
        created_by: user.id,
      });
      if (dbErr) throw dbErr;

      queryClient.invalidateQueries({ queryKey: ["gallery_images_admin"] });
      queryClient.invalidateQueries({ queryKey: ["gallery_images"] });
      setAltText("");
      toast({ title: "Bild hochgeladen", description: "Automatisch zu WebP konvertiert" });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  const updateEpoch = useMutation({
    mutationFn: async ({ id, epoch }: { id: string; epoch: string }) => {
      const { error } = await supabase.from("gallery_images").update({ epoch }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery_images_admin"] });
      queryClient.invalidateQueries({ queryKey: ["gallery_images"] });
    },
  });

  const updateShowSubtitle = useMutation({
    mutationFn: async ({ id, show_subtitle }: { id: string; show_subtitle: boolean }) => {
      const { error } = await supabase.from("gallery_images").update({ show_subtitle }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery_images_admin"] });
      queryClient.invalidateQueries({ queryKey: ["gallery_images"] });
    },
  });

  const updateAltText = useMutation({
    mutationFn: async ({ id, alt_text }: { id: string; alt_text: string }) => {
      const { error } = await supabase.from("gallery_images").update({ alt_text }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery_images_admin"] });
      queryClient.invalidateQueries({ queryKey: ["gallery_images"] });
      setEditingId(null);
      toast({ title: "Beschreibung aktualisiert" });
    },
  });

  const deleteImage = useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath: string }) => {
      await supabase.storage.from("gallery").remove([storagePath]);
      const { error } = await supabase.from("gallery_images").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["gallery_images_admin"] });
      queryClient.invalidateQueries({ queryKey: ["gallery_images"] });
      toast({ title: "Bild gelöscht" });
    },
  });

  return (
    <div className="space-y-4">

      {/* Upload form */}
      <div className="flex flex-wrap gap-2 mb-4 items-end">
        <div className="flex-1 min-w-[150px]">
          <label htmlFor="gallery-alt" className="text-xs text-muted-foreground mb-1 block">Beschreibung</label>
          <input id="gallery-alt"
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Bildbeschreibung"
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label htmlFor="gallery-epoch" className="text-xs text-muted-foreground mb-1 block">Kategorie</label>
          <select id="gallery-epoch"
            value={selectedEpoch}
            onChange={(e) => setSelectedEpoch(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {kategorien.map((e) => (
              <option key={e.value} value={e.value}>{e.label}</option>
            ))}
          </select>
        </div>
        <label className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer h-9">
          <Upload size={14} />
          {uploading ? "Lädt..." : "Hochladen"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadImage(file);
              e.target.value = "";
            }}
          />
        </label>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-muted-foreground">Filter:</span>
        <select
          value={filterEpoch}
          onChange={(e) => { setFilterEpoch(e.target.value); setPage(0); }}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="alle">Alle Kategorien</option>
          {kategorien.map((e) => (
            <option key={e.value} value={e.value}>{e.label}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} Bild{filtered.length !== 1 ? "er" : ""}
        </span>
      </div>

      {/* Image list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laden...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Hier sind noch keine Bilder. Lade oben das erste hoch und wähle die passende Kategorie.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {paged.map((img: GalleryImage) => (
              <div key={img.id} className="rounded-lg border overflow-hidden bg-background">
                <img src={img.publicUrl} alt={img.alt_text} className="w-full aspect-[4/3] object-cover" />
                <div className="p-2 space-y-2">
                  {/* Alt text - editable */}
                  {editingId === img.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editAltText}
                        onChange={(e) => setEditAltText(e.target.value)}
                        className="flex-1 h-7 rounded border border-input bg-background px-2 text-xs"
                        autoFocus
                      />
                      <button
                        onClick={() => updateAltText.mutate({ id: img.id, alt_text: editAltText })}
                        className="p-1 text-primary hover:text-primary/80"
                        title="Speichern"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-1 text-muted-foreground hover:text-foreground"
                        title="Abbrechen"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <p className="text-xs truncate flex-1">{img.alt_text || "–"}</p>
                      <button
                        onClick={() => { setEditingId(img.id); setEditAltText(img.alt_text || ""); }}
                        className="p-1 text-muted-foreground hover:text-foreground"
                        title="Beschreibung bearbeiten"
                      >
                        <Pencil size={12} />
                      </button>
                    </div>
                  )}
                  
                  {/* Show subtitle checkbox */}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`subtitle-${img.id}`}
                      checked={img.show_subtitle}
                      onCheckedChange={(checked) => updateShowSubtitle.mutate({ id: img.id, show_subtitle: !!checked })}
                    />
                    <label htmlFor={`subtitle-${img.id}`} className="text-xs text-muted-foreground cursor-pointer">
                      Untertitel anzeigen
                    </label>
                  </div>
                  
                  {/* Epoch + delete */}
                  <div className="flex items-center gap-1">
                    <select
                      value={img.epoch}
                      onChange={(e) => updateEpoch.mutate({ id: img.id, epoch: e.target.value })}
                      className="flex-1 h-7 rounded border border-input bg-background px-1 text-xs"
                    >
                      {kategorien.map((e) => (
                        <option key={e.value} value={e.value}>{e.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => deleteImage.mutate({ id: img.id, storagePath: img.storage_path })}
                      className="p-1 text-muted-foreground hover:text-destructive"
                      title="Löschen"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={currentPage === 0}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border hover:bg-muted disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Zurück
              </button>
              <span className="text-xs text-muted-foreground">
                Seite {currentPage + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-md border hover:bg-muted disabled:opacity-40"
              >
                Weiter <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GalleryAdmin;
