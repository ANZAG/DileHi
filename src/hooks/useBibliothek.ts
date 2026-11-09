import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { KartenStatus, Rechte, Stufe } from "@/lib/bibliothek";

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
  body: string | null;
  as_of: string | null;
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
  as_of: string | null;
  body: string | null;
}

export interface Bild {
  path: string;
  object: string;
  preview: string | null;
  width: number | null;
  height: number | null;
}

export interface Seite {
  slug: string;
  title: string;
  body: string | null;
  sort_order: number;
}

export interface Treffer {
  kind: "card" | "source" | "plate";
  id: string;
  presentation_id: string | null;
  title: string;
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
        .select("id, presentation_id, area, statement, grade, grade_note, level, valid_for, keywords, status, as_of, updated_at");
      if (darstellung) q = q.eq("presentation_id", darstellung);
      return holen<Karte[]>(q.order("id"));
    },
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
      const liste = await holen<Bild[]>(db.from("library_images").select("path, object, preview, width, height"));
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
 * Signierte Adressen für Bilder aus dem privaten Speicher. Zehn Minuten
 * gültig; die Abfrage erneuert sich nach acht, falls die Seite offen bleibt.
 */
export const useBildAdressen = (objekte: string[]) => {
  const liste = [...new Set(objekte)].sort();
  const { data } = useQuery({
    queryKey: ["bibliothek", "adressen", liste.join("|")],
    enabled: liste.length > 0,
    staleTime: 8 * 60 * 1000,
    refetchInterval: 8 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("library").createSignedUrls(liste, 10 * 60);
      if (error || !data) return {} as Record<string, string>;
      const karte: Record<string, string> = {};
      data.forEach((e, i) => {
        if (e.signedUrl) karte[liste[i]] = e.signedUrl;
      });
      return karte;
    },
  });
  return data ?? {};
};
