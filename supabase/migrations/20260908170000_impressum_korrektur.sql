-- Korrektur der Vereinsangaben
--
-- In 20260908140000 hatte ich Registernummer und Vorstand geraten statt sie
-- aus dem bestehenden Impressum zu lesen: VR 5378 statt VR 6783, und von den
-- zwei Vorstaenden nur einer. Die Migration ist bereits eingespielt, und weil
-- sie COALESCE verwendet, ueberschreibt ein erneuter Lauf die falschen Werte
-- nicht.
--
-- Deshalb hier eine gezielte Korrektur: Sie greift nur, wenn dort noch genau
-- der falsche Wert steht. Wer inzwischen von Hand etwas anderes eingetragen
-- hat, behaelt seine Fassung.

UPDATE public.app_settings
SET register_number = 'VR 6783'
WHERE id AND register_number = 'VR 5378';

UPDATE public.app_settings
SET board_members = E'Maximilian Bachon\nEric Treisbach'
WHERE id AND board_members = 'Eric Treisbach';

-- Die uebrigen Angaben aus dem bestehenden Impressum absichern, falls sie beim
-- ersten Lauf leer geblieben sind.
UPDATE public.app_settings
SET org_name       = COALESCE(NULLIF(org_name, 'Mein Verein e. V.'), 'Diu lebendec Histôrje e. V.'),
    org_short_name = COALESCE(NULLIF(org_short_name, 'Mein Verein'), 'Diu lebendec Histôrje'),
    org_street     = COALESCE(NULLIF(org_street, ''), 'Am Schloßpark 17'),
    org_zip        = COALESCE(NULLIF(org_zip, ''), '65203'),
    org_city       = COALESCE(NULLIF(org_city, ''), 'Wiesbaden'),
    org_email      = COALESCE(NULLIF(org_email, ''), 'vorstand@dilehi.de'),
    register_court = COALESCE(NULLIF(register_court, ''), 'Amtsgericht Wiesbaden')
WHERE id;
