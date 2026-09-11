-- Einen Abzug aus `backup-export` in diese Datenbank einspielen.
--
-- Aufgerufen vom Workflow „Umzug" (.github/workflows/umzug.yml), nie von Hand.
-- Die Datei öffnet und schliesst keine Transaktion; das tut der Aufrufer,
-- damit ein Probelauf am Ende alles zurückrollen kann.
--
-- Erwartet:
--   eine temporäre Tabelle transfer_payload (payload jsonb) mit dem Abzug
--   transfer.old_ref / transfer.new_ref   Kennungen des alten und neuen
--                                         Projekts, damit Adressen in den
--                                         Daten mitziehen (optional)
--
-- Ergebnis: temporäre Tabelle transfer_report, die der Workflow ausgibt.
--
-- Der Ablauf:
--
--   1. Leeren, solange Trigger und Fremdschlüssel greifen – was an einem
--      Konto hängt, geht über die Kaskade mit.
--   2. Mit session_replication_role = replica einspielen. Dann laufen keine
--      Trigger: Kein Profil entsteht doppelt, weil ein Konto angelegt wird,
--      keine Benachrichtigung geht los, weil ein alter Forenbeitrag
--      „neu" hereinkommt, kein Zeitstempel springt auf heute. Ebenso wenig
--      prüfen die Fremdschlüssel, und deshalb kommt die Reihenfolge der
--      Tabellen nicht darauf an.
--   3. Die Fremdschlüssel von Hand nachprüfen. Was dort hängen bleibt, bricht
--      alles ab.
--
-- Übernommen werden die Spalten, die es hier gibt. Fehlt eine im Abzug, gilt
-- ihr Standardwert; gibt es eine hier nicht mehr, steht sie im Bericht.

CREATE TEMP TABLE transfer_report (kind text, detail text, n bigint);

-- Eine Tabelle aus JSON füllen, nur mit den Spalten, die beide Seiten kennen.
CREATE FUNCTION pg_temp.transfer_load(target regclass, rows jsonb)
RETURNS bigint
LANGUAGE plpgsql
AS $fn$
DECLARE
  cols text;
  n bigint;
BEGIN
  IF rows IS NULL OR jsonb_typeof(rows) <> 'array' OR jsonb_array_length(rows) = 0 THEN
    RETURN 0;
  END IF;

  -- Alle Zeilen eines Abzugs haben dieselben Schlüssel, die erste reicht.
  SELECT string_agg(quote_ident(a.attname), ', ' ORDER BY a.attnum) INTO cols
  FROM pg_attribute a
  WHERE a.attrelid = target
    AND a.attnum > 0
    AND NOT a.attisdropped
    AND a.attgenerated = ''
    AND rows -> 0 ? a.attname;

  IF cols IS NULL THEN
    RAISE EXCEPTION '%: keine gemeinsame Spalte zwischen Abzug und Datenbank.', target;
  END IF;

  EXECUTE format(
    'INSERT INTO %s (%s) SELECT %s FROM jsonb_populate_recordset(NULL::%s, $1)',
    target, cols, cols, target
  ) USING rows;
  GET DIAGNOSTICS n = ROW_COUNT;

  -- Was der Abzug mitbringt und hier keinen Platz hat. Leere Spalten sind
  -- kein Verlust und werden nicht gemeldet.
  INSERT INTO transfer_report (kind, detail, n)
  SELECT 'spalte_entfaellt', format('%s.%s', target, k), count(*) FILTER (WHERE r -> k <> 'null'::jsonb)
  FROM jsonb_object_keys(rows -> 0) k
  CROSS JOIN jsonb_array_elements(rows) r
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_attribute a
    WHERE a.attrelid = target AND a.attname = k AND a.attnum > 0 AND NOT a.attisdropped
  )
  GROUP BY k
  HAVING count(*) FILTER (WHERE r -> k <> 'null'::jsonb) > 0;

  RETURN n;
END
$fn$;

DO $transfer$
DECLARE
  p jsonb;
  old_ref text := nullif(current_setting('transfer.old_ref', true), '');
  new_ref text := nullif(current_setting('transfer.new_ref', true), '');
  tables text;
  t text;
  rel regclass;
  loaded bigint;
  k record;
  ccols text;
  pcols text;
  n bigint;
  broken text[] := '{}';
BEGIN
  SELECT payload INTO p FROM transfer_payload;

  IF p IS NULL OR jsonb_typeof(p -> 'tabellen') IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Kein Abzug: transfer_payload ist leer oder enthält keine Tabellen.';
  END IF;
  IF jsonb_typeof(p -> 'konten' -> 'users') IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Der Abzug enthält keine Konten. Ohne sie hingen Profile, Rollen und Beiträge an niemandem.';
  END IF;
  IF jsonb_array_length(p -> 'konten' -> 'users') = 0 THEN
    RAISE EXCEPTION 'Der Abzug enthält null Konten. Das ist kein Verein, sondern ein Fehler beim Abholen.';
  END IF;

  -- Adressen des alten Projekts, etwa zu Bildern im Speicher, zeigen danach
  -- auf das neue. Nur in den Tabellen: In den Konten steht nichts davon.
  IF old_ref IS NOT NULL AND new_ref IS NOT NULL AND old_ref <> new_ref THEN
    p := jsonb_set(p, '{tabellen}', replace((p -> 'tabellen')::text, old_ref, new_ref)::jsonb);
  END IF;

  -- ── 1. Leeren ─────────────────────────────────────────────────────────────

  SELECT string_agg(format('public.%I', key), ', ' ORDER BY key) INTO tables
  FROM jsonb_object_keys(p -> 'tabellen') key
  WHERE to_regclass(format('public.%I', key)) IS NOT NULL;

  INSERT INTO transfer_report (kind, detail, n)
  SELECT 'fehlt_hier', key, jsonb_array_length(p -> 'tabellen' -> key)
  FROM jsonb_object_keys(p -> 'tabellen') key
  WHERE to_regclass(format('public.%I', key)) IS NULL;

  -- Tabellen, die an einer ersetzten hängen, aber selbst nicht im Abzug
  -- stehen, leert die Kaskade mit. Das soll im Bericht stehen, nicht
  -- verschwiegen werden.
  INSERT INTO transfer_report (kind, detail, n)
  SELECT DISTINCT 'mitgeleert', c.conrelid::regclass::text, NULL::bigint
  FROM pg_constraint c
  WHERE c.contype = 'f'
    AND c.connamespace = 'public'::regnamespace
    AND c.confrelid::regclass::text IN (SELECT format('%I', key) FROM jsonb_object_keys(p -> 'tabellen') key)
    AND c.conrelid::regclass::text NOT IN (SELECT format('%I', key) FROM jsonb_object_keys(p -> 'tabellen') key);

  EXECUTE 'TRUNCATE ' || tables || ' CASCADE';

  -- Auch das Konto aus der Einrichtung geht: An seine Stelle treten die
  -- Konten aus dem Abzug, darunter der Vorstand.
  DELETE FROM auth.users;

  -- ── 2. Einspielen ─────────────────────────────────────────────────────────

  PERFORM set_config('session_replication_role', 'replica', true);

  loaded := pg_temp.transfer_load('auth.users'::regclass, p -> 'konten' -> 'users');
  INSERT INTO transfer_report VALUES ('konten', 'übernommen', loaded);

  -- GoTrue liest diese Spalten als Text und scheitert an NULL mit „Database
  -- error querying schema". Beim Anlegen über die Schnittstelle stehen dort
  -- leere Zeichenketten, also hier auch.
  FOR t IN
    SELECT a.attname FROM pg_attribute a
    WHERE a.attrelid = 'auth.users'::regclass AND a.attnum > 0 AND NOT a.attisdropped
      AND a.attname IN ('encrypted_password', 'confirmation_token', 'recovery_token',
                        'email_change_token_new', 'email_change_token_current', 'email_change',
                        'phone_change', 'phone_change_token', 'reauthentication_token')
  LOOP
    EXECUTE format('UPDATE auth.users SET %1$I = '''' WHERE %1$I IS NULL', t);
  END LOOP;

  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'auth.users'::regclass AND attname = 'instance_id') THEN
    UPDATE auth.users SET instance_id = '00000000-0000-0000-0000-000000000000' WHERE instance_id IS NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'auth.users'::regclass AND attname = 'aud') THEN
    UPDATE auth.users SET aud = 'authenticated' WHERE aud IS NULL;
    UPDATE auth.users SET role = 'authenticated' WHERE role IS NULL;
  END IF;

  INSERT INTO transfer_report
  SELECT 'konten', 'mit Passwort', count(*) FROM auth.users WHERE encrypted_password <> '';

  loaded := pg_temp.transfer_load('auth.identities'::regclass, p -> 'konten' -> 'identities');

  -- Ohne Eintrag in auth.identities kann sich ein Konto nicht mit E-Mail
  -- anmelden. Wo der Abzug keinen mitbringt, entsteht er hier.
  INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, created_at, updated_at)
  SELECT gen_random_uuid(), u.id::text, u.id,
         jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true, 'phone_verified', false),
         'email', u.created_at, now()
  FROM auth.users u
  WHERE u.email IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM auth.identities i WHERE i.user_id = u.id AND i.provider = 'email');

  FOR t IN SELECT key FROM jsonb_object_keys(p -> 'tabellen') key ORDER BY key LOOP
    rel := to_regclass(format('public.%I', t));
    CONTINUE WHEN rel IS NULL;
    loaded := pg_temp.transfer_load(rel, p -> 'tabellen' -> t);
    INSERT INTO transfer_report VALUES ('tabelle', t, loaded);
  END LOOP;

  PERFORM set_config('session_replication_role', 'origin', true);

  -- ── 3. Nachprüfen ─────────────────────────────────────────────────────────
  --
  -- Beim Einspielen hat kein Fremdschlüssel geprüft. Das holt diese Schleife
  -- nach, für jeden in public und für die Anmeldedaten. In der alten
  -- Datenbank galten dieselben Schlüssel; schlägt hier einer an, ist der
  -- Abzug unvollständig – etwa weil eine Tabelle nicht lesbar war.

  FOR k IN
    SELECT con.conname, con.conrelid::regclass AS child, con.confrelid::regclass AS parent,
           con.conkey, con.confkey
    FROM pg_constraint con
    WHERE con.contype = 'f'
      AND (con.connamespace = 'public'::regnamespace
           OR con.conrelid = to_regclass('auth.identities'))
  LOOP
    SELECT string_agg(format('c.%I', a.attname), ', ' ORDER BY x.ord),
           string_agg(format('p.%I', b.attname), ', ' ORDER BY x.ord)
      INTO ccols, pcols
    FROM unnest(k.conkey, k.confkey) WITH ORDINALITY AS x(ck, pk, ord)
    JOIN pg_attribute a ON a.attrelid = k.child AND a.attnum = x.ck
    JOIN pg_attribute b ON b.attrelid = k.parent AND b.attnum = x.pk;

    EXECUTE format(
      'SELECT count(*) FROM %s c WHERE ROW(%s) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM %s p WHERE ROW(%s) = ROW(%s))',
      k.child, ccols, k.parent, pcols, ccols
    ) INTO n;

    IF n > 0 THEN
      broken := broken || format('%s (%s → %s): %s', k.conname, k.child, k.parent, n);
    END IF;
  END LOOP;

  IF cardinality(broken) > 0 THEN
    RAISE EXCEPTION 'Verweise ins Leere, der Abzug ist unvollständig: %', array_to_string(broken, '; ');
  END IF;
END
$transfer$;
