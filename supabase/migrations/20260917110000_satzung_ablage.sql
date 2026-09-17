-- Welche Ablage die Satzung enthält — und warum sie nicht verschwinden darf
--
-- Der Verweis auf die Satzung im Aufnahmeantrag sucht das Dokument an zwei
-- Stellen: Entweder ist eines ausdrücklich gewählt, oder es wird das neueste
-- aus einer Ablage genommen. Welche Ablage das ist, stand in zwei Funktionen
-- fest verdrahtet: `category = 'satzung'`.
--
-- Solange die Ablagen selbst fest verdrahtet waren, ging das. Seit sie jeder
-- Verein anlegen, umbenennen und löschen kann, geht es nicht mehr:
--
--   * Wer die Ablage löscht (leer ist sie schnell), verliert den Verweis —
--     lautlos. Im Antrag steht dann nur noch das Wort „Satzung“, und gemerkt
--     wird es frühestens, wenn ein Bewerber fragt.
--   * Wer seine Ablage anders nennt — „Grundlagen“, „Regelwerk“ —, konnte den
--     Verweis gar nicht darauf zeigen lassen.
--
-- Deshalb steht die Ablage jetzt in den Einstellungen, und ein Fremdschlüssel
-- hält sie fest. Das ist die Antwort auf die Frage „muss die Ablage bei einem
-- Verein obligatorisch sein?“: Sie ist es nicht wegen der Rechtsform, sondern
-- solange etwas auf sie zeigt. Ein Verein ohne Aufnahmeantrag braucht sie so
-- wenig wie eine Interessengemeinschaft; ein Verein, der im Antrag auf seine
-- Satzung verweist, kann sie nicht mehr aus Versehen löschen.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS statutes_category text;

COMMENT ON COLUMN public.app_settings.statutes_category IS
  'Ablage, aus der das neueste Dokument als Satzung gilt. NULL = keine.';

-- Bestehende Installationen zeigen auf die Ablage, die bisher gemeint war.
UPDATE public.app_settings
   SET statutes_category = 'satzung'
 WHERE statutes_category IS NULL
   AND EXISTS (SELECT 1 FROM public.document_categories WHERE key = 'satzung');

-- Löschen geht nur, solange niemand auf sie zeigt; Umbenennen des Schlüssels
-- zieht die Einstellung mit. Die Beschriftung darf sich jederzeit ändern —
-- daran hängt nichts.
ALTER TABLE public.app_settings
  DROP CONSTRAINT IF EXISTS app_settings_statutes_category_fkey;

ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_statutes_category_fkey
  FOREIGN KEY (statutes_category) REFERENCES public.document_categories(key)
  ON UPDATE CASCADE ON DELETE RESTRICT;

-- Beide Funktionen fragen jetzt die Einstellung statt eines festen Wortes.
CREATE OR REPLACE FUNCTION public.get_current_statutes_path()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    -- Das ausdrücklich gewählte Dokument.
    (SELECT d.storage_path
       FROM public.documents d
       JOIN public.app_settings s ON s.statutes_document_id = d.id
      WHERE s.id),
    -- Sonst das neueste aus der dafür bestimmten Ablage.
    (SELECT d.storage_path
       FROM public.documents d
       JOIN public.app_settings s ON s.statutes_category = d.category
      WHERE s.id
      ORDER BY d.created_at DESC
      LIMIT 1)
  );
$function$;

CREATE OR REPLACE FUNCTION public.statutes_options()
 RETURNS TABLE(id uuid, title text, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT d.id, d.title, d.created_at
  FROM public.documents d
  JOIN public.app_settings s ON s.statutes_category = d.category
  WHERE s.id
    AND public.has_permission(auth.uid(), 'system.settings')
  ORDER BY d.created_at DESC;
$function$;
