// @vitest-environment node
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { leereDatenbank, einspielen } from "./hilfe/buehne";

/**
 * Wann der geführte Durchlauf als erledigt gilt.
 *
 * Der Fund aus dem Probelauf: `20260916170000_einrichtungsprozess.sql` hakt
 * ihn für jede Installation ab, in der ein Vereinsname steht und eine Rolle
 * vergeben ist — damit DileHi nach einem Jahr Betrieb nicht plötzlich eine
 * Einrichtung vorgesetzt bekommt. Genau das trifft aber auch auf eine frische
 * Installation zu, sobald jemand den ersten Zugang angelegt und den Namen
 * eingetragen hat. Der Durchlauf war beendet, bevor er das erste Mal aufging.
 *
 * Die bessere Frage ist nicht „steht schon etwas da?", sondern „sind hier
 * schon Leute?". Geprüft wird deshalb beides: dass die frische Installation
 * ihren Durchlauf zurückbekommt und dass die laufende ihn nicht aufgedrängt
 * bekommt.
 */

const DURCHLAUF = "20260916170000_einrichtungsprozess.sql";

interface Stand {
  setup_step: number;
  setup_done_at: string | null;
}

/** Alle Migrationen, mit einem Zwischenschritt vor der Durchlauf-Migration. */
async function mitStand(zwischenschritt: string) {
  const db = await leereDatenbank();
  const dateien = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
  for (const f of dateien.filter((f) => f < DURCHLAUF)) {
    await einspielen(db, f, readFileSync(`supabase/migrations/${f}`, "utf-8").replace(/\r\n/g, "\n"));
  }
  await db.exec(zwischenschritt);
  for (const f of dateien.filter((f) => f >= DURCHLAUF)) {
    await einspielen(db, f, readFileSync(`supabase/migrations/${f}`, "utf-8").replace(/\r\n/g, "\n"));
  }
  return db;
}

/** Ein Konto mit Rolle – so weit ist jede Installation nach dem ersten Zugang. */
function konto(nr: number): string {
  const id = `${nr}${nr}${nr}${nr}${nr}${nr}${nr}${nr}-${nr}${nr}${nr}${nr}-${nr}${nr}${nr}${nr}-${nr}${nr}${nr}${nr}-${nr}${nr}${nr}${nr}${nr}${nr}${nr}${nr}${nr}${nr}${nr}${nr}`;
  return `
    insert into auth.users (id, email) values ('${id}', 'person${nr}@example.org');
    insert into public.profiles (id, display_name) values ('${id}', 'Person ${nr}')
      on conflict (id) do nothing;
    insert into public.user_roles (user_id, role) values ('${id}', 'officiatus_1')
      on conflict do nothing;
  `;
}

describe("Der Stand des geführten Durchlaufs", () => {
  it("bleibt offen, wenn erst der Einrichter selbst da ist", async () => {
    // Der Probelauf: ein Konto, ein Profil, der Vereinsname eingetragen.
    const db = await mitStand(`
      ${konto(1)}
      update public.app_settings set org_name = 'Probeverein e. V.';
    `);

    const stand = (await db.query<Stand>(
      "select setup_step, setup_done_at from public.app_settings"
    )).rows[0];

    expect(stand.setup_done_at, "Der Durchlauf war zugefallen, bevor ihn jemand sah").toBeNull();
    expect(stand.setup_step).toBe(0);

    await db.close();
  });

  it("drängt ihn einer laufenden Installation nicht auf", async () => {
    // DileHi: Vereinsdaten, mehrere Mitglieder. Dort soll nach einem Jahr
    // Betrieb keine Einrichtung aufgehen.
    const db = await mitStand(`
      ${konto(1)}
      ${konto(2)}
      ${konto(3)}
      update public.app_settings set org_name = 'Diu lebendec Historje e. V.';
    `);

    const stand = (await db.query<Stand>(
      "select setup_step, setup_done_at from public.app_settings"
    )).rows[0];
    expect(stand.setup_done_at).not.toBeNull();

    await db.close();
  });

  it("nimmt niemandem sein eigenes Ergebnis weg", async () => {
    // Wer den Durchlauf selbst gegangen ist, behält ihn abgeschlossen – auch
    // als einziges Mitglied. Daran erkennt man es: `setup_step` steht nicht
    // mehr auf 0, weil jemand geklickt hat.
    const db = await mitStand(`
      ${konto(1)}
      update public.app_settings set org_name = 'Kleiner Verein e. V.';
    `);
    await db.exec(`
      update public.app_settings
         set setup_step = 7, setup_done_at = now();
    `);

    // Noch einmal dieselbe Migration – so wie ein zweites Ausrollen es täte.
    await einspielen(
      db,
      "20260916200000_durchlauf_wieder_oeffnen.sql",
      readFileSync("supabase/migrations/20260916200000_durchlauf_wieder_oeffnen.sql", "utf-8")
    );

    const stand = (await db.query<Stand>(
      "select setup_step, setup_done_at from public.app_settings"
    )).rows[0];
    expect(stand.setup_done_at).not.toBeNull();

    await db.close();
  });
});
