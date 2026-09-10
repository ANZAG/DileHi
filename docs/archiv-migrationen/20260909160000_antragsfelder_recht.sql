-- Antragsfelder gehoeren zur Einrichtung, nicht zum Tagesgeschaeft
--
-- Die Felder des Aufnahmeantrags lagen unter „Mitglieder und Anfragen" und
-- damit beim Recht members.manage. Sie stehen jetzt unter „System", neben den
-- Texten des Antrags – wer den Antrag zusammenstellt, richtet die Anwendung
-- ein; wer Antraege prueft, arbeitet damit. Das sind zwei Aufgaben und zwei
-- Rollen.

DROP POLICY IF EXISTS application_fields_pflegen ON public.application_fields;
CREATE POLICY application_fields_pflegen ON public.application_fields
  FOR ALL TO authenticated
  USING (public.has_permission(auth.uid(), 'system.settings'))
  WITH CHECK (public.has_permission(auth.uid(), 'system.settings'));
