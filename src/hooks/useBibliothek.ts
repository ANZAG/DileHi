import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { invokeFunction } from "@/lib/functionError";
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

// Die Tabellen stehen noch nicht in den erzeugten Typen.
export const db = supabase as unknown as {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

const holen = async <T>(abfrage: PromiseLike<{ data: unknown; error: { message: string } | null }>): Promise<T> => {
  const { data, error } = await abfrage;
  if (error) throw new Error(error.message);
  return data as T;
};

export const useDarstellungen = () =>
  useQuery({
    queryKey: ["bibliothek", "darstellungen"],
    queryFn: () => holen<Darstellung[]>(db.from("library_presentations").select("*").order("sort_order").order("id")),
  });

export const useSeiten = () =>
  useQuery({
    queryKey: ["bibliothek", "seiten"],
    queryFn: () => holen<Seite[]>(db.from("library_pages").select("*").order("sort_order").order("title")),
  });

/** Alle Karten, ohne Text. Für Übersichten und Zählungen; bei einigen Hundert Karten billig. */
export const useKarten = (darstellung?: string) =>
  useQuery({
    queryKey: ["bibliothek", "karten", darstellung ?? "alle"],
    queryFn: () => {
      let q = db.from("library_cards")
        .select("id, presentation_id, area, statement, grade, grade_note, level, valid_for, keywords, topics, roles, status, as_of, updated_at");
      if (darstellung) q = q.eq("presentation_id", darstellung);
      return holen<Karte[]>(q.order("id"));
    },
  });

/** Alle Themenseiten, mit Text: Die Seiten brauchen ihn für „gehört zu", Offen und Prüfliste. */
export const useThemen = () =>
  useQuery({
    queryKey: ["bibliothek", "themen"],
    queryFn: () => holen<Thema[]>(db.from("library_topics").select("*").order("chapter").order("sort_order").order("title")),
  });

export const useKarte = (id: string | undefined) =>
  useQuery({
    queryKey: ["bibliothek", "karte", id],
    enabled: !!id,
    queryFn: async () => {
      const [karte, fundstellen] = await Promise.all([
        holen<Karte | null>(db.from("library_cards").select("*").eq("id", id).maybeSingle()),
        holen<Fundstelle[]>(db.from("library_findings").select("*").eq("card_id", id).order("position")),
      ]);
      return { karte, fundstellen };
    },
  });

export const useQuellen = () =>
  useQuery({
    queryKey: ["bibliothek", "quellen"],
    queryFn: () => holen<Quelle[]>(db.from("library_sources").select("*").order("title")),
  });

export const useTafeln = () =>
  useQuery({
    queryKey: ["bibliothek", "tafeln"],
    queryFn: () => holen<Tafel[]>(db.from("library_plates").select("*").order("id")),
  });

/** Welche Fundstelle auf welche Quelle oder Tafel verweist – für „zitiert in" und den Filter nach Darstellung. */
export const useVerweise = () =>
  useQuery({
    queryKey: ["bibliothek", "verweise"],
    queryFn: () =>
      holen<Pick<Fundstelle, "card_id" | "source_id" | "plate_id" | "page" | "pointer_image" | "page_image">[]>(
        db.from("library_findings").select("card_id, source_id, plate_id, page, pointer_image, page_image")
      ),
  });

export const useBilder = () =>
  useQuery({
    queryKey: ["bibliothek", "bilder"],
    queryFn: async () => {
      const liste = await holen<Bild[]>(db.from("library_images").select("path, width, height"));
      return new Map(liste.map((b) => [b.path, b]));
    },
  });

export const useSuche = (begriff: string) =>
  useQuery({
    queryKey: ["bibliothek", "suche", begriff],
    enabled: begriff.trim().length >= 2,
    queryFn: () => holen<Treffer[]>(db.rpc("library_search", { _q: begriff })),
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
