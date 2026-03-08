import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Image } from "lucide-react";

const EPOCH_OPTIONS = [
  { value: "mittelalter", label: "Spätmittelalter" },
  { value: "1815", label: "Napoleonik" },
  { value: "wk1", label: "Erster Weltkrieg" },
];

const GalleryAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedEpoch, setSelectedEpoch] = useState("mittelalter");
  const [altText, setAltText] = useState("");

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

  const uploadImage = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `${Date.now()}_${file.name}`;
      const { error: uploadErr } = await supabase.storage.from("gallery").upload(path, file);
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
      toast({ title: "Bild hochgeladen" });
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
    <div className="p-5 rounded-lg border bg-card">
      <h2 className="font-serif text-lg font-semibold mb-4 flex items-center gap-2">
        <Image size={20} /> Galerie verwalten
      </h2>

      {/* Upload form */}
      <div className="flex flex-wrap gap-2 mb-4 items-end">
        <div className="flex-1 min-w-[150px]">
          <label className="text-xs text-muted-foreground mb-1 block">Beschreibung</label>
          <input
            value={altText}
            onChange={(e) => setAltText(e.target.value)}
            placeholder="Bildbeschreibung"
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Epoche</label>
          <select
            value={selectedEpoch}
            onChange={(e) => setSelectedEpoch(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            {EPOCH_OPTIONS.map((e) => (
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

      {/* Image list */}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Laden...</p>
      ) : images.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Galerie-Bilder hochgeladen.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {images.map((img: any) => (
            <div key={img.id} className="rounded-lg border overflow-hidden bg-background">
              <img src={img.publicUrl} alt={img.alt_text} className="w-full aspect-[4/3] object-cover" />
              <div className="p-2 space-y-1">
                <p className="text-xs truncate">{img.alt_text || "–"}</p>
                <div className="flex items-center gap-1">
                  <select
                    value={img.epoch}
                    onChange={(e) => updateEpoch.mutate({ id: img.id, epoch: e.target.value })}
                    className="flex-1 h-7 rounded border border-input bg-background px-1 text-xs"
                  >
                    {EPOCH_OPTIONS.map((e) => (
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
      )}
    </div>
  );
};

export default GalleryAdmin;
