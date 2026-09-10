import { Link } from "react-router-dom";
import { PackageOpen } from "lucide-react";
import { useModule, modulAn } from "@/hooks/useModule";

/**
 * Ein Bereich, den es nur gibt, wenn sein Modul eingeschaltet ist.
 *
 * Bewusst keine Weiterleitung auf die Startseite: Wer einem Lesezeichen oder
 * einem alten Link folgt, soll erfahren, dass es den Bereich gibt und er
 * abgeschaltet ist. Eine wortlose Umleitung sieht aus wie ein Fehler, und die
 * Person sucht dann an der falschen Stelle.
 *
 * Auch keine weisse Seite: Genau das passiert, wenn man eine Route einfach
 * nicht rendert.
 */
export default function ModulRoute({ k, children }: { k: string; children: React.ReactNode }) {
  const { data: module, isLoading } = useModule();

  // Solange geladen wird, nichts behaupten. Die Abfrage ist eine Stunde lang
  // gemerkt, das trifft praktisch nur den ersten Aufruf.
  if (isLoading) return <>{children}</>;
  if (modulAn(module, k)) return <>{children}</>;

  const modul = module?.find((m) => m.key === k);
  const wegenAnderem = modul?.enabled && modul?.requires
    ? module?.find((m) => m.key === modul.requires)
    : null;

  return (
    <div className="container py-16 max-w-lg px-4 text-center">
      <PackageOpen size={32} className="mx-auto mb-4 text-muted-foreground" />
      <h1 className="font-serif text-2xl font-bold mb-3">
        {modul?.label ?? "Dieser Bereich"} ist abgeschaltet
      </h1>
      <p className="text-muted-foreground mb-6">
        {wegenAnderem
          ? `Der Bereich gehört zu „${wegenAnderem.label}", und das ist abgeschaltet.`
          : "Die Systemverwaltung kann ihn unter Verwaltung → Module wieder einschalten."}
        {" "}
        Vorhandene Daten bleiben erhalten.
      </p>
      <Link
        to="/intern"
        className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground font-medium"
      >
        Zum Mitgliederbereich
      </Link>
    </div>
  );
}
