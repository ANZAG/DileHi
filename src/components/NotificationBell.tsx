import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

/**
 * Glocke in der Kopfzeile.
 *
 * Ohne sie wird das Forum nicht benutzt – niemand schaut von sich aus nach.
 * Genau daran ist das alte wpForo eingeschlafen.
 */
export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const { data: items = [] } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, title, body, link, is_read, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
    enabled: !!user,
    // Ohne Nachfragen bleibt die Glocke stehen, bis die Seite neu geladen wird.
    refetchInterval: 60_000,
  });

  // Neue Benachrichtigungen sofort zeigen, statt eine Minute zu warten.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => queryClient.invalidateQueries({ queryKey: ["notifications", user.id] })
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // Klick daneben schließt die Liste – auf dem Handy der übliche Weg.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  if (!user) return null;

  const unread = items.filter((n) => !n.is_read).length;

  const markRead = async (ids?: string[]) => {
    await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<unknown>)(
      "mark_notifications_read", { _ids: ids ?? null }
    );
    queryClient.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const openItem = async (n: Notification) => {
    setOpen(false);
    if (!n.is_read) await markRead([n.id]);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        aria-label={unread > 0 ? `${unread} ungelesene Benachrichtigungen` : "Benachrichtigungen"}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center tabular-nums">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-lg border bg-card shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <span className="text-sm font-semibold">Benachrichtigungen</span>
            {unread > 0 && (
              <button
                onClick={() => markRead()}
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                <Check size={13} /> Alle gelesen
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-3 py-8 text-sm text-muted-foreground text-center">
                Nichts Neues.
              </p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openItem(n)}
                  className={`w-full text-left px-3 py-2.5 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${
                    n.is_read ? "" : "bg-primary/5"
                  }`}
                >
                  <span className="flex items-start gap-2">
                    {!n.is_read && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                    <span className={`min-w-0 ${n.is_read ? "pl-3.5" : ""}`}>
                      <span className="block text-sm font-medium truncate">{n.title}</span>
                      {n.body && <span className="block text-xs text-muted-foreground truncate">{n.body}</span>}
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(parseISO(n.created_at), { locale: de, addSuffix: true })}
                      </span>
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
