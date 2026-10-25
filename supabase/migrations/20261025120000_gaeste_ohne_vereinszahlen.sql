-- Zwei Funktionen nicht mehr ohne Anmeldung.
--
-- count_members() nannte jedem Besucher die Zahl der Mitglieder,
-- onboarding_completed_tasks() verriet unter anderem, ob schon ein Bankkonto
-- hinterlegt ist und ob es mehr als ein Mitglied gibt. Kritisch ist beides
-- nicht, aber es geht Gäste nichts an – und gebraucht wird es ohne Anmeldung
-- nirgends: Die Einführung fragt erst, wenn jemand angemeldet ist
-- (src/components/onboarding/useOnboarding.ts), count_members ruft die Seite
-- gar nicht auf, und keine Zugriffsregel benutzt eine der beiden.
--
-- Angemeldete behalten das Recht. Wiederholbar.

REVOKE EXECUTE ON FUNCTION public.count_members() FROM anon;
REVOKE EXECUTE ON FUNCTION public.onboarding_completed_tasks() FROM anon;
