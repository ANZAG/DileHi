import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Bundled fallback images
import heroMedieval from "@/assets/hero-medieval.webp";
import epochMedieval from "@/assets/epoch-medieval.webp";
import epochWW1 from "@/assets/epoch-ww1.webp";
import epoch1815 from "@/assets/epoch-1815.webp";
import gruppenfoto from "@/assets/gruppenfoto.webp";
import detailHandwerk from "@/assets/detail-handwerk.webp";
import vorfuehrung from "@/assets/vorfuehrung.webp";
import lederworkshop from "@/assets/lederworkshop.webp";
import transitionGruppenfoto from "@/assets/transition-gruppenfoto.webp";
import gruppenfotoSpaemi from "@/assets/gruppenfoto-spaemi.webp";
import burgFrauenstein from "@/assets/burg-frauenstein-darstellung.webp";
import mittelalterTafel from "@/assets/mittelalter-tafel.webp";
import nassauRegiment from "@/assets/nassau-regiment-knotel.webp";
import nassauUniformtafel from "@/assets/nassau-uniformtafel.webp";
import nassauerBelleAlliance from "@/assets/nassauer-belle-alliance.webp";
import kaserneImage from "@/assets/kaserne-mainz-kastel.webp";
import uniformImage from "@/assets/pibat21-uniform.webp";
import karteImage from "@/assets/karte-hessen-nassau.webp";

export const SITE_IMAGE_FALLBACKS: Record<string, string> = {
  "hero-startseite": heroMedieval,
  "epochenkarte-mittelalter": epochMedieval,
  "epochenkarte-napoleonik": epoch1815,
  "epochenkarte-wk1": epochWW1,
  "gruppenfoto-startseite": gruppenfoto,
  "gruppenfoto-verein": gruppenfoto,
  "detail-handwerk": detailHandwerk,
  "vorfuehrung-verein": vorfuehrung,
  "lederworkshop-veranstalter": lederworkshop,
  "epochen-uebersicht-veranstalter": transitionGruppenfoto,
  "hero-mittelalter": epochMedieval,
  "gruppenfoto-spaemi": gruppenfotoSpaemi,
  "burg-frauenstein": burgFrauenstein,
  "mittelalter-tafel": mittelalterTafel,
  "hero-napoleonik": epoch1815,
  "nassau-regiment-knotel": nassauRegiment,
  "nassau-uniformtafel": nassauUniformtafel,
  "nassauer-belle-alliance": nassauerBelleAlliance,
  "hero-wk1": epochWW1,
  "kaserne-mainz-kastel": kaserneImage,
  "pibat21-uniform": uniformImage,
  "karte-hessen-nassau": karteImage,
};

interface SiteImageData {
  src: string;
  alt: string;
}

/** Fetch all site images once, return individual slot data with bundled fallback */
export function useSiteImages() {
  return useQuery({
    queryKey: ["site_images"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_images")
        .select("*");
      if (error) return {} as Record<string, SiteImageData>;
      
      const map: Record<string, SiteImageData> = {};
      for (const img of data) {
        let src = SITE_IMAGE_FALLBACKS[img.slot] || "";
        if (img.storage_path) {
          const { data: urlData } = supabase.storage.from("gallery").getPublicUrl(img.storage_path);
          src = urlData.publicUrl;
        }
        map[img.slot] = { src, alt: img.alt_text || "" };
      }
      return map;
    },
    staleTime: 5 * 60 * 1000,
  });
}

/** Get a single site image with fallback */
export function useSiteImage(slot: string): SiteImageData {
  const { data } = useSiteImages();
  if (data?.[slot]) return data[slot];
  return { src: SITE_IMAGE_FALLBACKS[slot] || "", alt: "" };
}
