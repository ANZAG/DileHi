import { useState } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Upload, Image, FileEdit } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const EPOCHS = [
  { value: "mittelalter", label: "1290–1310", path: "/epochen/mittelalter" },
  { value: "wk1", label: "1916/17", path: "/epochen/wk1" },
  { value: "1815", label: "1815", path: "/epochen/1815" },
];

const SiteAdmin = () => {
  const { isVorstand, isHerold } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  if (!isVorstand && !isHerold) return <Navigate to="/intern" replace />;

  const uploadGalleryImage = async (file: File) => {
    setUploading(true);
    try {
      const path = `gallery/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage.from("internal-files").upload(path, file);
      if (error) throw error;
      toast({ title: "Bild hochgeladen", description: "Das Bild wurde zur Galerie hinzugefügt." });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
    setUploading(false);
  };

  return (
    <div className="container py-12 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>
        <h1 className="font-serif text-2xl font-bold mb-6">Siteadministration</h1>

        <div className="space-y-6">
          {/* Epoch pages */}
          <div className="p-5 rounded-lg border bg-card">
            <h2 className="font-serif text-lg font-semibold mb-4 flex items-center gap-2">
              <FileEdit size={20} /> Epochenseiten bearbeiten
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Die Bearbeitung der Epochenseiten (WYSIWYG-Editor) wird in einer späteren Version verfügbar sein.
              Kontaktiere den Entwickler für Inhaltsänderungen.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {EPOCHS.map((epoch) => (
                <Link
                  key={epoch.value}
                  to={epoch.path}
                  className="p-4 rounded-md border hover:bg-muted transition-colors text-center"
                >
                  <span className="text-sm font-medium">{epoch.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* Gallery upload */}
          <div className="p-5 rounded-lg border bg-card">
            <h2 className="font-serif text-lg font-semibold mb-4 flex items-center gap-2">
              <Image size={20} /> Galerie-Bilder hochladen
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Lade neue Bilder für die öffentliche Galerie hoch.
            </p>
            <label className="inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer">
              <Upload size={16} />
              {uploading ? "Wird hochgeladen..." : "Bild auswählen"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadGalleryImage(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SiteAdmin;
