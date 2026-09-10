-- Display-Felder in die Standardvorlage aufnehmen
--
-- Bei Living-History-Veranstaltungen bringen Mitglieder Schaustücke bzw.
-- vorgeführte Stationen mit. Für die Orga reichen zwei Angaben: ob jemand ein
-- Display ausstellt, und kurz was. Platzbedarf und Aufstellung werden im
-- Gespräch geklärt und gehören nicht ins Anmeldeformular.
--
-- Additiv und wiederholbar: Es wird nur ergänzt, wenn die Vorlage noch kein
-- Feld mit einer display-Rolle enthält. Eine selbst angepasste Vorlage bleibt
-- also unangetastet, und die beiden Felder lassen sich in der Verwaltung unter
-- "Umfrage-Vorlage" jederzeit wieder entfernen.

UPDATE public.form_templates t
SET fields = t.fields || jsonb_build_array(
  jsonb_build_object(
    'type', 'section',
    'label', 'Display',
    'required', false,
    'options', '[]'::jsonb,
    'settings', '{}'::jsonb,
    'description', NULL
  ),
  jsonb_build_object(
    'type', 'checkbox',
    'label', 'Ich stelle ein Display aus',
    'required', false,
    'options', '[]'::jsonb,
    'settings', jsonb_build_object('role', 'display.brings'),
    'description', NULL
  ),
  jsonb_build_object(
    'type', 'textarea',
    'label', 'Was für ein Display möchtest du ausstellen?',
    'required', false,
    'options', '[]'::jsonb,
    'settings', jsonb_build_object(
      'role', 'display.description',
      'conditional_on', 'Ich stelle ein Display aus',
      'placeholder', 'Kurze Beschreibung – Details klärt die Orga mit dir'
    ),
    'description', NULL
  )
)
WHERE t.slug = 'default'
  AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(t.fields) AS f(elem)
    WHERE COALESCE(f.elem -> 'settings' ->> 'role', '') LIKE 'display.%'
  );
