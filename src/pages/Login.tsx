import { useEffect, useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Loader2, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBranding } from "@/hooks/useBranding";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  /*
   * An wen sich jemand wenden soll, dessen Zugang gesperrt ist.
   *
   * Hier stand „vorstand@dilehi.de" fest im Code – in einer Installation eines
   * anderen Vereins wäre das eine fremde Adresse, an die sich niemand wenden
   * kann. Ohne hinterlegte Adresse bleibt der allgemeine Hinweis stehen; ein
   * ins Leere zeigender Verweis ist schlechter als keiner.
   */
  const { org_email } = useBranding();

  /*
   * Eine frische Installation hat noch kein Konto – niemand kann sich hier
   * anmelden, und niemand ahnt warum. Der Hinweis zeigt den Weg.
   *
   * Er verschwindet, sobald ein Konto eine Rolle hat. Bis dahin ist der
   * Zustand ohnehin von aussen sichtbar: eine Website ohne Inhalt.
   */
  const { data: einrichtungNoetig } = useQuery({
    queryKey: ["setup-needed"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("setup_needed" as never);
      if (error) return false;
      return data as unknown as boolean;
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const anWen = org_email ? `wende dich an ${org_email}` : "wende dich an den Vorstand";

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("deactivated") === "1") {
      toast({
        title: "Zugang deaktiviert",
        description: `Dein Mitgliedskonto wurde vom Vorstand deaktiviert. Bitte ${anWen}.`,
        variant: "destructive",
      });
    }
  }, [toast]);

  if (user) {
    return <Navigate to="/intern" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      const msg = (error.message || "").toLowerCase();
      const isBanned = msg.includes("banned") || msg.includes("disabled") || msg.includes("user is")
        || msg.includes("not allowed");
      toast({
        title: isBanned ? "Zugang deaktiviert" : "Anmeldung fehlgeschlagen",
        description: isBanned
          ? `Dein Konto ist derzeit deaktiviert. Bitte ${anWen}.`
          : "E-Mail oder Passwort ist falsch.",
        variant: "destructive",
      });
    } else {
      navigate("/intern");
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    try {
      const { error } = await supabase.functions.invoke("send-reset-email", {
        body: { email: forgotEmail },
      });
      if (error) throw error;
      toast({ title: "E-Mail gesendet", description: "Falls die Adresse existiert, erhältst du einen Link zum Zurücksetzen." });
      setForgotMode(false);
    } catch {
      toast({ title: "Fehler", description: "Bitte versuche es später erneut.", variant: "destructive" });
    }
    setForgotLoading(false);
  };

  if (forgotMode) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
              <Lock size={24} />
            </div>
            <h1 className="font-serif text-2xl font-bold">Passwort vergessen</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Gib deine E-Mail-Adresse ein, um einen Link zum Zurücksetzen zu erhalten.
            </p>
          </div>
          <form onSubmit={handleForgotPassword} className="p-6 rounded-lg border bg-card space-y-4">
            <div>
              <label htmlFor="forgot-email" className="text-sm font-medium mb-1.5 block">E-Mail</label>
              <input
                id="forgot-email"
                type="email"
                placeholder="name@beispiel.de"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <button
              type="submit"
              disabled={forgotLoading}
              className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {forgotLoading && <Loader2 size={16} className="animate-spin" />}
              Link senden
            </button>
            <button
              type="button"
              onClick={() => setForgotMode(false)}
              className="w-full text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
            >
              <ArrowLeft size={14} /> Zurück zur Anmeldung
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
            <Lock size={24} />
          </div>
          <h1 className="font-serif text-2xl font-bold">Mitgliederbereich</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Der interne Bereich ist nur für Mitglieder zugänglich.
          </p>
        </div>
        {einrichtungNoetig && (
          <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="font-medium mb-1">Diese Installation ist noch nicht eingerichtet.</p>
            <p className="text-muted-foreground">
              Es gibt noch kein Konto.{" "}
              <Link to="/einrichtung" className="text-primary underline">
                Ersten Zugang anlegen
              </Link>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 rounded-lg border bg-card space-y-4">
          <div>
            <label htmlFor="login-email" className="text-sm font-medium mb-1.5 block">E-Mail</label>
            <input
              id="login-email"
              type="email"
              placeholder="name@beispiel.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div>
            <label htmlFor="login-password" className="text-sm font-medium mb-1.5 block">Passwort</label>
            <input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Anmelden
          </button>
          <button
            type="button"
            onClick={() => setForgotMode(true)}
            className="w-full text-sm text-muted-foreground hover:text-foreground"
          >
            Passwort vergessen?
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
