import DOMPurify from "dompurify";
import { Link } from "react-router-dom";
import { BookOpen, Info, Lightbulb, Users, Star, ShieldCheck } from "lucide-react";
import { abstandKlasse, breitenKlasse, type Abstand, type Breite } from "./gestaltung";

const SYMBOLE = {
  keins: null,
  buch: BookOpen,
  info: Info,
  gluehbirne: Lightbulb,
  leute: Users,
  stern: Star,
  schild: ShieldCheck,
};

export type KastenSymbol = keyof typeof SYMBOLE;

/**
 * Ein hervorgehobener Kasten: Symbol, Überschrift, Text, optional ein Knopf.
 *
 * Kommt auf fast jeder Seite vor – „Was ist eigentlich Living History?",
 * „Interesse, mitzumachen?", „Ein Wort zur Vollständigkeit", „Unser
 * Schwerpunkt". Bisher stand jeder dieser Kästen einzeln im Code.
 *
 * Der Knopf gehört hier hinein und nicht als eigener Baustein daneben: Er
 * steht im Original innerhalb des Kastens, und ein Knopf, der darunter
 * herausrutscht, sieht aus wie ein Fehler.
 */
export function Hinweiskasten({
  symbol, stil, ueberschrift, inhalt, knopf, ziel,
  betont, breite, abstandOben, abstandUnten, abstand,
}: {
  symbol: KastenSymbol;
  stil?: "hinweis" | "notiz";
  ueberschrift?: string;
  inhalt: unknown;
  knopf?: string;
  ziel?: string;
  betont?: boolean;
  breite?: Breite;
  abstandOben?: Abstand;
  abstandUnten?: Abstand;
  abstand?: Abstand;
}) {
  const Symbol = SYMBOLE[symbol] ?? null;

  // Zwei Ausprägungen, beide gibt es im Original:
  //   „hinweis" – der grosse Kasten mit Symbol („Was ist Living History?")
  //   „notiz"   – die schmale Randbemerkung ohne Symbol, Überschrift in der
  //               Vereinsfarbe („Ein Wort zur Vollständigkeit")
  // Ohne diese Unterscheidung sah der zweite Fall aus wie der erste: zu grosse
  // Überschrift, falsche Farbe, Symbol, das dort nie stand.
  const notiz = stil === "notiz";

  const textKlassen = notiz
    ? "space-y-3 text-sm text-foreground/80 leading-relaxed [&_strong]:text-foreground"
    : "space-y-3 text-muted-foreground leading-relaxed [&_strong]:text-foreground " +
      "[&_ul]:list-disc [&_ul]:list-inside [&_ul]:pl-2 [&_ul]:space-y-1";

  const text = typeof inhalt === "string"
    ? <div className={textKlassen} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(inhalt) }} />
    : <div className={textKlassen}>{(inhalt as React.ReactNode) ?? null}</div>;

  return (
    <section className={`${breitenKlasse(breite)} ${abstandKlasse(abstandOben, abstandUnten, abstand ?? "klein")}`}>
      <div
        className={`rounded-xl border ${notiz ? "p-8" : "p-6 md:p-8"} ${
          betont ? "bg-primary/10 border-primary/25" : "bg-primary/5 border-primary/20"
        }`}
      >
        <div className="flex items-start gap-4">
          {Symbol && !notiz && (
            // Auf dem Handy weggelassen: Das Symbol nimmt dort Platz, den der
            // Text besser gebrauchen kann.
            <div className="bg-primary/10 p-3 rounded-full hidden sm:block mt-1 shrink-0">
              <Symbol className="w-6 h-6 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            {ueberschrift && (
              <h2
                className={`font-serif font-semibold mb-3 ${
                  notiz ? "text-lg text-primary" : "text-xl text-foreground"
                }`}
              >
                {ueberschrift}
              </h2>
            )}
            {text}
            {knopf && (
              <p className="mt-4">
                {ziel?.startsWith("http") ? (
                  <a
                    href={ziel} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
                  >
                    {knopf}
                  </a>
                ) : (
                  <Link
                    to={ziel || "/"}
                    className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
                  >
                    {knopf}
                  </Link>
                )}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export const KASTEN_STILE: { label: string; value: "hinweis" | "notiz" }[] = [
  { label: "Hinweis (groß, mit Symbol)", value: "hinweis" },
  { label: "Randbemerkung (schmal, ohne Symbol)", value: "notiz" },
];

export const KASTEN_SYMBOLE: { label: string; value: KastenSymbol }[] = [
  { label: "Ohne Symbol", value: "keins" },
  { label: "Buch", value: "buch" },
  { label: "Info", value: "info" },
  { label: "Glühbirne", value: "gluehbirne" },
  { label: "Personen", value: "leute" },
  { label: "Stern", value: "stern" },
  { label: "Schild", value: "schild" },
];
