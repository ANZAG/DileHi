import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { modulAn, useModule } from "@/hooks/useModule";
import { db } from "@/hooks/useNachweise";

interface Zeile {
  user_id: string;
  label: string;
  valid_until: string | null;
  verified: boolean;
}

/**
 * Wer von den Zusagen welchen Nachweis hat – am Tag der Veranstaltung gültig.
 *
 * Sichtbar nur für die Leitung: wer die Veranstaltung angelegt hat, wer alle
 * Veranstaltungen bearbeitet oder wer Nachweise einsehen darf. Das entscheidet
 * die Datenbankfunktion; alle anderen bekommen eine leere Liste, und dann
 * erscheint hier nichts.
 */
export default function TeilnehmerNachweise({ eventId, namen }: {
  eventId: string;
  namen: Record<string, string>;
}) {
  const { data: module } = useModule();
  const an = modulAn(module, "certificates");

  const { data: zeilen = [] } = useQuery({
    queryKey: ["event-attendee-certificates", eventId],
    queryFn: async (): Promise<Zeile[]> => {
      const { data, error } = await db.rpc("event_attendee_certificates", { _event_id: eventId });
      // Fehlt die Funktion (Migration noch nicht eingespielt), einfach nichts zeigen.
      if (error) return [];
      return (data ?? []) as Zeile[];
    },
    enabled: an,
    staleTime: 60 * 1000,
  });

  if (!an || zeilen.length === 0) return null;

  const jePerson = new Map<string, Zeile[]>();
  for (const z of zeilen) jePerson.set(z.user_id, [...(jePerson.get(z.user_id) ?? []), z]);

  return (
    <div
      className="mt-2 flex items-start gap-2 text-xs text-muted-foreground"
      title="Gültige Nachweise der Zusagen – nur für die Leitung sichtbar"
    >
      <ShieldCheck size={14} className="shrink-0 mt-0.5" aria-hidden />
      <div className="flex flex-wrap gap-x-4 gap-y-1 min-w-0">
        {[...jePerson].map(([id, liste]) => (
          <span key={id} className="break-words">
            <span className="text-foreground">{namen[id] ?? "Mitglied"}:</span>{" "}
            {liste.map((z, i) => (
              <span key={`${z.label}-${i}`}>
                {i > 0 && ", "}
                {z.label}
                {z.verified && (
                  <BadgeCheck size={12} className="inline ml-0.5 -mt-0.5 text-primary" aria-label="geprüft" />
                )}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
