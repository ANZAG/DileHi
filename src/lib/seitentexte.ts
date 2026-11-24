// Was an einer Baukastenseite Text ist. Das Modul liegt bei den Edge
// Functions, weil auch translate-page es braucht und Supabase beim Ausrollen
// nur jenes Verzeichnis mitnimmt; hier nur der kurze Weg dorthin.
export * from "../../supabase/functions/_shared/seitentexte.mjs";
