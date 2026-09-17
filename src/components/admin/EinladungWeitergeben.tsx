import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

/** Was `invite-member` zurückgibt. */
export interface EinladungsAntwort {
  success?: boolean;
  userId?: string;
  /** Ein neues Konto – bei einem vorhandenen gibt es keinen Link. */
  neu?: boolean;
  mailVersandt?: boolean;
  /** Warum die Mail nicht rausging, in den Worten des Mailservers. */
  mailFehler?: string | null;
  /** Der einmalige Link – nur gesetzt, wenn die Mail nicht rausging. */
  einladung?: string | null;
}

/**
 * Der Einladungslink zum Weitergeben, wenn die Mail nicht rausging.
 *
 * Eine frische Installation hat oft noch keinen Mailversand: SMTP ist die
 * Vorgabe, die Zugangsdaten stehen aber erst da, wenn jemand sie einträgt.
 * Vorher hiess es an dieser Stelle „Einladung versendet", während niemand
 * etwas bekam – und der Link, der nur einmal erzeugt wird, war weg.
 *
 * Die Einrichtungsseite macht es seit jeher so; hier ist dieselbe Hilfe für
 * jede weitere Einladung.
 */
export default function EinladungWeitergeben({
  email,
  link,
  grund,
}: {
  email: string;
  link: string;
  grund?: string | null;
}) {
  const { toast } = useToast();

  return (
    <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/40">
      <p className="text-sm">
        Das Konto für <strong>{email}</strong> steht, die Einladung ging aber nicht
        raus. Gib diesen Link weiter – er gilt einmalig und führt zum Festlegen
        des Passworts:
      </p>
      <div className="flex gap-2">
        <Input readOnly value={link} className="font-mono text-xs" aria-label="Einladungslink" />
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            navigator.clipboard?.writeText(link);
            toast({ title: "Kopiert" });
          }}
        >
          <Copy size={15} />
        </Button>
      </div>
      {grund ? (
        <p className="text-xs text-muted-foreground">
          Grund: {grund} — der Mailversand steht unter Verwaltung → Erscheinungsbild.
        </p>
      ) : null}
    </div>
  );
}
