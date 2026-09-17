-- Hilfetexte, die zur Form der Organisation passen
--
-- Der Schalter in der Rollenverwaltung heisst seit der Wortwahl nach
-- Organisationsform „Vorstand“ oder „Ansprechpartner“ — der Hilfetext daneben
-- sprach weiter vom Vorstand im Sinne der Satzung. Eine Interessengemeinschaft
-- hat beides nicht, und ein Text, der etwas anderes erklärt, als auf dem
-- Schalter steht, ist schlimmer als keiner.
--
-- Hilfetexte dürfen jetzt Platzhalter tragen, wie die Dokumentablagen:
-- „{leitung}“ wird beim Anzeigen zu „Vorstand“ oder „Ansprechpartner“
-- (src/components/Hilfe.tsx, einsetzen()). So steht ein Text da, der für jede
-- Form stimmt, ohne dass ihn jemand umschreiben muss.
--
-- Die Schranke: Geändert wird nur, wo der Text noch der mitgelieferte ist
-- (`text = defaults->>'text'`). Wer seinen Hilfetext selbst geschrieben hat,
-- behält ihn — auch DileHi.

UPDATE public.onboarding_help
   SET title = '{leitung}',
       text = 'Gehört die Rolle zur Leitung im Rechtssinn — bei einem Verein '
              || 'also dem Vorstand? Das ist eine Angabe über die Organisation, '
              || 'keine Berechtigung: Sie erscheint im Impressum und auf dem '
              || 'Aufnahmeantrag. Wer welche Rechte hat, steht daneben unter '
              || '„{leitungsgruppe}“.',
       defaults = jsonb_build_object(
         'title', '{leitung}',
         'text', 'Gehört die Rolle zur Leitung im Rechtssinn — bei einem Verein '
                 || 'also dem Vorstand? Das ist eine Angabe über die Organisation, '
                 || 'keine Berechtigung: Sie erscheint im Impressum und auf dem '
                 || 'Aufnahmeantrag. Wer welche Rechte hat, steht daneben unter '
                 || '„{leitungsgruppe}“.'
       )
 WHERE key = 'rolle_vorstand'
   AND text = defaults ->> 'text';

-- Dasselbe für die Art der Mitgliedschaft: Das Feld heisst bei einer
-- Interessengemeinschaft „Wie du dabei bist“, und geändert wird es dort von
-- der Leitung, nicht vom Vorstand.
UPDATE public.onboarding_help
   SET title = '{mitgliedsart}',
       text = 'Bestimmt, welcher Beitragssatz für dich gilt. Ändern kann sie '
              || 'nur {leitungsgruppe}, weil daran die Beiträge hängen.',
       defaults = jsonb_build_object(
         'title', '{mitgliedsart}',
         'text', 'Bestimmt, welcher Beitragssatz für dich gilt. Ändern kann sie '
                 || 'nur {leitungsgruppe}, weil daran die Beiträge hängen.'
       )
 WHERE key = 'mitgliedsart'
   AND text = defaults ->> 'text';
