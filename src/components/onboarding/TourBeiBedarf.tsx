import { Suspense, lazy, useEffect, useState } from "react";

const OnboardingTour = lazy(() => import("./OnboardingTour"));

type Aufruf = { tour?: string; key?: string };

/**
 * Die Führung erst laden, wenn jemand sie aufruft.
 *
 * Sie stand fest im Layout und zog damit ihre Animationsbibliothek
 * (framer-motion, rund 120 kB) in das Paket, das jeder Besucher der
 * öffentlichen Seiten lädt – gebraucht wird sie nur im Mitgliederbereich und
 * dort nur auf Knopfdruck. Hier hört ein kleiner Platzhalter auf den Aufruf
 * („start-onboarding"), lädt die Führung und reicht ihr den Aufruf weiter;
 * alle späteren hört sie selbst.
 */
export default function TourBeiBedarf() {
  const [aufruf, setAufruf] = useState<Aufruf | null>(null);

  useEffect(() => {
    if (aufruf) return;
    const merken = (e: Event) => setAufruf((e as CustomEvent<Aufruf>).detail ?? {});
    window.addEventListener("start-onboarding", merken);
    return () => window.removeEventListener("start-onboarding", merken);
  }, [aufruf]);

  if (!aufruf) return null;
  return (
    <Suspense fallback={null}>
      <OnboardingTour ersterAufruf={aufruf} />
    </Suspense>
  );
}
