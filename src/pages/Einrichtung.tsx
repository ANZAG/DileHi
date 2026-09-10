import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Copy, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";

/**
 * Der erste Bildschirm einer frischen Installation.
 *
 * Ohne diese Seite sieht eine neue Installation so aus: eine Website ohne
 * Inhalt und eine Anmeldung, an der sich niemand anmelden kann. Wer das zum
 * ersten Mal sieht, hält es für kaputt und ruft an.
 *
 * Die Alternative wäre gewesen, den ersten Zugang über die Kommandozeile
 * anzulegen – ein Befehl mit einem Geheimnis und einer JSON-Nutzlast. Das ist
 * für jemanden, der einen Verein führt und keine Software baut, keine
 * Alternative, sondern das Ende der Einrichtung.
 *
 * Sie schliesst sich von selbst: Sobald ein Konto eine Rolle hat, verweist sie
 * nur noch zur Anmeldung. Dahinter steckt keine zweite Prüfung, sondern
 * dieselbe, die auch die Edge Function macht – die Seite ist nur die
 * freundliche Fassade davor.
 */
export default function Einrichtung() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [geheimnis, setGeheimnis] = useState("");
  const [laeuft, setLaeuft] = useState(false);
  const [fertig, setFertig] = useState<{ rolle: string; einladung: string | null; mailVersandt: boolean } | null>(null);

  const { data: noetig, isLoading } = useQuery({
    queryKey: ["setup-needed"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("setup_needed" as never);
      if (error) throw new Error(error.message);
      return data as unknown as boolean;
    },
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  // Schon eingerichtet: Diese Seite hat hier nichts mehr zu suchen.
  if (noetig === false && !fertig) return <Navigate to="/login" replace />;

  const absenden = async (e: React.FormEvent) => {
    e.preventDefault();
    setLaeuft(true);
    try {
      const { data, error } = await supabase.functions.invoke("setup-first-admin", {
        body: { email: email.trim(), secret: geheimnis.trim(), name: name.trim() },
      });
      if (error) throw error;
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      setFertig(data as { rolle: string; einladung: string | null; mailVersandt: boolean });
    } catch (err) {
      toast({
        title: "Hat nicht geklappt",
        description:
          err instanceof Error && err.message
            ? err.message
            : "Prüfe das Einrichtungsgeheimnis. Es steht in den Einstellungen des Servers unter SETUP_SECRET.",
        variant: "destructive",
      });
    } finally {
      setLaeuft(false);
    }
  };

  if (fertig) {
    return (
      <div className="container max-w-lg py-16 px-4">
        <SEO title="Einrichtung abgeschlossen" description="Der erste Zugang wurde angelegt." noindex />
        <div className="p-6 rounded-lg border bg-card space-y-4">
          <h1 className="font-serif text-2xl font-bold flex items-center gap-2">
            <CheckCircle2 className="text-primary" size={22} /> Geschafft
          </h1>
          <p className="text-sm text-muted-foreground">
            Der Zugang steht, mit der Rolle <strong>{fertig.rolle}</strong>. Damit
            kommst du in die Verwaltung und kannst alles Weitere einstellen.
          </p>

          {fertig.mailVersandt ? (
            <p className="text-sm">
              Eine Einladung ist unterwegs an <strong>{email}</strong>. Darin steht
              der Link, mit dem du dein Passwort festlegst.
            </p>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">
                Der Mailversand ist noch nicht eingerichtet, die Einladung konnte
                also nicht rausgehen. Nimm diesen Link – er gilt einmalig:
              </p>
              <div className="flex gap-2">
                <Input readOnly value={fertig.einladung ?? ""} className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard?.writeText(fertig.einladung ?? "");
                    toast({ title: "Kopiert" });
                  }}
                >
                  <Copy size={15} />
                </Button>
              </div>
            </div>
          )}

          <Button asChild className="w-full">
            <Link to="/login">Weiter zur Anmeldung</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-lg py-16 px-4">
      <SEO
        title="Einrichtung"
        description="Den ersten Zugang zu dieser Installation anlegen."
        noindex
      />

      <div className="p-6 rounded-lg border bg-card">
        <h1 className="font-serif text-2xl font-bold mb-1 flex items-center gap-2">
          <ShieldCheck className="text-primary" size={22} /> Willkommen
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Diese Installation ist noch leer. Lege hier den ersten Zugang an – den
          mit allen Rechten. Alle weiteren Mitglieder lädst du danach bequem aus
          der Verwaltung ein.
        </p>

        <form onSubmit={absenden} className="space-y-4">
          <div>
            <Label htmlFor="setup-name" className="text-sm">Dein Name</Label>
            <Input
              id="setup-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Vorname Nachname"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="setup-email" className="text-sm">Deine E-Mail-Adresse</Label>
            <Input
              id="setup-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vorstand@verein.de"
            />
            <p className="text-xs text-muted-foreground mt-1">
              An diese Adresse geht die Einladung, mit der du dein Passwort
              festlegst.
            </p>
          </div>

          <div>
            <Label htmlFor="setup-secret" className="text-sm">Einrichtungsgeheimnis</Label>
            <Input
              id="setup-secret"
              type="password"
              required
              value={geheimnis}
              onChange={(e) => setGeheimnis(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Das hast du beim Aufsetzen als <code>SETUP_SECRET</code> hinterlegt.
              Ohne diese Abfrage könnte sich jeder, der die Adresse kennt, den
              ersten Zugang nehmen.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={laeuft}>
            {laeuft && <Loader2 size={15} className="mr-2 animate-spin" />}
            Zugang anlegen
          </Button>
        </form>
      </div>

      <p className="text-xs text-muted-foreground mt-4 text-center">
        Diese Seite verschwindet, sobald der erste Zugang steht.
      </p>
    </div>
  );
}
