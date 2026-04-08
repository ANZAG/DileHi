import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Pencil, Check, X, Image } from "lucide-react";
import { SITE_IMAGE_FALLBACKS } from "@/hooks/useSiteImage";

/** Converts any image File to WebP using the Canvas API */
const convertToWebP = (file: File): Promise<File> =>
  new Promise((resolve, reject) => {
    const img = document.createElement("img");
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")?.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error("Konvertierung fehlgeschlagen")); return; }
          const baseName = file.name.replace(/\.[^/.]+$/, "");
          resolve(new File([blob], `${baseName}.webp`, { type: "image/webp" }));
        },
        "image/webp",
        0.85,
      );
    };
    img.onerror = () => reject(new Error("Bild konnte nicht geladen werden"));
    img.src = objectUrl;
  });

interface SiteImage {
  id: string;
  slot: string;
  label: string;
  page: string;
  storage_path: string | null;
  alt_text: string;
}

const SiteImagesAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState<string | null>(null);
  const [filterPage, setFilterPage] = useState("alle");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAltText, setEditAltText] = useState("");

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["site_images_admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_images")
        .select("*")
        .order("page", { ascending: true });
      if (error) return [];
      return data as SiteImage[];
    },
  });

  const pages = [...new Set(images.map((img) => img.page))];
  const filtered = filterPage === "alle" ? images : images.filter((img) => img.page === filterPage);

  const uploadForSlot = async (slotId: string, file: File) => {
    if (!user) return;
    setUploading(slotId);
    try {
      const webpFile = await convertToWebP(file);
      const path = `site/${Date.now()}_${webpFile.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("gallery")
        .upload(path, webpFile, { contentType: "image/webp" });
      if (uploadErr) throw uploadErr;

      // Remove old file if exists
      const oldImage = images.find((img) => img.id === slotId);
      if (oldImage?.storage_path) {
        await supabase.storage.from("gallery").remove([oldImage.storage_path]);
      }

      const { error: dbErr } = await supabase
        .from("site_images")
        .update({ storage_path: path, updated_at: new Date().toISOString(), updated_by: user.id })
        .eq("id", slotId);
      if (dbErr) throw dbErr;

      queryClient.invalidateQueries({ queryKey: ["site_images_admin"] });
      queryClient.invalidateQueries({ queryKey: ["site_images"] });
      toast({ title: "Bild ersetzt", description: "Automatisch zu WebP konvertiert" });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
    setUploading(null);
  };

  const removeImage = useMutation({
    mutationFn: async ({ id, storagePath }: { id: string; storagePath: string }) => {
      await supabase.storage.from("gallery").remove([storagePath]);
      const { error } = await supabase
        .from("site_images")
        .update({ storage_path: null, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site_images_admin"] });
      queryClient.invalidateQueries({ queryKey: ["site_images"] });
      toast({ title: "Bild zurückgesetzt auf Standard" });
    },
  });

  const updateAltText = useMutation({
    mutationFn: async ({ id, alt_text }: { id: string; alt_text: string }) => {
      const { error } = await supabase.from("site_images").update({ alt_text }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site_images_admin"] });
      queryClient.invalidateQueries({ queryKey: ["site_images"] });
      setEditingId(null);
      toast({ title: "Beschreibung aktualisiert" });
    },
  });

  // Build preview URLs
  const getPreviewUrl = (img: SiteImage) => {
    if (!img.storage_path) return null;
    const { data } = supabase.storage.from("gallery").getPublicUrl(img.storage_path);
    return data.publicUrl;
  };

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-muted-foreground">Seite:</span>
        <select
          value={filterPage}
          onChange={(e) => setFilterPage(e.target.value)}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="alle">Alle Seiten</option>
          {pages.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} Bild{filtered.length !== 1 ? "er" : ""}
        </span>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laden...</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Keine Bilder gefunden.</p>
      ) : (
        <div className="space-y-6">
          {/* Group by page */}
          {(filterPage === "alle" ? pages : [filterPage]).map((pageName) => {
            const pageImages = filtered.filter((img) => img.page === pageName);
            if (pageImages.length === 0) return null;
            return (
              <div key={pageName}>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Image size={14} className="text-primary" />
                  {pageName}
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {pageImages.map((img) => {
                    const previewUrl = getPreviewUrl(img);
                    const isUploading = uploading === img.id;
                    return (
                      <div key={img.id} className="rounded-lg border overflow-hidden bg-background">
                        {/* Image preview */}
                        <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                          {previewUrl ? (
                            <img src={previewUrl} alt={img.alt_text} className="w-full h-full object-cover" />
                          ) : SITE_IMAGE_FALLBACKS[img.slot] ? (
                            <div className="relative w-full h-full">
                              <img src={SITE_IMAGE_FALLBACKS[img.slot]} alt={img.alt_text || "Standard-Bild"} className="w-full h-full object-cover" />
                              <span className="absolute bottom-1 left-1 text-[10px] bg-background/80 text-muted-foreground px-1 rounded">Standard</span>
                            </div>
                          ) : (
                            <div className="text-center text-xs text-muted-foreground p-2">
                              <Image size={24} className="mx-auto mb-1 opacity-40" />
                              Kein Bild
                            </div>
                          )}
                        </div>
                        <div className="p-2 space-y-2">
                          {/* Slot label */}
                          <p className="text-xs font-medium text-primary truncate" title={img.slot}>
                            {img.label}
                          </p>

                          {/* Alt text editable */}
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
                              >
                                <Check size={14} />
                              </button>
                              <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground hover:text-foreground">
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1">
                              <p className="text-xs truncate flex-1 text-muted-foreground">{img.alt_text || "–"}</p>
                              <button
                                onClick={() => { setEditingId(img.id); setEditAltText(img.alt_text || ""); }}
                                className="p-1 text-muted-foreground hover:text-foreground"
                              >
                                <Pencil size={12} />
                              </button>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-1">
                            <label className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer flex-1 justify-center">
                              <Upload size={12} />
                              {isUploading ? "Lädt..." : previewUrl ? "Ersetzen" : "Hochladen"}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={isUploading}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) uploadForSlot(img.id, file);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                            {img.storage_path && (
                              <button
                                onClick={() => removeImage.mutate({ id: img.id, storagePath: img.storage_path! })}
                                className="p-1 text-muted-foreground hover:text-destructive"
                                title="Auf Standard zurücksetzen"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SiteImagesAdmin;
