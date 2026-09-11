import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Adresse und öffentlicher Schlüssel kommen beim Bauen aus dem Projekt
// (deploy.yml, probeseite.yml), nicht aus einer eingecheckten Datei.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Ohne eigenen `storage`: Im Browser nimmt supabase-js von selbst localStorage,
// anderswo (Tests unter Node) einen Speicher im Arbeitsspeicher. Ein festes
// `localStorage` hier liess jeden Test scheitern, der diese Datei nur lud.
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  }
});
