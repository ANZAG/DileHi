-- Feldrollen für bestehende Formulare nachtragen
--
-- Die Auswertung erkannte ihre Felder bisher am Beschriftungstext:
--
--     if (lbl.includes("pkw") && !lbl.includes("anhänger")) carsCount++;
--
-- Das funktionierte, weil unsere Vorlage genau diese Wörter benutzt. Ein
-- anderer Verein, der sein Feld "Auto" nennt, bekam eine Kachel mit 0 – ohne
-- Fehlermeldung. Dieselbe Falle beim Umbenennen im eigenen Formular.
--
-- Ab jetzt trägt jedes Feld eine Rolle in settings.role. Diese Migration
-- vergibt sie für den Bestand nach genau denselben Textvergleichen, die bisher
-- bei jedem Seitenaufruf liefen – die Auswertungen aller Altveranstaltungen
-- bleiben damit unverändert.
--
-- Bewusst in settings statt in einer eigenen Spalte: settings ist bereits die
-- Ablage für Feldeigenschaften (visibility, conditional_on), und so braucht es
-- keine Neugenerierung von types.ts, bevor der Code die Rollen nutzen kann.

WITH matches AS (
  SELECT
    f.id,
    f.form_id,
    f.sort_order,
    CASE
      -- Strukturelle Feldtypen: eindeutig, unabhängig von der Beschriftung.
      WHEN f.type = 'attendance_days' THEN 'attendance.days'
      WHEN f.type = 'tent'            THEN 'lodging.tent'

      -- Transport. Reihenfolge zählt: "Anhänger zur Verfügung" zuerst, danach
      -- Anhängerkupplung, und PKW schließt "Anhänger" ausdrücklich aus –
      -- genauso wie der bisherige Code.
      WHEN f.type = 'checkbox' AND x.l LIKE '%anhänger zur verfügung%' THEN 'transport.trailer'
      WHEN f.type = 'checkbox' AND x.l LIKE '%anhänger%' AND x.l LIKE '%ziehen%' THEN 'transport.can_tow'
      WHEN f.type = 'checkbox' AND x.l LIKE '%pkw%' AND x.l NOT LIKE '%anhänger%' THEN 'transport.own_car'
      WHEN f.type = 'number' AND (x.l LIKE '%mitnehmen%' OR x.l LIKE '%sitzplätze%') THEN 'transport.seats'

      -- Verpflegung
      WHEN f.type IN ('select', 'text')     AND x.l LIKE '%ernährung%' THEN 'catering.diet'
      WHEN f.type IN ('textarea', 'text')   AND x.l LIKE '%allergi%'   THEN 'catering.allergies'

      -- Helfer
      WHEN f.type = 'checkbox' AND x.l LIKE '%küche%' THEN 'helper.kitchen'
      WHEN f.type = 'checkbox' AND (x.l LIKE '%einkauf%' OR x.l LIKE '%einzukaufen%') THEN 'helper.shopping'
      WHEN f.type = 'multi_select' AND (x.l LIKE '%aufbau%' OR x.l LIKE '%abbau%') THEN 'helper.tasks'
    END AS role
  FROM public.event_form_fields f
  CROSS JOIN LATERAL (SELECT lower(f.label) AS l) x
  WHERE NOT (COALESCE(f.settings, '{}'::jsonb) ? 'role')
),
ranked AS (
  -- Je Formular und Rolle nur ein Feld. Trifft die Textsuche mehrere (etwa zwei
  -- Kästchen mit "Küche" im Namen), gewinnt das erste im Formular – damit ist
  -- die Zuordnung eindeutig statt zufällig.
  SELECT
    id,
    role,
    row_number() OVER (PARTITION BY form_id, role ORDER BY sort_order, id) AS rn
  FROM matches
  WHERE role IS NOT NULL
)
UPDATE public.event_form_fields f
SET settings = COALESCE(f.settings, '{}'::jsonb) || jsonb_build_object('role', r.role)
FROM ranked r
WHERE f.id = r.id AND r.rn = 1;

-- Ab jetzt darf eine Rolle je Formular nur einmal vergeben werden. Zwei Felder
-- mit derselben Rolle wären mehrdeutig – die Auswertung müsste raten.
CREATE UNIQUE INDEX IF NOT EXISTS event_form_fields_role_unique
  ON public.event_form_fields (form_id, (settings ->> 'role'))
  WHERE settings ->> 'role' IS NOT NULL;

-- Auch die Standardvorlage verrollen, damit neu erzeugte Formulare die Rollen
-- von Anfang an mitbringen. Die Vorlage liegt als JSONB-Array in
-- form_templates.fields; jedes Element bekommt seine Rolle nach denselben Regeln.
UPDATE public.form_templates t
SET fields = sub.new_fields
FROM (
  SELECT
    t2.id,
    jsonb_agg(
      CASE
        WHEN elem ? 'role' OR elem -> 'settings' ? 'role' THEN elem
        WHEN role_key IS NULL THEN elem
        ELSE jsonb_set(
               elem,
               '{settings}',
               COALESCE(elem -> 'settings', '{}'::jsonb) || jsonb_build_object('role', role_key)
             )
      END
      ORDER BY ord
    ) AS new_fields
  FROM public.form_templates t2
  CROSS JOIN LATERAL jsonb_array_elements(t2.fields) WITH ORDINALITY AS a(elem, ord)
  CROSS JOIN LATERAL (SELECT lower(COALESCE(a.elem ->> 'label', '')) AS l,
                             COALESCE(a.elem ->> 'type', '')          AS ty) v
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN v.ty = 'attendance_days' THEN 'attendance.days'
      WHEN v.ty = 'tent'            THEN 'lodging.tent'
      WHEN v.ty = 'checkbox' AND v.l LIKE '%anhänger zur verfügung%' THEN 'transport.trailer'
      WHEN v.ty = 'checkbox' AND v.l LIKE '%anhänger%' AND v.l LIKE '%ziehen%' THEN 'transport.can_tow'
      WHEN v.ty = 'checkbox' AND v.l LIKE '%pkw%' AND v.l NOT LIKE '%anhänger%' THEN 'transport.own_car'
      WHEN v.ty = 'number' AND (v.l LIKE '%mitnehmen%' OR v.l LIKE '%sitzplätze%') THEN 'transport.seats'
      WHEN v.ty IN ('select', 'text')   AND v.l LIKE '%ernährung%' THEN 'catering.diet'
      WHEN v.ty IN ('textarea', 'text') AND v.l LIKE '%allergi%'   THEN 'catering.allergies'
      WHEN v.ty = 'checkbox' AND v.l LIKE '%küche%' THEN 'helper.kitchen'
      WHEN v.ty = 'checkbox' AND (v.l LIKE '%einkauf%' OR v.l LIKE '%einzukaufen%') THEN 'helper.shopping'
      WHEN v.ty = 'multi_select' AND (v.l LIKE '%aufbau%' OR v.l LIKE '%abbau%') THEN 'helper.tasks'
    END AS role_key
  ) r
  GROUP BY t2.id
) sub
WHERE t.id = sub.id;
