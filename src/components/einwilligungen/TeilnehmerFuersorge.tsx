import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CameraOff, ChevronDown, HeartPulse } from "lucide-react";
import { modulAn, useModule } from "@/hooks/useModule";
import { db } from "@/hooks/useEinwilligungen";

interface Zeile {
  user_id: string;
  display_name: string | null;
  no_photo_consent: boolean;
  is_minor: boolean;
  contacts: { name: string; phone: string; relation: string | null }[];
}

/**
 * Was die Leitung einer Veranstaltung über die Zusagen wissen muss: wer nicht
 * fotografiert werden will, wer minderjährig ist, und wen man im Notfall
 * anruft. Sehen darf das nur die Leitung – das entscheidet die
 * Datenbankfunktion; alle anderen bekommen nichts, und dann erscheint hier
 * nichts.
 */
export default function TeilnehmerFuersorge({ eventId }: { eventId: string }) {
  const { data: module } = useModule();
  const an = modulAn(module, "consents");
  const [offen, setOffen] = useState(false);

  const { data: zeilen = [] } = useQuery({
    queryKey: ["einwilligungen", "veranstaltung", eventId],
    queryFn: async (): Promise<Zeile[]> => {
      const { data, error } = await db.rpc("event_attendee_care", { _event_id: eventId });
      if (error) return [];
      return (data ?? []) as Zeile[];
    },
    enabled: an,
    staleTime: 60 * 1000,
  });

  if (!an || zeilen.length === 0) return null;

  const name = (z: Zeile) => z.display_name || "Mitglied";
  const ohneFoto = zeilen.filter((z) => z.no_photo_consent);
  const minderjaehrig = zeilen.filter((z) => z.is_minor);
  const mitKontakt = zeilen.filter((z) => z.contacts.length > 0);

  return (
    <div className="mt-2 space-y-1 text-xs text-muted-foreground" title="Nur für die Leitung der Veranstaltung sichtbar">
      {ohneFoto.length > 0 && (
        <p className="flex items-start gap-2">
          <CameraOff size={14} className="shrink-0 mt-0.5" aria-hidden />
          <span className="min-w-0 break-words">
            <span className="text-foreground">Ohne Fotofreigabe:</span> {ohneFoto.map(name).join(", ")}
          </span>
        </p>
      )}
      {minderjaehrig.length > 0 && (
        <p className="pl-6 break-words">
          <span className="text-foreground">Minderjährig:</span> {minderjaehrig.map(name).join(", ")}
        </p>
      )}
      {mitKontakt.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setOffen(!offen)}
            className="flex items-center gap-2 hover:text-foreground"
            aria-expanded={offen}
          >
            <HeartPulse size={14} aria-hidden /> Notfallkontakte ({mitKontakt.length})
            <ChevronDown size={12} className={`transition-transform ${offen ? "rotate-180" : ""}`} />
          </button>
          {offen && (
            <ul className="mt-1 pl-6 space-y-0.5">
              {mitKontakt.map((z) => (
                <li key={z.user_id} className="break-words">
                  <span className="text-foreground">{name(z)}:</span>{" "}
                  {z.contacts.map((k, i) => (
                    <span key={`${k.phone}-${i}`}>
                      {i > 0 && "; "}
                      {k.name}{k.relation && ` (${k.relation})`}{" "}
                      <a href={`tel:${k.phone}`} className="text-primary hover:underline">{k.phone}</a>
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
