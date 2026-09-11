# Archiv: Umzug aus Lovable

Mit diesen Werkzeugen ist DileHi am 11. September 2026 aus der Lovable-Cloud
ins eigene Supabase-Projekt umgezogen: alle Tabellen, 19 Konten samt
Passwort, 127 von 140 Dateien. Wie das ablief, steht in
[`../umzug.md`](../umzug.md).

Sie liegen hier und nicht mehr im Betrieb, weil es nichts mehr umzuziehen
gibt: Lovable ist abgeschaltet. Der Test (`transfer.test.ts`) spielte die
Migrationen nach dem Ausgangsstand noch einmal über einen Abzug der alten
Datenbank; seit der Umbenennung ins Englische passt das nicht mehr zusammen.

Wer so etwas noch einmal braucht – etwa für einen Verein, der von einer
anderen Supabase-Installation kommt –, findet hier die Bausteine:

| Datei | Aufgabe |
| --- | --- |
| `transfer/export-accounts.sql` | Konten samt Passwort-Hash aus `auth` herausgeben |
| `transfer/import.sql` | Abzug einspielen: leeren, ohne Trigger einspielen, Verweise nachprüfen |
| `transfer-files.mjs` | Dateien zwischen Ablagen tragen, Grenzen der Ablage kurz aufheben |
| `umzug.yml` | der Workflow, der alles zusammenband |
| `transfer.test.ts`, `transferFiles.test.ts` | die Prüfungen dazu |

Was dabei gelernt wurde, steht im Arbeitsstand unter den Fehlern 31 bis 36.

## Nachtrag, 11. September abends

Zwölf Dateinamen mit Semikolon sind beim Übertragen am `;` abgeschnitten
worden: Die Speicher-Schnittstelle von Supabase nimmt es in der Adresse als
Trennzeichen, obwohl `transfer-files.mjs` die Namen kodiert. Die Dateien sind
vollständig da, nur unter dem gekürzten Namen. Die Aktion `move` der Edge
Function `sharepoint-files` findet sie trotzdem und legt sie in SharePoint
unter dem vollen Namen ab.
