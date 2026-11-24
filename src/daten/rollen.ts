import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

/**
 * Datenzugriff für Rollen und Berechtigungen.
 *
 * Den schlanken Rollenkatalog (Schlüssel und Name) lesen viele Stellen; er
 * steht mit `useRollenkatalog` in `daten/mitglieder.ts`. Hier steht, was die
 * Verwaltung der Rollen selbst braucht.
 */

/** Eine Rolle mit dem, was die Verwaltung über sie wissen muss. */
export type RolleMitStand = {
  key: string;
  label: string;
  description: string | null;
  sort_order: number;
  is_board: boolean;
  is_leadership: boolean;
  is_default: boolean;
  public_listed: boolean;
  is_system: boolean;
  max_holders: number | null;
  member_count: number;
  permission_count: number;
};

export const rollenSchluessel = {
  alle: ["rollen"] as const,
  /** Die Rollen mit Zahl der Mitglieder und Rechte – für die Rollenverwaltung. */
  stand: () => ["rollen", "stand"] as const,
  /** Welche Rolle welches Recht hat. */
  rechte: () => ["rollen", "rechte"] as const,
  /** Welche Rechte es gibt. */
  rechtekatalog: () => ["rollen", "rechtekatalog"] as const,
  /** Die Rolle, die ein neu eingeladenes Mitglied bekommt. */
  standardrolle: () => ["rollen", "standardrolle"] as const,
};

export async function ladeRollenMitStand(): Promise<RolleMitStand[]> {
  const { data, error } = await supabase.rpc("role_status");
  if (error) throw error;
  return data ?? [];
}

export async function legeRolleAn(rolle: TablesInsert<"role_catalog">): Promise<void> {
  const { error } = await supabase.from("role_catalog").insert(rolle);
  if (error) throw error;
}

export async function aendereRolle(key: string, aenderung: TablesUpdate<"role_catalog">): Promise<void> {
  const { error } = await supabase.from("role_catalog").update(aenderung).eq("key", key);
  if (error) throw error;
}

/** Die Datenbank sagt selbst, warum es nicht geht – Grundausstattung, noch besetzt, letzte mit Rechteverwaltung. */
export async function loescheRolle(key: string): Promise<void> {
  const { error } = await supabase.from("role_catalog").delete().eq("key", key);
  if (error) throw error;
}

// ── Standardrolle ───────────────────────────────────────────────────────────

export async function setzeStandardrolle(key: string): Promise<void> {
  const { error } = await supabase.from("app_settings").update({ default_role: key }).eq("id", true);
  if (error) throw error;
}

/**
 * Ohne hinterlegte Standardrolle die unterste im Katalog: Die Reihenfolge ist
 * absteigend nach Verantwortung, unten steht also die einfachste Rolle.
 */
export async function ladeStandardrolle(): Promise<string> {
  const { data: einstellung, error } = await supabase.from("app_settings").select("default_role").maybeSingle();
  if (error) throw error;
  if (einstellung?.default_role) return einstellung.default_role;

  const { data: katalog, error: katalogFehler } = await supabase
    .from("role_catalog")
    .select("key")
    .order("sort_order", { ascending: false })
    .limit(1);
  if (katalogFehler) throw katalogFehler;
  return katalog?.[0]?.key ?? "";
}

// ── Berechtigungen ──────────────────────────────────────────────────────────

export async function ladeRollenrechte(): Promise<Tables<"role_permissions">[]> {
  const { data, error } = await supabase.from("role_permissions").select("*");
  if (error) throw error;
  return data;
}

export async function ladeRechtekatalog() {
  const { data, error } = await supabase.rpc("get_permission_catalog");
  if (error) throw error;
  return data ?? [];
}

/** Alles, was ein Mitglied über seine Rollen darf. */
export async function ladeRechteVon(userId: string): Promise<string[]> {
  const { data, error } = await supabase.rpc("get_user_permissions", { _user_id: userId });
  if (error) throw error;
  return data ?? [];
}

/** Die erteilten Rechte einer Rolle – für „ansehen als". */
export async function ladeRechteDerRolle(rolle: string): Promise<string[]> {
  const { data, error } = await supabase.from("role_permissions").select("permission").eq("role", rolle).eq("granted", true);
  if (error) throw error;
  return (data ?? []).map((r) => r.permission);
}

/** Gibt einer Rolle ein Recht oder nimmt es ihr. */
export async function setzeRollenrecht(rolle: string, recht: string, erteilt: boolean): Promise<void> {
  if (erteilt) {
    const { error } = await supabase.from("role_permissions").insert({ role: rolle, permission: recht, granted: true });
    if (error) throw error;
  } else {
    const { error } = await supabase.from("role_permissions").delete().eq("role", rolle).eq("permission", recht);
    if (error) throw error;
  }
}
