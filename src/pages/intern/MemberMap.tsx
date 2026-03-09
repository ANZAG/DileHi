import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

type MapMember = {
  display_name: string;
  city: string;
  phone: string;
  email: string;
  map_lat: number;
  map_lng: number;
};

const MemberMap = () => {
  const { isVorstand } = useAuth();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["member-map"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, city, phone, map_lat, map_lng, show_on_map, is_active")
        .eq("show_on_map", true)
        .eq("is_active", true)
        .not("map_lat", "is", null)
        .not("map_lng", "is", null);

      if (!profiles || profiles.length === 0) return [];

      // Fetch emails via edge function for contact info
      let emailMap: Record<string, string> = {};
      try {
        const userIds = profiles.map((p) => p.id);
        const { data: emails } = await supabase.functions.invoke("manage-member", {
          body: { action: "get_emails", userIds },
        });
        if (emails) emailMap = emails;
      } catch {}

      return profiles
        .filter((p) => p.map_lat != null && p.map_lng != null)
        .map((p) => ({
          display_name: p.display_name,
          city: p.city || "–",
          phone: p.phone || "",
          email: emailMap[p.id] || "",
          map_lat: p.map_lat as number,
          map_lng: p.map_lng as number,
        }));
    },
  });

  // Center on Germany
  const center = useMemo<[number, number]>(() => {
    if (members.length === 0) return [50.5, 10.0];
    const avgLat = members.reduce((s, m) => s + m.map_lat, 0) / members.length;
    const avgLng = members.reduce((s, m) => s + m.map_lng, 0) / members.length;
    return [avgLat, avgLng];
  }, [members]);

  return (
    <div className="container py-8 sm:py-12 max-w-4xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link
          to="/intern"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft size={16} /> Zurück
        </Link>
        <h1 className="font-serif text-2xl font-bold mb-2">Mitgliederkarte</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Zeigt die Wohnorte aller Mitglieder, die ihre Anzeige freigegeben haben.
          {members.length > 0 && ` (${members.length} Mitglieder sichtbar)`}
        </p>

        {isLoading ? (
          <div className="text-center text-muted-foreground py-16">Karte wird geladen…</div>
        ) : members.length === 0 ? (
          <div className="text-center py-16 space-y-2">
            <MapPin size={32} className="mx-auto text-muted-foreground" />
            <p className="text-muted-foreground">
              Noch keine Mitglieder auf der Karte. Aktiviere die Option in deinem{" "}
              <Link to="/intern/profil" className="text-primary underline">
                Profil
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden" style={{ height: "500px" }}>
            <MapContainer
              center={center}
              zoom={6}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {members.map((m, i) => (
                <Marker key={i} position={[m.map_lat, m.map_lng]}>
                  <Popup>
                    <div className="text-sm space-y-0.5">
                      <p className="font-semibold">{m.display_name}</p>
                      <p className="text-muted-foreground">{m.city}</p>
                      {m.email && <p className="text-xs">{m.email}</p>}
                      {m.phone && <p className="text-xs">{m.phone}</p>}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MemberMap;
