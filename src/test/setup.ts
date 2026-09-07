// Wird von vitest.config.ts als setupFiles geladen.
// Die Datei fehlte bisher, wodurch `npm test` (und damit `npm run ci`)
// mit Exit-Code 1 abbrach.
import "@testing-library/jest-dom/vitest";
