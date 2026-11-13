/**
 * Eine ganze Tabelle lesen, in Seiten.
 *
 * Supabase liefert je Abfrage höchstens so viele Zeilen, wie im Projekt als
 * „Max rows“ eingestellt ist (Vorgabe 1000) – und zwar ohne Fehler, die Liste
 * ist einfach kürzer. So zeigte die Wissensbibliothek nur die ersten 1000 von
 * 1155 Bildern und meldete den Rest als fehlend.
 *
 * Die Abfrage muss `count: "exact"` anfordern und eindeutig sortiert sein,
 * sonst können Zeilen zwischen zwei Seiten doppelt kommen oder fehlen.
 * Weitergelesen wird, bis die Zahl erreicht ist oder eine Seite leer bleibt;
 * deshalb stimmt das Ergebnis auch, wenn die Grenze im Projekt kleiner ist
 * als die angefragte Seite.
 */
export type Seitenabfrage<T> = (von: number, bis: number) => PromiseLike<{
  data: T[] | null;
  error: { message: string } | null;
  count?: number | null;
}>;

export const SEITENGROESSE = 1000;

export async function alleZeilen<T>(abfrage: Seitenabfrage<T>, groesse = SEITENGROESSE): Promise<T[]> {
  const alle: T[] = [];
  let gesamt: number | null = null;
  for (;;) {
    const { data, error, count } = await abfrage(alle.length, alle.length + groesse - 1);
    if (error) throw new Error(error.message);
    const teil = data ?? [];
    gesamt ??= count ?? null;
    alle.push(...teil);
    if (teil.length === 0) break;
    if (gesamt !== null ? alle.length >= gesamt : teil.length < groesse) break;
  }
  return alle;
}

/** Eine Liste in Stücke teilen – etwa für `.in(…)`, dessen Werte in der Adresse stehen. */
export function inStuecken<T>(liste: T[], groesse: number): T[][] {
  const stuecke: T[][] = [];
  for (let i = 0; i < liste.length; i += groesse) stuecke.push(liste.slice(i, i + groesse));
  return stuecke;
}
