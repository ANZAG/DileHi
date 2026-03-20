import { Tent, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CLUB_TENTS, calcClubTentArea } from "@/components/event-forms/types";
import TentVisualizer, { type TentItem } from "./TentVisualizer";

interface Props {
  spacing: number;
  setSpacing: (v: number) => void;
  selectedClubTents: string[];
  setSelectedClubTents: (v: string[]) => void;
  saveSettings: (patch: Record<string, any>) => void;
  memberTentArea: number;
  clubTentArea: number;
  totalArea: number;
  tentItems: TentItem[];
  vizHeight: number;
  setVizHeight: (v: number) => void;
  resetLayout: () => void;
  layoutVersion: number;
  savedPositions?: Record<string, { x: number; y: number; rotated?: boolean }>;
  onPositionsChange: (positions: Record<string, { x: number; y: number; rotated?: boolean }>) => void;
}

export default function EvalAreaCalculator({
  spacing, setSpacing,
  selectedClubTents, setSelectedClubTents,
  saveSettings,
  memberTentArea, clubTentArea, totalArea,
  tentItems, vizHeight, setVizHeight,
  resetLayout, layoutVersion, savedPositions, onPositionsChange,
}: Props) {
  return (
    <div className="border rounded-lg p-4 mb-6">
      <h3 className="font-semibold mb-3 flex items-center gap-2">
        <Tent size={18} /> Flächenrechner & Lagerplan
      </h3>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <Label className="text-sm">Abstand / Laufweg pro Zelt (m)</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  const next = Math.max(0, +(spacing - 0.5).toFixed(1));
                  setSpacing(next);
                  saveSettings({ spacing_m: next });
                }}
                disabled={spacing <= 0}
              >
                <span className="text-sm font-bold">−</span>
              </Button>
              <span className="text-sm font-medium w-12 text-center">{spacing.toFixed(1)}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => {
                  const next = +(spacing + 0.5).toFixed(1);
                  setSpacing(next);
                  saveSettings({ spacing_m: next });
                }}
              >
                <span className="text-sm font-bold">+</span>
              </Button>
              <span className="text-xs text-muted-foreground">m</span>
            </div>
          </div>

          <div>
            <Label className="text-sm mb-2 block">Vereinszelte einplanen</Label>
            <div className="space-y-2">
              {CLUB_TENTS.map((ct) => (
                <div key={ct.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={selectedClubTents.includes(ct.id)}
                    onCheckedChange={(checked) => {
                      const next = checked
                        ? [...selectedClubTents, ct.id]
                        : selectedClubTents.filter((id) => id !== ct.id);
                      setSelectedClubTents(next);
                      saveSettings({ club_tents: next });
                    }}
                  />
                  <Label className="font-normal cursor-pointer text-sm">
                    {ct.label}
                    <span className="text-muted-foreground ml-1">({calcClubTentArea(ct.id, spacing).toFixed(1)} m²)</span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Mitgliederzelte</span>
              <span className="font-medium">{memberTentArea.toFixed(1)} m²</span>
            </div>
            <div className="flex justify-between">
              <span>Vereinszelte</span>
              <span className="font-medium">{clubTentArea.toFixed(1)} m²</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t">
              <span>Gesamtfläche</span>
              <span>{totalArea.toFixed(1)} m²</span>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm">Lagerplan (Zelte verschiebbar)</Label>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs px-2"
                title="Optimiertes Layout berechnen"
                onClick={resetLayout}
              >
                <RefreshCw size={12} className="mr-1" /> Auto-Layout
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setVizHeight(Math.max(200, vizHeight - 50))}
                disabled={vizHeight <= 200}
              >
                <span className="text-xs font-bold">−</span>
              </Button>
              <span className="text-xs text-muted-foreground w-10 text-center">{vizHeight}px</span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() => setVizHeight(Math.min(600, vizHeight + 50))}
                disabled={vizHeight >= 600}
              >
                <span className="text-xs font-bold">+</span>
              </Button>
            </div>
          </div>
          <TentVisualizer
            items={tentItems}
            spacing={spacing}
            maxHeight={vizHeight}
            onPositionsChange={onPositionsChange}
            savedPositions={savedPositions}
            layoutVersion={layoutVersion}
          />
        </div>
      </div>
    </div>
  );
}
