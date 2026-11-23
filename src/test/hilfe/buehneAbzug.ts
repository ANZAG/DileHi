import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { ABZUG_DATEI, ABZUG_STAND, abzugErstellen } from "./buehne";

/**
 * Die fertige Installation einmal je Testlauf bauen und als Datei ablegen.
 *
 * Wird von vitest.config.ts als globalSetup geladen, läuft also vor allen
 * Testdateien und nur einmal. `installation()` in buehne.ts lädt den Abzug,
 * statt die Migrationen in jeder Testdatei neu einzuspielen.
 *
 * Über die Umgebung weitergereicht und nicht über `provide`: buehne.ts müsste
 * sonst `inject` aus vitest laden und wäre ohne laufenden Test nicht mehr zu
 * gebrauchen. Die Arbeitsprozesse starten erst nach diesem Schritt und erben
 * die Umgebung.
 */
export default async function setup(): Promise<() => void> {
  const { daten, stand } = await abzugErstellen();
  const ordner = mkdtempSync(path.join(tmpdir(), "dilehi-buehne-"));
  const datei = path.join(ordner, "pgdata.tar");
  writeFileSync(datei, daten);
  process.env[ABZUG_DATEI] = datei;
  process.env[ABZUG_STAND] = stand;
  return () => rmSync(ordner, { recursive: true, force: true });
}
