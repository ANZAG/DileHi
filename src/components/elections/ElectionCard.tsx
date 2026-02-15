import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Play, Square, Trash2, Pencil, CheckCircle2 } from "lucide-react";
import type { Election, ElectionResult } from "./types";

interface Props {
  election: Election;
  results: ElectionResult[];
  myVoteCount: number;
  maxVotes: number;
  totalMembers: number;
  isVorstand: boolean;
}

const formatTimestamp = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " + d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", hour12: false });
};

const ElectionCard = ({ election, results, myVoteCount, maxVotes, totalMembers, isVorstand }: Props) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCandidate, setSelectedCandidate] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: election.title,
    description: election.description || "",
    candidates: election.candidates.map((c) => c.name).join("\n"),
  });

  const electionResults = results
    .filter((r) => r.election_id === election.id)
    .sort((a, b) => b.vote_count - a.vote_count);
  const totalVotes = electionResults.reduce((sum, r) => sum + r.vote_count, 0);
  const totalPossibleVotes = maxVotes * totalMembers;
  const canVote = election.status === "active" && myVoteCount < maxVotes;

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

  const castVote = useMutation({
    mutationFn: async () => {
      if (!selectedCandidate || !user) return;
      const { error } = await supabase.from("votes").insert({
        election_id: election.id,
        candidate_id: selectedCandidate,
        voter_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAll();
      setSelectedCandidate(null);
      toast({ title: "Stimme abgegeben" });
    },
    onError: () => toast({ title: "Fehler bei der Stimmabgabe", variant: "destructive" }),
  });

  const deleteElection = useMutation({
    mutationFn: async () => {
      // If closed, create audit log entry first
      if (election.status === "closed") {
        const snapshot = electionResults.map((r) => ({
          candidate: r.candidate_name,
          votes: r.vote_count,
        }));
        // Get group title
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
      // Delete votes first, then candidates, then election
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
      // Update candidates: delete old, insert new
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
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                  title="Bearbeiten"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => updateStatus.mutate("active")}
                  className="p-1.5 rounded hover:bg-muted text-primary"
                  title="Starten"
                >
                  <Play size={16} />
                </button>
              </>
            )}
            {election.status === "active" && (
              <button
                onClick={() => updateStatus.mutate("closed")}
                className="p-1.5 rounded hover:bg-muted text-destructive"
                title="Beenden"
              >
                <Square size={16} />
              </button>
            )}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded hover:bg-muted text-destructive"
              title="Löschen"
            >
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
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Voting area - two-step: select then confirm */}
      {canVote && (
        <div className="space-y-2 mt-4">
          <p className="text-sm font-medium">
            Deine Stimme abgeben{maxVotes > 1 ? ` (${myVoteCount + 1}/${maxVotes})` : ""}:
          </p>
          {election.candidates?.map((c) => (
            <label
              key={c.id}
              className={`flex items-center gap-3 px-4 py-2.5 text-sm rounded-md border cursor-pointer transition-colors ${
                selectedCandidate === c.id
                  ? "bg-primary/10 border-primary"
                  : "hover:bg-muted"
              }`}
            >
              <input
                type="radio"
                name={`vote-${election.id}`}
                checked={selectedCandidate === c.id}
                onChange={() => setSelectedCandidate(c.id)}
                className="accent-primary"
              />
              {c.name}
            </label>
          ))}
          <button
            onClick={() => castVote.mutate()}
            disabled={!selectedCandidate || castVote.isPending}
            className="mt-2 px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Stimme abgeben
          </button>
        </div>
      )}

      {/* Already voted message */}
      {election.status === "active" && myVoteCount >= maxVotes && (
        <div className="mt-4 p-3 rounded-md bg-muted text-sm text-muted-foreground flex items-center gap-2">
          <CheckCircle2 size={16} className="text-primary" />
          Du hast bereits abgestimmt. Das Ergebnis wird nach Abschluss sichtbar.
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
