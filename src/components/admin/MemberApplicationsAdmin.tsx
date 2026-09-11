import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { invokeFunction } from "@/lib/functionError";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Eye, Clock, CheckCircle2, XCircle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { useDefaultRole } from "@/hooks/useDefaultRole";

type Application = {
  id: string;
  created_at: string;
  salutation: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  birthdate: string | null;
  street: string | null;
  zip: string | null;
  city: string | null;
  membership_type: string;
  contribution_interval: string;
  statutes_accepted: boolean;
  data_processing_accepted: boolean;
  /** Antworten auf die Zusatzfragen. Aus der Datenbank kommt schlichtes JSON –
   *  die Form wird erst beim Anzeigen geprueft. */
  extra: unknown;
  status: string;
  reviewed_at: string | null;
  review_notes: string | null;
};

const statusBadge = (status: string) => {
  switch (status) {
    case "pending":
      return <Badge variant="secondary" className="gap-1"><Clock size={10} /> Ausstehend</Badge>;
    case "approved":
      return <Badge className="gap-1 bg-green-500 text-white"><CheckCircle2 size={10} /> Genehmigt</Badge>;
    case "rejected":
      return <Badge variant="destructive" className="gap-1"><XCircle size={10} /> Abgelehnt</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

/** Die Zusatzantworten in einer Form, die sich anzeigen laesst. */
function zusatzAngaben(roh: unknown): [string, { label: string; wert: unknown }][] {
  if (!roh || typeof roh !== "object" || Array.isArray(roh)) return [];
  return Object.entries(roh as Record<string, unknown>)
    .filter(([, e]) => e && typeof e === "object" && "wert" in (e as object))
    .map(([id, e]) => [id, e as { label: string; wert: unknown }]);
}

const formatDate = (d: string | null) => {
  if (!d) return "–";
  try { return format(parseISO(d), "dd.MM.yyyy", { locale: de }); } catch { return d; }
};

const intervalLabel = (v: string) =>
  v === "halbjaehrlich" ? "Halbjährlich" : "Jährlich";

const MemberApplicationsAdmin = () => {
  // Welche Rolle ein angenommener Antrag bekommt, steht in den Einstellungen –
  // „mitglied" gibt es in einer Installation mit eigenen Rollennamen womoeglich
  // gar nicht.
  const defaultRole = useDefaultRole();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<Application | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [showPending, setShowPending] = useState(true);
  const [showOther, setShowOther] = useState(false);

  const { data: applications = [], isLoading } = useQuery({
    queryKey: ["membership_applications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membership_applications")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Application[];
    },
  });

  const pending = applications.filter((a) => a.status === "pending");
  const processed = applications.filter((a) => a.status !== "pending");

  const approveMutation = useMutation({
    mutationFn: async (app: Application) => {
      // Invite the member; the edge function also generates the PDF,
      // pre-fills the profile and attaches the application to the member.
      await invokeFunction("invite-member", {
        body: { email: app.email, role: defaultRole, applicationId: app.id },
      });

      // Mark application as approved
      const { error: updateErr } = await supabase
        .from("membership_applications")
        .update({ status: "approved", reviewed_by: user?.id, reviewed_at: new Date().toISOString() })
        .eq("id", app.id);
      if (updateErr) throw updateErr;
    },
    onSuccess: (_, app) => {
      queryClient.invalidateQueries({ queryKey: ["membership_applications"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setSelected(null);
      toast({
        title: "Antrag genehmigt",
        description: `${app.first_name} ${app.last_name} wurde eingeladen, das Profil befüllt und der Antrag als PDF im Profil hinterlegt.`,
      });
    },
    onError: (e: any) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  const rejectMutation = useMutation({
    mutationFn: async (app: Application) => {
      const { error } = await supabase
        .from("membership_applications")
        .update({
          status: "rejected",
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          review_notes: rejectNotes || null,
        })
        .eq("id", app.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["membership_applications"] });
      setSelected(null);
      setShowReject(false);
      setRejectNotes("");
      toast({ title: "Antrag abgelehnt" });
    },
    onError: (e: any) => toast({ title: "Fehler", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="text-sm text-muted-foreground py-6">Lade Anträge…</div>;

  return (
    <div className="space-y-4">
      {/* Link to public form */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40 border">
        <span className="text-sm text-muted-foreground">Öffentlicher Anmeldelink:</span>
        <a
          href="/mitglied-werden"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-primary hover:underline"
        >
          /mitglied-werden <ExternalLink size={12} />
        </a>
      </div>

      {applications.length === 0 && (
        <div className="text-center py-10 text-sm text-muted-foreground">
          Noch keine Anträge eingegangen.
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div>
          <button
            onClick={() => setShowPending((v) => !v)}
            className="flex items-center gap-2 w-full text-left text-sm font-semibold mb-2 py-1"
          >
            <Clock size={14} className="text-amber-500" />
            Ausstehend ({pending.length})
            {showPending ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
          </button>
          {showPending && (
            <div className="space-y-2">
              {pending.map((app) => (
                <button
                  key={app.id}
                  onClick={() => { setSelected(app); setShowReject(false); setRejectNotes(""); }}
                  className="w-full text-left p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors"
                >
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium block truncate">{app.first_name} {app.last_name}</span>
                      <span className="text-xs text-muted-foreground block truncate">{app.email}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {statusBadge(app.status)}
                      <span className="text-xs text-muted-foreground">{formatDate(app.created_at)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Processed */}
      {processed.length > 0 && (
        <div>
          <button
            onClick={() => setShowOther((v) => !v)}
            className="flex items-center gap-2 w-full text-left text-sm font-semibold text-muted-foreground mb-2 py-1 border-t pt-4"
          >
            Bearbeitet ({processed.length})
            {showOther ? <ChevronUp size={14} className="ml-auto" /> : <ChevronDown size={14} className="ml-auto" />}
          </button>
          {showOther && (
            <div className="space-y-2">
              {processed.map((app) => (
                <button
                  key={app.id}
                  onClick={() => { setSelected(app); setShowReject(false); setRejectNotes(""); }}
                  className="w-full text-left p-3 rounded-lg border bg-card hover:border-primary/50 transition-colors opacity-75"
                >
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                    <div className="min-w-0">
                      <span className="text-sm font-medium block truncate">{app.first_name} {app.last_name}</span>
                      <span className="text-xs text-muted-foreground block truncate">{app.email}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {statusBadge(app.status)}
                      <span className="text-xs text-muted-foreground">{formatDate(app.created_at)}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.first_name} {selected?.last_name}
              {selected && statusBadge(selected.status)}
            </DialogTitle>
            <DialogDescription>
              Eingegangen am {formatDate(selected?.created_at ?? null)}
            </DialogDescription>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 text-sm">
              {/* Personal data */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Persönliche Daten</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {selected.salutation && <><span className="text-muted-foreground">Anrede</span><span>{selected.salutation}</span></>}
                  <span className="text-muted-foreground">Name</span>
                  <span>{selected.first_name} {selected.last_name}</span>
                  <span className="text-muted-foreground">E-Mail</span>
                  <span className="break-all">{selected.email}</span>
                  {selected.phone && <><span className="text-muted-foreground">Telefon</span><span>{selected.phone}</span></>}
                  <span className="text-muted-foreground">Geburtsdatum</span>
                  <span>{formatDate(selected.birthdate)}</span>
                  <span className="text-muted-foreground">Adresse</span>
                  <span>{selected.street}, {selected.zip} {selected.city}</span>
                </div>
              </div>

              {/* Zusatzfragen – nur wenn welche gestellt und beantwortet wurden.
                  Sie stehen sonst erst im gedruckten Antrag, und wer hier
                  entscheidet, sieht sie gar nicht. */}
              {zusatzAngaben(selected.extra).length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Weitere Angaben
                  </h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {zusatzAngaben(selected.extra).map(([id, eintrag]) => (
                      <div key={id} className="contents">
                        <span className="text-muted-foreground">{eintrag.label}</span>
                        <span className="break-words">
                          {Array.isArray(eintrag.wert)
                            ? eintrag.wert.join(", ")
                            : typeof eintrag.wert === "boolean"
                            ? (eintrag.wert ? "ja" : "nein")
                            : String(eintrag.wert ?? "")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Membership */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Mitgliedschaft</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <span className="text-muted-foreground">Beitragseinzug</span>
                  <span>{intervalLabel(selected.contribution_interval)}</span>
                </div>
              </div>

              {/* Consents */}
              <div>
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Einverständnis</h4>
                <div className="space-y-1">
                  {[
                    { ok: selected.statutes_accepted, label: "Satzung anerkannt" },
                    { ok: selected.data_processing_accepted, label: "Datenschutz zugestimmt" },
                  ].map(({ ok, label }) => (
                    <div key={label} className="flex items-center gap-2">
                      {ok
                        ? <Check size={14} className="text-green-500" />
                        : <X size={14} className="text-destructive" />}
                      <span className={ok ? "" : "text-destructive"}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rejection notes */}
              {selected.review_notes && (
                <div className="p-3 rounded bg-muted/50">
                  <span className="text-xs font-semibold text-muted-foreground block mb-1">Ablehnungsnotiz</span>
                  <p className="text-sm">{selected.review_notes}</p>
                </div>
              )}

              {/* Reject form */}
              {showReject && selected.status === "pending" && (
                <div className="space-y-2 border rounded-lg p-3">
                  <label className="text-xs font-medium">Notiz (optional)</label>
                  <textarea
                    value={rejectNotes}
                    onChange={(e) => setRejectNotes(e.target.value)}
                    rows={3}
                    placeholder="Begründung für die Ablehnung…"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => rejectMutation.mutate(selected)}
                      disabled={rejectMutation.isPending}
                    >
                      Ablehnen bestätigen
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowReject(false)}>
                      Abbrechen
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {selected?.status === "pending" && !showReject && (
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setShowReject(true)}
              >
                <X size={14} className="mr-1" /> Ablehnen
              </Button>
              <Button
                onClick={() => {
                  if (confirm(`${selected.first_name} ${selected.last_name} aufnehmen und Einladungs-E-Mail senden?`)) {
                    approveMutation.mutate(selected);
                  }
                }}
                disabled={approveMutation.isPending}
              >
                <Check size={14} className="mr-1" /> Genehmigen & einladen
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemberApplicationsAdmin;
