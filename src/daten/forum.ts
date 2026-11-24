import { supabase } from "@/integrations/supabase/client";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { alsJson, ausJson } from "@/lib/json";

/**
 * Datenzugriff fürs Forum: Rubriken, Themen, Beiträge, Lesestand, Umfragen.
 *
 * Stand bis zur dritten Runde der Datenschicht in `components/forum/api.ts`
 * – schon damals die eine Stelle, an der das Forum mit der Datenbank spricht.
 * Bilder der Beiträge liegen im Speicher (`components/forum/forumImages.ts`).
 */

export type Umfragestand = { option_key: string; stimmen: number; namen: string[] };

export const forumSchluessel = {
  alle: ["forum"] as const,
  rubriken: () => ["forum", "rubriken"] as const,
  rubrikRechte: () => ["forum", "rubrik-rechte"] as const,
  /** Präfix: wie viele Themen je Rubrik, wie viele davon ungelesen – für jedes Mitglied. */
  rubrikStaende: () => ["forum", "rubrik-stand"] as const,
  rubrikStand: (userId: string | undefined) => ["forum", "rubrik-stand", userId] as const,
  /** Präfix: die Themen aller Rubriken. */
  themen: () => ["forum", "themen"] as const,
  themenIn: (rubrikId: string | undefined) => ["forum", "themen", rubrikId] as const,
  thema: (themaId: string | undefined) => ["forum", "thema", themaId] as const,
  beitraege: (themaId: string | undefined) => ["forum", "beitraege", themaId] as const,
  /** Präfix: was welches Mitglied zuletzt gelesen hat. */
  lesestaende: () => ["forum", "gelesen"] as const,
  lesestand: (userId: string | undefined) => ["forum", "gelesen", userId] as const,
  /** Präfix: die ungelesenen Themen über alle Rubriken. */
  ungelesene: () => ["forum", "ungelesen"] as const,
  ungelesen: (userId: string | undefined) => ["forum", "ungelesen", userId] as const,
  umfrage: (beitragId: string) => ["forum", "umfrage", beitragId] as const,
  meineStimmen: (beitragId: string, userId: string | undefined) =>
    ["forum", "umfrage-eigene", beitragId, userId] as const,
  /** Kurz gültige Adressen der Bilder eines Beitrags. */
  bilder: (pfade: string[]) => ["forum", "bilder", pfade] as const,
};

// ── Umfragen und Mitbringlisten ─────────────────────────────────────────────

export async function ladeUmfragestand(beitragId: string): Promise<Umfragestand[]> {
  const { data, error } = await supabase.rpc("forum_poll_results", { _post_id: beitragId });
  if (error) throw error;
  return data ?? [];
}

/** Welche Möglichkeiten das Mitglied gewählt hat. */
export async function ladeMeineStimmen(beitragId: string, userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("forum_poll_votes")
    .select("option_key")
    .eq("post_id", beitragId)
    .eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((v) => v.option_key);
}

/**
 * Schaltet eine Stimme um.
 *
 * Eine gewählte Möglichkeit wird abgewählt. Bei Einfachauswahl ersetzt die
 * neue Stimme die vorherige, statt dass zwei zählen – scheitert das Entfernen
 * der alten, kommt die neue nicht dazu.
 */
export async function schalteStimme(eingabe: {
  beitragId: string;
  userId: string;
  option: string;
  eigene: string[];
  mehrfach: boolean;
}): Promise<void> {
  const { beitragId, userId, option, eigene, mehrfach } = eingabe;
  if (eigene.includes(option)) {
    const { error } = await supabase
      .from("forum_poll_votes")
      .delete()
      .eq("post_id", beitragId)
      .eq("user_id", userId)
      .eq("option_key", option);
    if (error) throw error;
    return;
  }
  if (!mehrfach && eigene.length > 0) {
    const { error } = await supabase.from("forum_poll_votes").delete().eq("post_id", beitragId).eq("user_id", userId);
    if (error) throw error;
  }
  const { error } = await supabase
    .from("forum_poll_votes")
    .insert({ post_id: beitragId, user_id: userId, option_key: option });
  if (error) throw error;
}

// ── Rubriken, Themen, Beiträge ──────────────────────────────────────────────

export type CategoryStatus = "vorgeschlagen" | "aktiv" | "archiviert";

export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  sort_order: number;
  status: CategoryStatus;
  is_event_room: boolean;
  /** Rubrik, die sich nur ueber Veranstaltungen fuellt – kein Thema von Hand. */
  only_auto_threads: boolean;
  created_by: string | null;
}

export interface ForumThread {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  created_by: string;
  is_pinned: boolean;
  is_locked: boolean;
  is_archived: boolean;
  event_id: string | null;
  /** Nicht NULL = gehoert zu einer Veranstaltung, auch wenn die geloescht ist. */
  event_ends_on: string | null;
  post_count: number;
  last_post_at: string;
  last_post_by: string | null;
  created_at: string;
}

export interface ForumPost {
  id: string;
  thread_id: string;
  kind: "beitrag" | "umfrage" | "mitbringliste";
  body: string;
  payload: Record<string, unknown>;
  created_by: string;
  reply_to_id: string | null;
  edited_at: string | null;
  deleted_at: string | null;
  created_at: string;
}

/** Aus einem Titel eine lesbare Adresse machen. */
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "thema";

export async function ladeRubriken(): Promise<ForumCategory[]> {
  const { data, error } = await supabase.from("forum_categories").select("*").order("sort_order");
  if (error) throw error;
  const zeilen: ForumCategory[] = data ?? [];
  return zeilen;
}

/** Wann jemand welches Thema zuletzt geöffnet hat, je Thema. */
export async function ladeLesestand(userId: string): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from("forum_read_state")
    .select("thread_id, last_read_at")
    .eq("user_id", userId);
  if (error) throw error;
  const gelesen: Record<string, string> = {};
  for (const r of data ?? []) {
    gelesen[r.thread_id] = r.last_read_at;
  }
  return gelesen;
}

/**
 * Ist ein Thema für diese Person neu?
 *
 * Nie geöffnet zählt als neu – sonst ist ein frisches Thema unsichtbar.
 * Archiviertes nie: Dort passiert nichts mehr, und wer ein altes Archiv zum
 * ersten Mal sah, bekam es bisher als Dutzend „neue" Themen gemeldet.
 */
export function istUngelesen(
  thema: Pick<ForumThread, "last_post_at" | "is_archived">,
  gelesenAm: string | undefined
): boolean {
  if (thema.is_archived) return false;
  return !gelesenAm || new Date(gelesenAm) < new Date(thema.last_post_at);
}

/** Themenzahl und Zahl der ungelesenen Themen je Rubrik. */
export async function ladeRubrikStaende(userId?: string) {
  const { data: threads, error } = await supabase
    .from("forum_threads")
    .select("id, category_id, last_post_at, is_archived");
  if (error) throw error;
  const gelesen = userId ? await ladeLesestand(userId) : {};

  const stats: Record<string, { threads: number; unread: number }> = {};
  for (const t of (threads ?? []) as Pick<ForumThread, "id" | "category_id" | "last_post_at" | "is_archived">[]) {
    const entry = (stats[t.category_id] ??= { threads: 0, unread: 0 });
    entry.threads += 1;
    if (istUngelesen(t, gelesen[t.id])) entry.unread += 1;
  }
  return stats;
}

/** Alle ungelesenen Themen über alle Rubriken, das mit dem jüngsten Beitrag zuerst. */
export async function ladeUngeleseneThemen(userId: string): Promise<ForumThread[]> {
  const [{ data, error }, gelesen] = await Promise.all([
    supabase.from("forum_threads").select("*").eq("is_archived", false).order("last_post_at", { ascending: false }),
    ladeLesestand(userId),
  ]);
  if (error) throw error;
  const zeilen: ForumThread[] = data ?? [];
  return zeilen.filter((t) => istUngelesen(t, gelesen[t.id]));
}

export async function ladeThemen(categoryId: string): Promise<ForumThread[]> {
  const { data, error } = await supabase
    .from("forum_threads")
    .select("*")
    .eq("category_id", categoryId)
    .order("is_pinned", { ascending: false })
    .order("last_post_at", { ascending: false });
  if (error) throw error;
  const zeilen: ForumThread[] = data ?? [];
  return zeilen;
}

export async function ladeThema(id: string): Promise<ForumThread | null> {
  const { data, error } = await supabase.from("forum_threads").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  const zeile: ForumThread | null = data ?? null;
  return zeile;
}

export async function ladeBeitraege(threadId: string): Promise<ForumPost[]> {
  const { data, error } = await supabase
    .from("forum_posts")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, payload: ausJson<ForumPost["payload"]>(p.payload) }));
}

export async function legeThemaAn(input: {
  categoryId: string;
  title: string;
  body: string;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("forum_threads")
    .insert({
      category_id: input.categoryId,
      title: input.title.trim(),
      slug: slugify(input.title),
      created_by: input.userId,
    })
    .select()
    .single();
  if (error) throw error;

  const { error: postError } = await supabase.from("forum_posts").insert({
    thread_id: data.id,
    body: input.body,
    created_by: input.userId,
  });
  if (postError) throw postError;
  const zeile: ForumThread = data;
  return zeile;
}

export async function legeBeitragAn(input: { threadId: string; body: string; userId: string }) {
  const { data, error } = await supabase.from("forum_posts").insert({
    thread_id: input.threadId,
    body: input.body,
    created_by: input.userId,
  }).select("id").single();
  if (error) throw error;

  // Push anstossen. Bewusst ohne await und ohne Fehlerbehandlung: Die
  // Benachrichtigung steht bereits in der Datenbank, die Glocke zeigt sie und
  // die Abendmail nimmt sie mit. Push ist die Zugabe - schlaegt sie fehl, darf
  // der Beitrag trotzdem als gespeichert gelten.
  void supabase.functions
    .invoke("push-notify", { body: { postId: data.id } })
    .catch(() => undefined);
}

/** Lesestand setzen – ohne den bringt die Zählung ungelesener Themen nichts. */
export async function merkeGelesen(threadId: string, userId: string) {
  const { error } = await supabase
    .from("forum_read_state")
    .upsert(
      { user_id: userId, thread_id: threadId, last_read_at: new Date().toISOString() },
      { onConflict: "user_id,thread_id" }
    );
  if (error) throw error;
}

export async function speichereRubrik(category: Partial<ForumCategory> & { id?: string }) {
  const payload = {
    name: category.name,
    slug: category.slug || slugify(category.name ?? ""),
    description: category.description ?? null,
    icon: category.icon ?? "MessageSquare",
    sort_order: category.sort_order ?? 0,
    status: category.status ?? "vorgeschlagen",
  };
  if (category.id) {
    const { error } = await supabase.from("forum_categories").update(payload).eq("id", category.id);
    if (error) throw error;
    return;
  }
  // Eine neue Rubrik ohne Namen lehnt die Datenbank ohnehin ab.
  const { name } = payload;
  if (!name) throw new Error("Die Rubrik braucht einen Namen.");
  const { error } = await supabase
    .from("forum_categories")
    .insert({ ...payload, name, created_by: category.created_by });
  if (error) throw error;
}

export async function loescheRubrik(id: string) {
  const { error } = await supabase.from("forum_categories").delete().eq("id", id);
  if (error) throw error;
}

export interface CategoryRoleRights {
  category_id: string;
  role: string;
  can_view: boolean;
  can_reply: boolean;
  can_start: boolean;
  is_moderator: boolean;
}

export async function ladeRubrikRechte(): Promise<CategoryRoleRights[]> {
  const { data, error } = await supabase.from("forum_category_roles").select("*");
  if (error) throw error;
  const zeilen: CategoryRoleRights[] = data ?? [];
  return zeilen;
}

export async function setzeRubrikRecht(
  categoryId: string,
  role: string,
  patch: Partial<Omit<CategoryRoleRights, "category_id" | "role">>
) {
  const { error } = await supabase
    .from("forum_category_roles")
    .upsert({ category_id: categoryId, role, ...patch }, { onConflict: "category_id,role" });
  if (error) throw error;
}

/** Umfrage oder Mitbringliste als Beitrag im Thread. */
export async function legeUmfrageAn(input: {
  threadId: string;
  userId: string;
  kind: "umfrage" | "mitbringliste";
  payload: Record<string, unknown>;
}) {
  const { error } = await supabase.from("forum_posts").insert({
    thread_id: input.threadId,
    kind: input.kind,
    body: "",
    payload: alsJson(input.payload),
    created_by: input.userId,
  });
  if (error) throw error;
}

// ══ Moderation ═══════════════════════════════════════════════════════════════
//
// Die Rechte dafuer gab es in der Datenbank von Anfang an – nur keinen Knopf.
// Wer moderieren durfte, konnte es faktisch nicht.

export interface ThreadPatch {
  title?: string;
  category_id?: string;
  is_pinned?: boolean;
  is_locked?: boolean;
  is_archived?: boolean;
}

export async function aendereThema(id: string, patch: ThreadPatch) {
  const daten: TablesUpdate<"forum_threads"> = { ...patch };
  // Der Titel bestimmt die Adresse mit – sonst zeigt der Link auf den alten.
  if (patch.title !== undefined) {
    daten.title = patch.title.trim();
    daten.slug = slugify(patch.title);
  }
  const { error } = await supabase.from("forum_threads").update(daten).eq("id", id);
  if (error) throw new Error(uebersetzeFehler(error.message));
}

export async function loescheThema(id: string) {
  const { error } = await supabase.from("forum_threads").delete().eq("id", id);
  if (error) throw new Error(uebersetzeFehler(error.message));
}

export async function aendereBeitrag(input: {
  postId: string;
  body: string;
  userId: string;
  originalBody: string;
}) {
  // Erst den alten Stand sichern, dann aendern. Andersherum waere der alte
  // Stand weg, falls das Schreiben des Verlaufs scheitert.
  const { error: histError } = await supabase.from("forum_post_revisions").insert({
    post_id: input.postId,
    body: input.originalBody,
    edited_by: input.userId,
  });
  if (histError) throw histError;

  const { error } = await supabase
    .from("forum_posts")
    .update({ body: input.body, edited_at: new Date().toISOString(), edited_by: input.userId })
    .eq("id", input.postId);
  if (error) throw error;
}

/**
 * Weiches Entfernen: Der Beitrag verschwindet aus der Anzeige, aber es bleibt
 * sichtbar, dass dort einer war. Fuer einen Verein mit Protokollcharakter ist
 * das der Unterschied zwischen „entfernt" und „hat es nie gegeben".
 */
export async function entferneBeitrag(postId: string, userId: string) {
  const { error } = await supabase
    .from("forum_posts")
    .update({ deleted_at: new Date().toISOString(), deleted_by: userId })
    .eq("id", postId);
  if (error) throw error;
}

export async function stelleBeitragWiederHer(postId: string) {
  const { error } = await supabase
    .from("forum_posts")
    .update({ deleted_at: null, deleted_by: null })
    .eq("id", postId);
  if (error) throw error;
}

/** Die Schutzregeln melden sich mit Klartext – der soll auch ankommen. */
function uebersetzeFehler(message: string): string {
  if (message.includes("Veranstaltung geloescht")) {
    return "Diese Absprache gehört zu einer Veranstaltung. Sie wandert ins Archiv, wenn der Termin gelöscht wird.";
  }
  if (message.includes("Termin laeuft")) {
    return "Solange der Termin läuft, kann die Absprache nicht archiviert werden.";
  }
  return message;
}
