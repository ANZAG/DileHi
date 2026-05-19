import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [success, setSuccess] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  useEffect(() => {
    const verifyToken = async () => {
      const tokenHash = searchParams.get("token_hash");
      const type = searchParams.get("type");

      if (tokenHash && (type === "recovery" || type === "invite")) {
        // Verify the OTP token from the email link
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type === "invite" ? "invite" : "recovery",
        });
        if (!error) {
          setIsRecovery(true);
        } else {
          console.error("Token verification failed:", error.message);
        }
        setVerifying(false);
        return;
      }

      // Legacy: check for recovery type in URL hash
      const hash = window.location.hash;
      if (hash.includes("type=recovery")) {
        setIsRecovery(true);
      }

      // Listen for PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setIsRecovery(true);
        }
      });

      setVerifying(false);
      return () => subscription.unsubscribe();
    };

    verifyToken();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Passwörter stimmen nicht überein", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Passwort muss mindestens 6 Zeichen haben", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast({ title: "Fehler", description: error.message, variant: "destructive" });
    } else {
      setSuccess(true);
      setTimeout(() => navigate("/intern"), 2000);
    }
  };

  if (verifying) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <Loader2 size={32} className="mx-auto animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Link wird überprüft...</p>
        </div>
      </div>
    );
  }

  if (!isRecovery) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center text-muted-foreground">
          <p>Ungültiger oder abgelaufener Link.</p>
          <button onClick={() => navigate("/login")} className="mt-4 text-primary hover:underline text-sm">
            Zurück zur Anmeldung
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <CheckCircle2 size={48} className="mx-auto text-primary" />
          <h2 className="font-serif text-xl font-bold">Passwort geändert!</h2>
          <p className="text-sm text-muted-foreground">Du wirst weitergeleitet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
            <Lock size={24} />
          </div>
          <h1 className="font-serif text-2xl font-bold">Neues Passwort setzen</h1>
        </div>
        <form onSubmit={handleSubmit} className="p-6 rounded-lg border bg-card space-y-4">
          <div>
            <label htmlFor="reset-new-password" className="text-sm font-medium mb-1.5 block">Neues Passwort</label>
            <input
              id="reset-new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label htmlFor="reset-confirm-password" className="text-sm font-medium mb-1.5 block">Passwort bestätigen</label>
            <input
              id="reset-confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="••••••••"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Passwort ändern
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
