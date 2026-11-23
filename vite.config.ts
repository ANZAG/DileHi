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
      // _redirects gehört dazu, seit die Anleitung auch Netlify und
      // Cloudflare Pages nennt: Dort steht die Weiterleitung nicht in einer
      // .htaccess, und ohne sie gibt jede Unteradresse einen 404.
      for (const file of [".htaccess", "robots.txt", "_redirects"]) {
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
 * Lädt die beiden Vorgabeschriften schon mit dem HTML vor.
 *
 * Sonst findet der Browser sie erst spät: HTML, dann das Hauptprogramm, das
 * sie anfordert (src/main.tsx → lib/schriften.ts), dann ihr CSS, dann die
 * Datei. PageSpeed zeigte das als längste Kette der Startseite, gut 1,1 s
 * auf dem Handy – und bis dahin steht der Text in der Ersatzschrift da und
 * springt beim Wechsel.
 *
 * Nur die zwei Schnitte, die auf jeder Seite stehen: Fliesstext und
 * Überschrift. Jede weitere Datei nähme dem Kopfbild Leitung weg. Die Namen
 * tragen einen Prüfwert, deshalb werden sie erst nach dem Bauen gesucht.
 */
const VORLADE_SCHRIFTEN = [/^inter-latin-400-normal-.*\.woff2$/, /^dm-serif-display-latin-400-normal-.*\.woff2$/];

function schriftenVorladen(): Plugin {
  return {
    name: "schriften-vorladen",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        const dateien = Object.keys(ctx.bundle ?? {});
        return VORLADE_SCHRIFTEN.flatMap((muster) => {
          const datei = dateien.find((d) => muster.test(path.basename(d)));
          return datei
            ? [{
              tag: "link",
              attrs: { rel: "preload", as: "font", type: "font/woff2", href: `/${datei}`, crossorigin: "" },
              injectTo: "head" as const,
            }]
            : [];
        });
      },
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
    plugins: [react(), installationAddresses(env.VITE_SUPABASE_URL), schriftenVorladen()],
    // Der Worker des Scanners (src/lib/scan/verarbeitung.worker.ts) lädt das
    // Glätten erst bei Bedarf nach. Das geht nur mit Modulen; gestartet wird
    // er ohnehin als Modul ({ type: "module" }).
    worker: {
      format: "es",
    },
    build: {
      // Die Liste, welcher Programmteil welche anderen braucht
      // (.vite/manifest.json). scripts/vorabzug.mjs liest daraus die
      // modulepreload-Zeilen der fertigen Seiten und löscht die Datei danach
      // wieder aus dist/ – ausgeliefert wird sie nicht.
      manifest: true,
      rollupOptions: {
        output: {
          // Die grossen Bibliotheken in eigene Dateien. Sie ändern sich nur
          // mit einer neuen Fassung der Bibliothek; steckten sie mit dem
          // eigenen Code in einer Datei (656 kB, 197 kB gepackt), bekam diese
          // bei jedem Ausrollen einen neuen Namen, und wer die Seite schon
          // kannte, lud alles neu. So bleibt der grosse Teil im Browser.
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            supabase: ["@supabase/supabase-js"],
            abfragen: ["@tanstack/react-query"],
          },
        },
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
