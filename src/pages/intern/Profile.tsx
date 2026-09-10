import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import PushToggle from "@/components/PushToggle";
import { ArrowLeft, Save, Loader2, FileText, Trash2, Download, MapPin, Tent, Plus, HelpCircle, Bell } from "lucide-react";
import { tourStarten } from "@/components/onboarding/useTour";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import PersonaEditor from "@/components/personas/PersonaEditor";
import FormFieldRenderer from "@/components/event-forms/FormFieldRenderer";
import { useProfilfelder, bereichAn, freieFelder } from "@/hooks/useProfilfelder";
import { useBeitragsmodell } from "@/hooks/useBeitragsmodell";
import { useBeitragsstufen } from "@/hooks/useBeitragsstufen";
import { useModule } from "@/hooks/useModule";
import { SEITE } from "@/lib/layout";

const TENT_TYPE_OPTIONS = [
  { value: "speichenrad", label: "Speichenrad", shape: "circle" },
  { value: "doppelspeichenrad", label: "Doppelspeichenrad", shape: "rect" },
  { value: "kegelzelt", label: "Kegelzelt", shape: "circle" },
  { value: "a_tent", label: "A-Tent", shape: "rect" },
];

interface MemberTent {
  id: string;
  user_id: string;
  name: string;
  tent_type: string;
  shape: string;
  diameter: number | null;
  length: number | null;
  width: number | null;
  guy_rope: number;
}

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  // All editable profile fields in one object to avoid 18 separate useState calls.
  // This makes handleSave simpler and field additions require only one change here.
  const [form, setForm] = useState({
    displayName: "",
    salutation: "",
    firstName: "",
    lastName: "",
    street: "",
    zip: "",
    city: "",
    birthdate: "",
    phone: "",
    membershipType: "aktiv",
    contributionInterval: "jaehrlich",
    entryDate: "",
    exitDate: "",
    isActive: true,
    showOnMap: false,
    notifyDigest: true,
    // Dietary preferences – used to pre-fill event registration forms automatically
    diet: "",
    allergies: "",
  });
  const setField = useCallback(<K extends keyof typeof form>(key: K, value: typeof form[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Tent form state
  const [showAddTent, setShowAddTent] = useState(false);
  const [tentName, setTentName] = useState("");
  const [tentType, setTentType] = useState("kegelzelt");
  const [tentDiameter, setTentDiameter] = useState("");
  const [tentLength, setTentLength] = useState("");
  const [tentWidth, setTentWidth] = useState("");
  const [tentGuyRope, setTentGuyRope] = useState("0");

  // Load profile via useQuery for proper caching + loading state.
  // The raw useEffect approach would refetch on every mount without caching.
  const { data: profileData } = useQuery({
    queryKey: ["my-profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      return data;
    },
  });

  const { data: profilfelder = [] } = useProfilfelder();
  const { data: module } = useModule();

  /**
   * Die Beitragsstufen zur Auswahl.
   *
   * Standen bis eben als „Aktives Mitglied“ und „Fördermitglied“ fest im Code –
   * eine selbst angelegte Stufe tauchte hier nie auf, und eine entfernte blieb
   * für immer stehen. Welche angeboten werden, beantwortet die Datenbank.
   *
   * Die eigene Stufe bleibt in der Liste, auch wenn sie ausgelaufen ist. Sonst
   * würde das Formular sie beim nächsten Speichern stillschweigend auf eine
   * andere ändern.
   */
  const { arten } = useBeitragsmodell();
  const alleStufen = useBeitragsstufen();
  const mitgliedsarten = useMemo(() => {
    const liste = arten.map((a) => ({ key: a.key, label: a.label, ausgelaufen: false }));
    const eigene = form.membershipType;
    if (eigene && !liste.some((a) => a.key === eigene)) {
      liste.push({
        key: eigene,
        label: alleStufen.find((s) => s.key === eigene)?.label ?? eigene,
        ausgelaufen: true,
      });
    }
    return liste;
  }, [arten, alleStufen, form.membershipType]);

  /** Antworten auf die frei zusammengestellten Profilfelder. */
  const [extra, setExtra] = useState<Record<string, unknown>>({});

  useEffect(() => {
    if (user) setEmail(user.email || "");
  }, [user]);

  useEffect(() => {
    const roh = (profileData as { extra?: unknown } | null)?.extra;
    if (roh && typeof roh === "object" && !Array.isArray(roh)) {
      setExtra(roh as Record<string, unknown>);
    }
  }, [profileData]);

  useEffect(() => {
    if (profileData) {
      setForm({
        displayName: profileData.display_name || "",
        salutation: profileData.salutation || "",
        firstName: profileData.first_name || "",
        lastName: profileData.last_name || "",
        street: profileData.street || "",
        zip: profileData.zip || "",
        city: profileData.city || "",
        birthdate: profileData.birthdate || "",
        phone: profileData.phone || "",
        membershipType: profileData.membership_type || "aktiv",
        contributionInterval: profileData.contribution_interval || "jaehrlich",
        entryDate: profileData.entry_date || "",
        exitDate: profileData.exit_date || "",
        isActive: profileData.is_active ?? true,
        showOnMap: profileData.show_on_map ?? false,
        notifyDigest: (profileData as { notify_digest?: boolean }).notify_digest ?? true,
        diet: profileData.diet || "",
        allergies: profileData.allergies || "",
      });
    }
  }, [profileData]);

  const { data: membershipFiles = [] } = useQuery({
    queryKey: ["membership_files", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_files")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) return [];
      return data;
    },
  });

  const { data: myTents = [] } = useQuery({
    queryKey: ["member_tents", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("member_tents")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at");
      if (error) return [];
      return data as MemberTent[];
    },
  });

  const geocodeCity = async (plz: string, ort: string): Promise<{ lat: number; lng: number } | null> => {
    if (!plz && !ort) return null;
    // Try progressively broader queries until one succeeds.
    // No hardcoded country so it works for members outside Germany.
    const candidates = [
      [plz, ort].filter(Boolean).join(" "),          // "68159 Mannheim"
      ort,                                            // "Mannheim" (city only)
      plz,                                            // "68159" (zip only)
    ].filter(Boolean);
    for (const query of candidates) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`
        );
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
      } catch (_e) { /* intentional — geocode failure is non-critical */ }
    }
    return null;
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Determine map coordinates.
      // Strategy: keep existing coordinates from the DB unless we can get fresh ones.
      // This prevents wiping valid coords whenever Nominatim is slow or unreachable.
      let mapLat: number | null = profileData?.map_lat ?? null;
      let mapLng: number | null = profileData?.map_lng ?? null;
      let geocodeFailed = false;

      if (form.showOnMap && (form.zip || form.city)) {
        // Only re-geocode if address fields actually changed, or coords are missing
        const addressChanged =
          form.zip !== (profileData?.zip || "") ||
          form.city !== (profileData?.city || "");
        const missingCoords = mapLat == null || mapLng == null;

        if (addressChanged || missingCoords) {
          const coords = await geocodeCity(form.zip, form.city);
          if (coords) {
            mapLat = coords.lat;
            mapLng = coords.lng;
          } else {
            geocodeFailed = true;
            // Keep existing coords – don't overwrite with null
          }
        }
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          display_name: form.displayName,
          salutation: form.salutation,
          first_name: form.firstName,
          last_name: form.lastName,
          street: form.street,
          zip: form.zip,
          city: form.city,
          birthdate: form.birthdate || null,
          phone: form.phone,
          membership_type: form.membershipType,
          contribution_interval: form.contributionInterval,
          extra,
          show_on_map: form.showOnMap,
          notify_digest: form.notifyDigest,
          map_lat: form.showOnMap ? mapLat : null,
          map_lng: form.showOnMap ? mapLng : null,
          diet: form.diet || null,
          allergies: form.allergies || null,
          // notify_digest steht noch nicht in der erzeugten types.ts – die
          // entsteht erst bei der naechsten Neugenerierung. Danach kann die
          // Zusicherung weg.
        } as never)
        .eq("id", user.id);
      if (profileError) throw profileError;

      if (email !== user.email) {
        const { error: emailError } = await supabase.auth.updateUser({ email });
        if (emailError) throw emailError;
        toast({ title: "Bestätigungsmail gesendet", description: "Bitte bestätige die neue E-Mail-Adresse." });
      }

      if (newPassword) {
        if (newPassword !== confirmPassword) {
          toast({ title: "Passwörter stimmen nicht überein", variant: "destructive" });
          setSaving(false);
          return;
        }
        if (newPassword.length < 6) {
          toast({ title: "Passwort muss mindestens 6 Zeichen haben", variant: "destructive" });
          setSaving(false);
          return;
        }
        const { error: pwError } = await supabase.auth.updateUser({ password: newPassword });
        if (pwError) throw pwError;
      }

      if (geocodeFailed) {
        toast({
          title: "Profil gespeichert",
          description: "Der Wohnort konnte nicht auf der Karte eingetragen werden. Bitte prüfe Postleitzahl und Ort.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Profil gespeichert" });
      }
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
    setSaving(false);
  };

  const downloadFile = async (file: { storage_path: string }) => {
    const { data } = await supabase.storage.from("internal-files").createSignedUrl(file.storage_path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const addTent = async () => {
    if (!user || !tentName) return;
    const selectedType = TENT_TYPE_OPTIONS.find((t) => t.value === tentType);
    const shape = selectedType?.shape || "circle";
    const { error } = await supabase.from("member_tents").insert({
      user_id: user.id,
      name: tentName,
      tent_type: tentType,
      shape,
      diameter: shape === "circle" && tentDiameter ? Number(tentDiameter) : null,
      length: shape === "rect" && tentLength ? Number(tentLength) : null,
      width: shape === "rect" && tentWidth ? Number(tentWidth) : null,
      guy_rope: Number(tentGuyRope) || 0,
    });
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["member_tents"] });
    setShowAddTent(false);
    setTentName("");
    setTentType("kegelzelt");
    setTentDiameter("");
    setTentLength("");
    setTentWidth("");
    setTentGuyRope("0");
    toast({ title: "Zelt hinzugefügt" });
  };

  const deleteTent = async (tentId: string) => {
    await supabase.from("member_tents").delete().eq("id", tentId);
    queryClient.invalidateQueries({ queryKey: ["member_tents"] });
  };

  const selectedTentShape = TENT_TYPE_OPTIONS.find((t) => t.value === tentType)?.shape || "circle";

  return (
    <div className={SEITE}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-6">
          <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft size={16} /> Zurück
          </Link>
          <button
            onClick={() => tourStarten()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <HelpCircle size={14} /> Tour starten
          </button>
        </div>
        <h1 className="font-serif text-2xl font-bold mb-6">Mein Profil</h1>

        {/*
          * Zweispaltig ab dem grossen Bildschirm.
          *
          * Das Profil stand in einer Spalte von 32rem – auf einem gewoehnlichen
          * Monitor blieben zwei Drittel der Flaeche leer, und man scrollte an
          * zehn Kaesten vorbei. `columns` statt eines Rasters, weil die Kaesten
          * einzeln wegfallen koennen: Ein Raster mit fest zugeteilten Spalten
          * haette bei abgeschalteten Bereichen eine leere Haelfte.
          *
          * Die Reihenfolge im Quelltext ist die Reihenfolge auf dem Handy und
          * zugleich die Lesereihenfolge am Desktop (erst linke Spalte, dann
          * rechte). Sie ist nach Wichtigkeit sortiert: erst wer man ist, dann
          * was man mitbringt, zuletzt Einstellungen und Unterlagen.
          */}
        <div className="space-y-6 lg:space-y-0 lg:columns-2 lg:gap-6 lg:[&>*]:mb-6 lg:[&>*]:break-inside-avoid">
          {/* Personal info */}
          <div className="p-6 rounded-lg border bg-card space-y-4">
            <h2 className="font-serif text-lg font-semibold">Persönliche Daten</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="profile-salutation" className="text-sm font-medium mb-1.5 block">Anrede</label>
                <select
                  id="profile-salutation"
                  value={form.salutation}
                  onChange={(e) => setField("salutation", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">–</option>
                  <option value="Herr">Herr</option>
                  <option value="Frau">Frau</option>
                </select>
              </div>
              <div>
                <label htmlFor="profile-display-name" className="text-sm font-medium mb-1.5 block">Anzeigename</label>
                <input
                  id="profile-display-name"
                  value={form.displayName}
                  onChange={(e) => setField("displayName", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="profile-first-name" className="text-sm font-medium mb-1.5 block">Vorname</label>
                <input
                  id="profile-first-name"
                  value={form.firstName}
                  onChange={(e) => setField("firstName", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="profile-last-name" className="text-sm font-medium mb-1.5 block">Nachname</label>
                <input
                  id="profile-last-name"
                  value={form.lastName}
                  onChange={(e) => setField("lastName", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label htmlFor="profile-street" className="text-sm font-medium mb-1.5 block">Straße und Hausnummer</label>
              <input
                  id="profile-street"
                value={form.street}
                onChange={(e) => setField("street", e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label htmlFor="profile-zip" className="text-sm font-medium mb-1.5 block">PLZ</label>
                <input
                  id="profile-zip"
                  value={form.zip}
                  onChange={(e) => setField("zip", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label htmlFor="profile-city" className="text-sm font-medium mb-1.5 block">Wohnort</label>
                <input
                  id="profile-city"
                  value={form.city}
                  onChange={(e) => setField("city", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="profile-birthdate" className="text-sm font-medium mb-1.5 block">Geburtsdatum</label>
                <input
                  id="profile-birthdate"
                  type="date"
                  value={form.birthdate}
                  onChange={(e) => setField("birthdate", e.target.value)}
                  className="flex h-10 max-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none [&::-webkit-date-and-time-value]:text-left"
                />
              </div>
              <div>
                <label htmlFor="profile-phone" className="text-sm font-medium mb-1.5 block">Telefon / Handy</label>
                <input
                  id="profile-phone"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Membership info */}
          <div className="p-6 rounded-lg border bg-card space-y-4">
            <h2 className="font-serif text-lg font-semibold">Mitgliedschaft</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="profile-membership" className="text-sm font-medium mb-1.5 block">Art der Mitgliedschaft</label>
                <select
                  id="profile-membership"
                  value={form.membershipType}
                  onChange={(e) => setField("membershipType", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {mitgliedsarten.map((a) => (
                    <option key={a.key} value={a.key}>
                      {a.label}
                      {a.ausgelaufen ? " (wird nicht mehr angeboten)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="profile-payment" className="text-sm font-medium mb-1.5 block">Beitragseinzug</label>
                <select
                  id="profile-payment"
                  value={form.contributionInterval}
                  onChange={(e) => setField("contributionInterval", e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="jaehrlich">Jährlich</option>
                  <option value="halbjaehrlich">Halbjährlich</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="profile-join-date" className="text-sm font-medium mb-1.5 block">Eintrittsdatum</label>
                <input
                  id="profile-join-date"
                  type="date"
                  value={form.entryDate}
                  disabled
                  className="flex h-10 max-h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm cursor-not-allowed appearance-none [&::-webkit-date-and-time-value]:text-left"
                />
                <p className="text-xs text-muted-foreground mt-1">Wird vom Vorstand eingetragen</p>
              </div>
              {!form.isActive && (
                <div>
                  <label htmlFor="profile-leave-date" className="text-sm font-medium mb-1.5 block">Austrittsdatum</label>
                  <input
                    id="profile-leave-date"
                    type="date"
                    value={form.exitDate}
                    disabled
                    className="flex h-10 max-h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm cursor-not-allowed appearance-none [&::-webkit-date-and-time-value]:text-left"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Wird vom Vorstand eingetragen</p>
                </div>
              )}
            </div>
            {!form.isActive && (
              <p className="text-sm text-destructive font-medium">Mitgliedschaft beendet</p>
            )}
          </div>

          {/* Dietary preferences – pre-fill event registration forms automatically */}
          {bereichAn(profilfelder, "ernaehrung", module) && (
  <div className="p-6 rounded-lg border bg-card space-y-4">
              <div>
                <h2 className="font-serif text-lg font-semibold">Ernährung</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Wird bei Veranstaltungsanmeldungen automatisch vorausgefüllt.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="profile-diet" className="text-sm font-medium mb-1.5 block">Ernährungspräferenz</label>
                  <select
                    id="profile-diet"
                    value={form.diet}
                    onChange={(e) => setField("diet", e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">– keine Angabe –</option>
                    <option value="Keine Einschränkung">Keine Einschränkung</option>
                    <option value="Vegetarisch">Vegetarisch</option>
                    <option value="Vegan">Vegan</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="profile-allergies" className="text-sm font-medium mb-1.5 block">Allergien / Unverträglichkeiten</label>
                  <input
                    id="profile-allergies"
                    value={form.allergies}
                    onChange={(e) => setField("allergies", e.target.value)}
                    placeholder="z.B. Nüsse, Laktose …"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Tents */}
          {bereichAn(profilfelder, "zelte", module) && (
  <div className="p-6 rounded-lg border bg-card space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
                  <Tent size={18} /> Meine Zelte
                </h2>
                <Button variant="outline" size="sm" onClick={() => setShowAddTent(true)}>
                  <Plus size={14} className="mr-1" /> Zelt
                </Button>
              </div>
              {myTents.length === 0 && !showAddTent && (
                <p className="text-sm text-muted-foreground">Noch keine Zelte hinterlegt. Trage deine Zelte hier ein, damit sie bei Veranstaltungsumfragen automatisch zur Auswahl stehen.</p>
              )}
              {myTents.map((tent) => {
                const typeLabel = TENT_TYPE_OPTIONS.find((t) => t.value === tent.tent_type)?.label || tent.tent_type;
                const dimStr = tent.shape === "circle" && tent.diameter
                  ? `Ø${tent.diameter}m`
                  : tent.length && tent.width
                    ? `${tent.length}×${tent.width}m`
                    : "";
                return (
                  <div key={tent.id} className="flex items-center justify-between p-3 rounded border bg-background">
                    <div>
                      <span className="text-sm font-medium">{tent.name || typeLabel}</span>
                      <span className="text-xs text-muted-foreground ml-2">{typeLabel} {dimStr}</span>
                      {tent.guy_rope > 0 && <span className="text-xs text-muted-foreground ml-1">(Absp. {tent.guy_rope}m)</span>}
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteTent(tent.id)}>
                      <Trash2 size={14} className="text-destructive" />
                    </Button>
                  </div>
                );
              })}

              {showAddTent && (
                <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Name</Label>
                      <Input value={tentName} onChange={(e) => setTentName(e.target.value)} placeholder="z.B. Mein Speichenrad" />
                    </div>
                    <div>
                      <Label className="text-sm">Zelttyp</Label>
                      <Select value={tentType} onValueChange={setTentType}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TENT_TYPE_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {selectedTentShape === "circle" && (
                    <div>
                      <Label className="text-sm">Durchmesser (m)</Label>
                      <Input type="number" step="0.1" value={tentDiameter} onChange={(e) => setTentDiameter(e.target.value)} placeholder="z.B. 5" />
                    </div>
                  )}
                  {selectedTentShape === "rect" && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-sm">Länge (m)</Label>
                        <Input type="number" step="0.1" value={tentLength} onChange={(e) => setTentLength(e.target.value)} />
                      </div>
                      <div>
                        <Label className="text-sm">Breite (m)</Label>
                        <Input type="number" step="0.1" value={tentWidth} onChange={(e) => setTentWidth(e.target.value)} />
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm">Abspannung (m)</Label>
                    <Input type="number" step="0.1" value={tentGuyRope} onChange={(e) => setTentGuyRope(e.target.value)} placeholder="0" />
                    <p className="text-xs text-muted-foreground mt-1">Radius der Abspannung (0 wenn keine)</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addTent} disabled={!tentName}>Hinzufügen</Button>
                    <Button size="sm" variant="outline" onClick={() => setShowAddTent(false)}>Abbrechen</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Darstellungssteckbrief – nur intern sichtbar */}
          {bereichAn(profilfelder, "darstellung", module) && <PersonaEditor />}

          {/* Frei zusammengestellte Felder.
              Der Block erscheint nur, wenn es welche gibt – ein leerer Kasten
              „Weitere Angaben" waere auf jedem Profil zu sehen und nirgends
              zu erklaeren. */}
          {freieFelder(profilfelder).length > 0 && (
            <div className="p-6 rounded-lg border bg-card space-y-4">
              <h2 className="font-serif text-lg font-semibold">Weitere Angaben</h2>
              {freieFelder(profilfelder).map((feld) => (
                <FormFieldRenderer
                  key={feld.id}
                  field={feld}
                  value={extra[feld.id]}
                  onChange={(v) => setExtra((p) => ({ ...p, [feld.id]: v }))}
                />
              ))}
            </div>
          )}

          {/* Benachrichtigungen */}
          <div className="p-6 rounded-lg border bg-card space-y-3">
            <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
              <Bell size={18} /> Benachrichtigungen
            </h2>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.notifyDigest}
                onChange={(e) => setField("notifyDigest", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input"
              />
              <div>
                <span className="text-sm font-medium">Tägliche Zusammenfassung per E-Mail</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Eine Mail am Abend, wenn es Neues gibt. Gesammelt, nicht einzeln.
                  Die Glocke oben in der Leiste bleibt davon unberührt.
                </p>
              </div>
            </label>

            <PushToggle />
          </div>

          {/* Map opt-in */}
          {bereichAn(profilfelder, "karte", module) && (
  <div className="p-6 rounded-lg border bg-card space-y-3">
              <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
                <MapPin size={18} /> Mitgliederkarte
              </h2>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.showOnMap}
                  onChange={(e) => setField("showOnMap", e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input"
                />
                <div>
                  <span className="text-sm font-medium">Meinen Wohnort auf der Mitgliederkarte anzeigen</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Dein Anzeigename und Wohnort (nicht die genaue Adresse) werden für andere Mitglieder auf einer Karte sichtbar.
                  </p>
                </div>
              </label>
              {form.showOnMap && (!form.zip && !form.city) && (
                <p className="text-xs text-destructive">Bitte trage oben PLZ und Wohnort ein, damit dein Standort angezeigt werden kann.</p>
              )}
            </div>
          )}

          <div className="p-6 rounded-lg border bg-card space-y-4">
            <h2 className="font-serif text-lg font-semibold">Konto</h2>
            <div>
              <label htmlFor="profile-email" className="text-sm font-medium mb-1.5 block">E-Mail</label>
              <input
                  id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <hr className="border-border" />
            <p className="text-xs text-muted-foreground">Passwort ändern (leer lassen um es beizubehalten)</p>
            <div>
              <label htmlFor="profile-new-password" className="text-sm font-medium mb-1.5 block">Neues Passwort</label>
              <input
                  id="profile-new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label htmlFor="profile-confirm-pw" className="text-sm font-medium mb-1.5 block">Passwort bestätigen</label>
              <input
                  id="profile-confirm-pw"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Membership files */}
          {bereichAn(profilfelder, "antrag", module) && membershipFiles.length > 0 && (
            <div className="p-6 rounded-lg border bg-card space-y-3">
              <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
                <FileText size={18} /> Mitgliedsantrag
              </h2>
              {membershipFiles.map((file) => (
                <div key={file.id} className="flex items-center justify-between p-2 rounded border bg-background">
                  <span className="text-sm truncate">{file.name}</span>
                  <button
                    onClick={() => downloadFile(file)}
                    className="text-muted-foreground hover:text-foreground p-1"
                  >
                    <Download size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Speichern
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Profile;
