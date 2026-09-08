import { useState } from "react";
import { Plus, Trash2, BarChart3, ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { PollOption } from "./ForumPoll";

export interface PollDraft {
  kind: "umfrage" | "mitbringliste";
  frage: string;
  optionen: PollOption[];
  mehrfach: boolean;
  frist: string | null;
  anonym: boolean;
}

/**
 * Anlegen einer Umfrage oder Mitbringliste.
 *
 * Die beiden Formen unterscheiden sich fachlich kaum – die eine fragt „wann",
 * die andere „wer bringt was". Sie sind trotzdem getrennt benannt, weil die
 * Leute so darüber sprechen, und die Voreinstellungen unterscheiden sich:
 * Mitbringlisten sind immer Mehrfachauswahl und nie anonym.
 */
export default function PollComposer({
  onCancel,
  onSubmit,
  pending,
}: {
  onCancel: () => void;
  onSubmit: (draft: PollDraft) => void;
  pending: boolean;
}) {
  const [kind, setKind] = useState<"umfrage" | "mitbringliste">("umfrage");
  const [frage, setFrage] = useState("");
  const [optionen, setOptionen] = useState<PollOption[]>([
    { key: "o1", label: "" },
    { key: "o2", label: "" },
  ]);
  const [mehrfach, setMehrfach] = useState(false);
  const [frist, setFrist] = useState("");
  const [anonym, setAnonym] = useState(false);

  const isList = kind === "mitbringliste";
  const valid = frage.trim() !== "" && optionen.filter((o) => o.label.trim()).length >= 1;

  const setKindAndDefaults = (next: "umfrage" | "mitbringliste") => {
    setKind(next);
    if (next === "mitbringliste") {
      // Mehrere Sachen mitbringen ist der Normalfall, und wer was bringt,
      // muss sichtbar sein – sonst bringt es keiner.
      setMehrfach(true);
      setAnonym(false);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <div className="flex gap-2">
        {([
          { k: "umfrage" as const, label: "Umfrage", icon: BarChart3, hint: "Wann passt es?" },
          { k: "mitbringliste" as const, label: "Mitbringliste", icon: ListChecks, hint: "Wer bringt was?" },
        ]).map((t) => (
          <button
            key={t.k}
            onClick={() => setKindAndDefaults(t.k)}
            className={`flex-1 text-left p-2.5 rounded-lg border transition-colors ${
              kind === t.k ? "border-primary bg-primary/5" : "hover:bg-muted/50"
            }`}
          >
            <span className={`text-sm font-medium flex items-center gap-1.5 ${kind === t.k ? "text-primary" : ""}`}>
              <t.icon size={15} /> {t.label}
            </span>
            <span className="block text-xs text-muted-foreground mt-0.5">{t.hint}</span>
          </button>
        ))}
      </div>

      <div>
        <Label htmlFor="poll-frage" className="text-sm">
          {isList ? "Worum geht es?" : "Was möchtest du wissen?"}
        </Label>
        <Input
          id="poll-frage"
          value={frage}
          autoFocus
          onChange={(e) => setFrage(e.target.value)}
          placeholder={isList ? "z.B. Was brauchen wir am Samstag?" : "z.B. Wann treffen wir uns zum Packen?"}
        />
      </div>

      <div>
        <Label className="text-sm">{isList ? "Was wird gebraucht?" : "Zur Auswahl"}</Label>
        <div className="space-y-1.5 mt-1">
          {optionen.map((o, i) => (
            <div key={o.key} className="flex gap-1.5">
              <Input
                value={o.label}
                onChange={(e) =>
                  setOptionen(optionen.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
                }
                placeholder={isList ? "z.B. Grill" : "z.B. Freitag ab 16 Uhr"}
              />
              {optionen.length > 1 && (
                <Button
                  variant="ghost" size="icon"
                  aria-label="Eintrag entfernen"
                  onClick={() => setOptionen(optionen.filter((_, j) => j !== i))}
                >
                  <Trash2 size={15} />
                </Button>
              )}
            </div>
          ))}
        </div>
        <Button
          variant="outline" size="sm" className="mt-2"
          onClick={() => setOptionen([...optionen, { key: `o${Date.now()}`, label: "" }])}
        >
          <Plus size={14} className="mr-1" /> Eintrag hinzufügen
        </Button>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="poll-frist" className="text-xs text-muted-foreground">
            Frist (optional)
          </Label>
          <Input id="poll-frist" type="date" value={frist} onChange={(e) => setFrist(e.target.value)} />
        </div>
        <div className="flex flex-col justify-end gap-2 pb-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={mehrfach} onCheckedChange={(v) => setMehrfach(v === true)} disabled={isList} />
            <span className="text-sm">Mehrfachauswahl</span>
          </label>
          {!isList && (
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={anonym} onCheckedChange={(v) => setAnonym(v === true)} />
              <span className="text-sm">Anonym – nur Zahlen zeigen</span>
            </label>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>Abbrechen</Button>
        <Button
          disabled={!valid || pending}
          onClick={() =>
            onSubmit({
              kind,
              frage: frage.trim(),
              // Leere Zeilen fliegen raus – sonst steht eine namenlose Option da.
              optionen: optionen
                .filter((o) => o.label.trim())
                .map((o, i) => ({ key: `o${i + 1}`, label: o.label.trim() })),
              mehrfach: isList ? true : mehrfach,
              frist: frist || null,
              anonym: isList ? false : anonym,
            })
          }
        >
          {pending ? "Wird angelegt …" : "Einstellen"}
        </Button>
      </div>
    </div>
  );
}
