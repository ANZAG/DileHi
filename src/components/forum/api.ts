import { supabase } from "@/integrations/supabase/client";

/**
 * Datenzugriff fürs Forum.
 *
 * Die Forum-Tabellen stehen noch nicht in der erzeugten types.ts – die entsteht
 * erst bei der nächsten Neugenerierung. Damit die Zusicherungen nicht durch alle
 * Komponenten wandern, stehen sie gebündelt hier. Nach der Neugenerierung fällt
 * `db` ersatzlos weg, die Aufrufe bleiben.
 */
const db = supabase as unknown as {
  from: (table: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

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

export async function fetchCategories(): Promise<ForumCategory[]> {
  const { data, error } = await db.from("forum_categories").select("*").order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []) as ForumCategory[];
}

/** Themenzahl und Zahl der ungelesenen Themen je Rubrik. */
export async function fetchCategoryStats(userId?: string) {
  const { data: threads } = await db
    .from("forum_threads")
    .select("id, category_id, last_post_at");
  const { data: readState } = userId
    ? await db.from("forum_read_state").select("thread_id, last_read_at").eq("user_id", userId)
    : { data: [] };

  const readAt = new Map<string, string>(
    (readState ?? []).map((r: { thread_id: string; last_read_at: string }) => [r.thread_id, r.last_read_at])
  );

  const stats: Record<string, { threads: number; unread: number }> = {};
  for (const t of (threads ?? []) as { id: string; category_id: string; last_post_at: string }[]) {
    const entry = (stats[t.category_id] ??= { threads: 0, unread: 0 });
    entry.threads += 1;
    const seen = readAt.get(t.id);
    // Nie geöffnet zählt als ungelesen – sonst ist ein neues Thema unsichtbar.
    if (!seen || new Date(seen) < new Date(t.last_post_at)) entry.unread += 1;
  }
  return stats;
}

export async function fetchThreads(categoryId: string): Promise<ForumThread[]> {
  const { data, error } = await db
    .from("forum_threads")
    .select("*")
    .eq("category_id", categoryId)
    .order("is_pinned", { ascending: false })
    .order("last_post_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as ForumThread[];
}

export async function fetchThread(id: string): Promise<ForumThread | null> {
  const { data, error } = await db.from("forum_threads").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as ForumThread | null;
}

export async function fetchPosts(threadId: string): Promise<ForumPost[]> {
  const { data, error } = await db
    .from("forum_posts")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as ForumPost[];
}

export async function createThread(input: {
  categoryId: string;
  title: string;
  body: string;
  userId: string;
}) {
  const { data, error } = await db
    .from("forum_threads")
    .insert({
      category_id: input.categoryId,
      title: input.title.trim(),
      slug: slugify(input.title),
      created_by: input.userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);

  const { error: postError } = await db.from("forum_posts").insert({
    thread_id: data.id,
    body: input.body,
    created_by: input.userId,
  });
  if (postError) throw new Error(postError.message);
  return data as ForumThread;
}

export async function createPost(input: { threadId: string; body: string; userId: string }) {
  const { data, error } = await db.from("forum_posts").insert({
    thread_id: input.threadId,
    body: input.body,
    created_by: input.userId,
  }).select("id").single();
  if (error) throw new Error(error.message);

  // Push anstossen. Bewusst ohne await und ohne Fehlerbehandlung: Die
  // Benachrichtigung steht bereits in der Datenbank, die Glocke zeigt sie und
  // die Abendmail nimmt sie mit. Push ist die Zugabe - schlaegt sie fehl, darf
  // der Beitrag trotzdem als gespeichert gelten.
  void supabase.functions
    .invoke("push-notify", { body: { postId: data.id } })
    .catch(() => undefined);
}

/** Lesestand setzen – ohne den bringt die Zählung ungelesener Themen nichts. */
export async function markRead(threadId: string, userId: string) {
  await db
    .from("forum_read_state")
    .upsert(
      { user_id: userId, thread_id: threadId, last_read_at: new Date().toISOString() },
      { onConflict: "user_id,thread_id" }
    );
}

export async function saveCategory(category: Partial<ForumCategory> & { id?: string }) {
  const payload = {
    name: category.name,
    slug: category.slug || slugify(category.name ?? ""),
    description: category.description ?? null,
    icon: category.icon ?? "MessageSquare",
    sort_order: category.sort_order ?? 0,
    status: category.status ?? "vorgeschlagen",
  };
  const query = category.id
    ? db.from("forum_categories").update(payload).eq("id", category.id)
    : db.from("forum_categories").insert({ ...payload, created_by: category.created_by });
  const { error } = await query;
  if (error) throw new Error(error.message);
}

export async function deleteCategory(id: string) {
  const { error } = await db.from("forum_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export interface CategoryRoleRights {
  category_id: string;
  role: string;
  can_view: boolean;
  can_reply: boolean;
  can_start: boolean;
  is_moderator: boolean;
}

export async function fetchCategoryRights(): Promise<CategoryRoleRights[]> {
  const { data, error } = await db.from("forum_category_roles").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as CategoryRoleRights[];
}

export async function setCategoryRight(
  categoryId: string,
  role: string,
  patch: Partial<Omit<CategoryRoleRights, "category_id" | "role">>
) {
  const { error } = await db
    .from("forum_category_roles")
    .upsert({ category_id: categoryId, role, ...patch }, { onConflict: "category_id,role" });
  if (error) throw new Error(error.message);
}

/** Umfrage oder Mitbringliste als Beitrag im Thread. */
export async function createPollPost(input: {
  threadId: string;
  userId: string;
  kind: "umfrage" | "mitbringliste";
  payload: Record<string, unknown>;
}) {
  const { error } = await db.from("forum_posts").insert({
    thread_id: input.threadId,
    kind: input.kind,
    body: "",
    payload: input.payload,
    created_by: input.userId,
  });
  if (error) throw new Error(error.message);
}
