-- Die Ablagen der Dokumente gehören dem Verein, nicht dem Programm
--
-- Bisher standen sie an drei Stellen fest verdrahtet: als Liste im Programm
-- (Documents.tsx), in der Richtlinie auf der Tabelle und noch einmal in der
-- Richtlinie auf dem Dateispeicher. Es waren unsere sechs — „Vereinsshirts“
-- inklusive. Ein anderer Verein konnte keine eigene anlegen, keine löschen und
-- keine umbenennen; er bekam unsere Ablage und musste damit leben.
--
-- Drei Stellen für dieselbe Sache sind ausserdem drei Stellen, die
-- auseinanderlaufen: Wer im Programm eine Kategorie ergänzt hätte, hätte
-- Dokumente hochladen können, die niemand mehr sieht, weil die Richtlinie sie
-- nicht kennt.
--
-- Jetzt gibt es eine Tabelle. Wer etwas sehen darf, steht als Recht daran:
--
--   required_permission IS NULL   alle Mitglieder
--   'profiles.view_all'           die Leitung (und wer Dokumente verwaltet)
--   'documents.manage'            nur, wer Dokumente verwaltet
--
-- Das sind genau die drei Stufen, die es vorher auch gab — nur sagt sie jetzt
-- die Tabelle und nicht der Quelltext. Wer Dokumente verwaltet, sieht in jedem
-- Fall alles; sonst könnte er eine Ablage befüllen, in die er nicht
-- hineinsieht.
--
-- Die Bezeichnungen dürfen Platzhalter enthalten: „{satzung}“ wird zu
-- „Satzung“ oder zu „Absprachen“, je nach Form der Organisation. So heisst die
-- Ablage bei einer Interessengemeinschaft von Anfang an richtig, ohne dass
-- jemand etwas umbenennen muss — und sobald er es doch tut, steht dort sein
-- eigenes Wort und kein Platzhalter mehr.

CREATE TABLE IF NOT EXISTS public.document_categories (
  key text PRIMARY KEY,
  label text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  -- NULL = alle Mitglieder. Sonst der Schlüssel aus dem Rechtekatalog, den man
  -- braucht, um die Ablage überhaupt zu sehen.
  required_permission text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN public.document_categories.required_permission IS
  'Recht, das man zum Sehen braucht. NULL = alle Mitglieder.';

DO $$
DECLARE
  laeuft boolean;
  ig boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.user_roles)
      OR coalesce((SELECT org_name FROM public.app_settings LIMIT 1), '') <> 'Mein Verein e. V.'
    INTO laeuft;

  IF laeuft THEN
    -- Eine Installation, die schon läuft, bekommt genau das, was bisher im
    -- Quelltext stand. Sonst wäre diese Migration ein Umbau ihrer Ablage —
    -- und Dokumente, die gestern sichtbar waren, wären es heute nicht mehr.
    INSERT INTO public.document_categories (key, label, sort_order, required_permission)
    VALUES
      ('satzung',       'Satzung & Ordnungen', 10, NULL),
      ('protokoll',     'Tätigkeitsberichte',  20, NULL),
      ('vorstand',      'Vorstand',            30, 'profiles.view_all'),
      ('vorlagen',      'Vorlagen',            40, 'profiles.view_all'),
      ('vereinsshirts', 'Vereinsshirts',       50, 'documents.manage'),
      ('sonstiges',     'Sonstiges',           90, NULL)
    ON CONFLICT (key) DO NOTHING;
  ELSE
    SELECT coalesce((SELECT org_form FROM public.app_settings LIMIT 1), 'club') = 'interest_group'
      INTO ig;

    -- Eine neue Installation bekommt, was jede Organisation hat. Kein
    -- „Vereinsshirts“: Das ist unsere Ablage, nicht ihre.
    INSERT INTO public.document_categories (key, label, sort_order, required_permission)
    VALUES
      ('satzung',    '{satzung}',                10, NULL),
      ('protokolle', 'Protokolle und Berichte',  20, NULL),
      ('vorlagen',   'Vorlagen und Formulare',   30, NULL),
      ('intern',     'Nur für die {leitungsgruppe}', 40, 'profiles.view_all'),
      ('sonstiges',  'Sonstiges',                90, NULL)
    ON CONFLICT (key) DO NOTHING;
  END IF;

  -- Und was sonst noch in den Dokumenten steht: Ohne eine Zeile dafür griffe
  -- der Fremdschlüssel gleich unten ins Leere, und das Ausrollen bliebe
  -- stehen. Sichtbar wie bisher — unbekannte Kategorien waren nie beschränkt.
  INSERT INTO public.document_categories (key, label, sort_order, required_permission)
  SELECT DISTINCT d.category, initcap(replace(d.category, '-', ' ')), 80, NULL
  FROM public.documents d
  WHERE coalesce(btrim(d.category), '') <> ''
  ON CONFLICT (key) DO NOTHING;
END
$$;

-- Ein Dokument ohne gültige Ablage gibt es nicht mehr. Umbenennen des
-- Schlüssels zieht die Dokumente mit; löschen geht nur, solange keines mehr
-- darin liegt — sonst verschwänden Dokumente aus der Ansicht, ohne dass
-- jemand sie gelöscht hätte.
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_category_fkey;

ALTER TABLE public.documents
  ADD CONSTRAINT documents_category_fkey
  FOREIGN KEY (category) REFERENCES public.document_categories(key)
  ON UPDATE CASCADE ON DELETE RESTRICT;

ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;

-- Lesen darf jedes Mitglied: Die Liste der Ablagen ist kein Geheimnis, und
-- ohne sie stünde in der Ansicht neben jedem Dokument nur ein Schlüssel.
DROP POLICY IF EXISTS "Members read document categories" ON public.document_categories;
CREATE POLICY "Members read document categories" ON public.document_categories
  FOR SELECT TO authenticated
  USING (public.is_member(auth.uid()));

DROP POLICY IF EXISTS "Managers change document categories" ON public.document_categories;
CREATE POLICY "Managers change document categories" ON public.document_categories
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'documents.manage'))
  WITH CHECK (public.has_permission(auth.uid(), 'documents.manage'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_categories TO authenticated;
GRANT ALL ON public.document_categories TO service_role;

-- Die beiden Richtlinien, die bisher die Kategorien aufzählten, fragen jetzt
-- die Tabelle. Damit gibt es eine Stelle, an der steht, wer was sieht.
DROP POLICY IF EXISTS "Members can view documents" ON public.documents;
CREATE POLICY "Members can view documents" ON public.documents
  FOR SELECT TO authenticated
  USING (
    public.is_member(auth.uid())
    AND (
      public.has_permission(auth.uid(), 'documents.manage')
      OR EXISTS (
        SELECT 1 FROM public.document_categories c
         WHERE c.key = documents.category
           AND (c.required_permission IS NULL
                OR public.has_permission(auth.uid(), c.required_permission))
      )
    )
  );

DROP POLICY IF EXISTS "Members can read documents" ON storage.objects;
CREATE POLICY "Members can read documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'documents'
    AND public.is_member(auth.uid())
    AND EXISTS (
      SELECT 1
        FROM public.documents d
        JOIN public.document_categories c ON c.key = d.category
       WHERE d.storage_path = objects.name
         AND (public.has_permission(auth.uid(), 'documents.manage')
              OR c.required_permission IS NULL
              OR public.has_permission(auth.uid(), c.required_permission))
    )
  );
