import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SmilePlus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const EMOJI_OPTIONS = ["👍", "❤️", "😂", "🎉", "🤔", "👀", "⚔️", "🛡️"];

interface ForumReactionsProps {
  postId: string;
}

interface ReactionGroup {
  emoji: string;
  count: number;
  hasOwn: boolean;
}

const ForumReactions = ({ postId }: ForumReactionsProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: reactions = [] } = useQuery({
    queryKey: ["forum-reactions", postId],
    queryFn: async () => {
      const { data } = await supabase
        .from("forum_reactions")
        .select("id, emoji, user_id")
        .eq("post_id", postId);
      return data || [];
    },
  });

  // Group reactions
  const groups: ReactionGroup[] = [];
  const emojiMap = new Map<string, { count: number; hasOwn: boolean }>();
  reactions.forEach(r => {
    const existing = emojiMap.get(r.emoji);
    if (existing) {
      existing.count++;
      if (r.user_id === user?.id) existing.hasOwn = true;
    } else {
      emojiMap.set(r.emoji, { count: 1, hasOwn: r.user_id === user?.id });
    }
  });
  emojiMap.forEach((val, emoji) => groups.push({ emoji, ...val }));
  groups.sort((a, b) => b.count - a.count);

  const toggleReaction = useMutation({
    mutationFn: async (emoji: string) => {
      if (!user) return;
      const existing = reactions.find(r => r.emoji === emoji && r.user_id === user.id);
      if (existing) {
        await supabase.from("forum_reactions").delete().eq("id", existing.id);
      } else {
        await supabase.from("forum_reactions").insert({
          post_id: postId,
          user_id: user.id,
          emoji,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-reactions", postId] });
    },
  });

  return (
    <div className="flex items-center gap-1 flex-wrap mt-1">
      {groups.map(g => (
        <button
          key={g.emoji}
          onClick={() => toggleReaction.mutate(g.emoji)}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
            g.hasOwn
              ? "bg-primary/10 border-primary/30 text-primary"
              : "bg-muted/50 border-transparent hover:border-border text-muted-foreground"
          }`}
        >
          <span>{g.emoji}</span>
          <span>{g.count}</span>
        </button>
      ))}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full">
            <SmilePlus size={14} className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top" align="start">
          <div className="flex gap-1 flex-wrap">
            {EMOJI_OPTIONS.map(emoji => (
              <button
                key={emoji}
                onClick={() => {
                  toggleReaction.mutate(emoji);
                  setOpen(false);
                }}
                className="text-lg hover:bg-accent rounded p-1 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ForumReactions;
