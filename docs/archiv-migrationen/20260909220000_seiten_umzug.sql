-- Die Baukastenseiten übernehmen die echten Adressen
--
-- Sie standen bis jetzt unter „…-neu" neben den im Code gebauten Seiten, damit
-- sich beide vergleichen liessen. Der Vergleich ist durch: Text, Überschriften,
-- Bilder und Bildbreiten stimmen überein, die Abweichungen bei Titel,
-- strukturierten Daten und Impressum sind behoben.
--
-- Ab hier gibt es die Seiten nur noch einmal – im Editor. Die Dateien unter
-- src/pages/ sind mit dieser Änderung gelöscht.

-- Falls unter der Zieladresse schon etwas liegt (ein Fehlversuch, eine
-- angelegte Seite), muss es weichen – sonst scheitert die Umbenennung an der
-- Eindeutigkeit, und zwar mitten in der Migration.
DELETE FROM public.site_pages
WHERE slug IN ('startseite', 'verein', 'fuer-veranstalter', 'impressum', 'datenschutz',
               'epochen/mittelalter', 'epochen/1815', 'epochen/wk1')
  AND EXISTS (
    SELECT 1 FROM public.site_pages n WHERE n.slug = public.site_pages.slug || '-neu'
  );

UPDATE public.site_pages SET slug = replace(slug, '-neu', '')
WHERE slug IN ('startseite-neu', 'verein-neu', 'fuer-veranstalter-neu',
               'impressum-neu', 'datenschutz-neu',
               'epochen/mittelalter-neu', 'epochen/1815-neu', 'epochen/wk1-neu');

-- Systemseiten: Diese acht haengen am Menue und an rechtlichen Pflichten. Ein
-- versehentliches Loeschen waere kein Schoenheitsfehler – ohne Impressum ist
-- die Seite abmahnfaehig.
UPDATE public.site_pages SET is_system = true
WHERE slug IN ('startseite', 'verein', 'fuer-veranstalter', 'impressum', 'datenschutz',
               'epochen/mittelalter', 'epochen/1815', 'epochen/wk1');

-- Menuepunkte, die noch auf die Vergleichsadressen zeigen, mitziehen.
UPDATE public.site_menu SET href = replace(href, '-neu', '')
WHERE href LIKE '%-neu';
