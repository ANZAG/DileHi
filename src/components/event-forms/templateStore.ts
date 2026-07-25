import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_TEMPLATE_FIELDS } from "./defaultTemplate";
import type { FormField } from "./types";

export const DEFAULT_TEMPLATE_SLUG = "default";

export interface TemplateData {
  id: string | null;
  title: string;
  description: string | null;
  fields: FormField[];
}

function withIds(raw: any[]): FormField[] {
  return (raw || []).map((f, i) => ({
    id: f.id && typeof f.id === "string" ? f.id : `new-${crypto.randomUUID()}`,
    type: f.type,
    label: f.label ?? "",
    description: f.description ?? null,
    required: !!f.required,
    sort_order: i,
    options: Array.isArray(f.options) ? f.options : [],
    settings: f.settings || {},
  }));
}

/** Lädt die bearbeitbare Standardvorlage – fällt auf die eingebaute Vorlage zurück. */
export async function fetchDefaultTemplate(): Promise<TemplateData> {
  const { data, error } = await supabase
    .from("form_templates")
    .select("*")
    .eq("slug", DEFAULT_TEMPLATE_SLUG)
    .maybeSingle();
  if (error) throw error;

  if (!data) {
    return {
      id: null,
      title: "Anmeldung",
      description: null,
      fields: withIds(DEFAULT_TEMPLATE_FIELDS as any[]),
    };
  }

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    fields: withIds((data.fields as any[]) || []),
  };
}

/** Speichert die Standardvorlage (erstellt sie beim ersten Mal). */
export async function saveDefaultTemplate(template: TemplateData, userId: string) {
  const payload = {
    slug: DEFAULT_TEMPLATE_SLUG,
    name: "Standardvorlage",
    title: template.title,
    description: template.description,
    fields: template.fields.map((f, i) => ({
      type: f.type,
      label: f.label,
      description: f.description,
      required: f.required,
      sort_order: i,
      options: f.options || [],
      settings: f.settings || {},
    })) as any,
    updated_by: userId,
  };

  const { error } = await supabase
    .from("form_templates")
    .upsert(payload, { onConflict: "slug" });
  if (error) throw error;
}
