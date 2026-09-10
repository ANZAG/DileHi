import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, ListChecks, Check, Clock } from "lucide-react";
import { format, isPast, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

const db = supabase as unknown as {
  from: (t: string) => any;
  rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: any; error: any }>;
};

export interface PollOption { key: string; label: string }

export interface PollPayload {
  frage?: string;
  optionen?: PollOption[];
  mehrfach?: boolean;
  frist?: string | null;
  anonym?: boolean;
}

interface Result { option_key: string; stimmen: number; namen: string[] }

/**
 * Umfrage oder Mitbringliste in einem Thread.
 *
 * Bewusst getrennt von den satzungsrelevanten Abstimmungen: Dort gibt es
 * Wahlleitung, Stimmgewichte und ein Prüfprotokoll. „Wer bringt den Grill mit?"
 * braucht davon nichts – und die Verwechslung der beiden wäre genau die Art von
 * Unübersichtlichkeit, die wir loswerden wollen.
 */
export default function ForumPoll({
  postId,
  kind,
  payload,
}: {
  postId: string;
  kind: "umfrage" | "mitbringliste";
  payload: PollPayload;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const options = payload.optionen ?? [];
  const isList = kind === "mitbringliste";
  const closed = payload.frist ? isPast(parseISO(payload.frist)) : false;

  const { data: results = [] } = useQuery({
    queryKey: ["forum-poll", postId],
    queryFn: async () => {
      const { data } = await db.rpc("forum_poll_results", { _post_id: postId });
      return (data ?? []) as Result[];
    },
  });

  const { data: own = [] } = useQuery({
    queryKey: ["forum-poll-own", postId, user?.id],
    queryFn: async () => {
      const { data } = await db
        .from("forum_poll_votes")
        .select("option_key")
        .eq("post_id", postId)
        .eq("user_id", user!.id);
      return ((data ?? []) as { option_key: string }[]).map((v) => v.option_key);
    },
    enabled: !!user,
  });

  const vote = useMutation({
    mutationFn: async (optionKey: string) => {
      const chosen = own.includes(optionKey);
      if (chosen) {
        const { error } = await db
          .from("forum_poll_votes").delete()
          .eq("post_id", postId).eq("user_id", user!.id).eq("option_key", optionKey);
        if (error) throw new Error(error.message);
        return;
      }
      // Bei Einfachauswahl die vorherige Stimme ersetzen, statt zwei zu zählen.
      if (!payload.mehrfach && own.length > 0) {
        await db.from("forum_poll_votes").delete().eq("post_id", postId).eq("user_id", user!.id);
      }
      const { error } = await db
        .from("forum_poll_votes")
        .insert({ post_id: postId, user_id: user!.id, option_key: optionKey });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-poll", postId] });
      queryClient.invalidateQueries({ queryKey: ["forum-poll-own", postId, user?.id] });
    },
    onError: (err: Error) =>
      toast({ title: "Konnte nicht gespeichert werden", description: err.message, variant: "destructive" }),
  });

  const countFor = (key: string) => results.find((r) => r.option_key === key)?.stimmen ?? 0;
  const namesFor = (key: string) => results.find((r) => r.option_key === key)?.namen ?? [];
  const max = Math.max(1, ...options.map((o) => countFor(o.key)));
  const total = results.reduce((sum, r) => sum + r.stimmen, 0);

  return (
    <div className="rounded-lg border bg-muted/20 p-3 mt-2">
      <p className="text-sm font-semibold flex items-center gap-1.5">
        {isList ? <ListChecks size={15} /> : <BarChart3 size={15} />}
        {payload.frage || (isList ? "Wer bringt was mit?" : "Umfrage")}
      </p>

      {payload.frist && (
        <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
          <Clock size={12} />
          {closed
            ? `Abgelaufen am ${format(parseISO(payload.frist), "d. MMMM", { locale: de })}`
            : `Bis ${format(parseISO(payload.frist), "d. MMMM", { locale: de })}`}
        </p>
      )}

      <div className="space-y-1.5 mt-3">
        {options.map((o) => {
          const count = countFor(o.key);
          const chosen = own.includes(o.key);
          const names = namesFor(o.key);
          return (
            <div key={o.key}>
              <button
                type="button"
                disabled={closed || vote.isPending || !user}
                onClick={() => vote.mutate(o.key)}
                className={`w-full text-left rounded-md border px-2.5 py-2 transition-colors relative overflow-hidden ${
                  chosen ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                } ${closed ? "cursor-default opacity-90" : ""}`}
              >
                {/* Balken als Hintergrund – die Zahl allein liest sich schlechter. */}
                <span
                  className="absolute inset-y-0 left-0 bg-primary/10"
                  style={{ width: `${(count / max) * 100}%` }}
                  aria-hidden="true"
                />
                <span className="relative flex items-center gap-2">
                  <Checkbox checked={chosen} className="pointer-events-none" tabIndex={-1} />
                  <span className="text-sm flex-1 min-w-0">{o.label}</span>
                  <span className="text-sm font-semibold tabular-nums">{count}</span>
                  {chosen && <Check size={14} className="text-primary shrink-0" />}
                </span>
              </button>
              {names.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5 ml-2.5 truncate" title={names.join(", ")}>
                  {names.join(", ")}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-2">
        {payload.anonym
          ? "Anonym. Es werden nur Zahlen angezeigt."
          : payload.mehrfach
            ? "Mehrfachauswahl möglich."
            : "Eine Auswahl."}
        {total > 0 && ` · ${total} ${total === 1 ? "Eintrag" : "Einträge"}`}
      </p>
    </div>
  );
}
