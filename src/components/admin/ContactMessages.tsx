import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trash2 } from "lucide-react";

const ContactMessages = () => {
  const queryClient = useQueryClient();

  const { data: contactMessages = [] } = useQuery({
    queryKey: ["contact_messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return [];
      return data;
    },
  });

  const deleteContactMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contact_messages"] });
    },
  });

  if (contactMessages.length === 0) return null;

  return (
    <div className="space-y-3">
      {contactMessages.map((msg) => (
        <div key={msg.id} className="p-3 rounded-lg border bg-background">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium">{msg.name} ({msg.email})</p>
              <p className="text-xs text-muted-foreground">
                {new Date(msg.created_at).toLocaleDateString("de-DE")}{" "}
                {new Date(msg.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
              </p>
              <p className="text-sm mt-2">{msg.message}</p>
            </div>
            <button onClick={() => deleteContactMessage.mutate(msg.id)} className="text-muted-foreground hover:text-destructive p-1">
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContactMessages;
