import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { hexToHsl, hslToTokens, istDunkel, lesbareSchrift } from "@/lib/farben";
import { ladeSchriften } from "@/lib/schriften";

export interface Branding {
  org_name: string;
  org_short_name: string;
  org_tagline: string | null;
  logo_path: string | null;
  favicon_path: string | null;
  /** Steht das Logo neben dem Vereinsnamen in der Kopfzeile? */
  logo_in_header: boolean;
  /** Verlinkt {{satzung}} im Aufnahmeantrag auf das hinterlegte Dokument. */
  satzung_link: boolean;
  color_primary: string;
  color_dark: string;
  seo_description: string | null;
  seo_image_path: string | null;
  website_url: string | null;
  font_headings: string;
  font_body: string;
  // Pflichtangaben fuer Impressum und Datenschutzerklaerung. Sie stehen hier
  // und nicht in app_settings, weil beide Seiten oeffentlich sind.
  org_street: string | null;
  org_zip: string | null;
  org_city: string | null;
  org_country: string | null;
  org_email: string | null;
  org_phone: string | null;
  board_members: string | null;
  register_court: string | null;
  register_number: string | null;
  vat_id: string | null;
  privacy_contact: string | null;
  privacy_officer: string | null;
  hosting_provider: string | null;
  hosting_address: string | null;
  // Beschriftungen im Fussbereich. Stehen hier, weil der Fuss auf jeder
  // oeffentlichen Seite steht.
  footer_navigation_label: string;
  footer_legal_label: string;
}

/** Fällt der Aufruf aus, sieht die Seite aus wie bisher – nicht kaputt. */
const VORGABE: Branding = {
  org_name: "Diu lebendec Histôrje e. V.",
  org_short_name: "Diu lebendec Histôrje",
  org_tagline: null,
  logo_path: null,
  favicon_path: null,
  logo_in_header: true,
  satzung_link: true,
  color_primary: "#dd9933",
  color_dark: "#1c1917",
  seo_description: null,
  seo_image_path: null,
  website_url: null,
  font_headings: "DM Serif Display",
  font_body: "Inter",
  org_street: null,
  org_zip: null,
  org_city: null,
  org_country: null,
  org_email: null,
  org_phone: null,
  board_members: null,
  register_court: null,
  register_number: null,
  vat_id: null,
  privacy_contact: null,
  privacy_officer: null,
  hosting_provider: null,
  hosting_address: null,
  footer_navigation_label: "Navigation",
  footer_legal_label: "Rechtliches",
};

function oeffentlicheAdresse(pfad: string | null): string | null {
  if (!pfad) return null;
  const { data } = supabase.storage.from("gallery").getPublicUrl(pfad);
  return data.publicUrl;
}

/**
 * Vereinsname, Logo und Farben aus der Datenbank.
 *
 * Die Werte stehen seit Monaten in app_settings – gelesen hat sie bisher
 * niemand, die Farben lagen fest im Stylesheet. Für eine Installation, die ein
 * anderer Verein aufsetzt, ist das der erste Stolperstein: Er bekommt unsere
 * Farben und unseren Namen.
 *
 * Die Abfrage geht über public_branding(), nicht direkt auf app_settings: Dort
 * stehen auch Anschrift und Absenderadressen, und die Startseite muss ohne
 * Anmeldung funktionieren.
 */
export function useBranding() {
  const { data } = useQuery({
    queryKey: ["branding"],
    queryFn: async (): Promise<Branding> => {
      const { data, error } = await supabase.rpc("public_branding" as never);
      if (error) throw new Error(error.message);
      const row = (data as Branding[] | null)?.[0];
      return row ? { ...VORGABE, ...row } : VORGABE;
    },
    // Ändert sich praktisch nie und wird auf jeder Seite gebraucht.
    staleTime: 60 * 60 * 1000,
    retry: 1,
  });

  const branding = data ?? VORGABE;
  return {
    ...branding,
    logoUrl: oeffentlicheAdresse(branding.logo_path),
    faviconUrl: oeffentlicheAdresse(branding.favicon_path),
    seoImageUrl: oeffentlicheAdresse(branding.seo_image_path),
  };
}

/**
 * Setzt die Farben und das Symbol im Browsertab.
 *
 * Einmal im Layout aufgerufen. Die Variablen landen am <html>-Element und
 * überschreiben damit die Vorgaben aus index.css – für beide Modi, hell wie
 * dunkel, weil sie eine Stufe spezifischer sind als `:root` bzw. `.dark`.
 */
export function useBrandingAnwenden() {
  const branding = useBranding();
  const { color_primary, color_dark, faviconUrl, org_name, font_headings, font_body } = branding;

  useEffect(() => {
    const wurzel = document.documentElement;
    const primaer = hexToHsl(color_primary);

    if (primaer) {
      const wert = hslToTokens(primaer);
      // Alles, was im Stylesheet denselben Ton benutzt, zieht mit. Sonst
      // bliebe etwa der Fokusrahmen im alten Orange stehen.
      for (const name of ["--primary", "--accent", "--ring", "--sidebar-primary", "--sidebar-ring"]) {
        wurzel.style.setProperty(name, wert);
      }
      const schrift = lesbareSchrift(color_primary);
      for (const name of ["--primary-foreground", "--accent-foreground", "--sidebar-primary-foreground"]) {
        wurzel.style.setProperty(name, schrift);
      }
    }

    // Die zweite Vereinsfarbe ist der dunkle Ton: im hellen Modus die Schrift,
    // im dunklen der Hintergrund. Ist sie nicht dunkel, bleibt sie unbenutzt –
    // eine helle „dunkle Farbe" macht die Seite sonst unlesbar, und das merkt
    // man erst, wenn der fremde Verein sie schon eingestellt hat.
    const dunkel = hexToHsl(color_dark);
    if (dunkel && istDunkel(color_dark)) {
      wurzel.style.setProperty("--foreground", hslToTokens(dunkel));
    }
  }, [color_primary, color_dark]);

  useEffect(() => {
    ladeSchriften([font_headings, font_body]);
    const wurzel = document.documentElement;
    // In Anführungszeichen: Namen wie „Source Sans 3" brauchen sie, sonst
    // versteht CSS die Zahl als eigenen Wert.
    wurzel.style.setProperty("--schrift-ueberschrift", `"${font_headings}"`);
    wurzel.style.setProperty("--schrift-text", `"${font_body}"`);
  }, [font_headings, font_body]);

  useEffect(() => {
    if (!faviconUrl) return;
    let el = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!el) {
      el = document.createElement("link");
      el.rel = "icon";
      document.head.append(el);
    }
    el.href = faviconUrl;
  }, [faviconUrl]);

  return { ...branding, org_name };
}
