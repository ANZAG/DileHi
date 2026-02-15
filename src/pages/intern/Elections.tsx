import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Plus, Play, Square, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const Elections = () => {
  const { user, isVorstand } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", candidates: "" });

  const { data: elections = [], isLoading } = useQuery({
    queryKey: ["elections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("elections")
        .select("*, candidates(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: results = [] } = useQuery({
    queryKey: ["election_results"],
    queryFn: async () => {
      const { data, error } = await supabase.from("election_results").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: myVotes = [] } = useQuery({
    queryKey: ["my_votes", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("votes").select("election_id").eq("voter_id", user.id);
      if (error) return [];
      return data.map((v) => v.election_id);
    },
  });

  const createElection = useMutation({
    mutationFn: async () => {
      const { data: election, error } = await supabase
        .from("elections")
        .insert({ title: form.title, description: form.description || null, created_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      const candidateNames = form.candidates.split("\n").map((c) => c.trim()).filter(Boolean);
      if (candidateNames.length > 0) {
        const { error: cErr } = await supabase.from("candidates").insert(
          candidateNames.map((name) => ({ election_id: election.id, name }))
        );
        if (cErr) throw cErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      setShowForm(false);
      setForm({ title: "", description: "", candidates: "" });
      toast({ title: "Abstimmung erstellt" });
    },
    onError: () => toast({ title: "Fehler", variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, unknown> = { status };
      if (status === "closed") updates.closed_at = new Date().toISOString();
      const { error } = await supabase.from("elections").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elections"] });
      toast({ title: "Status aktualisiert" });
    },
  });

  const castVote = useMutation({
    mutationFn: async ({ electionId, candidateId }: { electionId: string; candidateId: string }) => {
      const { error } = await supabase.from("votes").insert({
        election_id: electionId,
        candidate_id: candidateId,
        voter_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["elections", "election_results", "my_votes"] });
      toast({ title: "Stimme abgegeben" });
    },
    onError: () => toast({ title: "Fehler bei der Stimmabgabe", variant: "destructive" }),
  });

  const getResults = (electionId: string) =>
    results.filter((r) => r.election_id === electionId).sort((a, b) => (b.vote_count as number) - (a.vote_count as number));

  return (
    <div className="container py-12 max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <Link to="/intern" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft size={16} /> Zurück
        </Link>
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-serif text-2xl font-bold">Abstimmungen</h1>
          {isVorstand && (
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus size={16} /> Neue Abstimmung
            </button>
          )}
        </div>

        {showForm && (
          <div className="p-4 rounded-lg border bg-card mb-6 space-y-3">
            <input
              placeholder="Titel der Abstimmung *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            />
            <textarea
              placeholder="Beschreibung (optional)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[60px]"
            />
            <textarea
              placeholder="Kandidaten / Optionen (eine pro Zeile) *"
              value={form.candidates}
              onChange={(e) => setForm({ ...form, candidates: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[80px]"
            />
            <button
              onClick={() => form.title && form.candidates && createElection.mutate()}
              disabled={!form.title || !form.candidates || createElection.isPending}
              className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Erstellen
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="text-center text-muted-foreground py-12">Laden...</div>
        ) : elections.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">Noch keine Abstimmungen.</div>
        ) : (
          <div className="space-y-4">
            {elections.map((election) => {
              const hasVoted = myVotes.includes(election.id);
              const electionResults = getResults(election.id);
              const totalVotes = electionResults.reduce((sum, r) => sum + (r.vote_count as number), 0);

              return (
                <div key={election.id} className="p-5 rounded-lg border bg-card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-serif text-lg font-semibold">{election.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          election.status === "active" ? "bg-primary/10 text-primary" :
                          election.status === "closed" ? "bg-muted text-muted-foreground" :
                          "bg-accent/20 text-accent-foreground"
                        }`}>
                          {election.status === "active" ? "Aktiv" : election.status === "closed" ? "Geschlossen" : "Entwurf"}
                        </span>
                      </div>
                      {election.description && <p className="text-sm text-muted-foreground mt-1">{election.description}</p>}
                    </div>
                    {isVorstand && (
                      <div className="flex gap-1">
                        {election.status === "draft" && (
                          <button
                            onClick={() => updateStatus.mutate({ id: election.id, status: "active" })}
                            className="p-1.5 rounded hover:bg-muted text-green-600"
                            title="Starten"
                          >
                            <Play size={16} />
                          </button>
                        )}
                        {election.status === "active" && (
                          <button
                            onClick={() => updateStatus.mutate({ id: election.id, status: "closed" })}
                            className="p-1.5 rounded hover:bg-muted text-red-600"
                            title="Beenden"
                          >
                            <Square size={16} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Voting area */}
                  {election.status === "active" && !hasVoted && (
                    <div className="space-y-2 mt-4">
                      <p className="text-sm font-medium">Deine Stimme abgeben:</p>
                      {election.candidates?.map((c: { id: string; name: string }) => (
                        <button
                          key={c.id}
                          onClick={() => castVote.mutate({ electionId: election.id, candidateId: c.id })}
                          disabled={castVote.isPending}
                          className="block w-full text-left px-4 py-2.5 text-sm rounded-md border hover:bg-primary/5 hover:border-primary transition-colors"
                        >
                          {c.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {election.status === "active" && hasVoted && (
                    <div className="mt-4 p-3 rounded-md bg-muted text-sm text-muted-foreground flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-primary" />
                      Du hast bereits abgestimmt. Das Ergebnis wird nach Abschluss sichtbar.
                    </div>
                  )}

                  {/* Results */}
                  {election.status === "closed" && electionResults.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <p className="text-sm font-medium">Ergebnis ({totalVotes} Stimmen):</p>
                      {electionResults.map((r) => {
                        const pct = totalVotes > 0 ? Math.round(((r.vote_count as number) / totalVotes) * 100) : 0;
                        return (
                          <div key={r.candidate_id} className="flex items-center gap-3">
                            <span className="text-sm w-32 truncate">{r.candidate_name}</span>
                            <div className="flex-1 h-6 bg-muted rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-sm font-medium w-16 text-right">{r.vote_count} ({pct}%)</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default Elections;
