import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { FUNCTIONS_PLACEHOLDER, fillFunctionsUrl } from "./src/lib/publicAddresses";

/**
 * Setzt in .htaccess und robots.txt die Adresse der Edge Functions ein.
 *
 * Beide Dateien liegen unverändert in public/ und werden nur kopiert. Stünde
 * die Adresse dort fest, zeigte jede Installation auf das Projekt, aus dem
 * sie kopiert wurde – bis Anfang September stand hier die Lovable-Datenbank.
 */
function installationAddresses(supabaseUrl: string | undefined): Plugin {
  let outDir = "dist";
  return {
    name: "installation-addresses",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    writeBundle() {
      if (!supabaseUrl) {
        throw new Error(
          "VITE_SUPABASE_URL fehlt. Ohne sie weiss der Build nicht, zu welcher Datenbank die Seite gehört."
        );
      }
      for (const file of [".htaccess", "robots.txt"]) {
        const target = path.resolve(outDir, file);
        if (!fs.existsSync(target)) continue;
        const filled = fillFunctionsUrl(fs.readFileSync(target, "utf-8"), supabaseUrl);
        if (filled.includes(FUNCTIONS_PLACEHOLDER)) throw new Error(`${file}: Platzhalter nicht ersetzt`);
        fs.writeFileSync(target, filled);
      }
    },
  };
}

/**
 * Die Versionen der Migrationen, die zu diesem Stand des Programms gehören.
 *
 * Der Einrichtungsassistent vergleicht sie mit dem, was in der Datenbank
 * eingespielt ist, und sagt, wenn das Ausrollen vergessen wurde. Sie kommen
 * als Liste von Namen in den Build – die Dateien selbst bleiben draussen: Ein
 * Schema gehört nicht in ein öffentliches Verzeichnis.
 */
function migrationsVersionen(): string[] {
  const ordner = path.resolve(__dirname, "supabase/migrations");
  if (!fs.existsSync(ordner)) return [];
  return fs
    .readdirSync(ordner)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => f.replace(/_.*$/, "").replace(/\.sql$/, ""))
    .filter((v) => /^\d+$/.test(v))
    .sort();
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    define: {
      __MIGRATIONEN__: JSON.stringify(migrationsVersionen()),
    },
    plugins: [react(), installationAddresses(env.VITE_SUPABASE_URL)],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
