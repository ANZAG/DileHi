-- Hilfetexte zur Rollenverwaltung
--
-- Drei Schalter an einer Rolle, und alle drei klingen ähnlich. Ohne Erklärung
-- rät man – und rät bei „Vereinsleitung" gegen „Vorstand" mit ziemlicher
-- Sicherheit falsch, weil die beiden im Alltag dasselbe bedeuten und in der
-- Anwendung nicht.

INSERT INTO public.onboarding_hilfe (key, titel, text)
SELECT * FROM (VALUES

  ('rolle_leitung', 'Vereinsleitung',
   'Diese Rolle bekommt die Rechte, die in den Zugriffsregeln an der Leitung hängen: Abstimmungen führen, Protokolle einsehen, Beiträge anderer sehen. Sparsam vergeben – das ist der weitreichendste Schalter auf dieser Seite.'),

  ('rolle_vorstand', 'Vorstand',
   'Gehört die Rolle dem Vorstand im Sinne der Satzung an? Das ist eine Angabe über den Verein, keine Berechtigung: Sie erscheint im Impressum und auf dem Aufnahmeantrag. Wer welche Rechte hat, steht daneben unter „Vereinsleitung“.'),

  ('rolle_oeffentlich', 'Öffentlich nennen',
   'Die Rolle wird nach aussen ausgewiesen, etwa im Impressum oder auf dem Aufnahmeantrag. Namen erscheinen dort nur, wenn die Person selbst zugestimmt hat.')

) AS v(key, titel, text)
WHERE NOT EXISTS (
  SELECT 1 FROM public.onboarding_hilfe h WHERE h.key = v.key
);

UPDATE public.onboarding_hilfe
SET standard = jsonb_build_object('titel', titel, 'text', text)
WHERE standard IS NULL;
