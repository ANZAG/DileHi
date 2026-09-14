import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { HeartPulse, Loader2, Plus, ShieldQuestion, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { datumDe } from "@/lib/datum";
import {
  db, istMinderjaehrig, useEinwilligungsArten, type Einwilligung, type Notfallkontakt,
} from "@/hooks/useEinwilligungen";

/**
 * „Einwilligungen und Notfallkontakt" im Profil.
 *
 * Jede Einwilligung einzeln, mit ihrem vollen Wortlaut – wer zustimmt, soll
 * wissen, wozu. Ja und Nein sind gleich gross; Nein ist keine schlechtere
 * Antwort. Bei Minderjährigen trägt ein Erziehungsberechtigter seinen Namen
 * ein. Jede Entscheidung landet mit Zeitpunkt im Protokoll des Vereins.
 */
export default function MeineEinwilligungen() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: arten = [] } = useEinwilligungsArten();

  const { data: geburtsdatum } = useQuery({
    queryKey: ["einwilligungen", "geburtsdatum", user?.id],
    queryFn: async (): Promise<string | null> => {
      const { data } = await db.from("profiles").select("birthdate").eq("id", user!.id).maybeSingle();
      return (data?.birthdate as string | null) ?? null;
    },
    enabled: !!user,
  });

  const { data: meine = [] } = useQuery({
    queryKey: ["einwilligungen", "meine", user?.id],
    queryFn: async (): Promise<Einwilligung[]> => {
      const { data, error } = await db.from("member_consents").select("*").eq("user_id", user!.id);
      if (error) throw new Error(error.message);
      return (data ?? []) as Einwilligung[];
    },
    enabled: !!user,
  });

  const { data: kontakte = [] } = useQuery({
    queryKey: ["einwilligungen", "kontakte", user?.id],
    queryFn: async (): Promise<Notfallkontakt[]> => {
      const { data, error } = await db.from("member_emergency_contacts").select("*").eq("user_id", user!.id).order("created_at");
      if (error) throw new Error(error.message);
      return (data ?? []) as Notfallkontakt[];
    },
    enabled: !!user,
  });

  const minderjaehrig = istMinderjaehrig(geburtsdatum);
  const [erziehungsberechtigt, setErziehungsberechtigt] = useState("");
  const [neuerKontakt, setNeuerKontakt] = useState<{ name: string; phone: string; relation: string } | null>(null);

  const entscheiden = useMutation({
    mutationFn: async ({ typeId, granted }: { typeId: string; granted: boolean }) => {
      const { error } = await db.from("member_consents").upsert(
        {
          user_id: user!.id,
          type_id: typeId,
          granted,
          guardian_name: minderjaehrig ? erziehungsberechtigt.trim() || null : null,
        },
        { onConflict: "user_id,type_id" }
      );
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["einwilligungen"] }),
    onError: (err: Error) => toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  const kontaktSpeichern = useMutation({
    mutationFn: async () => {
      const { error } = await db.from("member_emergency_contacts").insert({
        user_id: user!.id,
        name: neuerKontakt!.name.trim(),
        phone: neuerKontakt!.phone.trim(),
        relation: neuerKontakt!.relation.trim() || null,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setNeuerKontakt(null);
      qc.invalidateQueries({ queryKey: ["einwilligungen", "kontakte"] });
    },
    onError: (err: Error) => toast({ title: "Nicht gespeichert", description: err.message, variant: "destructive" }),
  });

  const kontaktLoeschen = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("member_emergency_contacts").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["einwilligungen", "kontakte"] }),
  });

  const aktiv = arten.filter((a) => a.is_active);

  return (
    <div data-tour="profil-einwilligungen" className="p-6 rounded-lg border bg-card space-y-5">
      <div>
        <h2 className="font-serif text-lg font-semibold flex items-center gap-2">
          <ShieldQuestion size={18} /> Einwilligungen
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Freiwillig und jederzeit änderbar. Eine Änderung gilt ab sofort, nicht rückwirkend.
        </p>
      </div>

      {minderjaehrig && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 space-y-2">
          <p className="text-sm text-amber-900">
            Laut Geburtsdatum bist du noch nicht volljährig. Deshalb entscheidet ein Erziehungsberechtigter.
          </p>
          <div>
            <Label className="text-xs text-amber-900" htmlFor="erziehungsberechtigt">Name des Erziehungsberechtigten</Label>
            <Input
              id="erziehungsberechtigt"
              className="h-9 bg-background"
              value={erziehungsberechtigt}
              onChange={(e) => setErziehungsberechtigt(e.target.value)}
            />
          </div>
        </div>
      )}

      <ul className="space-y-3">
        {aktiv.map((art) => {
          const eintrag = meine.find((m) => m.type_id === art.id);
          const gesperrt = entscheiden.isPending || (minderjaehrig && !erziehungsberechtigt.trim());
          return (
            <li key={art.id} className="rounded-md border p-3 space-y-2">
              <p className="text-sm font-medium">{art.label}</p>
              <p className="text-xs text-muted-foreground">{art.text}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant={eintrag?.granted === true ? "default" : "outline"}
                  disabled={gesperrt}
                  onClick={() => entscheiden.mutate({ typeId: art.id, granted: true })}
                >
                  Ja, ich willige ein
                </Button>
                <Button
                  size="sm"
                  variant={eintrag?.granted === false ? "default" : "outline"}
                  disabled={gesperrt}
                  onClick={() => entscheiden.mutate({ typeId: art.id, granted: false })}
                >
                  Nein
                </Button>
                <span className="text-xs text-muted-foreground">
                  {eintrag
                    ? `${eintrag.granted ? "Eingewilligt" : "Nicht eingewilligt"} am ${datumDe(eintrag.decided_at.slice(0, 10))}${eintrag.guardian_name ? ` durch ${eintrag.guardian_name}` : ""}`
                    : "Noch nicht entschieden"}
                </span>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="border-t pt-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-medium text-sm flex items-center gap-2">
            <HeartPulse size={16} /> Notfallkontakt
          </h3>
          {!neuerKontakt && (
            <Button size="sm" variant="outline" onClick={() => setNeuerKontakt({ name: "", phone: "", relation: "" })}>
              <Plus size={14} className="mr-1" /> Kontakt
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Wen die Leitung einer Veranstaltung anrufen soll, wenn dir etwas passiert. Sichtbar nur für dich, die
          Leitung von Veranstaltungen, zu denen du zugesagt hast, und die Verwaltung.
        </p>
        {kontakte.length === 0 && !neuerKontakt && (
          <p className="text-sm text-muted-foreground">Kein Notfallkontakt eingetragen.</p>
        )}
        <ul className="space-y-1">
          {kontakte.map((k) => (
            <li key={k.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 break-words">
                {k.name}{k.relation && ` (${k.relation})`} · <a href={`tel:${k.phone}`} className="text-primary hover:underline">{k.phone}</a>
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
                onClick={() => kontaktLoeschen.mutate(k.id)}
                aria-label="Kontakt löschen"
              >
                <Trash2 size={13} />
              </Button>
            </li>
          ))}
        </ul>
        {neuerKontakt && (
          <div className="grid gap-2 sm:grid-cols-3 items-end rounded-md border bg-muted/30 p-3">
            <div>
              <Label className="text-xs">Name</Label>
              <Input className="h-9" value={neuerKontakt.name} onChange={(e) => setNeuerKontakt({ ...neuerKontakt, name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Telefon</Label>
              <Input className="h-9" type="tel" value={neuerKontakt.phone} onChange={(e) => setNeuerKontakt({ ...neuerKontakt, phone: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Beziehung (optional)</Label>
              <Input className="h-9" value={neuerKontakt.relation} onChange={(e) => setNeuerKontakt({ ...neuerKontakt, relation: e.target.value })} placeholder="z. B. Mutter" />
            </div>
            <div className="flex gap-2 sm:col-span-3">
              <Button
                size="sm"
                onClick={() => kontaktSpeichern.mutate()}
                disabled={!neuerKontakt.name.trim() || !neuerKontakt.phone.trim() || kontaktSpeichern.isPending}
              >
                {kontaktSpeichern.isPending && <Loader2 size={14} className="mr-1 animate-spin" />} Speichern
              </Button>
              <Button size="sm" variant="outline" onClick={() => setNeuerKontakt(null)}>Abbrechen</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
