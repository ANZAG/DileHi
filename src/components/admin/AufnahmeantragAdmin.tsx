import { useState } from "react";
import AntragsfelderAdmin from "./AntragsfelderAdmin";
import { Antragstexte } from "./VorlagenAdmin";

/**
 * Alles, was den Aufnahmeantrag ausmacht – Felder und Texte in einer Maske.
 *
 * Vorher lagen die Felder unter „Mitglieder und Anfragen" und die Sätze
 * darunter unter „System → Textvorlagen". Wer den Antrag ändert, ändert aber
 * beides: erst die Frage, dann den Satz, der darunter steht. Zwei Reiter in
 * zwei Gruppen hiessen zweimal suchen.
 *
 * Und die Einordnung unter „System" statt unter „Mitglieder": Den Antrag
 * zusammenzustellen ist eine Einrichtungsaufgabe, keine des Tagesgeschäfts.
 * Anträge prüfen und Mitglieder pflegen bleibt drüben.
 */
export default function AufnahmeantragAdmin() {
  const [bereich, setBereich] = useState<"felder" | "texte">("felder");

  return (
    <div>
      <div className="mb-4">
        <h2 className="font-serif text-lg font-semibold">Aufnahmeantrag</h2>
        <p className="text-sm text-muted-foreground">
          Was der Antrag abfragt und was darin steht – im Webformular wie auf
          dem PDF, das daraus entsteht.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-1 border-b">
        {([
          ["felder", "Felder"],
          ["texte", "Texte"],
        ] as const).map(([id, titel]) => (
          <button
            key={id}
            type="button"
            onClick={() => setBereich(id)}
            aria-current={bereich === id ? "true" : undefined}
            className={`px-3 py-2 text-sm font-medium -mb-px border-b-2 transition-colors ${
              bereich === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {titel}
          </button>
        ))}
      </div>

      {bereich === "felder" ? <AntragsfelderAdmin /> : <Antragstexte />}
    </div>
  );
}
