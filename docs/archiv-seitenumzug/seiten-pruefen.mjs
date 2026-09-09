/**
 * Vergleicht eine übertragene Seite mit ihrer Quelle.
 *
 * Die Übertragung ist Mustererkennung auf JSX – da geht leicht etwas verloren,
 * ohne dass es auffällt. Dieses Skript nimmt beide Seiten, wirft alles Markup
 * weg und meldet jeden Satz, der in der einen steht und in der anderen nicht.
 *
 *   node scripts/seiten-pruefen.mjs
 */
import { readFileSync } from "node:fs";

/** Reiner Text aus einer JSX-Datei – Attribute und Ausdrücke fliegen raus. */
function textAusQuelle(datei) {
  let s = readFileSync(datei, "utf-8");
  // Alles vor dem return gehört zur Logik, nicht zum Inhalt.
  const start = s.indexOf("return (");
  if (start > 0) s = s.slice(start);
  return s
    // SEO-Bestandteile stehen nicht auf der Seite.
    .replace(/<SEO[\s\S]*?\/>/g, "")
    .replace(/\{[^{}]*\}/g, "\n")  // JSX-Ausdruecke
    // Absichtlich ein Zeilenumbruch statt eines Leerzeichens: Sonst laufen
    // benachbarte Elemente zu einem Satz zusammen, der nirgends steht, und der
    // Vergleich meldet lauter Fehlalarme.
    .replace(/<[^>]*>/g, "\n")
    .replace(/[ \t]+/g, " ");
}

/** Reiner Text aus einer erzeugten Migration. */
function textAusMigration(datei) {
  const sql = readFileSync(datei, "utf-8");
  const treffer = sql.match(/'(\{.*?\})'::jsonb/s);
  if (!treffer) throw new Error(`Kein JSON in ${datei}`);
  const daten = JSON.parse(treffer[1]);

  const sammeln = (wert) => {
    if (typeof wert === "string") return wert;
    if (Array.isArray(wert)) return wert.map(sammeln).join(" ");
    if (wert && typeof wert === "object") {
      return Object.entries(wert)
        .filter(([k]) => k !== "id" && k !== "type")
        .map(([, v]) => sammeln(v))
        .join(" ");
    }
    return "";
  };

  return sammeln(daten).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
}

/** In Sätze zerlegen, damit die Meldung brauchbar ist. */
function saetze(text) {
  return text
    .split(/\n+|(?<=[.!?:])\s+/)
    .map((s) => s.trim())
    // Kurze Fragmente sind Beschriftungen, kein Inhalt. Uebrig gebliebene
    // Attribute und Ausdruecke sind Markup, kein Text - sonst meldet der
    // Pruefer lauter Fehlalarme aus der Lightbox.
    .filter((s) => s.length > 40 && !s.includes("className=") && !s.includes("{"));
}

/**
 * Überschriften getrennt vergleichen.
 *
 * Der Reihenvergleich hat einen Fehler durchgelassen, bei dem SAEMTLICHE
 * Überschriften fehlten: Ihr Text taucht meist auch im Fliesstext auf, deshalb
 * fiel es kaum auf. Überschriften sind aber die Gliederung der Seite – fehlen
 * sie, ist die Seite kaputt, auch wenn kein Wort verloren ging.
 */
function ueberschriften(text, quelle = false) {
  if (quelle) {
    const s = readFileSync(text, "utf-8");
    // In Dokumentreihenfolge, nicht erst alle h2 und dann alle h3 – sonst
    // sieht jede richtig sortierte Seite falsch aus.
    return [...s.matchAll(/<h2[^>]*>(?<zwei>[\s\S]*?)<\/h2>|<h3[^>]*>(?<drei>[\s\S]*?)<\/h3>/g)]
      .map((m) => (m.groups.zwei ?? m.groups.drei ?? "")
        .replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim())
      .filter((t) => t && !t.includes("{"));
  }
  const sql = readFileSync(text, "utf-8");
  const treffer = sql.match(/'(\{.*?\})'::jsonb/s);
  const daten = JSON.parse(treffer[1]);

  // Überschriften stehen an zwei Stellen: als <h2>/<h3> im Fliesstext und als
  // Eigenschaft eines Bausteins (Galerie, Zeitstrahl, Hinweiskasten, Karten).
  // Beides zählt – sonst meldet der Prüfer alles als fehlend, was ordentlich
  // in einem Baustein steckt.
  const raus = [];
  const sammeln = (wert) => {
    if (typeof wert === "string") {
      for (const m of wert.matchAll(/<h[23]>([\s\S]*?)<\/h[23]>/g)) raus.push(m[1].trim());
      return;
    }
    if (Array.isArray(wert)) return wert.forEach(sammeln);
    if (wert && typeof wert === "object") {
      for (const [k, v] of Object.entries(wert)) {
        if ((k === "ueberschrift" || k === "titel") && typeof v === "string" && v.trim()) raus.push(v.trim());
        else sammeln(v);
      }
    }
  };
  sammeln(daten);
  return raus;
}

/**
 * Die Bilder mit ihrer Breite.
 *
 * Der Textvergleich oben haette den auffaelligsten Fehler der bisherigen
 * Umzuege nicht gefunden: Eine Uniformtafel, die im Original 512 Pixel breit
 * ist, stand in der neuen Fassung ueber die vollen 704 – kein Wort fehlte,
 * die Seite sah trotzdem anders aus. Deshalb hier ausdruecklich.
 */
function bilder(datei, quelle = false) {
  if (quelle) {
    const s = readFileSync(datei, "utf-8");
    const namen = {};
    for (const m of s.matchAll(/const\s+(\w+)\s*=\s*useSiteImage\("([^"]+)"\)/g)) namen[m[1]] = m[2];
    return [...s.matchAll(
      /<div className="(rounded-lg overflow-hidden[^"]*)">\s*<img src=\{(\w+)\.src\}/g
    )].map((m) => ({
      schluessel: namen[m[2]] ?? m[2],
      breite: m[1].includes("max-w-md") ? "schmal"
        : m[1].includes("max-w-lg") ? "mittel"
        : "voll",
    }));
  }
  const sql = readFileSync(datei, "utf-8");
  const daten = JSON.parse(sql.match(/'(\{.*?\})'::jsonb/s)[1]);
  return (daten.content ?? [])
    .filter((b) => b.type === "Einzelbild")
    .map((b) => ({ schluessel: b.props.bildSchluessel, breite: b.props.bildbreite ?? "voll" }));
}

const paare = [
  ["src/pages/EpochMedieval.tsx", "supabase/migrations/20260908080000_prototyp_spaetmittelalter.sql"],
  ["src/pages/Epoch1815.tsx", "supabase/migrations/20260908120000_seite_napoleonik.sql"],
  ["src/pages/EpochWW1.tsx", "supabase/migrations/20260908130000_seite_wk1.sql"],
  ["src/pages/Index.tsx", "supabase/migrations/20260908110000_seite_startseite.sql"],
  ["src/pages/About.tsx", "supabase/migrations/20260908190000_seite_verein.sql"],
  ["src/pages/FuerVeranstalter.tsx", "supabase/migrations/20260908200000_seite_fuer_veranstalter.sql"],
];

let fehler = 0;
for (const [quelle, migration] of paare) {
  const original = textAusQuelle(quelle);
  const neu = textAusMigration(migration);

  // Vergleich auf Wortebene, damit unterschiedliche Zeichensetzung nicht stört.
  const normal = (s) => s.replace(/[–—]/g, "-").replace(/[„“”]/g, '"').toLowerCase();
  const neuNorm = normal(neu);

  const fehlend = saetze(original).filter((s) => {
    const kern = normal(s).slice(0, 60);
    return kern.length > 30 && !neuNorm.includes(kern);
  });

  // Überschriften ausdrücklich – ihr Text steht oft auch im Fliesstext, ein
  // fehlendes <h2> faellt beim Satzvergleich deshalb nicht auf.
  const hQuelle = ueberschriften(quelle, true);
  const hNeu = ueberschriften(migration);
  const hFehlend = hQuelle.filter((h) => !hNeu.some((n) => normal(n) === normal(h)));

  // Reihenfolge: Der Prüfer hat bisher nur geprüft, OB etwas da ist. Bei der
  // Napoleonik-Seite standen die Kennzahlen vor dem Kasten statt dahinter –
  // vollständig, aber falsch. Deshalb auch die Abfolge vergleichen.
  const reihenfolgeQuelle = hQuelle.map(normal);
  const reihenfolgeNeu = hNeu.map(normal).filter((h) => reihenfolgeQuelle.includes(h));
  const reihenfolgePasst =
    reihenfolgeNeu.length !== reihenfolgeQuelle.length ||
    reihenfolgeNeu.every((h, i) => h === reihenfolgeQuelle[i]);

  // Bilder mit ihrer Breite – Reihenfolge und Zuschnitt muessen stimmen.
  const bQuelle = bilder(quelle, true);
  const bNeu = bilder(migration);
  const bAbweichung = bQuelle
    .map((b, i) => {
      const gegen = bNeu[i];
      if (!gegen) return `${b.schluessel} fehlt`;
      if (gegen.schluessel !== b.schluessel) return `${b.schluessel} statt ${gegen.schluessel}`;
      if (gegen.breite !== b.breite) return `${b.schluessel}: Breite ${gegen.breite} statt ${b.breite}`;
      return null;
    })
    .filter(Boolean);

  const inOrdnung =
    fehlend.length === 0 && hFehlend.length === 0 && reihenfolgePasst && bAbweichung.length === 0;
  const maengel = [
    fehlend.length ? `${fehlend.length} Satz/Saetze fehlen` : null,
    hFehlend.length ? `${hFehlend.length} Ueberschrift(en) fehlen` : null,
    reihenfolgePasst ? null : "Reihenfolge weicht ab",
    bAbweichung.length ? `${bAbweichung.length} Bild(er) weichen ab` : null,
  ].filter(Boolean);

  console.log(
    `${quelle.padEnd(30)} ${inOrdnung ? "vollstaendig" : maengel.join(", ")}` +
    `  (${hQuelle.length} Ueberschriften, ${bQuelle.length} Bilder geprueft)`
  );
  for (const h of hFehlend) console.log(`   – Ueberschrift: ${h}`);
  for (const b of bAbweichung) console.log(`   – Bild: ${b}`);
  for (const s of fehlend.slice(0, 4)) console.log(`   – ${s.slice(0, 110)}…`);
  if (!reihenfolgePasst) {
    console.log(`   Quelle:  ${hQuelle.join(" · ")}`);
    console.log(`   Editor:  ${hNeu.join(" · ")}`);
  }
  fehler += fehlend.length + hFehlend.length + bAbweichung.length + (reihenfolgePasst ? 0 : 1);
}

process.exit(fehler > 0 ? 1 : 0);
