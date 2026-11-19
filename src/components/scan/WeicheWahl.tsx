import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BookPlus, Inbox, Link2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useKategorien } from "@/hooks/useKategorien";
import type { Weiche } from "@/lib/scan/speicher";

/**
 * Wohin gehört der Scan? Drei Wege, und alle enden in der Quellensammlung:
 *
 *   an eine Quelle hängen   die Quelle steht schon da, nur ohne Datei
 *   neue Quelle             Titel, Epoche, Ordner – wie beim Hochladen
 *   Posteingang             noch unklar; der Eingangskorb ordnet später zu
 */

interface Props {
  vorgabe: Weiche | null;
  epochVorgabe: string;
  ordnerVorgabe: string | null;
  onWahl: (w: Weiche) => void;
}

type Art = Weiche["art"];

interface Ordner { id: string; name: string; parent_id: string | null }

/** Ordner mit ihrem Weg, „Briefe / 1813", alphabetisch. */
function ordnerMitWeg(liste: Ordner[]): { id: string; weg: string }[] {
  const nachId = new Map(liste.map((o) => [o.id, o]));
  const weg = (o: Ordner): string => {
    const teile = [o.name];
    let p = o.parent_id ? nachId.get(o.parent_id) : undefined;
    for (let i = 0; p && i < 10; i++) {
      teile.unshift(p.name);
      p = p.parent_id ? nachId.get(p.parent_id) : undefined;
    }
    return teile.join(" / ");
  };
  return liste.map((o) => ({ id: o.id, weg: weg(o) })).sort((a, b) => a.weg.localeCompare(b.weg, "de"));
}

export function WeicheWahl({ vorgabe, epochVorgabe, ordnerVorgabe, onWahl }: Props) {
  const kategorien = useKategorien();
  const [art, setArt] = useState<Art>(vorgabe?.art ?? "neu");
  const [titel, setTitel] = useState(vorgabe?.titel ?? "");
  const [epoch, setEpoch] = useState(vorgabe && vorgabe.art !== "eingang" ? vorgabe.epoch : epochVorgabe);
  const [ordner, setOrdner] = useState<string | null>(vorgabe?.art === "neu" ? vorgabe.folderId : ordnerVorgabe);
  const [suche, setSuche] = useState("");
  const [gewaehlt, setGewaehlt] = useState<{ id: string; title: string; epoch: string } | null>(
    vorgabe?.art === "quelle" ? { id: vorgabe.sourceId, title: vorgabe.titel, epoch: vorgabe.epoch } : null
  );
  const aktiveEpoche = epoch || kategorien[0]?.value || "";

  const { data: ordnerListe = [] } = useQuery({
    queryKey: ["source_folders", aktiveEpoche],
    enabled: art === "neu" && !!aktiveEpoche,
    queryFn: async () => {
      const { data, error } = await supabase.from("source_folders").select("id, name, parent_id").eq("epoch", aktiveEpoche);
      if (error) throw error;
      return ordnerMitWeg(data ?? []);
    },
  });

  // Nur Quellen ohne Datei: Ein Buch, das schon eine Datei hat, würde sonst
  // überschrieben.
  const { data: ohneDatei = [], isFetching } = useQuery({
    queryKey: ["sources-ohne-datei", suche],
    enabled: art === "quelle",
    queryFn: async () => {
      let q = supabase.from("sources").select("id, title, epoch")
        .is("drive_item_id", null).is("file_path", null).order("title").limit(30);
      if (suche.trim()) q = q.ilike("title", `%${suche.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const bereit =
    art === "quelle" ? !!gewaehlt : art === "neu" ? !!titel.trim() && !!aktiveEpoche : !!titel.trim();

  const weiter = () => {
    if (!bereit) return;
    if (art === "quelle" && gewaehlt) onWahl({ art, sourceId: gewaehlt.id, titel: gewaehlt.title, epoch: gewaehlt.epoch });
    else if (art === "neu") onWahl({ art, titel: titel.trim(), epoch: aktiveEpoche, folderId: ordner });
    else onWahl({ art: "eingang", titel: titel.trim() });
  };

  const karte = (wert: Art, Symbol: typeof BookPlus, kopf: string, text: string) => (
    <button
      type="button"
      onClick={() => setArt(wert)}
      aria-pressed={art === wert}
      className={`text-left p-4 rounded-lg border transition-colors ${art === wert ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
    >
      <Symbol size={20} className="text-primary mb-2" />
      <p className="font-medium text-sm">{kopf}</p>
      <p className="text-xs text-muted-foreground mt-1">{text}</p>
    </button>
  );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-serif text-xl font-semibold">Wohin gehört das Buch?</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Der Scan landet als PDF mit erkanntem Text in der Quellensammlung und ist danach dort durchsuchbar.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {karte("neu", BookPlus, "Neue Quelle", "Titel und Epoche angeben – die Quelle wird beim Hochladen angelegt.")}
        {karte("quelle", Link2, "Vorhandene Quelle", "Die Quelle ist schon eingetragen, hat aber noch keine Datei.")}
        {karte("eingang", Inbox, "Weiß ich noch nicht", "In den Posteingang. Im Eingangskorb später einer Quelle zuordnen.")}
      </div>

      {art !== "quelle" && (
        <label className="block space-y-1">
          <span className="text-sm font-medium">Titel</span>
          <input
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            placeholder="z. B. Wacker: Das herzoglich-nassauische Militär"
            className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
        </label>
      )}

      {art === "neu" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <span className="text-sm font-medium">Epoche</span>
            <div className="flex flex-wrap gap-1">
              {kategorien.map((k) => (
                <button
                  key={k.value}
                  type="button"
                  onClick={() => { setEpoch(k.value); setOrdner(null); }}
                  className={`px-3 py-2 text-xs rounded-md border ${aktiveEpoche === k.value ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                >
                  {k.label}
                </button>
              ))}
            </div>
          </div>
          {ordnerListe.length > 0 && (
            <label className="block space-y-1">
              <span className="text-sm font-medium">Ordner (optional)</span>
              <select
                value={ordner ?? ""}
                onChange={(e) => setOrdner(e.target.value || null)}
                className="w-full h-10 rounded-md border border-input bg-background px-2 text-sm"
              >
                <option value="">– oberste Ebene –</option>
                {ordnerListe.map((o) => <option key={o.id} value={o.id}>{o.weg}</option>)}
              </select>
            </label>
          )}
        </div>
      )}

      {art === "quelle" && (
        <div className="space-y-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={suche}
              onChange={(e) => setSuche(e.target.value)}
              placeholder="Quelle suchen …"
              className="w-full h-10 rounded-md border border-input bg-background pl-9 pr-3 text-sm"
            />
          </div>
          <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
            {ohneDatei.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setGewaehlt(s)}
                className={`w-full text-left px-3 py-2 text-sm ${gewaehlt?.id === s.id ? "bg-primary/10 font-medium" : "hover:bg-muted"}`}
              >
                {s.title}
                <span className="ml-2 text-xs text-muted-foreground">{kategorien.find((k) => k.value === s.epoch)?.label ?? s.epoch}</span>
              </button>
            ))}
            {!isFetching && ohneDatei.length === 0 && (
              <p className="px-3 py-4 text-sm text-muted-foreground">Keine Quelle ohne Datei gefunden.</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Hier stehen nur Quellen, die noch keine Datei haben. Anhängen darf, wer die Quelle angelegt hat oder die Dateiablage verwaltet.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={weiter}
        disabled={!bereit}
        className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
      >
        Weiter zum Scannen
      </button>
    </div>
  );
}
