import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import EventRegistration from "@/pages/EventRegistration";

/**
 * Anmeldung innerhalb des Mitgliederbereichs.
 *
 * Bisher führte „Anmelden“ auf /anmeldung/<token> – eine öffentliche Seite mit
 * anderer Optik, ohne die gewohnte Navigation, aus der man nur über den
 * Browser-Zurück-Button herausfand. Für dieselbe Handlung gab es damit zwei
 * völlig verschiedene Erlebnisse, je nachdem ob ein Formular hinterlegt war.
 *
 * Der öffentliche Link bleibt unverändert bestehen: Gäste brauchen ihn, und
 * Mitglieder, die ihn trotzdem benutzen, werden beim Absenden weiterhin über
 * ihre Anmeldung mit dem Konto verknüpft.
 */
export default function EventRegistrationInternal() {
  const { eventId } = useParams<{ eventId: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ["event_form_token", eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_forms")
        .select("public_token, is_open")
        .eq("event_id", eventId!)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  if (isLoading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        <span className="sr-only">Formular wird geladen …</span>
      </div>
    );
  }

  if (!data?.public_token) {
    return (
      <div className="container py-20 text-center max-w-lg px-4">
        <h1 className="text-xl font-bold mb-2">Kein Anmeldeformular</h1>
        <p className="text-muted-foreground">
          Für diese Veranstaltung gibt es kein Formular. Zusagen kannst du direkt in der
          Terminübersicht.
        </p>
      </div>
    );
  }

  return <EventRegistration tokenOverride={data.public_token} internal />;
}
