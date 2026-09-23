import { useEffect, useRef, useState } from "react";

/**
 * Sanftes Einblenden ohne Animationsbibliothek.
 *
 * Die öffentlichen Seiten luden dafür framer-motion – rund 120 kB, ein Sechstel
 * des Hauptpakets, nur um Überschriften und Kacheln 20 px von unten
 * einblenden zu lassen. Dasselbe leistet CSS (tailwindcss-animate ist ohnehin
 * da); der Mitgliederbereich behält framer-motion, wo er mehr braucht.
 *
 * Wer „weniger Bewegung" eingestellt hat, sieht alles sofort.
 */
export const EINBLENDEN =
  "animate-in fade-in slide-in-from-bottom-5 duration-[600ms] fill-mode-both motion-reduce:animate-none";

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
