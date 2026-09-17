import { moduleOn, type ModuleState } from "@/hooks/useModule";
import type { Beitragsmodell } from "@/hooks/useBeitragsmodell";

/**
 * Was im Profil unter „Mitgliedschaft" überhaupt zu entscheiden ist.
 *
 * Aus dem Probelauf: Bei einer Interessengemeinschaft ist das Modul
 * „Beiträge" ab Werk aus — im Profil stand trotzdem ein Feld
 * „Beitragseinzug", jährlich oder halbjährlich. Ein Feld, das nach etwas
 * fragt, das es nicht gibt, ist schlimmer als keines: Wer es ausfüllt, glaubt,
 * es passiere etwas damit.
 *
 * Als eigene Funktionen und nicht als Bedingung mitten in der Maske, damit
 * sich das prüfen lässt, ohne einen Browser zu starten — und damit an einer
 * Stelle steht, warum ein Feld erscheint.
 */

/**
 * Der Beitragseinzug (jährlich, halbjährlich).
 *
 * Zwei Gründe, ihn wegzulassen: Das Modul ist aus, oder es wird gar kein
 * Beitrag erhoben. Im zweiten Fall gibt es nichts einzuziehen — die Frage
 * nach dem Rhythmus wäre dann eine Fangfrage.
 */
export function beitragseinzugZeigen(
  module: ModuleState[] | undefined,
  modell: Beitragsmodell
): boolean {
  return moduleOn(module, "contributions") && modell !== "keiner";
}

/**
 * Die Art der Mitgliedschaft.
 *
 * Sie kommt aus dem Beitragsmodell. Wo nur eine zur Auswahl steht — und das
 * ist bei einer Interessengemeinschaft ohne Beiträge der Normalfall —, gibt
 * es nichts zu wählen, und die Frage verwirrt bloss. Gezählt wird die Liste,
 * wie die Maske sie anbietet: die angebotenen Arten plus die eigene, falls
 * sie nicht mehr angeboten wird.
 */
export function mitgliedsartZeigen(zurAuswahl: number): boolean {
  return zurAuswahl > 1;
}
