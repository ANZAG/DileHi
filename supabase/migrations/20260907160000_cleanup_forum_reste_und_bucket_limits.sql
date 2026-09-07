-- Aufräumen: Reste des entfernten Forums + fehlende Grenzen an den Storage-Buckets
--
-- Belegt durch den Schema-Abzug vom 07.09.2026 (schema-storage.sql):
--
-- 1. Auf storage.objects liegen vier Policies für den Bucket 'forum-images'.
--    Den Bucket gibt es nicht mehr (vorhanden sind nur documents, gallery,
--    internal-files), und das dort geprüfte Recht 'forum.moderate' wurde am
--    19.05.2026 aus permission_catalog und role_permissions gelöscht.
--    Die Policies können also nie greifen und sind reine Altlast.
--
--    Hinweis für später: Wenn das Forum zurückkommt, werden Bucket und Policies
--    bewusst neu angelegt – dann mit Größen- und MIME-Grenze von Anfang an.
--
-- 2. Kein einziger Bucket hat file_size_limit oder allowed_mime_types gesetzt.
--    Damit kann jedes Mitglied Dateien beliebigen Typs und beliebiger Größe
--    hochladen – auch ausführbare Dateien in einen Bucket, aus dem andere
--    Mitglieder herunterladen. Die Grenzen unten entsprechen dem, was die
--    Oberfläche tatsächlich anbietet (accept-Attribute der Upload-Felder).

-- ── 1. Verwaiste Forum-Policies entfernen ───────────────────────────────────
DROP POLICY IF EXISTS "Anyone can view forum images"      ON storage.objects;
DROP POLICY IF EXISTS "Members can upload forum images"   ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own forum images" ON storage.objects;

-- ── 2. Grenzen an den Buckets ───────────────────────────────────────────────

-- gallery: öffentlich lesbar, nur Bilder, 10 MB.
UPDATE storage.buckets
SET file_size_limit = 10485760,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'
    ]
WHERE id = 'gallery';

-- documents: Satzung, Ordnungen, Berichte – Dokumentformate, 25 MB.
UPDATE storage.buckets
SET file_size_limit = 26214400,
    allowed_mime_types = ARRAY[
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.oasis.opendocument.text',
      'text/plain'
    ]
WHERE id = 'documents';

-- internal-files: gemischt (Steckbrief-Bilder, Lagepläne, Quellen,
-- Mitgliedsunterlagen, Pinnwand-Anhänge) – Bilder und Dokumente, 25 MB.
UPDATE storage.buckets
SET file_size_limit = 26214400,
    allowed_mime_types = ARRAY[
      'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.oasis.opendocument.text',
      'text/plain'
    ]
WHERE id = 'internal-files';
