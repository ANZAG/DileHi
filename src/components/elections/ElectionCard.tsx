import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Play, Square, Trash2, Pencil, CheckCircle2, Plus, Minus, ChevronDown, ChevronRight } from "lucide-react";
import type { Election, ElectionResult } from "./types";

interface Props {
  election: Election;
  results: ElectionResult[];
  hasVoted: boolean;
  myVoteCount: number;
  totalMembers: number;
  totalPossibleVotes: number;
  defaultOpen?: boolean;
}

const formatTimestamp = (iso: string) => {
  const d = new Date(iso);
  return (
    d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " " +
    d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", hour12: false })
  );
};

const ElectionCard = ({ election, results, hasVoted, myVoteCount, totalMembers, totalPossibleVotes, defaultOpen = true }: Props) => {
  const { user, hasPermission } = useAuth();
  const isVorstand = hasPermission("elections.manage");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [expanded, setExpanded] = useState(defaultOpen);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    title: election.title,
    description: election.description || "",
    candidates: election.candidates.map((c) => c.name).join("\n"),
  });

  // Vote allocation state: { candidateId: count }
  const [voteAllocation, setVoteAllocation] = useState<Record<string, number>>({});

  const electionResults = useMemo(
    () =>
      results
        .filter((r) => r.election_id === election.id)
        .sort((a, b) => b.vote_count - a.vote_count),
    [results, election.id]
  );

  const totalVotes = useMemo(() => electionResults.reduce((sum, r) => sum + r.vote_count, 0), [electionResults]);

  // 1) usedVotes: Jede Stimme ist eine Zeile in votes -> COUNT(*) (election_id, voter_id)
  const { data: usedVotes = 0 } = useQuery({
    queryKey: ["my_votes_used", election.id, user?.id],
    enabled: !!user?.id && election.status === "active",
    queryFn: async () => {
      const { count, error } = await supabase
        .from("votes" as any)
        .select("id", { count: "exact", head: true })
        .eq("election_id", election.id)
        .eq("voter_id", user!.id);

      if (error) throw error;
      return count ?? 0;
    },
  });

  // 2) remainingVotes: neue Stimmen (z.B. durch Stellvertretung) = myVoteCount - usedVotes
  const remainingVotes = Math.max(0, myVoteCount - usedVotes);

  // ALT war: election.status==="active" && !hasVoted && myVoteCount>0
  // NEU: solange remainingVotes > 0 darf weiter gewählt werden
  const canVote = election.status === "active" && remainingVotes > 0;

  const allocatedTotal = useMemo(
    () => Object.values(voteAllocation).reduce((s, v) => s + v, 0),
    [voteAllocation]
  );

  // Wenn sich Election oder remainingVotes ändert, setze die aktuelle Auswahl zurück,
  // damit keine "alte" Verteilung gegen ein neues Limit läuft.
  useEffect(() => {
    setVoteAllocation({});
  }, [election.id, remainingVotes]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["elections"] });
    queryClient.invalidateQueries({ queryKey: ["election_results"] });
    queryClient.invalidateQueries({ queryKey: ["my_votes"] });
    if (user?.id) queryClient.invalidateQueries({ queryKey: ["my_votes_used", election.id, user.id] });
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

      // cast_votes erwartet candidate_id + count (siehe SQL)
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
            .from("election_groups")
            .select("title")
            .eq("id", election.group_id)
            .single();
          groupTitle = data?.title || null;
        }
        await supabase.from("election_audit_log").insert({
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

  // Wasserdicht: Limitprüfung basierend auf prev + remainingVotes (kein stale allocatedTotal)
  const adjustVote = (candidateId: string, delta: number) => {
    setVoteAllocation((prev) => {
      const current = prev[candidateId] || 0;
      const newVal = Math.max(0, current + delta);

      const prevTotal = Object.values(prev).reduce((s, v) => s + v, 0);

      // Wenn wir erhöhen wollen, aber schon am Limit sind -> blocken
      if (delta > 0 && prevTotal >= remainingVotes) return prev;

      // Wenn wir nichts ändern -> prev zurück
      if (newVal === current) return prev;

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
      <div className="flex items-start justify-between mb-3 gap-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-start gap-2 text-left min-w-0 flex-1"
          aria-expanded={expanded}
        >
          <span className="mt-1 text-muted-foreground shrink-0">
            {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
          </span>
          <div className="min-w-0">
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
        </button>

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
            <button onClick={() => setShowDeleteConfirm(false)} className="px-3 py-1.5 text-sm rounded-md border hover:bg-muted">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {expanded && (
      <>
      {/* Hinweis bei bereits abgegebenen Stimmen */}
      {election.status === "active" && hasVoted && (
        <div className="mt-4 p-3 rounded-md bg-muted text-sm text-muted-foreground flex items-center gap-2">
          <CheckCircle2 size={16} className="text-primary" />
          {remainingVotes > 0
            ? `Du hast bereits abgestimmt. Du hast noch ${remainingVotes} zusätzliche Stimme${remainingVotes !== 1 ? "n" : ""} offen.`
            : "Du hast bereits abgestimmt. Das Ergebnis wird nach Abschluss sichtbar."}
        </div>
      )}

      {/* No votes (represented) */}
      {election.status === "active" && !hasVoted && myVoteCount === 0 && (
        <div className="mt-4 p-3 rounded-md bg-muted text-sm text-muted-foreground">
          Du wirst in dieser Abstimmung vertreten und kannst nicht selbst abstimmen.
        </div>
      )}

      {/* Cumulative voting area (NEU: basiert auf remainingVotes) */}
      {canVote && (
        <div className="space-y-3 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Deine Stimmen verteilen:</p>
            <span
              className={`text-sm font-medium ${
                allocatedTotal === remainingVotes
                  ? "text-primary"
                  : allocatedTotal > remainingVotes
                  ? "text-destructive"
                  : "text-muted-foreground"
              }`}
            >
              {allocatedTotal} / {remainingVotes} Stimmen vergeben
            </span>
          </div>

          {election.candidates?.map((c) => {
            const count = voteAllocation[c.id] || 0;
            return (
              <div key={c.id} className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-md border">
                <span className="text-sm break-words min-w-0">{c.name}</span>
                <div className="flex items-center gap-2 shrink-0">

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
                    disabled={allocatedTotal >= remainingVotes}
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
              if (allocatedTotal !== remainingVotes) {
                toast({
                  title: `Du musst genau ${remainingVotes} Stimme${remainingVotes !== 1 ? "n" : ""} vergeben`,
                  description: `Aktuell: ${allocatedTotal} von ${remainingVotes}`,
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

      {/* Results */}
      {election.status === "closed" && electionResults.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">
            Ergebnis ({totalVotes} von {totalPossibleVotes} möglichen Stimmen):
          </p>
          {electionResults.map((r) => {
            const pct = totalVotes > 0 ? Math.round((r.vote_count / totalVotes) * 100) : 0;
            return (
              <div key={r.candidate_id} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm break-words min-w-0">{r.candidate_name}</span>
                  <span className="text-sm font-medium whitespace-nowrap shrink-0">
                    {r.vote_count} ({pct}%)
                  </span>
                </div>
                <div className="h-6 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
      </>
      )}
    </div>
  );
};

export default ElectionCard;
