// @ts-self-types="./seitentexte.d.mts"
//
// Was an einer Baukastenseite Text ist – und was nicht.
//
// Eine Seite liegt als JSON in der Datenbank: eine Liste von Bausteinen, jeder
// mit seinen Eigenschaften (src/components/sitebuilder/puckConfig.tsx). Zum
// Übersetzen braucht es daraus genau die Sätze, die ein Besucher liest, und
// nichts sonst: keine Bildschlüssel, keine Farben, keine Zieladressen, keine
// Auswahlwerte wie „links" oder „breit". Wird davon etwas übersetzt, ist die
// Seite kaputt, nicht nur falsch.
//
// Deshalb eine Liste der Feldnamen, die Text tragen, und kein Raten am Wert.
// Ein Test (src/test/seitentexte.test.ts) vergleicht sie mit den Feldern im
// Editor: Ein neues Textfeld, das hier fehlt, fällt dort auf.
//
// Schlichtes JavaScript ohne Abhängigkeiten, weil drei Stellen es brauchen:
// der Editor (Vite), scripts/seiten-uebersetzen.mjs (Node) und die Edge
// Function translate-page (Deno). Es liegt hier, weil Supabase beim Ausrollen
// einer Funktion nur dieses Verzeichnis mitnimmt.

/** Felder, deren Wert ein Besucher als Text liest. */
export const TEXTFELDER = [
  "oberzeile", "ueberschrift", "unterzeile", "untertitel", "titel", "text", "inhalt",
  "einleitung", "abschluss", "hinweis", "beschriftung", "knopf", "knopf1", "knopf2",
  "rolle", "wert", "jahre", "hervorgehoben", "bildunterschrift", "description", "source", "code",
];

/**
 * Textfelder, die bewusst nicht übersetzt werden: Namen von Personen und
 * Einrichtungen und die Bezeichnung einer Lizenz. Eine Maschine macht aus
 * „Hans Müller" sonst gelegentlich „Hans Miller".
 */
export const EIGENNAMEN = ["name", "license"];

/** Felder mit einer Zieladresse. */
export const ZIELFELDER = ["ziel", "ziel1", "ziel2", "zielFrei"];

const TEXT = new Set(TEXTFELDER);
const ZIEL = new Set(ZIELFELDER);

/** Enthält der Text Auszeichnung? Dann muss sie beim Übersetzen stehen bleiben. */
export function istHtml(text) {
  return /<[a-zA-Z/][^>]*>/.test(String(text ?? ""));
}

/**
 * Lohnt sich das Übersetzen? Nicht bei „1813–1815", „12" oder „—": Ohne
 * Buchstaben gibt es nichts zu übersetzen. Und nicht bei eigenem HTML mit
 * Programm oder Stilangaben darin – daran soll keine Maschine drehen.
 */
function uebersetzbar(feld, wert) {
  if (typeof wert !== "string" || !/\p{L}/u.test(wert.replace(/<[^>]*>/g, " "))) return false;
  if (feld === "code" && /<(script|style)\b/i.test(wert)) return false;
  return true;
}

/** Läuft durch alle Eigenschaften eines Bausteins, auch in Listen (Karten, Personen). */
function durchlaufen(wert, pfad, besuch) {
  if (Array.isArray(wert)) {
    wert.forEach((w, i) => durchlaufen(w, [...pfad, i], besuch));
    return;
  }
  if (!wert || typeof wert !== "object") return;
  for (const [feld, inhalt] of Object.entries(wert)) {
    if (inhalt && typeof inhalt === "object") durchlaufen(inhalt, [...pfad, feld], besuch);
    else besuch(feld, inhalt, [...pfad, feld], wert);
  }
}

const bloecke = (daten) => (Array.isArray(daten?.content) ? daten.content : []);

/**
 * Alle übersetzbaren Texte einer Seite, in der Reihenfolge der Seite.
 *
 * `schluessel` sagt, wo der Text steht: Nummer des Bausteins, dann der Weg
 * durch seine Eigenschaften („3.karten.0.titel"). `art` ist „html", wenn der
 * Text Auszeichnung enthält – dann muss der Übersetzer die Tags stehen lassen.
 */
export function texteSammeln(daten) {
  const texte = [];
  bloecke(daten).forEach((block, i) => {
    durchlaufen(block?.props, [i], (feld, wert, pfad) => {
      if (!TEXT.has(feld) || !uebersetzbar(feld, wert)) return;
      texte.push({ schluessel: pfad.join("."), art: istHtml(wert) ? "html" : "text", text: wert });
    });
  });
  return texte;
}

const kopie = (wert) => (wert === undefined ? wert : JSON.parse(JSON.stringify(wert)));

/**
 * Eine Kopie der Seite mit eingesetzten Übersetzungen.
 *
 * `uebersetzt` ordnet Schlüsseln aus `texteSammeln` ihren neuen Text zu. Was
 * fehlt oder leer ist, bleibt deutsch. Eingesetzt wird nur, wo heute ein
 * übersetzbarer Text steht: Ein Schlüssel, der auf einen Bildschlüssel oder
 * ins Leere zeigt (die Seite wurde seit dem Auslesen umgebaut), ändert nichts.
 *
 * Mit `original` wird zusätzlich verglichen, ob der deutsche Text noch der
 * ist, der übersetzt wurde. `ausgelassen` nennt die Schlüssel, bei denen das
 * nicht stimmt.
 */
export function texteEinsetzen(daten, uebersetzt, original) {
  const neu = kopie(daten) ?? { content: [], root: {} };
  const eingesetzt = [];
  const ausgelassen = [];
  const offen = new Set(Object.keys(uebersetzt ?? {}));
  bloecke(neu).forEach((block, i) => {
    durchlaufen(block?.props, [i], (feld, wert, pfad, halter) => {
      const schluessel = pfad.join(".");
      if (!offen.has(schluessel)) return;
      offen.delete(schluessel);
      const text = uebersetzt[schluessel];
      const passt = TEXT.has(feld) && uebersetzbar(feld, wert)
        && (original?.[schluessel] === undefined || original[schluessel] === wert);
      if (!passt || typeof text !== "string" || text.trim() === "") {
        ausgelassen.push(schluessel);
        return;
      }
      halter[feld] = text;
      eingesetzt.push(schluessel);
    });
  });
  return { daten: neu, eingesetzt, ausgelassen: [...ausgelassen, ...offen] };
}

/**
 * Eine Kopie der Seite, in der jede Zieladresse durch `umrechnen` gegangen
 * ist: die Zielfelder der Bausteine und die Verweise im Fliesstext.
 *
 * Damit bleiben die Verweise einer übersetzten Seite in ihrer Sprache
 * (/verein → /en/verein), ohne dass jeder Baustein davon wissen muss. Was
 * `umrechnen` nicht ändert – fremde Adressen, Anker –, bleibt, wie es ist.
 */
export function zieleUmrechnen(daten, umrechnen) {
  const neu = kopie(daten);
  bloecke(neu).forEach((block, i) => {
    durchlaufen(block?.props, [i], (feld, wert, _pfad, halter) => {
      if (typeof wert !== "string" || wert === "") return;
      if (ZIEL.has(feld)) {
        halter[feld] = umrechnen(wert);
      } else if (TEXT.has(feld) && istHtml(wert)) {
        halter[feld] = wert.replace(
          /(<a\b[^>]*?\shref\s*=\s*)(?:"([^"]*)"|'([^']*)')/gi,
          (_ganz, vor, doppelt, einfach) => `${vor}"${String(umrechnen(doppelt ?? einfach)).replace(/"/g, "&quot;")}"`,
        );
      }
    });
  });
  return neu;
}

// ── Eine ganze Seite ────────────────────────────────────────────────────────

/** Die Felder der Seite ausserhalb der Bausteine, die übersetzt werden. */
export const SEITENFELDER = ["title", "seo_title", "seo_description"];

/**
 * Alles Übersetzbare einer Seite als flache Liste: erst Titel und
 * Suchmaschinenangaben (Schlüssel „@title" …), dann die Bausteine.
 */
export function seiteZerlegen(seite) {
  const kopf = SEITENFELDER
    .filter((f) => typeof seite?.[f] === "string" && seite[f].trim() !== "")
    .map((f) => ({ schluessel: `@${f}`, art: "text", text: seite[f] }));
  return [...kopf, ...texteSammeln(seite?.content)];
}

/**
 * Aus einer deutschen Seite und übersetzten Texten die Zeile für
 * site_page_translations. Ohne übersetzten Titel bleibt der deutsche –
 * die Spalte darf nicht leer sein.
 */
export function seiteZusammensetzen(seite, uebersetzt, original) {
  const { daten, eingesetzt, ausgelassen } = texteEinsetzen(
    seite?.content,
    Object.fromEntries(Object.entries(uebersetzt ?? {}).filter(([k]) => !k.startsWith("@"))),
    original,
  );
  const feld = (f) => {
    const text = uebersetzt?.[`@${f}`];
    return typeof text === "string" && text.trim() !== "" ? text.trim() : null;
  };
  return {
    zeile: {
      title: feld("title") ?? seite?.title ?? "",
      seo_title: feld("seo_title"),
      seo_description: feld("seo_description"),
      content: daten,
    },
    eingesetzt,
    ausgelassen,
  };
}
