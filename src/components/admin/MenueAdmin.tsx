import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Plus, Trash2, Eye, EyeOff, CornerDownRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { fetchPages, type SitePage } from "@/components/sitebuilder/api";

interface Eintrag {
  id: string;
  label: string;
  page_id: string | null;
  href: string | null;
  parent_id: string | null;
  sort_order: number;
  is_visible: boolean;
  opens_new: boolean;
}

const db = supabase as unknown as { from: (t: string) => any };

/**
 * Das Menü der öffentlichen Seite.
 *
 * Stand bis vor Kurzem als Array im Code. Jetzt in der Datenbank – aber ohne
 * diese Oberfläche liess es sich nur per SQL ändern, was für die Zielgruppe
 * dasselbe ist wie „gar nicht".
 *
 * Bewusst mit Pfeilen statt Ziehen und Ablegen: Ein Menü hat sieben Einträge,
 * die man einmal im Jahr umsortiert. Dafür lohnt keine Ziehmechanik, und
 * Pfeile funktionieren auch auf dem Handy und mit der Tastatur.
 */
export default function MenueAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [neuOffen, setNeuOffen] = useState(false);
  const [neuLabel, setNeuLabel] = useState("");
  const [neuZiel, setNeuZiel] = useState("");
  const [neuUnter, setNeuUnter] = useState("");

  const { data: eintraege = [], isLoading } = useQuery({
    queryKey: ["site-menu-admin"],
    queryFn: async () => {
      const { data, error } = await db.from("site_menu").select("*").order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as Eintrag[];
    },
  });

  const { data: seiten = [] } = useQuery({ queryKey: ["site-pages"], queryFn: fetchPages });

  const frisch = () => {
    queryClient.invalidateQueries({ queryKey: ["site-menu-admin"] });
    queryClient.invalidateQueries({ queryKey: ["site-menu"] });
  };

  const aendern = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Eintrag> }) => {
      const { error } = await db.from("site_menu").update(patch).eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: frisch,
    onError: (err: Error) => toast({ title: "Ging nicht", description: err.message, variant: "destructive" }),
  });

  const anlegen = useMutation({
    mutationFn: async () => {
      // Ein Eintrag zeigt entweder auf eine Seite oder auf eine freie Adresse –
      // die Prüfbedingung in der Datenbank lässt nichts anderes zu.
      const istSeite = neuZiel.startsWith("seite:");
      const oben = eintraege.filter((e) => !e.parent_id);
      const { error } = await db.from("site_menu").insert({
        label: neuLabel.trim(),
        page_id: istSeite ? neuZiel.slice(6) : null,
        href: istSeite ? null : neuZiel.trim(),
        parent_id: neuUnter || null,
        sort_order: (oben[oben.length - 1]?.sort_order ?? 0) + 10,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNeuOffen(false);
      setNeuLabel("");
      setNeuZiel("");
      setNeuUnter("");
      frisch();
    },
    onError: (err: Error) =>
      toast({ title: "Nicht angelegt", description: err.message, variant: "destructive" }),
  });

  const entfernen = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("site_menu").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: frisch,
  });

  /** Tauscht die Reihenfolge mit dem Nachbarn – nur innerhalb derselben Ebene. */
  const verschieben = (eintrag: Eintrag, richtung: -1 | 1) => {
    const geschwister = eintraege
      .filter((e) => e.parent_id === eintrag.parent_id)
      .sort((a, b) => a.sort_order - b.sort_order);
    const i = geschwister.findIndex((e) => e.id === eintrag.id);
    const nachbar = geschwister[i + richtung];
    if (!nachbar) return;
    aendern.mutate({ id: eintrag.id, patch: { sort_order: nachbar.sort_order } });
    aendern.mutate({ id: nachbar.id, patch: { sort_order: eintrag.sort_order } });
  };

  const zielText = (e: Eintrag) => {
    if (e.href) return e.href;
    const seite = seiten.find((s: SitePage) => s.id === e.page_id);
    return seite ? `/${seite.slug}` : "— Seite gelöscht —";
  };

  const oben = eintraege.filter((e) => !e.parent_id).sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="font-serif text-lg font-semibold">Menü</h2>
          <p className="text-sm text-muted-foreground">
            Die Punkte in der Kopfzeile. Eine Ebene Untermenü ist möglich.
          </p>
        </div>
        {!neuOffen && (
          <Button size="sm" onClick={() => setNeuOffen(true)}>
            <Plus size={15} className="mr-1" /> Punkt hinzufügen
          </Button>
        )}
      </div>

      {neuOffen && (
        <div className="rounded-lg border bg-card p-4 mb-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="menue-label" className="text-sm">Beschriftung</Label>
              <Input
                id="menue-label" value={neuLabel} autoFocus
                onChange={(e) => setNeuLabel(e.target.value)}
                placeholder="z. B. Über uns"
              />
            </div>
            <div>
              <Label className="text-sm">Ziel</Label>
              <Select value={neuZiel} onValueChange={setNeuZiel}>
                <SelectTrigger><SelectValue placeholder="Seite oder Adresse wählen" /></SelectTrigger>
                <SelectContent>
                  {seiten.map((s: SitePage) => (
                    <SelectItem key={s.id} value={`seite:${s.id}`}>{s.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="mt-1"
                value={neuZiel.startsWith("seite:") ? "" : neuZiel}
                onChange={(e) => setNeuZiel(e.target.value)}
                placeholder="oder eigene Adresse, z. B. /kontakt"
              />
            </div>
          </div>
          <div>
            <Label className="text-sm">Untermenü von (optional)</Label>
            <Select value={neuUnter} onValueChange={setNeuUnter}>
              <SelectTrigger><SelectValue placeholder="Nichts – eigener Punkt" /></SelectTrigger>
              <SelectContent>
                {oben.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNeuOffen(false)}>Abbrechen</Button>
            <Button
              disabled={!neuLabel.trim() || !neuZiel.trim() || anlegen.isPending}
              onClick={() => anlegen.mutate()}
            >
              Hinzufügen
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Lade Menü …</p>
      ) : oben.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Noch kein Menüpunkt. Solange keiner da ist, zeigt die Seite das mitgelieferte Menü.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card overflow-hidden">
          {oben.flatMap((e) => [
            <MenueZeile
              key={e.id} eintrag={e} ziel={zielText(e)}
              onHoch={() => verschieben(e, -1)}
              onRunter={() => verschieben(e, 1)}
              onSichtbar={() => aendern.mutate({ id: e.id, patch: { is_visible: !e.is_visible } })}
              onEntfernen={() => {
                if (confirm(`Menüpunkt „${e.label}" entfernen?`)) entfernen.mutate(e.id);
              }}
            />,
            ...eintraege
              .filter((k) => k.parent_id === e.id)
              .sort((a, b) => a.sort_order - b.sort_order)
              .map((k) => (
                <MenueZeile
                  key={k.id} eintrag={k} ziel={zielText(k)} untergeordnet
                  onHoch={() => verschieben(k, -1)}
                  onRunter={() => verschieben(k, 1)}
                  onSichtbar={() => aendern.mutate({ id: k.id, patch: { is_visible: !k.is_visible } })}
                  onEntfernen={() => {
                    if (confirm(`Menüpunkt „${k.label}" entfernen?`)) entfernen.mutate(k.id);
                  }}
                />
              )),
          ])}
        </ul>
      )}
    </div>
  );
}

function MenueZeile({ eintrag, ziel, untergeordnet, onHoch, onRunter, onSichtbar, onEntfernen }: {
  eintrag: Eintrag;
  ziel: string;
  untergeordnet?: boolean;
  onHoch: () => void;
  onRunter: () => void;
  onSichtbar: () => void;
  onEntfernen: () => void;
}) {
  return (
    // Auf schmalen Bildschirmen rutschen die vier Knöpfe unter den Text, statt
    // ihn auf zwei Zeichen zusammenzuquetschen.
    <li className={`flex flex-wrap items-center gap-2 p-3 ${eintrag.is_visible ? "" : "opacity-50"}`}>
      {untergeordnet && <CornerDownRight size={14} className="text-muted-foreground ml-4 shrink-0" />}
      <span className="min-w-0 flex-1 basis-full sm:basis-auto">
        <span className="font-medium text-sm break-words">{eintrag.label}</span>
        <span className="block text-xs text-muted-foreground break-all">{ziel}</span>
      </span>

      <Button variant="ghost" size="icon" aria-label="Nach oben" onClick={onHoch}>
        <ChevronUp size={15} />
      </Button>
      <Button variant="ghost" size="icon" aria-label="Nach unten" onClick={onRunter}>
        <ChevronDown size={15} />
      </Button>
      <Button
        variant="ghost" size="icon"
        aria-label={eintrag.is_visible ? "Ausblenden" : "Einblenden"}
        title={eintrag.is_visible ? "Ausblenden" : "Einblenden"}
        onClick={onSichtbar}
      >
        {eintrag.is_visible ? <Eye size={15} /> : <EyeOff size={15} />}
      </Button>
      <Button variant="ghost" size="icon" aria-label="Entfernen" onClick={onEntfernen}>
        <Trash2 size={15} className="text-destructive" />
      </Button>
    </li>
  );
}
