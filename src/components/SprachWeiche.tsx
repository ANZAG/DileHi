import { useEffect, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation, useNavigate } from "react-router-dom";
import {
  browserspracheAbhaken, browserspracheGeprueft, gewaehlteSprache, useAngeboteneSprachen, useSprache,
} from "@/hooks/useSprache";
import { STANDARDSPRACHE, ankunftsSprache, istAbrufer, nurDeutsch, sprachPfad, spracheVonPfad } from "@/lib/sprachen.mjs";

/**
 * Setzt die Sprache des Dokuments und führt beim Ankommen einmal in die
 * Sprache des Besuchers.
 *
 * Erst nach dem Laden, im Browser: Das fertige HTML einer Adresse
 * (scripts/vorabzug.mjs) ist für jeden dasselbe, der Server leitet nichts um.
 * Und mit `replace`, damit „Zurück" nicht in eine Schleife führt.
 */
export default function SprachWeiche() {
  const ort = useLocation();
  const navigate = useNavigate();
  const { sprache } = useSprache();
  const { sprachen, bekannt } = useAngeboteneSprachen();
  const erledigt = useRef(false);

  useEffect(() => {
    // Erst wenn feststeht, welche Sprachen es gibt – und dann nie wieder:
    // Die Weiche gilt für das Ankommen, nicht für jeden Klick danach.
    if (erledigt.current || !bekannt) return;
    erledigt.current = true;
    const gewaehlt = gewaehlteSprache();
    const geprueft = browserspracheGeprueft();
    const abrufer = istAbrufer(navigator.userAgent) || navigator.webdriver === true;
    const ziel = ankunftsSprache({
      pfad: ort.pathname,
      gewaehlt,
      geprueft,
      browser: navigator.languages ?? [navigator.language],
      angeboten: sprachen,
      abrufer,
    });
    // Abhaken nur, wenn die Browsersprache wirklich den Ausschlag gab. Wer
    // zuerst im Mitgliederbereich oder auf einer übersetzten Adresse landet,
    // wird beim nächsten Besuch einer deutschen Seite noch gefragt.
    const gefragt = !abrufer && !gewaehlt && !geprueft && sprachen.length > 0
      && spracheVonPfad(ort.pathname) === STANDARDSPRACHE && !nurDeutsch(ort.pathname);
    if (gefragt) browserspracheAbhaken();
    if (ziel !== STANDARDSPRACHE) {
      navigate(sprachPfad(`${ort.pathname}${ort.search}${ort.hash}`, ziel), { replace: true });
    }
  }, [bekannt, sprachen, ort, navigate]);

  // Die Vorgabe für jede Adresse. Eine Seite, deren Text in einer anderen
  // Sprache dasteht als ihr Rahmen, überschreibt sie (SEO, `lang`).
  return <Helmet><html lang={sprache} /></Helmet>;
}
