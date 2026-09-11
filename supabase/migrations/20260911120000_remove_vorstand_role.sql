-- Die Rolle „vorstand" verschwindet.
--
-- Gewünscht am 10.09.2026: Den Vorsitz hat bei uns der 1. Officiatus, eine
-- eigene Rolle „Vorstand" braucht es nicht. Die Migrationen danach haben die
-- Rollennamen frei gemacht, die Rolle selbst aber stehen lassen. Im
-- Ausgangsstand stand sie deshalb noch — kleingeschrieben, ohne Beschreibung,
-- mit zwanzig Rechten und `roles.manage`. Wegen dieses Rechts galt sie als
-- geschützte Systemrolle und liess sich in der Verwaltung nicht löschen.
--
-- Ihre Rechte gehen über den Fremdschlüssel mit (ON DELETE CASCADE).
--
-- Der Wächter am Katalog (`role_catalog_guard`) bleibt zuständig: Hat noch
-- jemand die Rolle, bricht diese Migration mit seiner Meldung ab, statt
-- jemandem stillschweigend die Rechte zu nehmen. Dann erst umtragen.
--
-- Nicht zu verwechseln mit der Dokumentkategorie „vorstand" — die bleibt.

DELETE FROM public.role_catalog WHERE key = 'vorstand';
