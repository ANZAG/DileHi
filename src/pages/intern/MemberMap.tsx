import { useEffect, useMemo, useRef } from "react";
import { EINBLENDEN_SEITE } from "@/lib/einblenden";
import { ArrowLeft, MapPin, Info, CalendarDays } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { veranstaltungSchluessel } from "@/daten/veranstaltungen";
import { useAuth } from "@/hooks/useAuth";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { SEITE } from "@/lib/layout";
import { geocodeAdresse, geocodeOrt, type Koordinaten } from "@/lib/geocode";

type KartenMitglied = { id: string; display_name: string | null; city: string | null; zip: string | null; map_lat: number | null; map_lng: number | null };

type KartenTermin = { id: string; title: string; location: string | null; start_date: string; end_date: string | null; all_day: boolean; location_lat: number | null; location_lng: number | null };

// Feste Leerwerte: Ein neues [] oder {} bei jedem Rendern liesse die Karte
// jedes Mal neu aufbauen.
const KEINE_MITGLIEDER: KartenMitglied[] = [];
const KEINE_TERMINE: KartenTermin[] = [];
const NICHTS_NACHGESCHLAGEN: Record<string, Koordinaten> = {};

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
  const navigate = useNavigate();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Only map-relevant columns are exposed (RPC, no full profile row)
  const { data: gespeichert = KEINE_MITGLIEDER, isLoading } = useQuery({
    queryKey: ["member-map"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_map_members");
      if (error) throw error;
      // Die erzeugten Typen kennen hier kein null; die Spalten können aber leer sein.
      const zeilen: KartenMitglied[] = data ?? [];
      return zeilen;
    },
  });

  // Mitglieder, die auf die Karte wollen, aber keine gespeicherten Koordinaten
  // haben (ein früherer Fehler im Profil hat sie mit null überschrieben).
  const ohneKoordinaten = useMemo(
    () => gespeichert.filter((p) => (p.map_lat == null || p.map_lng == null) && (p.city || p.zip)),
    [gespeichert],
  );

  // Ihre Orte werden hier nachgeschlagen – in einer eigenen Abfrage, damit die
  // Karte nicht darauf wartet: Nominatim erlaubt eine Anfrage je Sekunde, bei
  // zwanzig Mitgliedern wären das über zwanzig Sekunden „Karte wird geladen".
  //
  // Das Ergebnis bleibt im Speicher dieser Sitzung. Früher sollte es ins Profil
  // des jeweiligen Mitglieds zurückgeschrieben werden; das hat nie geklappt,
  // weil jeder nur das eigene Profil ändern darf („Users can update own
  // profile"). Die Datenbank meldete dabei keinen Fehler, und so gingen bei
  // jedem Besuch wieder alle Anfragen hinaus – gleichzeitig.
  const { data: nachgeschlagen = NICHTS_NACHGESCHLAGEN } = useQuery({
    queryKey: ["member-map-nachgeschlagen", ohneKoordinaten.map((p) => `${p.id}|${p.zip ?? ""}|${p.city ?? ""}`)],
    enabled: ohneKoordinaten.length > 0,
    staleTime: Infinity,
    gcTime: Infinity,
    // Scheitert eine Anfrage (kein Netz, 429), bricht der Durchlauf ab, statt
    // weiterzufragen. Was bis dahin gefunden wurde, hat sich geocode gemerkt –
    // der eine neue Versuch fängt also nicht von vorn an.
    retry: 1,
    queryFn: async ({ signal }) => {
      const gefunden: Record<string, Koordinaten> = {};
      for (const p of ohneKoordinaten) {
        const punkt = await geocodeOrt(p.zip, p.city, signal);
        if (!punkt) continue;
        gefunden[p.id] = punkt;
        // Das eigene Profil darf man ändern – dort die Lücke gleich schliessen.
        if (p.id === user?.id) {
          const { error } = await supabase.from("profiles").update({ map_lat: punkt.lat, map_lng: punkt.lng }).eq("id", p.id);
          if (error) console.warn("Koordinaten konnten nicht im Profil gespeichert werden:", error.message);
        }
      }
      return gefunden;
    },
  });

  const members = useMemo(
    () =>
      gespeichert.flatMap((p) => {
        const punkt = p.map_lat != null && p.map_lng != null ? { lat: p.map_lat, lng: p.map_lng } : nachgeschlagen[p.id];
        return punkt
          ? [{ id: p.id, display_name: p.display_name, city: p.city || "–", map_lat: punkt.lat, map_lng: punkt.lng }]
          : [];
      }),
    [gespeichert, nachgeschlagen],
  );

  // Fetch upcoming events with location (use cached lat/lng when available)
  const { data: termine = KEINE_TERMINE } = useQuery({
    queryKey: veranstaltungSchluessel.fuerKarte(),
    queryFn: async () => {
      // Start of today (local) — events disappear only the day AFTER they end,
      // so ongoing/multi-day events stay visible until then.
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const cutoff = startOfToday.toISOString();
      const { data, error } = await supabase
        .from("events")
        .select("id, title, location, start_date, end_date, all_day, location_lat, location_lng")
        // Keep events whose end is today or later; for single-day events (no end_date)
        // fall back to comparing the start date.
        .or(`end_date.gte.${cutoff},and(end_date.is.null,start_date.gte.${cutoff})`)
        .not("location", "is", null)
        .order("start_date", { ascending: true })
        .limit(20);
      if (error) throw error;
      const zeilen: KartenTermin[] = data ?? [];
      return zeilen;
    },
  });

  // Veranstaltungen, deren Ort noch keine gespeicherten Koordinaten hat.
  const termineOhneKoordinaten = useMemo(
    () => termine.filter((e) => (e.location_lat == null || e.location_lng == null) && e.location),
    [termine],
  );

  // Wie bei den Mitgliedern: nachschlagen in einer eigenen Abfrage, damit die
  // Veranstaltungen mit gespeicherten Koordinaten sofort auf der Karte stehen.
  const { data: orte = NICHTS_NACHGESCHLAGEN } = useQuery({
    queryKey: ["member-map-orte", [...new Set(termineOhneKoordinaten.map((e) => e.location!))]],
    enabled: termineOhneKoordinaten.length > 0,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
    queryFn: async ({ signal }) => {
      const gefunden: Record<string, Koordinaten> = {};
      for (const e of termineOhneKoordinaten) {
        const ort = e.location!;
        // Derselbe Ort bei mehreren Veranstaltungen: geocode merkt sich die
        // Antwort, die zweite Frage geht nicht mehr hinaus.
        const punkt = await geocodeAdresse(ort, signal);
        if (!punkt) continue;
        gefunden[ort] = punkt;
        // Save geocoded results back to DB for caching. Das gelingt nur, wer
        // die Veranstaltung ändern darf (angelegt hat oder events.moderate);
        // bei allen anderen ändert die Datenbank nichts und meldet auch
        // keinen Fehler – für sie bleibt es beim Ergebnis dieser Sitzung.
        const { error } = await supabase
          .from("events")
          .update({ location_lat: punkt.lat, location_lng: punkt.lng })
          .eq("id", e.id);
        if (error) console.warn("Koordinaten der Veranstaltung konnten nicht gespeichert werden:", error.message);
      }
      return gefunden;
    },
  });

  const events = useMemo(
    () =>
      termine.flatMap((e) => {
        const punkt =
          e.location_lat != null && e.location_lng != null
            ? { lat: e.location_lat, lng: e.location_lng }
            : e.location
              ? orte[e.location]
              : undefined;
        return punkt && e.location
          ? [{ id: e.id, title: e.title, location: e.location, start_date: e.start_date, end_date: e.end_date, all_day: e.all_day, lat: punkt.lat, lng: punkt.lng }]
          : [];
      }),
    [termine, orte],
  );

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

    // Separate cluster groups for members (blue) and events (orange)
    const createClusterIcon = (color: string) => (cluster: any) => {
      const count = cluster.getChildCount();
      return L.divIcon({
        className: "",
        html: `<div style="background:${color};color:#fff;border:2px solid #fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;box-shadow:0 2px 6px rgba(0,0,0,.35);">${count}</div>`,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });
    };

    const memberCluster = (L as any).markerClusterGroup({
      maxClusterRadius: 20,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: createClusterIcon("#3b82f6"),
    });

    const eventCluster = (L as any).markerClusterGroup({
      maxClusterRadius: 20,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: createClusterIcon("#c2410c"),
    });

    // Member markers (default blue)
    members.forEach((m) => {
      const popupEl = document.createElement("div");
      popupEl.style.fontSize = "13px";

      const name = document.createElement("strong");
      name.textContent = m.display_name ?? "Mitglied";
      popupEl.appendChild(name);
      popupEl.appendChild(document.createElement("br"));

      const cityEl = document.createElement("span");
      cityEl.style.color = "#666";
      cityEl.textContent = m.city;
      popupEl.appendChild(cityEl);

      memberCluster.addLayer(L.marker([m.map_lat, m.map_lng]).bindPopup(popupEl));
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
      eventCluster.addLayer(L.marker([ev.lat, ev.lng], { icon: eventIcon }).bindPopup(popupContent));
    });

    map.addLayer(memberCluster);
    map.addLayer(eventCluster);

    if (allPoints.length > 1) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [members, events, isLoading, hasData, navigate]);

  return (
    <div className={SEITE}>
      <div className={EINBLENDEN_SEITE}>
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
            <MapPin size={14} className="text-[#3b82f6]" /> Mitglieder
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
          <div className="rounded-lg border overflow-hidden isolate" style={{ height: "500px" }}>
            <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberMap;
