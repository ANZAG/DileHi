-- Hilfetext zur Standardrolle
--
-- Vier Schalter an einer Rolle sind drei zu viel, um sie zu raten.

INSERT INTO public.onboarding_hilfe (key, titel, text)
SELECT * FROM (VALUES
  ('rolle_standard', 'Standard für Neue',
   'Diese Rolle bekommt, wer neu eingeladen wird oder dessen Aufnahmeantrag angenommen wird. Es kann immer nur eine sein; ein Klick hier verschiebt sie. Solange eine Rolle die Standardrolle ist, lässt sie sich nicht löschen.')
) AS v(key, titel, text)
WHERE NOT EXISTS (SELECT 1 FROM public.onboarding_hilfe h WHERE h.key = v.key);

UPDATE public.onboarding_hilfe
SET standard = jsonb_build_object('titel', titel, 'text', text)
WHERE standard IS NULL;
