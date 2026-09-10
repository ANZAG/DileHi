-- Welches Dokument die Satzung ist
--
-- Bisher galt: das neueste Dokument der Kategorie „Satzung & Ordnungen". Der
-- Name der Kategorie sagt schon, warum das nicht traegt – dort liegen auch
-- Beitragsordnung, Vorstandsordnung und Geschaeftsordnung, und die sind
-- praktisch immer neuer als die Satzung. Der Aufnahmeantrag haette dann auf
-- die Beitragsordnung verwiesen, und niemand haette es gemerkt: Der Verweis
-- heisst ja weiterhin „Satzung".
--
-- Jetzt wird das Dokument ausgewaehlt. Ohne Auswahl bleibt es beim bisherigen
-- Verhalten, damit eine Installation ohne diese Einstellung weiter
-- funktioniert.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS satzung_document_id uuid;

COMMENT ON COLUMN public.app_settings.satzung_document_id IS
  'Das Dokument, auf das {{satzung}} verweist. Leer = neuestes der Kategorie satzung.';

-- Kein Fremdschluessel mit ON DELETE CASCADE: Wird das Dokument geloescht,
-- soll die Einstellung nicht stillschweigend mitverschwinden, sondern der
-- Verweis ins Leere zeigen und beim naechsten Blick auffallen.
ALTER TABLE public.app_settings
  DROP CONSTRAINT IF EXISTS app_settings_satzung_document_fk;

ALTER TABLE public.app_settings
  ADD CONSTRAINT app_settings_satzung_document_fk
  FOREIGN KEY (satzung_document_id) REFERENCES public.documents(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.get_current_satzung_path()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    -- Das ausdruecklich gewaehlte Dokument.
    (SELECT d.storage_path
       FROM public.documents d
       JOIN public.app_settings s ON s.satzung_document_id = d.id
      WHERE s.id),
    -- Sonst wie bisher: das neueste der Kategorie.
    (SELECT storage_path
       FROM public.documents
      WHERE category = 'satzung'
      ORDER BY created_at DESC
      LIMIT 1)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_current_satzung_path() TO anon, authenticated;

/*
 * Die Dokumente, aus denen sich die Satzung waehlen laesst.
 *
 * Eine eigene Funktion, weil die Auswahl im Erscheinungsbild steht: Wer dort
 * arbeitet, hat system.settings – aber nicht zwingend das Recht, die
 * Dokumente des Vereins zu lesen. Herausgegeben werden nur Titel und Datum,
 * keine Ablagepfade.
 */
CREATE OR REPLACE FUNCTION public.satzung_auswahl()
RETURNS TABLE (id uuid, title text, created_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.title, d.created_at
  FROM public.documents d
  WHERE d.category = 'satzung'
    AND public.has_permission(auth.uid(), 'system.settings')
  ORDER BY d.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.satzung_auswahl() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.satzung_auswahl() TO authenticated;
