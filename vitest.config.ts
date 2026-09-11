import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Einige Module laden den Supabase-Client, und der verlangt eine Adresse.
    // Bis zum Umzug kam sie aus der eingecheckten .env; lokal liegt eine
    // .env.local, im Build gar nichts. Feste Platzhalter, damit die Tests
    // überall gleich laufen – und nie mit einer echten Datenbank sprechen.
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:54321",
      VITE_SUPABASE_PUBLISHABLE_KEY: "test",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
