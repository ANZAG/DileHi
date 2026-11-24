// @ts-self-types="./rahmentexte.d.mts"
//
// Die kurzen öffentlichen Texte ausserhalb der Seiten – und was davon eine
// Maschine übersetzen darf.
//
// Menüpunkte, Vereinsangaben, Quellen, Besucherhinweise, Bildbeschreibungen:
// Alles, was in site_text_translations übersetzt wird. Drei Stellen müssen
// sich darüber einig sein – die Tabelle in der Seitenverwaltung, die Funktion
// translate-page und scripts/seiten-uebersetzen.mjs –, deshalb steht es hier
// einmal. Schlichtes JavaScript ohne Abhängigkeiten, wie seitentexte.mjs.

/** Die öffentlichen Texte aus den Vereinsangaben (Check in der Migration). */
export const RAHMENFELDER = ["org_tagline", "seo_description", "footer_navigation_label", "footer_legal_label"];

/**
 * Die Arten, in der Reihenfolge der Verwaltung. `recht` ist das Recht, mit
 * dem jemand die deutsche Fassung pflegt – wer das hat, darf auch übersetzen
 * (wie site_text_translation_editable in der Datenbank).
 */
export const RAHMENARTEN = [
  { art: "menu", titel: "Menüpunkte", recht: null },
  { art: "settings", titel: "Untertitel und Fuss", recht: null },
  { art: "image", titel: "Bilder der Seiten – Beschreibung (Alternativtext)", recht: "site_images.manage" },
  { art: "gallery", titel: "Galeriebilder – Beschreibung", recht: "gallery.manage" },
  { art: "visitor", titel: "Für Besucher – Aufzählung", recht: "visitor_highlights.manage" },
  { art: "source", titel: "Quellen", recht: "epoch_sources.manage" },
];

/**
 * Sieht der Eintrag nach einer Literatur- oder Fundstellenangabe aus?
 *
 * „Kühnel, Harry: Alltag im Spätmittelalter, Graz 1984" übersetzt man nicht:
 * Wer das Buch sucht, braucht den Titel, unter dem es erschienen ist. Dasselbe
 * gilt für Signaturen („Cod. Pal. germ. 848"). Ein beschreibender Eintrag wie
 * „Funde aus dem Rhein-Main-Gebiet (u. a. Landesmuseum Wiesbaden)" dagegen
 * sagt einem französischen Leser auf Deutsch nichts.
 *
 * Beides steht im selben Feld, also entscheidet die Form. Im Zweifel gilt ein
 * Eintrag als Literaturangabe: Die Maschine lässt ihn dann stehen, und von
 * Hand übersetzen lässt er sich immer.
 */
export function istLiteraturangabe(text) {
  const t = String(text ?? "").trim();
  if (t === "") return false;
  // Verfasser vor dem Doppelpunkt: „Nachname, Vorname:" – auch mehrere, auch „(Hg.)".
  if (/^[^:]{2,80},\s*[^:,]{1,40}(\s*\((Hg|Hrsg|Ed|Éd)\.?\))?\s*:\s/u.test(t)) return true;
  // Kursiv gesetzter Werktitel (Sternchen, siehe src/lib/betonung.ts).
  if (/\*[^*]{3,}\*/.test(t)) return true;
  // Signaturen, Bände, Seiten, Kennungen.
  if (/\b(Cod|Ms|Hs|Inv|Bd|Vol|Nr|Jg|Aufl)\.\s|\bISBN\b|\bDOI\b|\bS\.\s*\d|\bpp?\.\s*\d|https?:\/\//u.test(t)) return true;
  // Erscheinungsort und -jahr am Ende: „…, Graz 1984" oder „… (Stuttgart 2003)".
  if (/[,(]\s*[\p{Lu}][\p{L}.\-/ ]{1,40}\s(1[4-9]|20)\d{2}\)?\.?$/u.test(t)) return true;
  return false;
}

const hatBuchstaben = (t) => typeof t === "string" && /\p{L}/u.test(t);

/**
 * Alle übersetzbaren Rahmentexte aus dem deutschen Stand, als flache Liste.
 *
 * `schluessel` ist „<art>:<ref>", wie in site_text_translations. `maschinell`
 * sagt, ob DeepL den Text übersetzen soll – bei Literaturangaben nicht.
 * `ort` hilft in der Verwaltung beim Wiederfinden (Bildplatz, Kategorie).
 */
export function rahmentexteSammeln({ menue, marke, bilder, galerie, besucher, quellen }) {
  const zeilen = [
    ...(menue ?? []).map((m) => ({ art: "menu", ref: m.id, text: m.label, ort: "Menüpunkt" })),
    ...RAHMENFELDER.map((f) => ({ art: "settings", ref: f, text: marke?.[f], ort: SETTINGS_ORT[f] })),
    ...(bilder ?? []).map((b) => ({ art: "image", ref: b.slot, text: b.alt_text, ort: b.label || b.slot })),
    ...(galerie ?? []).map((g) => ({ art: "gallery", ref: g.id, text: g.alt_text, ort: g.epoch ? `Galerie ${g.epoch}` : "Galerie" })),
    ...(besucher ?? []).map((b) => ({ art: "visitor", ref: b.id, text: b.text, ort: b.epoch ?? "" })),
    ...(quellen ?? []).map((q) => ({ art: "source", ref: q.id, text: q.text, ort: q.epoch ?? "" })),
  ];
  return zeilen
    .filter((z) => z.ref != null && hatBuchstaben(z.text))
    .map((z) => ({
      schluessel: `${z.art}:${z.ref}`,
      art: z.art,
      ref: String(z.ref),
      text: z.text,
      ort: z.ort ?? "",
      maschinell: !(z.art === "source" && istLiteraturangabe(z.text)),
    }));
}

const SETTINGS_ORT = {
  org_tagline: "Untertitel",
  seo_description: "Beschreibung für Suchmaschinen",
  footer_navigation_label: "Fuss: Titel der Spalte Navigation",
  footer_legal_label: "Fuss: Titel der Spalte Rechtliches",
};

/** „menu:abc" → { art: "menu", ref: "abc" }. Der Schlüssel eines Bildplatzes darf selbst Doppelpunkte enthalten. */
export function schluesselTeilen(schluessel) {
  const s = String(schluessel ?? "");
  const trenner = s.indexOf(":");
  return trenner < 1 ? null : { art: s.slice(0, trenner), ref: s.slice(trenner + 1) };
}
