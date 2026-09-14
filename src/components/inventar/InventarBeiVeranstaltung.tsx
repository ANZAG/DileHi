import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { modulAn, useModule } from "@/hooks/useModule";
import { db } from "@/hooks/useInventar";

interface Zeile {
  quantity: number;
  status: string;
  inventory_items: { name: string } | null;
}

/**
 * Was für eine Veranstaltung aus dem Inventar reserviert oder ausgegeben ist.
 *
 * Steht bei der Veranstaltung, weil man es dort sucht: Beim Packen für das
 * Lager fragt niemand die Inventarseite, sondern schaut in den Termin.
 */
export default function InventarBeiVeranstaltung({ eventId }: { eventId: string }) {
  const { data: module } = useModule();
  const an = modulAn(module, "inventory");

  const { data: zeilen = [] } = useQuery({
    queryKey: ["inventar", "veranstaltung", eventId],
    queryFn: async (): Promise<Zeile[]> => {
      const { data, error } = await db.from("inventory_loans")
        .select("quantity, status, inventory_items(name)")
        .eq("event_id", eventId)
        .neq("status", "returned");
      // Fehlt die Tabelle (Migration noch nicht eingespielt), nichts zeigen.
      if (error) return [];
      return (data ?? []) as Zeile[];
    },
    enabled: an,
    staleTime: 60 * 1000,
  });

  if (!an || zeilen.length === 0) return null;

  // Gleiche Gegenstände zusammenfassen: zwei Reservierungen über je ein Zelt
  // sind im Termin „2× Speichenrad".
  const summen = new Map<string, number>();
  for (const z of zeilen) {
    const name = z.inventory_items?.name ?? "Gegenstand";
    summen.set(name, (summen.get(name) ?? 0) + z.quantity);
  }

  return (
    <div className="mt-2 flex items-start gap-2 text-xs text-muted-foreground">
      <Package size={14} className="shrink-0 mt-0.5" aria-hidden />
      <p className="min-w-0 break-words">
        <Link to="/intern/inventar" className="text-foreground hover:underline">Inventar</Link>:{" "}
        {[...summen].map(([name, anzahl]) => `${anzahl > 1 ? `${anzahl}× ` : ""}${name}`).join(", ")}
      </p>
    </div>
  );
}
