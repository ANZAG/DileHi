-- Umlaute in der Quellensammlung zusammensetzen.
--
-- „ä" lässt sich auf zwei Arten speichern: als ein Zeichen (NFC) oder als „a"
-- mit angehängten Pünktchen (NFD). Auf dem Bildschirm sieht beides gleich
-- aus, für die Datenbank sind es verschiedene Texte. Aus der alten Cloud kam
-- die zerlegte Form mit – wer „geräthschaften" in die Suche tippt, findet die
-- Bände von Becker und von Hefner deshalb nicht.
--
-- Einmal geradeziehen, für alle drei Textfelder. Wo schon die zusammengesetzte
-- Form steht, ändert sich nichts; bei einer leeren Sammlung passiert gar
-- nichts. Deshalb darf das auch bei jeder Neuinstallation mitlaufen.

update public.sources
set title = normalize(title, NFC),
    content = normalize(content, NFC),
    file_name = normalize(file_name, NFC)
where title <> normalize(title, NFC)
   or content <> normalize(content, NFC)
   or file_name <> normalize(file_name, NFC);
