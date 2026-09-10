import { Component, type ErrorInfo, type ReactNode } from "react";
import { zwischenspeicherLeeren } from "@/lib/recovery";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Fängt Fehler ab, die beim Rendern auftreten.
 *
 * Ohne diese Grenze führt jeder Fehler in einer Komponente dazu, dass React den
 * gesamten Baum abräumt – die Seite wird weiß, und in der Oberfläche steht
 * nichts, was weiterhilft. Genau das ist am 07.09.2026 passiert und war ohne
 * Zugang zur Browser-Konsole nicht einzugrenzen.
 */
/**
 * Erkennt einen fehlgeschlagenen Nachladeversuch an der Fehlermeldung.
 *
 * Nach aussen gegeben, damit ein Test die Formulierungen der Browser
 * festhalten kann – sie sind der einzige Anhaltspunkt, den wir haben.
 */
export function istNachladefehler(meldung: string): boolean {
  return [
    // Chrome, Edge
    /dynamically imported module/i,
    /Failed to fetch dynamically imported module/i,
    /Expected a JavaScript(?: or WebAssembly)? module script/i,
    // Firefox
    /Importing a module script failed/i,
    /disallowed MIME type/i,
    // Safari
    /is not a valid JavaScript MIME type/i,
    // Webpack-Sprachgebrauch, taucht in Bibliotheken auf
    /ChunkLoadError/i,
    /Loading chunk \S+ failed/i,
  ].some((muster) => muster.test(meldung ?? ""));
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Bleibt für die Konsole erhalten, damit sich der Fehler melden lässt.
    console.error("Unbehandelter Fehler in der Oberfläche:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    // Nach einer Aktualisierung der Website sind die alten Programmteile gelöscht.
    // Wer die Seite währenddessen offen hatte, kann sie nicht mehr nachladen –
    // ein Neuladen behebt das, deshalb wird dieser Fall eigens benannt.
    //
    // Die Liste ist laenger, als sie sein muesste, weil jeder Browser eine
    // eigene Formulierung hat. Safari sagt „'text/html' is not a valid
    // JavaScript MIME type" – die fehlte, und deshalb bekam jemand die grosse
    // Fehlerseite samt technischer Angabe, wo ein „bitte neu laden" gereicht
    // haette.
    const isStaleChunk = istNachladefehler(error.message);

    return (
      <div className="container py-16 max-w-lg px-4 text-center">
        <h1 className="font-serif text-2xl font-bold mb-3">
          {isStaleChunk ? "Die Seite wurde aktualisiert" : "Da ist etwas schiefgelaufen"}
        </h1>
        <p className="text-muted-foreground mb-6">
          {isStaleChunk
            ? "Im Hintergrund ist eine neue Version veröffentlicht worden. Ein Neuladen genügt."
            : "Dieser Bereich konnte nicht angezeigt werden. Bitte lade die Seite neu."}
        </p>

        <button
          // Nicht nur neu laden: Wer hier landet, hat den automatischen
          // Versuch schon hinter sich. Dann steckt der Fehler vermutlich im
          // Zwischenspeicher, und ein blosses Neuladen holt ihn wieder hervor.
          onClick={() => void zwischenspeicherLeeren().then(() => window.location.reload())}
          className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium"
        >
          Seite neu laden
        </button>

        {!isStaleChunk && (
          <details className="mt-8 text-left">
            <summary className="text-sm text-muted-foreground cursor-pointer">
              Technische Angaben
            </summary>
            <pre className="mt-2 p-3 rounded-md bg-muted text-xs overflow-x-auto whitespace-pre-wrap break-words">
              {error.message}
            </pre>
            <p className="text-xs text-muted-foreground mt-2">
              Diese Meldung hilft beim Beheben. Bitte mitschicken.
            </p>
          </details>
        )}
      </div>
    );
  }
}
