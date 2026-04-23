import { Tent, RefreshCw, Printer } from "lucide-react";
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
  eventTitle?: string;
}

// ---------------------------------------------------------------------------
// CSS-Variablen im SVG durch echte Farbwerte ersetzen, damit der
// Druckdialog die Farben korrekt rendert (neues Fenster hat keinen Zugriff
// auf das App-Stylesheet).
// ---------------------------------------------------------------------------
function resolveCSSVars(svgHtml: string): string {
  const style = getComputedStyle(document.documentElement);

  // hsl(var(--name) / alpha) → hsl(value / alpha)
  let result = svgHtml.replace(
    /hsl\(var\((--[\w-]+)\)\s*\/\s*([\d.]+)\)/g,
    (_, varName: string, alpha: string) => {
      const value = style.getPropertyValue(varName).trim();
      return value ? `hsl(${value} / ${alpha})` : "transparent";
    }
  );

  // hsl(var(--name)) → hsl(value)
  result = result.replace(
    /hsl\(var\((--[\w-]+)\)\)/g,
    (_, varName: string) => {
      const value = style.getPropertyValue(varName).trim();
      return value ? `hsl(${value})` : "#333";
    }
  );

  return result;
}

function printTentMap(spacing: number, eventTitle?: string) {
  const svgEl = document.querySelector(".tent-visualizer-svg") as SVGSVGElement | null;
  if (!svgEl) return;

  // Farben auflösen bevor wir in ein neues Fenster schreiben
  const svgContent = resolveCSSVars(svgEl.outerHTML);

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>Lagerplan${eventTitle ? ` – ${eventTitle}` : ""}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; color: #111; }
    h1 { font-size: 15px; margin: 0 0 3px; font-weight: bold; }
    p { font-size: 10px; color: #555; margin: 0 0 10px; }
    svg { width: 100%; height: auto; max-height: 175mm; display: block; }
    .legend { display: flex; gap: 18px; margin-top: 8px; font-size: 10px; flex-wrap: wrap; align-items: center; }
    .legend-item { display: flex; align-items: center; gap: 5px; }
    .legend-box { width: 14px; height: 14px; border-radius: 2px; }
  </style>
</head>
<body>
  <h1>Lagerplan${eventTitle ? ` – ${eventTitle}` : ""}</h1>
  <p>Abstand / Laufweg: ${spacing.toFixed(1)} m pro Zelt | Fläche inkl. Abspannseile und Wege</p>
  ${svgContent}
  <div class="legend">
    <div class="legend-item">
      <div class="legend-box" style="background:rgba(0,0,0,0.07);border:1px dashed #aaa;"></div>
      Mitgliederzelte
    </div>
    <div class="legend-item">
      <div class="legend-box" style="background:rgba(200,140,50,0.25);border:1px solid #c8903a;"></div>
      Vereinszelte
    </div>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=1000,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => { w.print(); }, 500);
}

export default function EvalAreaCalculator({
  spacing, setSpacing,
  selectedClubTents, setSelectedClubTents,
  saveSettings,
  memberTentArea, clubTentArea, totalArea,
  tentItems, vizHeight, setVizHeight,
  resetLayout, layoutVersion, savedPositions, onPositionsChange,
  eventTitle,
}: Props) {
  return (
    <div className="border rounded-lg p-4 mb-6">
      <h3 className="font-semibold mb-3 flex items-center gap-2 text-sm sm:text-base">
        <Tent size={18} /> Flächenrechner & Lagerplan
      </h3>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Linke Spalte: Einstellungen + Flächenwerte */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm">Abstand / Laufweg pro Zelt (m)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="outline" size="icon" className="h-8 w-8 shrink-0"
                onClick={() => { const n = Math.max(0, +(spacing - 0.5).toFixed(1)); setSpacing(n); saveSettings({ spacing_m: n }); }}
                disabled={spacing <= 0}
              >
                <span className="text-sm font-bold">−</span>
              </Button>
              <span className="text-sm font-medium w-12 text-center">{spacing.toFixed(1)}</span>
              <Button
                variant="outline" size="icon" className="h-8 w-8 shrink-0"
                onClick={() => { const n = +(spacing + 0.5).toFixed(1); setSpacing(n); saveSettings({ spacing_m: n }); }}
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
                    <span className="text-muted-foreground ml-1">
                      ({calcClubTentArea(ct.id, spacing).toFixed(1)} m²)
                    </span>
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t space-y-1 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Mitgliederzelte (Einzelflächen)</span>
              <span>{memberTentArea.toFixed(1)} m²</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Vereinszelte (Einzelflächen)</span>
              <span>{clubTentArea.toFixed(1)} m²</span>
            </div>
            <div className="flex justify-between font-semibold text-base pt-1 border-t">
              <span>Gesamtfläche (Layout)</span>
              <span>{totalArea.toFixed(0)} m²</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Bounding-Box des aktuellen Layouts, inkl. Abspannseile und Laufwege.
            </p>
          </div>
        </div>

        {/* Rechte Spalte: Visualizer */}
        <div className="min-w-0">
          {/* Header: Label oben, Buttons darunter – wrappen auf mobile */}
          <div className="mb-2 space-y-1">
            <Label className="text-sm">Lagerplan (Zelte verschiebbar)</Label>
            <div className="flex flex-wrap items-center gap-1">
              <Button
                variant="outline" size="sm" className="h-7 text-xs px-2"
                onClick={() => printTentMap(spacing, eventTitle)}
                disabled={tentItems.length === 0}
                title="Lagerplan drucken"
              >
                <Printer size={12} className="mr-1" /> Drucken
              </Button>
              <Button
                variant="outline" size="sm" className="h-7 text-xs px-2"
                onClick={resetLayout}
                title="Optimiertes Layout berechnen"
              >
                <RefreshCw size={12} className="mr-1" /> Auto-Layout
              </Button>
              {/* Höhe Visualizer */}
              <div className="flex items-center gap-1 ml-auto">
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => setVizHeight(Math.max(200, vizHeight - 50))}
                  disabled={vizHeight <= 200}
                >
                  <span className="text-xs font-bold">−</span>
                </Button>
                <span className="text-xs text-muted-foreground w-10 text-center">{vizHeight}px</span>
                <Button
                  variant="outline" size="icon" className="h-7 w-7"
                  onClick={() => setVizHeight(Math.min(600, vizHeight + 50))}
                  disabled={vizHeight >= 600}
                >
                  <span className="text-xs font-bold">+</span>
                </Button>
              </div>
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
