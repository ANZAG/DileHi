-- Der Durchlauf war zugefallen, bevor ihn jemand gesehen hat
--
-- `20260916170000_einrichtungsprozess.sql` hakt den Durchlauf für jede
-- Installation ab, die schon läuft — sonst bekäme DileHi nach einem Jahr
-- Betrieb plötzlich eine Einrichtung vorgesetzt. Die Schranke dafür war:
-- Vereinsname eingetragen und mindestens eine Rolle vergeben.
--
-- Das ist zu grob. Genau das trifft nämlich auch auf eine frische
-- Installation zu, in der jemand den ersten Zugang angelegt und den Namen
-- eingetragen hat — also auf jede, die gerade erst anfängt. Im Probelauf ist
-- genau das passiert: Der Durchlauf war beendet, bevor er das erste Mal
-- aufging, und im Assistenten hing auch der Knopf „Schritt für Schritt“ an
-- derselben Bedingung. Es gab keinen Weg zurück.
--
-- Die bessere Frage ist nicht „steht schon etwas da?“, sondern „sind hier
-- schon Leute?“. Ein Verein im Betrieb hat mehr als ein Mitglied; eine
-- Installation am ersten Tag hat genau eins, nämlich den, der sie aufsetzt.
--
-- Zurückgesetzt wird deshalb nur dort, wo beides zutrifft:
--
--   setup_step = 0   niemand hat je einen Schritt angeklickt. Wer den
--                    Durchlauf selbst durchlaufen und beendet hat, behält
--                    sein Ergebnis — auch als einziges Mitglied.
--   höchstens ein Profil   die Installation ist noch niemandes Verein.
--
-- DileHi hat Dutzende Profile und bleibt unangetastet.

UPDATE public.app_settings
   SET setup_done_at = NULL
 WHERE setup_done_at IS NOT NULL
   AND coalesce(setup_step, 0) = 0
   AND (SELECT count(*) FROM public.profiles) <= 1;
