import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FIELD_TYPES } from "./types";
import {
  Heading, Type, AlignLeft, Hash, List, CheckSquare, ToggleLeft, Calendar, Tent,
} from "lucide-react";

const ICONS: Record<string, any> = {
  Heading, Type, AlignLeft, Hash, List, CheckSquare, ToggleLeft, Calendar, Tent,
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (type: string) => void;
}

/** Feldtyp-Auswahl in Klartext mit Erklärung und Beispiel */
export default function FieldTypePicker({ open, onOpenChange, onSelect }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Was möchtest du hinzufügen?</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {FIELD_TYPES.map((t) => {
            const Icon = ICONS[t.icon] || Type;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  onSelect(t.value);
                  onOpenChange(false);
                }}
                className="flex gap-3 p-3 rounded-lg border bg-card text-left hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <span className="mt-0.5 text-primary shrink-0">
                  <Icon size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{t.label}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{t.hint}</span>
                  <span className="block text-xs text-muted-foreground/80 mt-0.5 italic">{t.example}</span>
                </span>
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
