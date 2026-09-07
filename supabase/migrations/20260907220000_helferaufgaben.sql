-- Helferaufgaben: aus "Auf-/Abbau" wird eine Frage mit Terminen
--
-- Bisher war das eine Mehrfachauswahl mit den Optionen "Aufbau/Packen" und
-- "Abbau/Aufräumen". Sie sagte, DASS jemand hilft, aber nicht WANN – und genau
-- das entscheidet, ob jemand zusagen kann: Aufbau am Freitagnachmittag ist
-- etwas anderes als Aufbau am Samstagmorgen.
--
-- Der neue Feldtyp helper_tasks trägt je Aufgabe einen Termin und eine
-- Mindestanzahl gleichzeitig benötigter Personen. Letzteres ist der Grund,
-- warum eine bloße Zahl nicht reicht: Manche Zelte brauchen sechs Leute auf
-- einmal, die meisten drei. "4 Helfer" beantwortet die Frage nicht.
--
-- Antworten bleiben erhalten: Die Aufgabenschlüssel entsprechen den bisherigen
-- Optionstexten, und in den Antworten stehen genau diese Texte.

-- ── Bestehende Formularfelder umstellen ─────────────────────────────────────
UPDATE public.event_form_fields f
SET
  type = 'helper_tasks',
  settings = COALESCE(f.settings, '{}'::jsonb) || jsonb_build_object(
    'tasks',
    (
      SELECT jsonb_agg(
               jsonb_build_object(
                 'key',   opt,
                 'label', opt,
                 'when',  NULL,
                 'min',   NULL
               )
               ORDER BY ord
             )
      FROM jsonb_array_elements_text(to_jsonb(f.options)) WITH ORDINALITY AS o(opt, ord)
    )
  ),
  options = '{}'::text[]
WHERE f.settings ->> 'role' = 'helper.tasks'
  AND f.type = 'multi_select'
  AND COALESCE(array_length(f.options, 1), 0) > 0;

-- ── Standardvorlage umstellen ───────────────────────────────────────────────
-- Die Mehrfachauswahl wird zur Aufgabenfrage; die beiden Einzelkästchen für
-- Küche und Einkauf gehen als Aufgaben darin auf. Ergebnis: eine Frage statt
-- drei, dafür mit Terminen und mit Auswertung.
UPDATE public.form_templates t
SET fields = sub.new_fields
FROM (
  SELECT
    t2.id,
    jsonb_agg(elem ORDER BY ord) FILTER (WHERE elem IS NOT NULL) AS new_fields
  FROM public.form_templates t2
  CROSS JOIN LATERAL jsonb_array_elements(t2.fields) WITH ORDINALITY AS a(orig, ord)
  CROSS JOIN LATERAL (
    SELECT CASE
      -- Die Mehrfachauswahl wird zur Aufgabenfrage mit allen sechs Aufgaben.
      WHEN a.orig -> 'settings' ->> 'role' = 'helper.tasks' THEN
        jsonb_build_object(
          'type', 'helper_tasks',
          'label', 'Wobei kannst du helfen?',
          'required', false,
          'options', '[]'::jsonb,
          'description', 'Die Zeiten stehen hinter der jeweiligen Aufgabe.',
          'settings', jsonb_build_object(
            'role', 'helper.tasks',
            'tasks', jsonb_build_array(
              jsonb_build_object('key','lager-beladen','label','Beladen im Vereinslager','when',NULL,'min',NULL),
              jsonb_build_object('key','aufbau','label','Aufbau vor Ort','when',NULL,'min',NULL),
              jsonb_build_object('key','abbau','label','Abbau vor Ort','when',NULL,'min',NULL),
              jsonb_build_object('key','lager-entladen','label','Auspacken im Vereinslager','when',NULL,'min',NULL),
              jsonb_build_object('key','einkauf','label','Einkaufen','when',NULL,'min',NULL),
              jsonb_build_object('key','kochen','label','Kochen','when',NULL,'min',NULL)
            )
          )
        )
      -- Küche und Einkauf gehen in den Aufgaben auf und entfallen als
      -- Einzelfragen. NULL wird unten herausgefiltert.
      WHEN a.orig -> 'settings' ->> 'role' IN ('helper.kitchen', 'helper.shopping') THEN NULL
      -- Der Abschnitt "Organisation" enthielt nur diese beiden Fragen.
      WHEN a.orig ->> 'type' = 'section' AND a.orig ->> 'label' = 'Organisation' THEN NULL
      ELSE a.orig
    END AS elem
  ) c
  GROUP BY t2.id
) sub
WHERE t.id = sub.id
  AND EXISTS (
    SELECT 1 FROM jsonb_array_elements(t.fields) AS f(elem)
    WHERE f.elem ->> 'type' = 'multi_select'
      AND f.elem -> 'settings' ->> 'role' = 'helper.tasks'
  );
