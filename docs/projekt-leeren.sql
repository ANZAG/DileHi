-- DING: ein Supabase-Projekt wieder in den Auslieferungszustand bringen
--
-- Wofür das gebraucht wird: Wenn in einem neuen Projekt schon etwas steht —
-- weil es mit Git verbunden war und dabei alte Migrationen durchliefen, oder
-- weil ein Versuch mittendrin abbrach. Der Ausgangsstand legt Tabellen an; er
-- kann nicht auf Tabellen gelegt werden, die es schon gibt.
--
-- ==========================================================================
--  ERST PRÜFEN, DANN AUSFÜHREN
-- ==========================================================================
--
--   select count(*) from auth.users;
--
-- Steht dort etwas anderes als 0, gibt es in diesem Projekt schon Menschen.
-- Dann ist es nicht das leere Projekt, für das dieses Skript gedacht ist —
-- nicht ausführen.
--
-- Was bleibt: das Projekt selbst, seine Kennung, die Schlüssel, das
-- Datenbankpasswort und die hinterlegten Geheimnisse der Edge Functions. Nur
-- deshalb lohnt sich das gegenüber „Projekt löschen und neu anlegen".
--
-- Danach: Actions → Supabase ausrollen → Run workflow.

-- 1. Alles, was DING im öffentlichen Teil angelegt hat.
drop schema if exists public cascade;
create schema public;

-- 2. Die Rechte am Schema selbst.
--
-- Bewusst nur „usage": Wer welche Tabelle lesen darf, steht im Ausgangsstand,
-- Zeile für Zeile. Ein pauschales Recht auf alles Künftige — wie es Supabase
-- von Haus aus vergibt — würde jede neue Tabelle sofort für jeden Besucher
-- öffnen. Genau das soll nicht sein.
grant usage on schema public to anon, authenticated, service_role;
grant all on schema public to postgres;

-- 3. Die Ablagen für Bilder und Dokumente.
--
-- Sie liegen ausserhalb von public und überleben Schritt 1. Die Regeln darauf
-- legt der Ausgangsstand neu an und stolperte sonst über die vorhandenen.
--
-- Fehler werden hier abgefangen und nur gemeldet. Grund: Der SQL-Editor führt
-- alles in einem Zug aus und macht bei der ersten scheiternden Anweisung
-- *alles* rückgängig — auch die Schritte davor. Beim ersten Anlauf war genau
-- das passiert: Es sah aus, als sei geleert worden, und es war nichts geleert.
-- Der Speicher gehört einer eigenen Rolle; ob man daran darf, hängt vom
-- Projekt ab. Das darf den Rest nicht mitreissen.
do $$
declare r record;
begin
  begin
    for r in
      select policyname from pg_policies
      where schemaname = 'storage' and tablename = 'objects'
    loop
      execute format('drop policy %I on storage.objects', r.policyname);
    end loop;
  exception when others then
    raise notice 'Speicherregeln blieben stehen: %', sqlerrm;
  end;

  begin
    delete from storage.objects;
    delete from storage.buckets;
  exception when others then
    raise notice 'Ablagen blieben stehen: %', sqlerrm;
  end;
end $$;

-- 4. Das Verzeichnis der eingespielten Migrationen.
--
-- Hier stand, was einmal lief. Nichts davon ist nach Schritt 1 noch da, und
-- solange die Einträge stehen, verweigert der Ausrollen-Knopf die Arbeit:
-- Er findet Versionen in der Datenbank, die es im Projekt nicht mehr gibt.
delete from supabase_migrations.schema_migrations;

-- 5. Nachsehen, ob wirklich nichts mehr steht.
select
  (select count(*) from information_schema.tables where table_schema = 'public') as tabellen,
  (select count(*) from supabase_migrations.schema_migrations) as migrationseintraege,
  (select count(*) from storage.buckets) as ablagen,
  (select count(*) from auth.users) as konten;
