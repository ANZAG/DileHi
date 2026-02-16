import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Play, Square, Trash2, Pencil, CheckCircle2, Plus, Minus } from "lucide-react";
import type { Election, ElectionResult } from "./types";

interface Props {
  election: Election;
  results: ElectionResult[];
  hasVoted: boolean;
  myVoteCount: number;
  totalMembers: number;
  totalPossibleVotes: number;
  isVorstand: boolean;
}

const formatTimestamp = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", hour12: false });
};

const ElectionCard = ({ election, results, hasVoted, myVoteCount, totalMembers, totalPossibleVotes, isVorstand }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: election.title,
    description: election.description || "",
    candidates: election.candidates.map((c) => c.name).join("\n"),
  });

  // Vote allocation state: { candidateId: count }
  const [voteAllocation, setVoteAllocation] = useState<Record<string, number>>({});
  const allocatedTotal = Object.values(voteAllocation).reduce((s, v) => s + v, 0);

  const electionResults = results
    .filter((r) => r.election_id === election.id)
    .sort((a, b) => b.vote_count - a.vote_count);
  const totalVotes = electionResults.reduce((sum, r) => sum + r.vote_count, 0);
  const canVote = election.status === "active" && !hasVoted && myVoteCount > 0;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["elections"] });
    queryClient.invalidateQueries({ queryKey: ["election_results"] });
    queryClient.invalidateQueries({ queryKey: ["my_votes"] });
  };

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const updates: Record<string, unknown> = { status };
      if (status === "closed") updates.closed_at = new Date().toISOString();
      const { error } = await supabase.from("elections").update(updates).eq("id", election.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      toast({ title: "Status aktualisiert" });
    },
  });

  const castVotes = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const votes = Object.entries(voteAllocation)
        .filter(([, count]) => count > 0)
        .map(([candidate_id, count]) => ({ candidate_id, count }));
      const { error } = await supabase.rpc("cast_votes", {
        _election_id: election.id,
        _voter_id: user.id,
        _votes: votes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      setVoteAllocation({});
      toast({ title: "Stimmen abgegeben" });
    },
    onError: (err: any) => {
      const msg = err?.message || "Fehler bei der Stimmabgabe";
      toast({ title: msg, variant: "destructive" });
    },
  });

  const deleteElection = useMutation({
    mutationFn: async () => {
      if (election.status === "closed") {
        const snapshot = electionResults.map((r) => ({
          candidate: r.candidate_name,
          votes: r.vote_count,
        }));
        let groupTitle = null;
        if (election.group_id) {
          const { data } = await supabase
            .from("election_groups" as any)
            .select("title")
            .eq("id", election.group_id)
            .single();
          groupTitle = (data as any)?.title || null;
        }
        await supabase.from("election_audit_log" as any).insert({
          election_title: election.title,
          election_description: election.description,
          group_title: groupTitle,
          result_snapshot: snapshot,
          total_votes: totalVotes,
          deleted_by: user!.id,
        });
      }
      await supabase.from("votes").delete().eq("election_id", election.id);
      await supabase.from("candidates").delete().eq("election_id", election.id);
      const { error } = await supabase.from("elections").delete().eq("id", election.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      setShowDeleteConfirm(false);
      toast({ title: "Abstimmung gelöscht" });
    },
    onError: () => toast({ title: "Fehler beim Löschen", variant: "destructive" }),
  });

  const saveEdit = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("elections")
        .update({ title: editForm.title, description: editForm.description || null })
        .eq("id", election.id);
      if (error) throw error;
      await supabase.from("candidates").delete().eq("election_id", election.id);
      const names = editForm.candidates.split("\n").map((c) => c.trim()).filter(Boolean);
      if (names.length > 0) {
        const { error: cErr } = await supabase
          .from("candidates")
          .insert(names.map((name) => ({ election_id: election.id, name })));
        if (cErr) throw cErr;
      }
    },
    onSuccess: () => {
      invalidateAll();
      setEditing(false);
      toast({ title: "Abstimmung aktualisiert" });
    },
    onError: () => toast({ title: "Fehler beim Speichern", variant: "destructive" }),
  });

  const adjustVote = (candidateId: string, delta: number) => {
    setVoteAllocation((prev) => {
      const current = prev[candidateId] || 0;
      const newVal = Math.max(0, current + delta);
      if (delta > 0 && allocatedTotal >= myVoteCount) return prev;
      return { ...prev, [candidateId]: newVal };
    });
  };

  if (editing && election.status === "draft") {
    return (
      <div className="p-4 rounded-lg border bg-card space-y-3">
        <input
          value={editForm.title}
          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
          className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold"
        />
        <textarea
          placeholder="Beschreibung (optional)"
          value={editForm.description}
          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
        />
        <textarea
          placeholder="Kandidaten / Optionen (eine pro Zeile)"
          value={editForm.candidates}
          onChange={(e) => setEditForm({ ...editForm, candidates: e.target.value })}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
        />
        <div className="flex gap-2">
          <button
            onClick={() => editForm.title && editForm.candidates && saveEdit.mutate()}
            disabled={!editForm.title || !editForm.candidates || saveEdit.isPending}
            className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Speichern
          </button>
          <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm rounded-md border hover:bg-muted">
            Abbrechen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-serif text-lg font-semibold">{election.title}</h3>
            <span
              className={`text-xs px-2 py-0.5 rounded ${
                election.status === "active"
                  ? "bg-primary/10 text-primary"
                  : election.status === "closed"
                  ? "bg-muted text-muted-foreground"
                  : "bg-accent/20 text-accent-foreground"
              }`}
            >
              {election.status === "active" ? "Aktiv" : election.status === "closed" ? "Geschlossen" : "Entwurf"}
              {election.status === "active" && isVorstand && (
                <span className="ml-1">({totalVotes}/{totalPossibleVotes} Stimmen)</span>
              )}
            </span>
            {election.status === "closed" && election.closed_at && (
              <span className="text-xs text-muted-foreground">{formatTimestamp(election.closed_at)}</span>
            )}
          </div>
          {election.description && <p className="text-sm text-muted-foreground mt-1">{election.description}</p>}
        </div>
        {isVorstand && (
          <div className="flex gap-1">
            {election.status === "draft" && (
              <>
                <button onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-muted text-muted-foreground" title="Bearbeiten">
                  <Pencil size={16} />
                </button>
                <button onClick={() => updateStatus.mutate("active")} className="p-1.5 rounded hover:bg-muted text-primary" title="Starten">
                  <Play size={16} />
                </button>
              </>
            )}
            {election.status === "active" && (
              <button onClick={() => updateStatus.mutate("closed")} className="p-1.5 rounded hover:bg-muted text-destructive" title="Beenden">
                <Square size={16} />
              </button>
            )}
            <button onClick={() => setShowDeleteConfirm(true)} className="p-1.5 rounded hover:bg-muted text-destructive" title="Löschen">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 mb-3 space-y-2">
          <p className="text-sm font-medium text-destructive">
            Soll diese Abstimmung wirklich gelöscht werden?
            {election.status === "closed" && " Ein Logeintrag wird erstellt."}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => deleteElection.mutate()}
              disabled={deleteElection.isPending}
              className="px-3 py-1.5 text-sm rounded-md bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              Ja, löschen
            </button>
            <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Cumulative voting area */}
      {canVote && (
        <div className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              Deine Stimmen verteilen:
            </p>
            <span className={`text-sm font-medium ${allocatedTotal === myVoteCount ? "text-primary" : allocatedTotal > myVoteCount ? "text-destructive" : "text-muted-foreground"}`}>
              {allocatedTotal} / {myVoteCount} Stimmen vergeben
            </span>
          </div>
          {election.candidates?.map((c) => {
            const count = voteAllocation[c.id] || 0;
            return (
              <div key={c.id} className="flex items-center justify-between px-4 py-2.5 rounded-md border">
                <span className="text-sm">{c.name}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjustVote(c.id, -1)}
                    disabled={count === 0}
                    className="p-1 rounded hover:bg-muted disabled:opacity-30"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-sm font-medium w-8 text-center">{count}</span>
                  <button
                    onClick={() => adjustVote(c.id, 1)}
                    disabled={allocatedTotal >= myVoteCount}
                    className="p-1 rounded hover:bg-muted disabled:opacity-30"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            );
          })}
          <button
            onClick={() => {
              if (allocatedTotal !== myVoteCount) {
                toast({
                  title: `Du musst genau ${myVoteCount} Stimme${myVoteCount !== 1 ? "n" : ""} vergeben`,
                  description: `Aktuell: ${allocatedTotal} von ${myVoteCount}`,
                  variant: "destructive",
                });
                return;
              }
              castVotes.mutate();
            }}
            disabled={castVotes.isPending}
            className="mt-1 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Stimmen abgeben
          </button>
        </div>
      )}

      {/* Already voted */}
      {election.status === "active" && hasVoted && (
        <div className="mt-4 p-3 rounded-md bg-muted text-sm text-muted-foreground flex items-center gap-2">
          <CheckCircle2 size={16} className="text-primary" />
          Du hast bereits abgestimmt. Das Ergebnis wird nach Abschluss sichtbar.
        </div>
      )}

      {/* No votes (represented) */}
      {election.status === "active" && !hasVoted && myVoteCount === 0 && (
        <div className="mt-4 p-3 rounded-md bg-muted text-sm text-muted-foreground">
          Du wirst in dieser Abstimmung vertreten und kannst nicht selbst abstimmen.
        </div>
      )}

      {/* Results */}
      {election.status === "closed" && electionResults.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">
            Ergebnis ({totalVotes} von {totalPossibleVotes} möglichen Stimmen):
          </p>
          {electionResults.map((r) => {
            const pct = totalVotes > 0 ? Math.round((r.vote_count / totalVotes) * 100) : 0;
            return (
              <div key={r.candidate_id} className="flex items-center gap-3">
                <span className="text-sm w-32 truncate">{r.candidate_name}</span>
                <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-sm font-medium w-16 text-right">
                  {r.vote_count} ({pct}%)
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ElectionCard;
