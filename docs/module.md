# Ein Modul hinzufügen

Ein Modul ist ein Bereich, den ein Verein braucht oder nicht: Forum,
Abstimmungen, Beiträge, Lagerlogistik. Abgeschaltet verschwindet er überall –
Menüpunkt, Kachel, Verwaltungsreiter, Profilbereich, Route. **Die Daten bleiben.**

Damit das ohne Pflaster geht, gibt es genau vier Stellen. Wenn du an einer
fünften ein `if` schreiben musst, fehlt im Modulsystem ein Haken – dann gehört
er dorthin und nicht in deinen Code.

Als Beispiel ein Modul „Inventar": Was hat der Verein, wo liegt es, wer hat es
geliehen.

## 1. Migration

Die eigenen Tabellen, dazu eine Zeile in `app_modules`:

```sql
INSERT INTO public.app_modules (key, label, description, enabled, sort_order, requires, kind)
VALUES ('inventar', 'Inventar',
        'Was der Verein besitzt, wo es liegt und wer es geliehen hat.',
        true, 150, NULL, 'core')
ON CONFLICT (key) DO NOTHING;
```

- `requires` nur setzen, wenn das Modul auf einem anderen aufbaut. Die
  Abhängigkeit wird in `module_enabled()` rekursiv ausgewertet: Ist das
  Grundmodul aus, ist auch dieses aus – unabhängig vom eigenen Schalter.
- `kind` ist `core` (eigener Bereich) oder `addon` (Erweiterung eines
  anderen Moduls). Steuert nur, wo es in der Verwaltung steht.
- Rechte gehören **nicht** hierher, sondern in den `permission_catalog`. Modul
  und Recht beantworten verschiedene Fragen: „Gibt es das hier?" und „Darf
  diese Person das?"

## 2. Route

In `src/App.tsx` einwickeln:

```tsx
<Route path="/intern/inventar" element={
  <ModulRoute k="inventar"><ProtectedRoute><Inventar /></ProtectedRoute></ModulRoute>
} />
```

`ModulRoute` zeigt bei abgeschaltetem Modul eine Erklärung statt einer weißen
Seite – wer einem Lesezeichen folgt, soll erfahren, dass es den Bereich gibt
und er abgeschaltet ist.

## 3. Listen

Überall, wo das Modul auftauchen soll, `module` an den Eintrag schreiben.
Gefiltert wird zentral über `nurAktive()`:

```tsx
// src/pages/intern/Dashboard.tsx
{ title: "Inventar", desc: "…", icon: Package, path: "/intern/inventar", module: "inventar" },

// src/pages/intern/Admin.tsx
{ id: "inventar" as const, gruppe: "intern", label: "Inventar", …, module: "inventar" },
```

Für einen Bereich im Mitgliederprofil eine Zeile in `profile_fields` mit
`block_key` und `module` – dann greifen beide Schalter, der des Bereichs und der
des Moduls.

## 4. Feldtypen

Bringt das Modul einen eigenen Feldtyp für Formulare mit, bekommt er in
`FIELD_TYPES` ein `module`. Die Auswahl filtert danach von selbst:

```ts
{ module: "inventar", value: "ausleihe", label: "Ausleihe", … }
```

## Und die Tour?

Kein Pflichtschritt, aber der Ort dafür: eine Zeile in `onboarding_steps`
mit `modul = 'inventar'`. Sie erscheint dann nur, wenn das Modul eingeschaltet
ist, und verschwindet mit ihm – ohne eine weitere Abfrage. Siehe
[onboarding.md](onboarding.md).

## Was der Test prüft

`src/test/module.test.ts` vergleicht die im Code benutzten Modulschlüssel mit
denen in den Migrationen. Ein Schlüssel ohne Zeile in der Datenbank gilt als
eingeschaltet und ließe sich nie abschalten – ohne dass irgendwo etwas rot
wird. Genau diese halbe Verkabelung hatten wir schon zweimal.

## Was bewusst kein Modul ist

Mitglieder, Rollen und Rechte, Erscheinungsbild, öffentliche Seiten,
E-Mail-Versand. Eine Vereinsverwaltung ohne Mitglieder wäre keine, und ein
Schalter, den niemand je umlegt, ist nur eine Stelle, an der etwas kaputtgehen
kann.

## Abschalten löscht nichts

Weder beim Modul noch bei einem Profilbereich. Wer versehentlich das Forum
abschaltet, findet die Beiträge nach dem Wiedereinschalten unverändert vor.
Das ist keine Bequemlichkeit, sondern die Voraussetzung dafür, dass sich jemand
traut, etwas auszuprobieren.
