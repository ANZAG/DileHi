import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

/**
 * Datenzugriff für die Glocke und die Benachrichtigungen aufs Gerät.
 *
 * Die Echtzeitverbindung der Glocke und das Abo beim Browser bleiben bei den
 * Komponenten.
 */

export type Benachrichtigung = Pick<
  Tables<"notifications">,
  "id" | "type" | "title" | "body" | "link" | "is_read" | "created_at"
>;

export const benachrichtigungSchluessel = {
  alle: ["benachrichtigungen"] as const,
  liste: (userId: string | undefined) => ["benachrichtigungen", "liste", userId] as const,
};

/** Die letzten 20 Benachrichtigungen des angemeldeten Mitglieds – die Datenbank zeigt jedem nur die eigenen. */
export async function ladeBenachrichtigungen(): Promise<Benachrichtigung[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, is_read, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data ?? [];
}

/** Ohne Kennungen bleibt das Argument weg; die Funktion nimmt dann alle. */
export async function markiereGelesen(ids?: string[]): Promise<void> {
  const { error } = await supabase.rpc("mark_notifications_read", { _ids: ids });
  if (error) throw error;
}

/** Ein Gerät hat genau ein Abo; meldet es sich neu an, ersetzt das neue das alte. */
export async function speicherePushAbo(abo: TablesInsert<"push_subscriptions">): Promise<void> {
  const { error } = await supabase.from("push_subscriptions").upsert(abo, { onConflict: "endpoint" });
  if (error) throw error;
}

export async function loeschePushAbo(endpoint: string): Promise<void> {
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw error;
}
