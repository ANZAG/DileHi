import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, FolderPlus, RefreshCw, Users, Lock } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ElectionCard from "@/components/elections/ElectionCard";
import RepresentationDialog from "@/components/elections/RepresentationDialog";
import type { Election, ElectionGroup, ElectionResult, GroupMember } from "@/components/elections/types";

const Elections = () => {
  const { user, hasPermission } = useAuth();
  const isVorstand = hasPermission("elections.manage");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupForm, setGroupForm] = useState({ title: "" });
  const [showElectionForm, setShowElectionForm] = useState<string | null>(null);
  const [electionForm, setElectionForm] = useState({ title: "", description: "", candidates: "" });
  const [representationGroupId, setRepresentationGroupId] = useState<string | null>(null);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("elections-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "elections" }, () => {
        queryClient.invalidateQueries({ queryKey: ["elections"] });
        queryClient.invalidateQueries({ queryKey: ["election_results"] });
        queryClient.invalidateQueries({ queryKey: ["my_votes"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => {
        queryClient.invalidateQueries({ queryKey: ["election_results"] });
        queryClient.invalidateQueries({ queryKey: ["my_votes"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "group_members" }, () => {
        queryClient.invalidateQueries({ queryKey: ["group_members"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["election_groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("election_groups")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as ElectionGroup[];
    },
  });

  const { data: elections = [], isLoading: loadingElections } = useQuery({
    queryKey: ["elections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("elections")
        .select("*, candidates(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Election[];
    },
  });

  const { data: results = [] } = useQuery({
    queryKey: ["election_results"],
    queryFn: async () => {
      const { data, error } = await supabase.from("election_results").select("*");
      if (error) throw error;
      return data as unknown as ElectionResult[];
    },
  });

  const { data: myVotes = [] } = useQuery({
    queryKey: ["my_votes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("votes").select("election_id").eq("voter_id", user.id);
      if (error) return [];
      return data;
    },
  });

  const { data: allGroupMembers = [] } = useQuery({
    queryKey: ["group_members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("group_members")
        .select("*");
      if (error) return [];
      return data as GroupMember[];
    },
  });

  const hasVotedInElection = (electionId: string) =>
    myVotes.some((v) => v.election_id === electionId);

  const getMyVoteCount = (election: Election) => {
    if (!user || !election.group_id) return 1;
    const member = allGroupMembers.find(
      (m) => m.group_id === election.group_id && m.user_id === user.id
    );
    return member ? member.vote_count : 1;
  };

  const getTotalPossibleVotes = (groupId: string | null) => {
    if (!groupId) return allGroupMembers.length || 1;
    const members = allGroupMembers.filter((m) => m.group_id === groupId);
    return members.reduce((sum, m) => sum + m.vote_count, 0) || 1;
  };

  const getTotalMembers = (groupId: string | null) => {
    if (!groupId) return 1;
    return allGroupMembers.filter((m) => m.group_id === groupId && m.vote_count > 0).length;
  };

  const createGroup = useMutation({
    mutationFn: async () => {
      // Create the group
      const { data: group, error } = await supabase
        .from("election_groups")
        .insert({
          title: groupForm.title,
          votes_per_member: 1,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Auto-add all members with 1 vote each.
      // Uses get_member_ids() so role logic stays in the DB –
      // no frontend change needed when a new role is added.
      const { data: members } = await supabase.rpc("get_member_ids");
      if (members && members.length > 0) {
        await supabase.from("group_members").insert(
          members.map((m: { user_id: string }) => ({
            group_id: group.id,
            user_id: m.user_id,
            vote_count: 1,
          }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["election_groups"] });
      queryClient.invalidateQueries({ queryKey: ["group_members"] });
      setShowGroupForm(false);
      setGroupForm({ title: "" });
      toast({ title: "Thema erstellt" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const createElection = useMutation({
    mutationFn: async (groupId: string) => {
      const { data: election, error } = await supabase
        .from("elections")
        .insert({
          title: electionForm.title,
          description: electionForm.description || null,
          created_by: user!.id,
          group_id: groupId,
        } as any)
        .select()
        .single();
      if (error) throw error;
      const names = electionForm.candidates.split("\n").map((c) => c.trim()).filter(Boolean);
      if (names.length > 0) {
        const { error: cErr } = await supabase
          .from("candidates")
          .insert(names.map((name) => ({ election_id: (election as any).id, name })));
        if (cErr) throw cErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      setShowElectionForm(null);
      setElectionForm({ title: "", description: "", candidates: "" });
      toast({ title: "Abstimmung erstellt" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const closeGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const now = new Date().toISOString();
      // Close group and all its active elections in two queries instead of N+1
      await supabase
        .from("election_groups")
        .update({ status: "closed", closed_at: now })
        .eq("id", groupId);
      const activeIds = elections
        .filter((e) => e.group_id === groupId && e.status === "active")
        .map((e) => e.id);
      if (activeIds.length > 0) {
        await supabase
          .from("elections")
          .update({ status: "closed", closed_at: now })
          .in("id", activeIds);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["election_groups"] });
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      queryClient.invalidateQueries({ queryKey: ["election_results"] });
      toast({ title: "Thema geschlossen" });
    },
  });

  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      // Batch delete: one query per table instead of one per election
      const electionIds = elections
        .filter((e) => e.group_id === groupId)
        .map((e) => e.id);
      if (electionIds.length > 0) {
        // Cascade order: votes → candidates → elections
        await supabase.from("votes").delete().in("election_id", electionIds);
        await supabase.from("candidates").delete().in("election_id", electionIds);
        await supabase.from("elections").delete().in("id", electionIds);
      }
      const { error } = await supabase.from("election_groups").delete().eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["election_groups"] });
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      toast({ title: "Thema gelöscht" });
    },
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["elections"] });
    queryClient.invalidateQueries({ queryKey: ["election_results"] });
    queryClient.invalidateQueries({ queryKey: ["my_votes"] });
    queryClient.invalidateQueries({ queryKey: ["election_groups"] });
    queryClient.invalidateQueries({ queryKey: ["group_members"] });
    toast({ title: "Aktualisiert" });
  };

  const isLoading = loadingGroups || loadingElections;

  const visibleElections = isVorstand
    ? elections
    : elections.filter((e) => e.status !== "draft");

  const getGroupElections = (groupId: string) =>
    visibleElections.filter((e) => e.group_id === groupId);

  const ungroupedElections = visibleElections.filter((e) => !e.group_id);

  const representationGroup = groups.find((g) => g.id === representationGroupId);

  return (
    <div className="container py-8 sm:py-12 max-w-4xl px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
          <h1 className="font-serif text-2xl font-bold">Abstimmungen</h1>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={refreshAll}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md border hover:bg-muted transition-colors"
              title="Aktualisieren"
            >
              <RefreshCw size={16} />
            </button>
            {isVorstand && (
              <button
                onClick={() => setShowGroupForm(!showGroupForm)}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <FolderPlus size={16} /> Neues Thema
              </button>
            )}
          </div>
        </div>

        {/* Create group form */}
        {showGroupForm && (
          <div className="p-4 rounded-lg border bg-card mb-6 space-y-3">
            <h3 className="text-sm font-semibold">Neues Thema erstellen</h3>
            <input
              placeholder="Titel (z.B. JHV 2026) *"
              value={groupForm.title}
              onChange={(e) => setGroupForm({ ...groupForm, title: e.target.value })}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Alle registrierten Mitglieder werden automatisch mit je einer Stimme hinzugefügt.
              Stellvertretungen können danach eingerichtet werden.
            </p>
            <button
              onClick={() => groupForm.title && createGroup.mutate()}
              disabled={!groupForm.title || createGroup.isPending}
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Erstellen
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Laden...</div>
        ) : groups.length === 0 && ungroupedElections.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">Noch keine Abstimmungen.</div>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => {
              const groupElections = getGroupElections(group.id);
              const isClosed = group.status === "closed";
              if (!isVorstand && groupElections.length === 0) return null;

              return (
                <div key={group.id} className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="font-serif text-lg sm:text-xl font-bold">{group.title}</h2>
                        {isClosed && (
                          <span className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1">
                            <Lock size={12} /> Geschlossen
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {isVorstand && (
                        <>
                          <button
                            onClick={() => setRepresentationGroupId(group.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border hover:bg-muted"
                            title="Stellvertretung"
                          >
                            <Users size={14} /> <span className="hidden sm:inline">Stellvertretung</span><span className="sm:hidden">Vertr.</span>
                          </button>
                          {!isClosed && (
                            <>
                              <button
                                onClick={() => setShowElectionForm(showElectionForm === group.id ? null : group.id)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                              >
                                <Plus size={14} /> Abstimmung
                              </button>
                              <button
                                onClick={() => closeGroup.mutate(group.id)}
                                className="px-3 py-1.5 text-xs rounded-md border text-destructive hover:bg-destructive/10"
                              >
                                Schließen
                              </button>
                            </>
                          )}
                          {groupElections.length === 0 && (
                            <button
                              onClick={() => deleteGroup.mutate(group.id)}
                              className="px-3 py-1.5 text-xs rounded-md border text-destructive hover:bg-destructive/10"
                            >
                              Löschen
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Create election form */}
                  {showElectionForm === group.id && !isClosed && (
                    <div className="p-4 rounded-lg border bg-card space-y-3">
                      <input
                        placeholder="Titel der Abstimmung *"
                        value={electionForm.title}
                        onChange={(e) => setElectionForm({ ...electionForm, title: e.target.value })}
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                      />
                      <textarea
                        placeholder="Beschreibung (optional)"
                        value={electionForm.description}
                        onChange={(e) => setElectionForm({ ...electionForm, description: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
                      />
                      <textarea
                        placeholder="Kandidaten / Optionen (eine pro Zeile) *"
                        value={electionForm.candidates}
                        onChange={(e) => setElectionForm({ ...electionForm, candidates: e.target.value })}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
                      />
                      <button
                        onClick={() => electionForm.title && electionForm.candidates && createElection.mutate(group.id)}
                        disabled={!electionForm.title || !electionForm.candidates || createElection.isPending}
                        className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                      >
                        Erstellen
                      </button>
                    </div>
                  )}

                  {groupElections.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic pl-1">Noch keine Abstimmungen in diesem Thema.</p>
                  ) : (
                    <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                      {groupElections.map((election, idx) => (
                        <ElectionCard
                          key={election.id}
                          election={election}
                          results={results}
                          hasVoted={hasVotedInElection(election.id)}
                          myVoteCount={getMyVoteCount(election)}
                          totalMembers={getTotalMembers(election.group_id)}
                          totalPossibleVotes={getTotalPossibleVotes(election.group_id)}
                          defaultOpen={idx === 0}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Ungrouped elections (legacy) */}
            {ungroupedElections.length > 0 && (
              <div className="space-y-3">
                {groups.length > 0 && (
                  <h2 className="font-serif text-xl font-bold text-muted-foreground">Sonstige</h2>
                )}
                <div className="space-y-3">
                  {ungroupedElections.map((election, idx) => (
                    <ElectionCard
                      key={election.id}
                      election={election}
                      results={results}
                      hasVoted={hasVotedInElection(election.id)}
                      myVoteCount={1}
                      totalMembers={1}
                      totalPossibleVotes={1}
                      defaultOpen={idx === 0}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {/* Representation Dialog */}
      {representationGroupId && representationGroup && (
        <RepresentationDialog
          groupId={representationGroupId}
          groupTitle={representationGroup.title}
          isReadOnly={representationGroup.status === "closed"}
          onClose={() => setRepresentationGroupId(null)}
        />
      )}
    </div>
  );
};

export default Elections;
