-- Vier Rubriken, damit das Forum nicht leer anfängt
--
-- Ein leeres Forum ist wie ein leerer Raum mit einem Schild „Redet doch": Es
-- redet niemand. Wer anfängt, braucht eine Rubrik, in die sein erster Beitrag
-- passt — und zwar bevor er versteht, dass er Rubriken selbst anlegen kann.
--
-- Bewusst wenige und bewusst allgemeine: Sie passen einem Verein wie einer
-- Interessengemeinschaft, und wer sie nicht mag, benennt sie um oder
-- archiviert sie (Verwaltung → Forum-Rubriken). Vier sind wenig genug, dass
-- man sie überblickt, und genug, dass nicht alles in einem Topf landet.
--
-- Die Schranke ist dieselbe wie bei den Rollennamen: nur in einer
-- Installation, in der noch niemand die Vereinsdaten eingetragen hat, und nur,
-- solange es überhaupt keine Rubrik gibt. DileHi hat beides längst.

DO $$
DECLARE
  unberuehrt boolean;
BEGIN
  SELECT coalesce((SELECT org_name FROM public.app_settings LIMIT 1), '') = 'Mein Verein e. V.'
     AND NOT EXISTS (SELECT 1 FROM public.forum_categories)
    INTO unberuehrt;

  IF NOT unberuehrt THEN
    RAISE NOTICE 'Forum-Rubriken übersprungen: Es gibt schon welche, oder die Installation läuft.';
    RETURN;
  END IF;

  INSERT INTO public.forum_categories (name, slug, description, icon, sort_order, status)
  VALUES
    ('Allgemeines', 'allgemeines',
     'Alles, was sonst nirgends hinpasst.', 'MessageSquare', 10, 'aktiv'),
    ('Termine und Treffen', 'termine',
     'Absprachen zu Terminen: Wer kommt, wer bringt was mit, wer fährt wen.', 'CalendarDays', 20, 'aktiv'),
    ('Ausrüstung und Material', 'ausruestung',
     'Was wir haben, was fehlt, was jemand verleiht oder sucht.', 'Package', 30, 'aktiv'),
    ('Fragen und Hilfe', 'fragen',
     'Wer etwas nicht weiss, fragt hier. Auch die kleinen Fragen.', 'HelpCircle', 40, 'aktiv');
END
$$;
