-- SEPA-Lastschrift entfernen, Bankverbindung verwaltbar machen
--
-- Der Aufnahmeantrag hat vier Spalten für den Lastschrifteinzug: iban, bic,
-- account_holder und sepa_accepted. Erhoben wurden sie nie – das Formular
-- kennt die Felder nicht, submit-application schreibt vier feste NULL-Werte
-- hinein, und gedruckt wurden sie auch nicht. Der Verein bietet den Einzug
-- bis heute nicht an; es war eine Idee, die nie umgesetzt wurde.
--
-- Sie stehenzulassen ist nicht folgenlos: Die Datenschutzerklärung nannte
-- „Bankverbindung (IBAN und BIC) sowie die Angaben des erteilten
-- SEPA-Lastschriftmandats" unter den verarbeiteten Daten. Eine Erklärung, die
-- eine Verarbeitung beschreibt, die es nicht gibt, ist genauso falsch wie eine,
-- die eine verschweigt. Die Erklärung wird mit dieser Änderung berichtigt
-- (Migration 20260908160000, neu erzeugt).

ALTER TABLE public.membership_applications
  DROP COLUMN IF EXISTS iban,
  DROP COLUMN IF EXISTS bic,
  DROP COLUMN IF EXISTS account_holder,
  DROP COLUMN IF EXISTS sepa_accepted;

-- ══ Bankverbindung des Vereins ══════════════════════════════════════════════
--
-- Nicht zu verwechseln mit dem Obigen: Der Verein hat ein Konto, auf das
-- Mitglieder ihren Beitrag überweisen. Das ist keine Lastschrift, sondern eine
-- Angabe, die im Beitragsbereich steht.
--
-- Sie stand bisher fest im Code (src/pages/intern/Contributions.tsx), mit
-- einem Vereinsnamen ohne Zirkumflex und einer IBAN, die stark nach der
-- Beispiel-IBAN aus Anleitungen aussieht. Deshalb wird hier NICHTS vorbelegt:
-- Eine falsche Kontonummer ist schlimmer als gar keine, und die Karte im
-- Beitragsbereich bleibt so lange verborgen, bis jemand die richtige einträgt.

ALTER TABLE public.app_settings
  ADD COLUMN IF NOT EXISTS bank_recipient text,
  ADD COLUMN IF NOT EXISTS bank_iban      text,
  ADD COLUMN IF NOT EXISTS bank_bic       text;

COMMENT ON COLUMN public.app_settings.bank_iban IS
  'Konto des Vereins fuer eingehende Beitraege. Keine Lastschrift.';

-- Der Empfänger ist in aller Regel der Vereinsname – das lässt sich vorbelegen,
-- ohne etwas zu erfinden.
UPDATE public.app_settings
SET bank_recipient = org_name
WHERE id AND bank_recipient IS NULL;
