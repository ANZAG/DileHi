import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { X, History, UserX, UserCheck } from "lucide-react";
import type { GroupMember, RepresentationLogEntry } from "./types";

interface Props {
  groupId: string;
  groupTitle: string;
  isReadOnly: boolean;
  onClose: () => void;
}

const formatTimestamp = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", hour12: false });
};

const RepresentationDialog = ({ groupId, groupTitle, isReadOnly, onClose }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showLog, setShowLog] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ["group_members", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members" as any)
        .select("*")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as GroupMember[];
    },
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles_all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, display_name");
      if (error) return [];
      return data;
    },
  });

  const { data: logEntries = [] } = useQuery({
    queryKey: ["representation_log", groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("representation_log" as any)
        .select("*")
        .eq("group_id", groupId)
        .order("changed_at", { ascending: false });
      if (error) return [];
      return data as unknown as RepresentationLogEntry[];
    },
  });

  const { data: logProfiles = [] } = useQuery({
    queryKey: ["profiles_for_rep_log"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, display_name");
      if (error) return [];
      return data;
    },
  });

  // Check if any votes exist in this topic's elections
  const { data: hasVotes = false } = useQuery({
    queryKey: ["topic_has_votes", groupId],
    queryFn: async () => {
      const { data: elections } = await supabase
        .from("elections")
        .select("id")
        .eq("group_id", groupId);
      if (!elections || elections.length === 0) return false;
      const ids = elections.map((e) => e.id);
      const { count } = await supabase
        .from("votes")
        .select("id", { count: "exact", head: true })
        .in("election_id", ids);
      return (count || 0) > 0;
    },
  });

  const getName = (userId: string) =>
    profiles.find((p) => p.id === userId)?.display_name || "Unbekannt";

  const getLogName = (userId: string) =>
    logProfiles.find((p) => p.id === userId)?.display_name || "Unbekannt";

  // Get who this member represents
  const getRepresentedUsers = (userId: string) =>
    members.filter((m) => m.represented_by === userId);

  const setRepresentation = useMutation({
    mutationFn: async ({ representedUserId, representativeId }: { representedUserId: string; representativeId: string | null }) => {
      const representedMember = members.find((m) => m.user_id === representedUserId);
      if (!representedMember) return;

      const oldRepresentative = representedMember.represented_by;

      // Update the represented user
      await supabase
        .from("group_members" as any)
        .update({
          represented_by: representativeId,
          vote_count: representativeId ? 0 : 1,
        })
        .eq("group_id", groupId)
        .eq("user_id", representedUserId);

      // If removing old representative, decrease their vote count
      if (oldRepresentative && oldRepresentative !== representativeId) {
        const oldRep = members.find((m) => m.user_id === oldRepresentative);
        if (oldRep) {
          await supabase
            .from("group_members" as any)
            .update({ vote_count: Math.max(1, oldRep.vote_count - 1) })
            .eq("group_id", groupId)
            .eq("user_id", oldRepresentative);
        }
      }

      // If setting new representative, increase their vote count
      if (representativeId) {
        const newRep = members.find((m) => m.user_id === representativeId);
        if (newRep) {
          await supabase
            .from("group_members" as any)
            .update({ vote_count: newRep.vote_count + 1 })
            .eq("group_id", groupId)
            .eq("user_id", representativeId);
        }
      }

      // Log if votes have already been cast
      if (hasVotes) {
        const representedName = getName(representedUserId);
        const action = representativeId ? "Vertretung gesetzt" : "Vertretung entfernt";
        const details = representativeId
          ? `${getName(representativeId)} vertritt jetzt ${representedName}`
          : `Vertretung für ${representedName} wurde entfernt (vorher: ${oldRepresentative ? getName(oldRepresentative) : "-"})`;

        await supabase.from("representation_log" as any).insert({
          group_id: groupId,
          action,
          details,
          changed_by: user!.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["representation_log", groupId] });
      toast({ title: "Vertretung aktualisiert" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  // Toggle a member's presence without assigning a representative.
  // Absent members (vote_count=0, no represented_by) are excluded from the total vote count.
  // This is distinct from "represented" (vote_count=0, represented_by=someId).
  const toggleAbsent = useMutation({
    mutationFn: async ({ memberId, currentlyAbsent }: { memberId: string; currentlyAbsent: boolean }) => {
      const member = members.find((m) => m.user_id === memberId);
      if (!member) return;

      if (currentlyAbsent || member.represented_by) {
        // Restore to present: clear any representation, set vote_count back to 1.
        // Works whether the member was absent (vote_count=0) or represented by someone.
        if (member.represented_by) {
          // Decrease the representative's vote count first
          const rep = members.find((m) => m.user_id === member.represented_by);
          if (rep) {
            await supabase
              .from("group_members" as any)
              .update({ vote_count: Math.max(1, rep.vote_count - 1) })
              .eq("group_id", groupId)
              .eq("user_id", member.represented_by);
          }
        }
        await supabase
          .from("group_members" as any)
          .update({ vote_count: 1, represented_by: null })
          .eq("group_id", groupId)
          .eq("user_id", memberId);
      } else {
        // Mark as absent: clear any existing representation first
        if (member.represented_by) {
          const rep = members.find((m) => m.user_id === member.represented_by);
          if (rep) {
            await supabase
              .from("group_members" as any)
              .update({ vote_count: Math.max(1, rep.vote_count - 1) })
              .eq("group_id", groupId)
              .eq("user_id", member.represented_by);
          }
          await supabase
            .from("group_members" as any)
            .update({ represented_by: null, vote_count: 0 })
            .eq("group_id", groupId)
            .eq("user_id", memberId);
        } else {
          await supabase
            .from("group_members" as any)
            .update({ vote_count: 0 })
            .eq("group_id", groupId)
            .eq("user_id", memberId);
        }
      }

      if (hasVotes) {
        await supabase.from("representation_log" as any).insert({
          group_id: groupId,
          action: currentlyAbsent ? "Anwesenheit wiederhergestellt" : "Mitglied ausgetragen",
          details: currentlyAbsent
            ? \`\${getName(memberId)} wurde als anwesend markiert\`
            : \`\${getName(memberId)} wurde als abwesend ausgetragen\`,
          changed_by: user!.id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group_members", groupId] });
      queryClient.invalidateQueries({ queryKey: ["representation_log", groupId] });
      toast({ title: "Anwesenheit aktualisiert" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  // Members who are not represented by anyone (available to be representatives).
  // Also exclude absent members (vote_count=0, no represented_by).
  const availableRepresentatives = (forUserId: string) =>
    members.filter((m) => m.user_id !== forUserId && !m.represented_by && m.vote_count > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background border rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col m-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-serif text-lg font-semibold">
            Stellvertretung – {groupTitle}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowLog(!showLog)}
              className="p-1.5 rounded hover:bg-muted text-muted-foreground"
              title="Änderungsprotokoll"
            >
              <History size={18} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-muted text-muted-foreground">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-auto flex-1 p-4">
          {showLog ? (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Änderungsprotokoll</h3>
              {logEntries.length === 0 ? (
                <p className="text-sm text-muted-foreground">Keine Änderungen protokolliert.</p>
              ) : (
                <div className="space-y-2">
                  {logEntries.map((entry) => (
                    <div key={entry.id} className="p-3 rounded border bg-card text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium">{entry.action}</span>
                          <p className="text-muted-foreground mt-0.5">{entry.details}</p>
                        </div>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-3">
                          {formatTimestamp(entry.changed_at)}
                          <br />von {getLogName(entry.changed_by)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-medium">Name</th>
                  <th className="text-center py-2 px-2 font-medium w-24">Stimmen</th>
                  <th className="text-left py-2 px-2 font-medium">Vertretung für</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const representedUsers = getRepresentedUsers(member.user_id);
                  const isRepresented = !!member.represented_by;
                  // Absent = vote_count is 0 without being represented by someone
                  const isAbsent = member.vote_count === 0 && !member.represented_by;

                  return (
                    <tr key={member.id} className={`border-b ${(isRepresented || isAbsent) ? "opacity-50" : ""}`}>
                      <td className="py-2 px-2">
                        <div className="flex items-center gap-2">
                          <span>{getName(member.user_id)}</span>
                          {isAbsent && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              abwesend
                            </span>
                          )}
                          {isRepresented && (
                            <span className="text-xs text-muted-foreground">
                              (vertreten durch {getName(member.represented_by!)})
                            </span>
                          )}
                          {!isReadOnly && (
                            <button
                              onClick={() => toggleAbsent.mutate({ memberId: member.user_id, currentlyAbsent: isAbsent })}
                              className="ml-auto p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                              title={
                                isAbsent || isRepresented
                                  ? "Als anwesend eintragen (Vertretung wird aufgehoben)"
                                  : "Als abwesend austragen"
                              }
                            >
                              {(isAbsent || isRepresented) ? <UserCheck size={15} /> : <UserX size={15} />}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="text-center py-2 px-2 font-medium">{member.vote_count}</td>
                      <td className="py-2 px-2">
                        {representedUsers.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {representedUsers.map((ru) => (
                              <span key={ru.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 text-xs">
                                {getName(ru.user_id)}
                                {!isReadOnly && (
                                  <button
                                    onClick={() => setRepresentation.mutate({
                                      representedUserId: ru.user_id,
                                      representativeId: null,
                                    })}
                                    className="text-destructive hover:text-destructive/80"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        {!isReadOnly && !isRepresented && !isAbsent && (
                          <select
                            className="mt-1 text-xs rounded border border-input bg-background px-2 py-1"
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                setRepresentation.mutate({
                                  representedUserId: e.target.value,
                                  representativeId: member.user_id,
                                });
                              }
                            }}
                          >
                            <option value="">+ Vertretung hinzufügen</option>
                            {members
                              // Exclude self, already-represented members, and absent members
                            .filter((m) => m.user_id !== member.user_id && !m.represented_by && m.vote_count > 0)
                              .map((m) => (
                                <option key={m.user_id} value={m.user_id}>
                                  {getName(m.user_id)}
                                </option>
                              ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepresentationDialog;
