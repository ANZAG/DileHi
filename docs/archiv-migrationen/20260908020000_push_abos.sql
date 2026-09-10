-- Push-Meldungen: Geräte-Abonnements
--
-- Ein Abonnement gehört zu einem Gerät, nicht zu einer Person: Wer Handy und
-- Rechner benutzt, hat zwei. Beide sollen klingeln.
--
-- Der endpoint ist die vom Browser vergebene Adresse des Push-Dienstes. Er ist
-- eindeutig und dient zugleich als Schlüssel – meldet sich dasselbe Gerät neu
-- an, wird der bestehende Eintrag aktualisiert statt verdoppelt.

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  endpoint    text PRIMARY KEY,
  user_id     uuid NOT NULL,
  -- Öffentlicher Schlüssel und Geheimnis des Geräts, vom Browser erzeugt.
  -- Ohne sie lässt sich die Nachricht nicht verschlüsseln.
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  -- Nur zur Wiedererkennung in der Geräteliste ("Chrome auf Android").
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  last_sent_at timestamptz,
  -- Zählt fehlgeschlagene Zustellungen. Ein Gerät, das dauerhaft ablehnt,
  -- wird entfernt – sonst wächst die Tabelle mit toten Einträgen.
  failure_count integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Jeder verwaltet nur die eigenen Geräte. Gelesen wird zum Versenden mit
-- Service-Role, das umgeht RLS ohnehin.
CREATE POLICY "Eigene Geraete" ON public.push_subscriptions FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Einstellung je Mitglied, getrennt von der Tageszusammenfassung: Wer Push
-- will, will nicht zwingend auch die Mail – und umgekehrt.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS notify_push boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.notify_push IS
  'Push-Meldungen auf angemeldete Geraete. Unabhaengig von notify_digest.';

-- ══ Empfänger einer Meldung ═════════════════════════════════════════════════
--
-- Wird von der Edge Function mit Service-Role gelesen. Liefert die Geräte
-- derjenigen, die zum Thema benachrichtigt werden – ohne den Verfasser.
CREATE OR REPLACE FUNCTION public.push_targets_for_thread(_thread_id uuid, _exclude uuid)
RETURNS TABLE (endpoint text, p256dh text, auth text, user_id uuid)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.endpoint, s.p256dh, s.auth, s.user_id
  FROM public.forum_thread_audience(_thread_id, _exclude) a
  JOIN public.profiles p ON p.id = a.user_id AND p.notify_push AND p.is_active IS DISTINCT FROM false
  JOIN public.push_subscriptions s ON s.user_id = a.user_id
  WHERE s.failure_count < 5;
$$;

REVOKE ALL ON FUNCTION public.push_targets_for_thread(uuid, uuid) FROM PUBLIC, anon, authenticated;

-- ══ Aufräumen ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.push_mark_failure(_endpoint text, _gone boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _gone THEN
    -- 404/410 vom Push-Dienst heisst: Das Geraet gibt es nicht mehr.
    DELETE FROM public.push_subscriptions WHERE endpoint = _endpoint;
  ELSE
    UPDATE public.push_subscriptions
    SET failure_count = failure_count + 1
    WHERE endpoint = _endpoint;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.push_mark_failure(text, boolean) FROM PUBLIC, anon, authenticated;
