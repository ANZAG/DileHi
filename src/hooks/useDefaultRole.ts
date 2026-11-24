import { useQuery } from "@tanstack/react-query";
import { ladeStandardrolle, rollenSchluessel } from "@/daten/rollen";

/**
 * Die Rolle, die ein neu eingeladenes Mitglied bekommt.
 *
 * Stand als „mitglied" fest im Programm – an vier Stellen. In einer
 * Installation, die ihre Rollen selbst benennt, gibt es die vielleicht gar
 * nicht, und eine Einladung wäre dann nicht abzuschicken.
 *
 * Ohne hinterlegte Standardrolle die unterste im Katalog: Die Reihenfolge ist
 * absteigend nach Verantwortung, unten steht also die einfachste Rolle. Ein
 * geratener Wert ist hier besser als gar keiner, weil sonst der Knopf zum
 * Einladen ins Leere führt.
 */
export function useDefaultRole(): string {
  const { data } = useQuery({
    queryKey: rollenSchluessel.standardrolle(),
    queryFn: ladeStandardrolle,
    staleTime: 10 * 60 * 1000,
  });
  return data ?? "";
}
