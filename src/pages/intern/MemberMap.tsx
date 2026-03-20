import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Info, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";

// Fix default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const eventIcon = new L.DivIcon({
  className: "",
  html: `<div style="background:#c2410c;border:2px solid #fff;border-radius:50%;width:28px;height:28px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,.35);">
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
  </div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
  popupAnchor: [0, -16],
});

const MemberMap = () => {
  const { user } = useAuth();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["member-map"],
    queryFn: async () => {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, city, map_lat, map_lng, show_on_map, is_active")
        .eq("show_on_map", true)
        .eq("is_active", true)
        .not("map_lat", "is", null)
        .not("map_lng", "is", null);

      if (!profiles || profiles.length === 0) return [];

      return profiles
        .filter((p) => p.map_lat != null && p.map_lng != null)
        .map((p) => ({
          display_name: p.display_name,
          city: p.city || "–",
          map_lat: p.map_lat as number,
          map_lng: p.map_lng as number,
        }));
    },
  });

  // Fetch upcoming events with location (use cached lat/lng when available)
  const { data: events = [] } = useQuery({
    queryKey: ["member-map-events"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("events")
        .select("id, title, location, start_date, end_date, all_day, location_lat, location_lng")
        .gte("start_date", now)
        .not("location", "is", null)
        .order("start_date", { ascending: true })
        .limit(20);

      if (!data) return [];

      type EventMarker = { id: string; title: string; location: string; start_date: string; end_date: string | null; all_day: boolean; lat: number; lng: number };
      // Separate events with cached coords vs those needing geocoding
      const cached: EventMarker[] = [];
      const needsGeocoding: typeof data = [];

      for (const e of data) {
        if (e.location_lat != null && e.location_lng != null) {
          cached.push({
            id: e.id,
            title: e.title,
            location: e.location!,
            start_date: e.start_date,
            end_date: e.end_date,
            all_day: e.all_day,
            lat: e.location_lat,
            lng: e.location_lng,
          });
        } else if (e.location) {
          needsGeocoding.push(e);
        }
      }

      if (needsGeocoding.length === 0) return cached;

      // Geocode remaining locations
      const uniqueLocations = [...new Set(needsGeocoding.map((e) => e.location!))];
      const geoCache: Record<string, { lat: number; lng: number } | null> = {};

      const buildLocationCandidates = (raw: string) => {
        const normalized = raw.replace(/\s+/g, " ").trim();
        const withoutParens = normalized
          .replace(/\([^)]*\)/g, " ")
          .replace(/\s+,/g, ",")
          .replace(/,\s*,/g, ",")
          .replace(/\s+/g, " ")
          .trim();

        const countryNormalized = withoutParens
          .replace(/\bDeutschland\b/gi, "Germany")
          .replace(/\bFrankreich\b/gi, "France")
          .replace(/\bÖsterreich\b/gi, "Austria")
          .replace(/\bSchweiz\b/gi, "Switzerland");

        const parts = countryNormalized
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);

        const cityOrZipPart = parts.length >= 2 ? parts[parts.length - 2] : "";
        const cityWithCountry = parts.length >= 2 ? parts.slice(-2).join(", ") : "";

        return [...new Set([countryNormalized, normalized, cityOrZipPart, cityWithCountry].filter(Boolean))];
      };

      const geocode = async (query: string): Promise<{ lat: number; lng: number } | null> => {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=0`
        );
        if (!res.ok) return null;
        const results = (await res.json()) as Array<{ lat: string; lon: string }>;
        if (!Array.isArray(results) || results.length === 0) return null;
        return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
      };

      await Promise.all(
        uniqueLocations.map(async (loc) => {
          const candidates = buildLocationCandidates(loc);
          try {
            for (const candidate of candidates) {
              const point = await geocode(candidate);
              if (point) {
                geoCache[loc] = point;
                return;
              }
            }
            geoCache[loc] = null;
          } catch {
            geoCache[loc] = null;
          }
        })
      );

      // Save geocoded results back to DB for caching
      for (const e of needsGeocoding) {
        const geo = e.location ? geoCache[e.location] : null;
        if (geo) {
          supabase.from("events").update({ location_lat: geo.lat, location_lng: geo.lng }).eq("id", e.id).then();
        }
      }

      

      const geocoded = needsGeocoding
        .filter((e) => e.location && geoCache[e.location!])
        .map((e) => ({
          id: e.id,
          title: e.title,
          location: e.location!,
          start_date: e.start_date,
          end_date: e.end_date,
          all_day: e.all_day,
          lat: geoCache[e.location!]!.lat,
          lng: geoCache[e.location!]!.lng,
        }));

      return [...cached, ...geocoded];
    },
  });

  // Check if the current user has opted in
  const { data: userOptedIn } = useQuery({
    queryKey: ["member-map-optin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("show_on_map")
        .eq("id", user!.id)
        .single();
      return data?.show_on_map ?? false;
    },
  });

  const hasData = members.length > 0 || events.length > 0;

  useEffect(() => {
    if (!containerRef.current || !hasData || isLoading) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const allPoints: [number, number][] = [
      ...members.map((m) => [m.map_lat, m.map_lng] as [number, number]),
      ...events.map((e) => [e.lat, e.lng] as [number, number]),
    ];

    const avgLat = allPoints.reduce((s, p) => s + p[0], 0) / allPoints.length;
    const avgLng = allPoints.reduce((s, p) => s + p[1], 0) / allPoints.length;

    const map = L.map(containerRef.current).setView([avgLat, avgLng], 6);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Member markers (default blue)
    members.forEach((m) => {
      const popupContent = `
        <div style="font-size:13px;">
          <strong>${m.display_name}</strong><br/>
          <span style="color:#666;">${m.city}</span>
        </div>
      `;
      L.marker([m.map_lat, m.map_lng]).addTo(map).bindPopup(popupContent);
    });

    // Event markers (orange calendar icon)
    events.forEach((ev) => {
      const dateStr = ev.all_day
        ? format(parseISO(ev.start_date), "dd.MM.yyyy", { locale: de })
        : format(parseISO(ev.start_date), "dd.MM.yyyy HH:mm", { locale: de });
      const popupContent = `
        <div style="font-size:13px;">
          <strong>${ev.title}</strong><br/>
          <span style="color:#666;">${dateStr}</span><br/>
          <span style="color:#888;font-size:11px;">${ev.location}</span>
        </div>
      `;
      L.marker([ev.lat, ev.lng], { icon: eventIcon }).addTo(map).bindPopup(popupContent);
    });

    if (allPoints.length > 1) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [members, events, isLoading, hasData]);

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
        <p className="text-sm text-muted-foreground mb-4">
          Zeigt die Wohnorte aller Mitglieder und kommende Veranstaltungen.
          {members.length > 0 && ` (${members.length} Mitglieder`}
          {events.length > 0 && `${members.length > 0 ? ", " : " ("}${events.length} Veranstaltung${events.length !== 1 ? "en" : ""}`}
          {(members.length > 0 || events.length > 0) && ")"}
        </p>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
          <span className="flex items-center gap-1.5">
            <MapPin size={14} className="text-primary" /> Mitglieder
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays size={14} className="text-orange-700" /> Veranstaltungen
          </span>
        </div>

        {!isLoading && userOptedIn === false && (
          <div className="flex items-start gap-2 p-3 mb-4 rounded-lg border bg-muted/50 text-sm">
            <Info size={16} className="text-primary mt-0.5 shrink-0" />
            <p>
              Du bist noch nicht auf der Karte sichtbar. Aktiviere die Option in deinem{" "}
              <Link to="/intern/profil" className="text-primary underline font-medium">
                Profil
              </Link>
              , um deinen Wohnort für andere Mitglieder anzuzeigen.
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-muted-foreground py-16">Karte wird geladen…</div>
        ) : !hasData ? (
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
            <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MemberMap;
