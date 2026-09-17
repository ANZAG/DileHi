/// <reference types="vite/client" />

/**
 * Die Migrationen dieses Programmstands, vom Build eingesetzt
 * (siehe vite.config.ts). In Tests nicht gesetzt – deshalb überall mit
 * `typeof __MIGRATIONEN__ === "undefined"` absichern.
 */
declare const __MIGRATIONEN__: string[] | undefined;
