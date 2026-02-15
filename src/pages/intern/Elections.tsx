import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, FolderPlus, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import ElectionCard from "@/components/elections/ElectionCard";
import type { Election, ElectionGroup, ElectionResult } from "@/components/elections/types";

const Elections = () => {
  const { user, isVorstand } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [groupForm, setGroupForm] = useState({ title: "", votes_per_member: 1 });
  const [showElectionForm, setShowElectionForm] = useState<string | null>(null);
  const [electionForm, setElectionForm] = useState({ title: "", description: "", candidates: "" });

  // Realtime subscription for elections
  useEffect(() => {
    const channel = supabase
      .channel("elections-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "elections" }, () => {
        queryClient.invalidateQueries({ queryKey: ["elections"] });
        queryClient.invalidateQueries({ queryKey: ["election_results"] });
        queryClient.invalidateQueries({ queryKey: ["my_votes"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: groups = [], isLoading: loadingGroups } = useQuery({
    queryKey: ["election_groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("election_groups" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as unknown as ElectionGroup[];
    },
  });

  const { data: elections = [], isLoading: loadingElections } = useQuery({
    queryKey: ["elections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("elections")
        .select("*, candidates(*)")
        .order("created_at", { ascending: true });
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

  const { data: totalMembers = 1 } = useQuery({
    queryKey: ["total_members"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("count_members");
      if (error) return 1;
      return Number(data) || 1;
    },
  });

  const getMyVoteCount = (electionId: string) =>
    myVotes.filter((v) => v.election_id === electionId).length;

  const createGroup = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("election_groups" as any).insert({
        title: groupForm.title,
        votes_per_member: groupForm.votes_per_member,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["election_groups"] });
      setShowGroupForm(false);
      setGroupForm({ title: "", votes_per_member: 1 });
      toast({ title: "Klammer erstellt" });
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

  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from("election_groups" as any).delete().eq("id", groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["election_groups"] });
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      toast({ title: "Klammer gelöscht" });
    },
  });

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ["elections"] });
    queryClient.invalidateQueries({ queryKey: ["election_results"] });
    queryClient.invalidateQueries({ queryKey: ["my_votes"] });
    queryClient.invalidateQueries({ queryKey: ["election_groups"] });
    toast({ title: "Aktualisiert" });
  };

  const isLoading = loadingGroups || loadingElections;

  // Filter elections: non-Vorstand only see active/closed
  const visibleElections = isVorstand
    ? elections
    : elections.filter((e) => e.status !== "draft");

  const getGroupElections = (groupId: string) =>
    visibleElections.filter((e) => e.group_id === groupId);

  const ungroupedElections = visibleElections.filter((e) => !e.group_id);

  return (
    <div className="container py-12 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>
        <div className="flex items-center justify-between mb-6 gap-2 flex-wrap">
          <h1 className="font-serif text-2xl font-bold">Abstimmungen</h1>
          <div className="flex gap-2">
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
                <FolderPlus size={16} /> Neue Klammer
              </button>
            )}
          </div>
        </div>

        {/* Create group form */}
        {showGroupForm && (
          <div className="p-4 rounded-lg border bg-card mb-6 space-y-3">
            <h3 className="text-sm font-semibold">Neue Klammer erstellen</h3>
            <input
              placeholder="Titel (z.B. JHV 2026) *"
              value={groupForm.title}
              onChange={(e) => setGroupForm({ ...groupForm, title: e.target.value })}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
            <div className="flex items-center gap-3">
              <label className="text-sm">Stimmen pro Mitglied:</label>
              <input
                type="number"
                min={1}
                max={20}
                value={groupForm.votes_per_member}
                onChange={(e) => setGroupForm({ ...groupForm, votes_per_member: Math.max(1, parseInt(e.target.value) || 1) })}
                className="w-20 h-10 rounded-md border border-input bg-background px-3 text-sm text-center"
              />
            </div>
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
            {/* Groups */}
            {groups.map((group) => {
              const groupElections = getGroupElections(group.id);
              // Non-Vorstand: hide empty groups (all drafts)
              if (!isVorstand && groupElections.length === 0) return null;

              return (
                <div key={group.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-serif text-xl font-bold">{group.title}</h2>
                      <p className="text-xs text-muted-foreground">
                        {group.votes_per_member} Stimme{group.votes_per_member !== 1 ? "n" : ""} pro Mitglied
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {isVorstand && (
                        <>
                          <button
                            onClick={() => setShowElectionForm(showElectionForm === group.id ? null : group.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <Plus size={14} /> Abstimmung
                          </button>
                          {groupElections.length === 0 && (
                            <button
                              onClick={() => deleteGroup.mutate(group.id)}
                              className="px-3 py-1.5 text-xs rounded-md border text-destructive hover:bg-destructive/10"
                            >
                              Klammer löschen
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Create election form within group */}
                  {showElectionForm === group.id && (
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
                    <p className="text-sm text-muted-foreground italic pl-1">Noch keine Abstimmungen in dieser Klammer.</p>
                  ) : (
                    <div className="space-y-3 pl-4 border-l-2 border-primary/20">
                      {groupElections.map((election) => (
                        <ElectionCard
                          key={election.id}
                          election={election}
                          results={results}
                          myVoteCount={getMyVoteCount(election.id)}
                          maxVotes={group.votes_per_member}
                          totalMembers={totalMembers}
                          isVorstand={isVorstand}
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
                  {ungroupedElections.map((election) => (
                    <ElectionCard
                      key={election.id}
                      election={election}
                      results={results}
                      myVoteCount={getMyVoteCount(election.id)}
                      maxVotes={1}
                      totalMembers={totalMembers}
                      isVorstand={isVorstand}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Elections;
