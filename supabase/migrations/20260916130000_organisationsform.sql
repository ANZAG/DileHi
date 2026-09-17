-- Was seid ihr? Verein, eingetragener Verein oder Interessengemeinschaft
--
-- In der Szene gibt es alle drei, und sie sind sich nur von aussen ähnlich:
--
--   * Ein **eingetragener Verein** hat Registergericht und Registernummer,
--     einen gewählten Vorstand, eine Satzung, eine Mitgliederversammlung mit
--     Beschlüssen — und oft die Gemeinnützigkeit mit allem, was daran hängt.
--   * Ein **nicht eingetragener Verein** hat dasselbe Innenleben, aber kein
--     Register. Ein Impressum, das nach der Registernummer fragt, fragt ins
--     Leere.
--   * Eine **Interessengemeinschaft** hat oft weder Aufnahmeantrag noch
--     Beiträge noch einen Vorstand im Rechtssinn — sondern Leute, die etwas
--     zusammen machen, und ein, zwei Ansprechpartner.
--
-- Bisher setzte DING überall den eingetragenen Verein voraus. Eine IG fand
-- beim ersten Blick in die Verwaltung „Aufnahmeanträge", „Beiträge",
-- „Beschlussregister" und einen „Vorstand" — und musste raten, was davon sie
-- betrifft. Das ist die Art von Fremdheit, an der jemand aufhört.
--
-- Die Form steht ab jetzt in den Vereinsdaten. Sie schaltet nichts hart ab:
-- Sie ist die **Vorauswahl** im Einrichtungsprozess und der Grund, warum die
-- Oberfläche die richtigen Wörter benutzt. Jeder kann danach alles einzeln
-- anders entscheiden — eine IG, die Beiträge einsammelt, schaltet sie an.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS org_form text NOT NULL DEFAULT 'club';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'app_settings_org_form_check'
  ) THEN
    ALTER TABLE public.app_settings
      ADD CONSTRAINT app_settings_org_form_check
      CHECK (org_form IN ('club', 'registered_club', 'interest_group'));
  END IF;
END
$$;

COMMENT ON COLUMN public.app_settings.org_form IS
  'Organisationsform: club (Verein), registered_club (e. V.), interest_group (Interessengemeinschaft). Steuert Vorauswahl und Wortwahl, schaltet nichts hart ab.';

-- Wer schon eine Registernummer eingetragen hat, ist ein eingetragener
-- Verein. Das ist keine Vermutung, sondern das, was dort steht — und es
-- erspart jeder laufenden Installation eine Frage, die sie längst beantwortet
-- hat. DileHi ist damit versorgt, ohne dass jemand etwas anfassen muss.
UPDATE public.app_settings
   SET org_form = 'registered_club'
 WHERE nullif(btrim(coalesce(register_number, '')), '') IS NOT NULL;
