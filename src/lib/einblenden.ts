import { useEffect, useRef, useState } from "react";

/**
 * Sanftes Einblenden ohne Animationsbibliothek.
 *
 * Die öffentlichen Seiten luden dafür framer-motion – rund 120 kB, ein Sechstel
 * des Hauptpakets, nur um Überschriften und Kacheln 20 px von unten
 * einblenden zu lassen. Dasselbe leistet CSS (tailwindcss-animate ist ohnehin
 * da). Seit November 2026 gilt das auch für Anmeldung, Formulare und den
 * Mitgliederbereich; framer-motion bleibt nur der Führung für Neue
 * (OnboardingTour), die damit wirklich etwas bewegt.
 *
 * Wer „weniger Bewegung" eingestellt hat, sieht alles sofort.
 */
export const EINBLENDEN =
  "animate-in fade-in slide-in-from-bottom-5 [animation-duration:600ms] fill-mode-both motion-reduce:animate-none";

/**
 * Dasselbe für den Rahmen einer ganzen Seite im Mitgliederbereich.
 *
 * Ohne „fill-mode-both": Damit bliebe die Animation nach ihrem Ende in Kraft,
 * und der Browser behandelte den Rahmen weiter wie ein verschobenes Element –
 * eigene Ebene, und fest stehende Kinder (`position: fixed`) richteten sich
 * nach ihm statt nach dem Fenster. framer-motion räumte am Ende auf; ohne
 * Füllmodus tut CSS das auch. Eine Verzögerung gibt es hier nicht, also fehlt
 * dem Anfang nichts.
 */
export const EINBLENDEN_SEITE =
  "animate-in fade-in slide-in-from-bottom-5 [animation-duration:500ms] motion-reduce:animate-none";

/** Kleine Karte nach dem Absenden: wächst leicht heran statt hochzurutschen. */
export const EINBLENDEN_KARTE =
  "animate-in fade-in zoom-in-95 [animation-duration:300ms] motion-reduce:animate-none";

/**
 * Einblenden, sobald ein Element ins Bild kommt – einmal.
 *
 * Bis dahin unsichtbar. Kennt der Browser keinen IntersectionObserver, steht
 * alles sofort da: Lieber ohne Bewegung als ein Inhalt, der nie erscheint.
 */
export function useEinblenden<T extends HTMLElement>(): [React.RefObject<T>, string] {
  const ref = useRef<T>(null);
  const beobachtbar = typeof window !== "undefined" && "IntersectionObserver" in window;
  const [sichtbar, setSichtbar] = useState(!beobachtbar);

  useEffect(() => {
    if (sichtbar || !ref.current) return;
    const beobachter = new IntersectionObserver((eintraege) => {
      if (eintraege.some((e) => e.isIntersecting)) {
        setSichtbar(true);
        beobachter.disconnect();
      }
    }, { rootMargin: "0px 0px -10% 0px" });
    beobachter.observe(ref.current);
    return () => beobachter.disconnect();
  }, [sichtbar]);

  return [ref, sichtbar ? EINBLENDEN : "opacity-0 motion-reduce:opacity-100"];
}
