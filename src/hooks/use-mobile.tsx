import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // Gleich beim ersten Zeichnen richtig. Vorher stand hier `undefined`, also
  // „kein Handy": Der Zeitstrahl der Startseite zeigte auf dem Handy kurz
  // die grosse Kachel für den Rechner und lud ihr Bild – und gleich danach
  // die Liste fürs Handy mit demselben Bild in kleinerer Fassung noch einmal.
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(() =>
    typeof window === "undefined" ? undefined : window.innerWidth < MOBILE_BREAKPOINT,
  );

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
