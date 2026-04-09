import { BellRing, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

interface ForumSubscribeButtonProps {
  threadId?: string;
  categoryId?: string;
  size?: "sm" | "default";
}

const ForumSubscribeButton = ({ threadId, categoryId, size = "sm" }: ForumSubscribeButtonProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ["forum-subscription", user?.id, threadId, categoryId];

  const { data: subscription } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user) return null;
      let query = supabase
        .from("forum_subscriptions")
        .select("id")
        .eq("user_id", user.id);

      if (threadId) query = query.eq("thread_id", threadId);
      if (categoryId) query = query.eq("category_id", categoryId);

      const { data } = await query.maybeSingle();
      return data;
    },
    enabled: !!user && !!(threadId || categoryId),
  });

  const isSubscribed = !!subscription;

  const toggle = useMutation({
    mutationFn: async () => {
      if (!user) return;
      if (isSubscribed) {
        await supabase.from("forum_subscriptions").delete().eq("id", subscription!.id);
      } else {
        await supabase.from("forum_subscriptions").insert({
          user_id: user.id,
          thread_id: threadId || null,
          category_id: categoryId || null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({
        title: isSubscribed ? "Abonnement entfernt" : "Abonniert",
        description: isSubscribed
          ? "Du erhältst keine Benachrichtigungen mehr."
          : "Du wirst über neue Beiträge benachrichtigt.",
      });
    },
  });

  if (!user) return null;

  return (
    <Button
      variant={isSubscribed ? "default" : "outline"}
      size={size}
      onClick={() => toggle.mutate()}
      disabled={toggle.isPending}
      className="gap-1"
    >
      {isSubscribed ? <BellOff size={14} /> : <BellRing size={14} />}
      {isSubscribed ? "Abbestellen" : "Abonnieren"}
    </Button>
  );
};

export default ForumSubscribeButton;
