import { ladeFormularvorlage, speichereFormularvorlage } from "@/daten/veranstaltungen";
import { ausJson } from "@/lib/json";
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
  const data = await ladeFormularvorlage(DEFAULT_TEMPLATE_SLUG);

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
    // `fields` ist eine JSON-Spalte; withIds prüft jedes Feld einzeln nach.
    fields: withIds(ausJson<unknown[] | null>(data.fields) || []),
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
    })),
    updated_by: userId,
  };

  await speichereFormularvorlage(payload);
}
