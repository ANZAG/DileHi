import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { invokeFunction } from "@/lib/functionError";
import { alleZeilen, type Seitenabfrage } from "@/lib/alleZeilen";
import type { BaumKnoten, KartenStatus, RahmenZeile, Rechte, Stufe } from "@/lib/bibliothek";

/**
 * Daten der Wissensbibliothek. Alles kommt aus der Datenbank, nichts aus dem
 * Build – sonst läge es ohne Anmeldung auf dem Webspace.
 */

export interface Darstellung {
  id: string;
  title: string;
  epoch: string | null;
  period: string | null;
  levels: string[];
  areas: Record<string, string>;
  chapters: Kapitel[];
  roles: Rolle[];
  image: string | null;
  body: string | null;
  as_of: string | null;
}

export interface Kapitel {
  nr: number;
  titel: string;
  status?: "bereit" | "entwurf" | "recherche" | "nicht-relevant";
  text?: string;
}

export interface Rolle {
  id: string;
  titel: string;
  text?: string;
}

export interface Thema {
  id: string;
  presentation_id: string;
  title: string;
  chapter: number;
  parent_id: string | null;
  sort_order: number;
  grp: string | null;
  keywords: string[];
  roles: string[];
  cards: string[];
  plates: string[];
  tree: BaumKnoten[] | null;
  frame: RahmenZeile[] | null;
  summary: string | null;
  body: string | null;
  as_of: string | null;
  updated_at: string;
}

export interface Karte {
  id: string;
  presentation_id: string;
  area: number;
  statement: string;
  grade: Stufe;
  grade_note: string | null;
  level: string | null;
  valid_for: string | null;
  keywords: string[];
  topics: string[];
  roles: string[];
  status: KartenStatus;
  as_of: string | null;
  body: string | null;
  updated_at: string;
}

export interface Fundstelle {
  id: string;
  card_id: string;
  position: number;
  source_id: string | null;
  plate_id: string | null;
  page: string | null;
  pdf_page: number | null;
  quote: string | null;
  quote_note: string | null;
  pointer_image: string | null;
  page_image: string | null;
}

export interface Quelle {
  id: string;
  kind: string | null;
  title: string;
  place_publisher: string | null;
  year: string | null;
  note: string | null;
  original: string | null;
  level: string | null;
  rights: string | null;
  rights_status: Rechte;
  evaluated: string | null;
  title_page: string | null;
  body: string | null;
  collection_source_id: string | null;
  public_source_id: string | null;
}

export interface Tafel {
  id: string;
  presentation_id: string;
  title: string;
  file: string | null;
  object: string | null;
  dating: string | null;
  reproduction: string | null;
  readable: string | null;
  not_readable: string | null;
  unit: string | null;
  rights: string | null;
  rights_status: Rechte;
  year: number | null;
  dating_origin: string | null;
  situation: string | null;
  shows: { thema: string; merkmal: string; anzahl?: number }[];
  as_of: string | null;
  body: string | null;
}

/** Ein Bild aus dem Ordner der Bibliothek in SharePoint. */
export interface Bild {
  path: string;
  width: number | null;
  height: number | null;
}

/** Wo der Browser ein Bild holt: die ganze Datei und eine Vorschau mit 800 px. */
export interface BildAdresse {
  full: string;
  preview: string | null;
}

export interface Seite {
  slug: string;
  title: string;
  body: string | null;
  sort_order: number;
  frequent: string[];
}

export interface Treffer {
  kind: "topic" | "card" | "source" | "plate";
  id: string;
  presentation_id: string | null;
  title: string;
  summary: string | null;
  rank: number;
}

/** Darf die angemeldete Person lesen, darf sie pflegen? */
export function useBibliotheksrechte() {
  const { hasPermission } = useAuth();
  const pflegen = hasPermission("library.manage");
  return { lesen: pflegen || hasPermission("library.read"), pflegen };
}

/**
 * Die Bibliothek hält vieles in JSON-Spalten (Ebenen, Kapitel, Baum, Rahmen …)
 * und Text mit festem Wertevorrat (Stufe, Status, Rechte). Der erzeugte Typ
 * kennt davon nur `Json` und `string`; die Form steht oben in den
 * Schnittstellen. `holen` und `alle` sind die beiden Stellen, an denen eine
 * Zeile als ihr Anwendungstyp gilt. Tabelle, Spalten und Sortierung prüft der
 * Compiler vorher an der Abfrage selbst.
 */
type Antwort = { data: unknown; error: { message: string } | null };

const holen = async <T>(abfrage: PromiseLike<Antwort>): Promise<T> => {
  const { data, error } = await abfrage;
  if (error) throw new Error(error.message);
  return data as T;
};

/**
 * Ganze Listen immer seitenweise: Supabase liefert je Abfrage höchstens 1000
 * Zeilen, ohne Fehler. Die Sortierung endet jeweils auf der Kennung, damit
 * keine Zeile zwischen zwei Seiten verloren geht. Die Abfrage muss
 * `count: "exact"` anfordern.
 */
const alle = <T>(abfrage: (von: number, bis: number) => PromiseLike<Antwort & { count?: number | null }>) =>
  alleZeilen<T>(abfrage as Seitenabfrage<T>);

export const useDarstellungen = () =>
  useQuery({
    queryKey: ["bibliothek", "darstellungen"],
    queryFn: () => alle<Darstellung>((von, bis) =>
      supabase.from("library_presentations").select("*", { count: "exact" }).order("sort_order").order("id").range(von, bis)),
  });

export const useSeiten = () =>
  useQuery({
    queryKey: ["bibliothek", "seiten"],
    queryFn: () => alle<Seite>((von, bis) =>
      supabase.from("library_pages").select("*", { count: "exact" }).order("sort_order").order("title").order("slug").range(von, bis)),
  });

/** Alle Karten, ohne Text. Für Übersichten und Zählungen; bei einigen Hundert Karten billig. */
export const useKarten = (darstellung?: string) =>
  useQuery({
    queryKey: ["bibliothek", "karten", darstellung ?? "alle"],
    queryFn: () =>
      alle<Karte>((von, bis) => {
        const q = supabase
          .from("library_cards")
          .select(
            "id, presentation_id, area, statement, grade, grade_note, level, valid_for, keywords, topics, roles, status, as_of, updated_at",
            { count: "exact" }
          );
        return (darstellung ? q.eq("presentation_id", darstellung) : q).order("id").range(von, bis);
      }),
  });

/** Alle Themenseiten, mit Text: Die Seiten brauchen ihn für „gehört zu", Offen und Prüfliste. */
export const useThemen = () =>
  useQuery({
    queryKey: ["bibliothek", "themen"],
    queryFn: () => alle<Thema>((von, bis) =>
      supabase.from("library_topics").select("*", { count: "exact" })
        .order("chapter").order("sort_order").order("title").order("id").range(von, bis)),
  });

export const useKarte = (id: string | undefined) =>
  useQuery({
    queryKey: ["bibliothek", "karte", id],
    enabled: !!id,
    queryFn: async () => {
      // Läuft nur mit Kennung (enabled); der Typ weiß das nicht.
      if (!id) return { karte: null, fundstellen: [] };
      const [karte, fundstellen] = await Promise.all([
        holen<Karte | null>(supabase.from("library_cards").select("*").eq("id", id).maybeSingle()),
        holen<Fundstelle[]>(supabase.from("library_findings").select("*").eq("card_id", id).order("position")),
      ]);
      return { karte, fundstellen };
    },
  });

export const useQuellen = () =>
  useQuery({
    queryKey: ["bibliothek", "quellen"],
    queryFn: () => alle<Quelle>((von, bis) =>
      supabase.from("library_sources").select("*", { count: "exact" }).order("title").order("id").range(von, bis)),
  });

export const useTafeln = () =>
  useQuery({
    queryKey: ["bibliothek", "tafeln"],
    queryFn: () => alle<Tafel>((von, bis) =>
      supabase.from("library_plates").select("*", { count: "exact" }).order("id").range(von, bis)),
  });

/** Welche Fundstelle auf welche Quelle oder Tafel verweist – für „zitiert in" und den Filter nach Darstellung. */
export const useVerweise = () =>
  useQuery({
    queryKey: ["bibliothek", "verweise"],
    queryFn: () =>
      alle<Pick<Fundstelle, "card_id" | "source_id" | "plate_id" | "page" | "pointer_image" | "page_image">>((von, bis) =>
        supabase.from("library_findings")
          .select("card_id, source_id, plate_id, page, pointer_image, page_image", { count: "exact" })
          .order("id").range(von, bis)
      ),
  });

export const useBilder = () =>
  useQuery({
    queryKey: ["bibliothek", "bilder"],
    queryFn: async () => {
      const liste = await alle<Bild>((von, bis) =>
        supabase.from("library_images").select("path, width, height", { count: "exact" }).order("path").range(von, bis));
      return new Map(liste.map((b) => [b.path, b]));
    },
  });

export const useSuche = (begriff: string) =>
  useQuery({
    queryKey: ["bibliothek", "suche", begriff],
    enabled: begriff.trim().length >= 2,
    queryFn: () => holen<Treffer[]>(supabase.rpc("library_search", { _q: begriff })),
    placeholderData: (vorher) => vorher,
  });

/**
 * Adressen für Bilder aus SharePoint. Die Edge Function stellt sie aus; sie
 * gelten ohne Anmeldung, aber nur kurz. Nach acht Minuten holt die Seite
 * neue, falls sie offen bleibt.
 *
 * Gebündelt: Was die Bilder einer Seite im selben Augenblick anfragen, geht
 * als ein Aufruf hinaus – sonst kostete jede Karte zwei, die Seite einer
 * Quelle ein Dutzend Aufrufe der Funktion.
 */
let wartend: { pfad: string; fertig: (a: BildAdresse | null) => void; fehler: (e: unknown) => void }[] = [];
let geplant: ReturnType<typeof setTimeout> | null = null;

function adresseHolen(pfad: string): Promise<BildAdresse | null> {
  return new Promise((fertig, fehler) => {
    wartend.push({ pfad, fertig, fehler });
    geplant ??= setTimeout(async () => {
      const runde = wartend;
      wartend = [];
      geplant = null;
      for (let i = 0; i < runde.length; i += 100) {
        const teil = runde.slice(i, i + 100);
        try {
          const { urls } = await invokeFunction<{ urls: Record<string, BildAdresse> }>("library-files", {
            body: { action: "urls", paths: [...new Set(teil.map((t) => t.pfad))] },
          });
          teil.forEach((t) => t.fertig(urls[t.pfad] ?? null));
        } catch (e) {
          teil.forEach((t) => t.fehler(e));
        }
      }
    }, 15);
  });
}

export const useBildAdresse = (pfad: string | null) =>
  useQuery({
    queryKey: ["bibliothek", "adresse", pfad],
    enabled: !!pfad,
    staleTime: 8 * 60 * 1000,
    refetchInterval: 8 * 60 * 1000,
    retry: 1,
    queryFn: () => adresseHolen(pfad!),
  }).data ?? null;

/**
 * „Ich stelle dar: …" – je Darstellung gemerkt, im Browser der Person. Die
 * Wahl gilt auf allen Seiten der Darstellung, auch in einem zweiten Reiter.
 */
const ROLLE_EREIGNIS = "bibliothek-rolle";
const rolleLesen = (darstellung: string) => {
  try {
    return localStorage.getItem(`bibliothek-rolle-${darstellung}`);
  } catch {
    return null;
  }
};

export function useGewaehlteRolle(darstellung: string | undefined): [string | null, (rolle: string | null) => void] {
  const [rolle, setRolle] = useState<string | null>(() => (darstellung ? rolleLesen(darstellung) : null));
  useEffect(() => {
    if (!darstellung) return;
    setRolle(rolleLesen(darstellung));
    const neu = () => setRolle(rolleLesen(darstellung));
    window.addEventListener(ROLLE_EREIGNIS, neu);
    window.addEventListener("storage", neu);
    return () => {
      window.removeEventListener(ROLLE_EREIGNIS, neu);
      window.removeEventListener("storage", neu);
    };
  }, [darstellung]);
  const waehlen = (r: string | null) => {
    if (!darstellung) return;
    try {
      if (r) localStorage.setItem(`bibliothek-rolle-${darstellung}`, r);
      else localStorage.removeItem(`bibliothek-rolle-${darstellung}`);
    } catch {
      // Ohne Speicher gilt die Wahl nur auf dieser Seite.
    }
    setRolle(r);
    window.dispatchEvent(new Event(ROLLE_EREIGNIS));
  };
  return [rolle, waehlen];
}
