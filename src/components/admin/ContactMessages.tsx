import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Trash2, ChevronDown, ChevronUp, Reply } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";

const ContactMessages = () => {
  const { isVorstand } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);

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

  const handleReply = async (email: string, name: string) => {
    if (!replyText.trim()) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke("reply-contact", {
      body: { to: email, name, message: replyText.trim() },
    });
    setSending(false);
    if (error || !data?.success) {
      toast({ title: "Fehler beim Senden", variant: "destructive" });
    } else {
      toast({ title: "Antwort gesendet" });
      setReplyTo(null);
      setReplyText("");
    }
  };

  // Parse structured event inquiry fields from message
  const parseMessage = (message: string) => {
    const lines = message.split("\n");
    const fields: { label: string; value: string }[] = [];
    let freeText = "";

    for (const line of lines) {
      const match = line.match(/^(Name|Organisation|Art|Datum|Ort|Besucherzahl|Epoche|Nachricht):\s*(.+)/);
      if (match) {
        fields.push({ label: match[1], value: match[2] });
      } else if (line.trim()) {
        freeText += (freeText ? "\n" : "") + line;
      }
    }

    return { fields, freeText, isStructured: fields.length >= 2 };
  };

  if (contactMessages.length === 0) {
    return <p className="text-sm text-muted-foreground py-4 text-center">Keine Nachrichten vorhanden.</p>;
  }

  return (
    <div className="space-y-3">
      {contactMessages.map((msg) => {
        const parsed = parseMessage(msg.message);
        const isStructured = parsed.isStructured;
        // For structured messages: show Name & Organisation as summary
        const summaryFields = isStructured
          ? parsed.fields.filter((f) => f.label === "Name" || f.label === "Organisation")
          : [];
        const detailFields = isStructured
          ? parsed.fields.filter((f) => f.label !== "Name" && f.label !== "Organisation")
          : [];

        return (
          <div key={msg.id} className="p-3 rounded-lg border bg-background">
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{msg.name} ({msg.email})</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(msg.created_at).toLocaleDateString("de-DE")}{" "}
                  {new Date(msg.created_at).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
                </p>

                {isStructured ? (
                  <div className="mt-2">
                    {summaryFields.map((f, i) => (
                      <p key={i} className="text-sm">
                        <span className="font-medium">{f.label}:</span> {f.value}
                      </p>
                    ))}
                    {detailFields.length > 0 && (
                      <Collapsible>
                        <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline mt-1">
                          Details anzeigen <ChevronDown size={12} className="collapsible-chevron" />
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-1">
                          {detailFields.map((f, i) => (
                            <p key={i} className="text-sm">
                              <span className="font-medium">{f.label}:</span> {f.value}
                            </p>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                ) : (
                  <p className="text-sm mt-2">{msg.message}</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {isVorstand && (
                  <>
                    <button
                      onClick={() => {
                        setReplyTo(replyTo === msg.id ? null : msg.id);
                        setReplyText("");
                      }}
                      className="text-muted-foreground hover:text-primary p-1"
                      title="Antworten"
                    >
                      <Reply size={14} />
                    </button>
                    <button onClick={() => deleteContactMessage.mutate(msg.id)} className="text-muted-foreground hover:text-destructive p-1">
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {replyTo === msg.id && (
              <div className="mt-3 space-y-2 border-t pt-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  placeholder={`Antwort an ${msg.name}...`}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleReply(msg.email, msg.name)}
                    disabled={sending || !replyText.trim()}
                    className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 disabled:opacity-50"
                  >
                    {sending ? "Wird gesendet..." : "Senden"}
                  </button>
                  <button
                    onClick={() => { setReplyTo(null); setReplyText(""); }}
                    className="px-3 py-1.5 rounded-md border text-xs font-medium hover:bg-muted"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ContactMessages;
