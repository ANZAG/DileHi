import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Save, Loader2, FileText, Trash2, Download, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);

  // Profile fields from membership application
  const [salutation, setSalutation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [street, setStreet] = useState("");
  const [zip, setZip] = useState("");
  const [city, setCity] = useState("");
  const [birthdate, setBirthdate] = useState("");
  const [phone, setPhone] = useState("");
  const [membershipType, setMembershipType] = useState("aktiv");
  const [contributionInterval, setContributionInterval] = useState("jaehrlich");
  const [entryDate, setEntryDate] = useState("");
  const [exitDate, setExitDate] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [showOnMap, setShowOnMap] = useState(false);

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setDisplayName(data.display_name || "");
            setSalutation(data.salutation || "");
            setFirstName(data.first_name || "");
            setLastName(data.last_name || "");
            setStreet(data.street || "");
            setZip(data.zip || "");
            setCity(data.city || "");
            setBirthdate(data.birthdate || "");
            setPhone(data.phone || "");
            setMembershipType(data.membership_type || "aktiv");
            setContributionInterval(data.contribution_interval || "jaehrlich");
            setEntryDate(data.entry_date || "");
            setExitDate(data.exit_date || "");
            setIsActive(data.is_active ?? true);
            setShowOnMap(data.show_on_map ?? false);
          }
        });
    }
  }, [user]);

  // Membership files for the current user
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

  const geocodeCity = async (plz: string, ort: string): Promise<{ lat: number; lng: number } | null> => {
    if (!plz && !ort) return null;
    try {
      const query = `${plz} ${ort}, Germany`;
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`);
      const data = await res.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch {}
    return null;
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      let mapLat: number | null = null;
      let mapLng: number | null = null;

      if (showOnMap && (zip || city)) {
        const coords = await geocodeCity(zip, city);
        if (coords) {
          mapLat = coords.lat;
          mapLng = coords.lng;
        }
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          salutation,
          first_name: firstName,
          last_name: lastName,
          street,
          zip,
          city,
          birthdate: birthdate || null,
          phone,
          membership_type: membershipType,
          contribution_interval: contributionInterval,
          show_on_map: showOnMap,
          map_lat: showOnMap ? mapLat : null,
          map_lng: showOnMap ? mapLng : null,
        })
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

      toast({ title: "Profil gespeichert" });
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

  return (
    <div className="container py-8 sm:py-12 max-w-lg px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>
        <h1 className="font-serif text-2xl font-bold mb-6">Mein Profil</h1>

        <div className="space-y-6">
          {/* Personal info */}
          <div className="p-6 rounded-lg border bg-card space-y-4">
            <h2 className="font-serif text-lg font-semibold">Persönliche Daten</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Anrede</label>
                <select
                  value={salutation}
                  onChange={(e) => setSalutation(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">–</option>
                  <option value="Herr">Herr</option>
                  <option value="Frau">Frau</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Anzeigename</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Vorname</label>
                <input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nachname</label>
                <input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Straße und Hausnummer</label>
              <input
                value={street}
                onChange={(e) => setStreet(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-1">
                <label className="text-sm font-medium mb-1.5 block">PLZ</label>
                <input
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium mb-1.5 block">Wohnort</label>
                <input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Geburtsdatum</label>
                <input
                  type="date"
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="flex h-10 max-h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm appearance-none [&::-webkit-date-and-time-value]:text-left"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Telefon / Handy</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                <label className="text-sm font-medium mb-1.5 block">Art der Mitgliedschaft</label>
                <select
                  value={membershipType}
                  onChange={(e) => setMembershipType(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="aktiv">Aktives Mitglied</option>
                  <option value="foerder">Fördermitglied</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Beitragseinzug</label>
                <select
                  value={contributionInterval}
                  onChange={(e) => setContributionInterval(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="jaehrlich">Jährlich</option>
                  <option value="halbjaehrlich">Halbjährlich</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Eintrittsdatum</label>
                <input
                  type="date"
                  value={entryDate}
                  disabled
                  className="flex h-10 max-h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm cursor-not-allowed appearance-none [&::-webkit-date-and-time-value]:text-left"
                />
                <p className="text-xs text-muted-foreground mt-1">Wird vom Vorstand eingetragen</p>
              </div>
              {exitDate && (
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Austrittsdatum</label>
                  <input
                    type="date"
                    value={exitDate}
                    disabled
                    className="flex h-10 max-h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm cursor-not-allowed appearance-none [&::-webkit-date-and-time-value]:text-left"
                  />
                </div>
              )}
            </div>
            {!isActive && (
              <p className="text-sm text-destructive font-medium">Mitgliedschaft beendet</p>
            )}
          </div>

          {/* Map opt-in */}
          <div className="p-6 rounded-lg border bg-card space-y-3">
            <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
              <MapPin size={18} /> Mitgliederkarte
            </h2>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnMap}
                onChange={(e) => setShowOnMap(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input"
              />
              <div>
                <span className="text-sm font-medium">Meinen Wohnort auf der Mitgliederkarte anzeigen</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Dein Anzeigename und Wohnort (nicht die genaue Adresse) werden für andere Mitglieder auf einer Karte sichtbar.
                </p>
              </div>
            </label>
            {showOnMap && (!zip && !city) && (
              <p className="text-xs text-destructive">Bitte trage oben PLZ und Wohnort ein, damit dein Standort angezeigt werden kann.</p>
            )}
          </div>

          <div className="p-6 rounded-lg border bg-card space-y-4">
            <h2 className="font-serif text-lg font-semibold">Konto</h2>
            <div>
              <label className="text-sm font-medium mb-1.5 block">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <hr className="border-border" />
            <p className="text-xs text-muted-foreground">Passwort ändern (leer lassen um es beizubehalten)</p>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Neues Passwort</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Passwort bestätigen</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* Membership files */}
          {membershipFiles.length > 0 && (
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
