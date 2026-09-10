// Wird von vitest.config.ts als setupFiles geladen.
// Die Datei fehlte bisher, wodurch `npm test` (und damit `npm run ci`)
// mit Exit-Code 1 abbrach.
import "@testing-library/jest-dom/vitest";

// jsdom kennt weder ResizeObserver noch matchMedia. Beides braucht der
// Seiteneditor beim blossen Laden (@dnd-kit), noch bevor ein Test etwas
// darstellt. Platzhalter genuegen: Beobachtet wird in den Tests nichts.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof ResizeObserver;

globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof matchMedia;
