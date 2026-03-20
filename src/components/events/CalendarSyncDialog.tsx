import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  personalIcalUrl: string | null;
  icalUrl: string;
  copyCalendarUrl: () => void;
}

export default function CalendarSyncDialog({ open, onOpenChange, personalIcalUrl, icalUrl, copyCalendarUrl }: Props) {
  const { toast } = useToast();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Kalender abonnieren</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Kopiere die URL unten und füge sie als <strong>Kalenderabonnement</strong> in deinem Kalender-Programm hinzu 
            (Outlook, Apple Kalender, Google Calendar). Dein Kalender synchronisiert dann automatisch alle Events, 
            denen du zugesagt hast.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">Meine zugesagten Termine</label>
            <div className="flex gap-2">
              <Input readOnly value={personalIcalUrl || "Wird geladen..."} className="text-xs font-mono" />
              <Button size="icon" variant="outline" onClick={copyCalendarUrl} disabled={!personalIcalUrl}>
                <Copy size={16} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enthält nur Events, denen du zugesagt hast. Wird automatisch aktualisiert.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Alle Vereinstermine</label>
            <div className="flex gap-2">
              <Input readOnly value={icalUrl} className="text-xs font-mono" />
              <Button size="icon" variant="outline" onClick={() => {
                navigator.clipboard.writeText(icalUrl);
                toast({ title: "URL kopiert" });
              }}>
                <Copy size={16} />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enthält alle Vereinstermine, unabhängig von deiner Zusage.
            </p>
          </div>

          <div className="rounded-lg bg-muted p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">So geht's:</p>
            <p>• <strong>Outlook:</strong> Start → Kalender hinzufügen → Aus dem Internet …</p>
            <p>• <strong>Apple Kalender:</strong> Ablage → Neues Kalenderabonnement</p>
            <p>• <strong>Google Calendar:</strong> Andere Kalender → Per URL</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
