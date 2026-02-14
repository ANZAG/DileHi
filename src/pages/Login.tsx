import { motion } from "framer-motion";
import { Lock } from "lucide-react";

const Login = () => (
  <div className="min-h-[70vh] flex items-center justify-center px-4">
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-sm"
    >
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary mb-4">
          <Lock size={24} />
        </div>
        <h1 className="font-serif text-2xl font-bold">Mitgliederbereich</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Der interne Bereich ist nur für Vereinsmitglieder zugänglich.
        </p>
      </div>

      <div className="p-6 rounded-lg border bg-card space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">E-Mail</label>
          <input
            type="email"
            placeholder="name@beispiel.de"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            disabled
          />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Passwort</label>
          <input
            type="password"
            placeholder="••••••••"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            disabled
          />
        </div>
        <button
          disabled
          className="w-full h-10 rounded-md bg-primary text-primary-foreground font-medium text-sm opacity-50 cursor-not-allowed"
        >
          Anmelden
        </button>
        <p className="text-xs text-center text-muted-foreground">
          Login wird aktiviert, sobald der Backend-Bereich eingerichtet ist.
        </p>
      </div>
    </motion.div>
  </div>
);

export default Login;
