import { useRef, useState, useEffect } from "react";

export interface TentItem {
  id: string;
  label: string;
  typeName: string;
  area: number;
  w: number;
  h: number;
  innerW: number;
  innerH: number;
  guyRope: number;
  shape: string;
  category: string;
  x: number;
  y: number;
  rotated?: boolean;
}

/**
 * Ordnet die Zelte an. Die Umsetzung liegt in campLayout.ts – der Name bleibt,
 * damit die Aufrufstellen unverändert bleiben.
 */
export { layoutCamp as autoLayout } from "./campLayout";

interface TentVisualizerProps {
  items: TentItem[];
  spacing: number;
  maxHeight: number;
  onPositionsChange?: (positions: Record<string, { x: number; y: number; rotated?: boolean; angle?: number }>) => void;
  savedPositions?: Record<string, { x: number; y: number; rotated?: boolean; angle?: number }>;
  layoutVersion: number;
  mapImageUrl?: string;
  mapScale?: number;
}

type PositionState = { x: number; y: number; rotated?: boolean; angle?: number };

// Normiert den Drehwinkel: legacy `rotated: true` = 90°
function getAngle(pos?: PositionState): number {
  if (!pos) return 0;
  if (typeof pos.angle === "number") return pos.angle;
  return pos.rotated ? 90 : 0;
}

export default function TentVisualizer({
  items, spacing, maxHeight,
  onPositionsChange, savedPositions, layoutVersion,
  mapImageUrl, mapScale,
}: TentVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{ id: string; mode: "move" | "rotate" } | null>(null);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const [positions, setPositions] = useState<Record<string, PositionState>>({});
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  const lastLayoutVersion = useRef(layoutVersion);

  const itemsKey = items.map((i) => i.id).join(",");

  useEffect(() => {
    const isAutoLayout = layoutVersion !== lastLayoutVersion.current;
    lastLayoutVersion.current = layoutVersion;

    const pos: Record<string, PositionState> = {};
    for (const item of items) {
      if (!isAutoLayout && savedPositions?.[item.id]) {
        pos[item.id] = savedPositions[item.id];
      } else {
        pos[item.id] = { x: item.x, y: item.y };
      }
    }
    setPositions(pos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, savedPositions, layoutVersion]);

  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const item of items) {
        if (!next[item.id]) {
          next[item.id] = { x: item.x, y: item.y };
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [items]);

  // Kartenhintergrund laden und natürliche Größe ermitteln
  useEffect(() => {
    if (!mapImageUrl || !mapScale) {
      setImageSize(null);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      if (!cancelled) setImageSize(null);
    };
    img.src = mapImageUrl;
    return () => { cancelled = true; };
  }, [mapImageUrl, mapScale]);

  if (items.length === 0 && !mapImageUrl) {
    return <div className="border-2 border-dashed rounded flex items-center justify-center text-sm text-muted-foreground" style={{ height: maxHeight }}>Keine Zelte</div>;
  }

  // Basismaße (ohne Rotation) – freie Rotation erfolgt per SVG-Transform um die Mitte
  const getBaseDimensions = (item: TentItem) => ({
    w: item.w, h: item.h, innerW: item.innerW, innerH: item.innerH,
  });

  // Achsengerichtete Bounding-Box eines um `angleDeg` um die Mitte gedrehten Rechtecks
  const rotatedAABB = (x: number, y: number, w: number, h: number, angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    const newW = w * cos + h * sin;
    const newH = w * sin + h * cos;
    const cx = x + w / 2;
    const cy = y + h / 2;
    return { minX: cx - newW / 2, minY: cy - newH / 2, maxX: cx + newW / 2, maxY: cy + newH / 2 };
  };

  const computeBoundsRotated = () => {
    let minX = 0, minY = 0, maxX = 10, maxY = 10;
    if (items.length > 0) {
      minX = Infinity; minY = Infinity; maxX = -Infinity; maxY = -Infinity;
      for (const item of items) {
        const pos = positions[item.id] || { x: item.x, y: item.y };
        const dims = getBaseDimensions(item);
        const angle = item.shape === "rect" ? getAngle(pos) : 0;
        const box = rotatedAABB(pos.x, pos.y, dims.w, dims.h, angle);
        minX = Math.min(minX, box.minX);
        minY = Math.min(minY, box.minY);
        maxX = Math.max(maxX, box.maxX);
        maxY = Math.max(maxY, box.maxY);
      }
    }
    // Kartenbild in den Bounds berücksichtigen (echter Maßstab: px / scale = m)
    if (imageSize && mapScale) {
      const imgW = imageSize.width / mapScale;
      const imgH = imageSize.height / mapScale;
      minX = Math.min(minX, 0);
      minY = Math.min(minY, 0);
      maxX = Math.max(maxX, imgW);
      maxY = Math.max(maxY, imgH);
    }
    return { minX: minX - 1, minY: minY - 1, maxX: maxX + 1, maxY: maxY + 1 };
  };

  const bounds = computeBoundsRotated();
  const vbW = bounds.maxX - bounds.minX;
  const vbH = bounds.maxY - bounds.minY;

  const getSVGPoint = (e: React.MouseEvent<SVGSVGElement> | React.MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = (((e as React.MouseEvent).clientX - rect.left) / rect.width) * vbW + bounds.minX;
    const y = (((e as React.MouseEvent).clientY - rect.top) / rect.height) * vbH + bounds.minY;
    return { x, y };
  };

  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const pt = getSVGPoint(e);
    const pos = positions[id] || { x: 0, y: 0 };
    setDragOffset({ dx: pt.x - pos.x, dy: pt.y - pos.y });
    setDragging({ id, mode: "move" });
  };

  const handleRotateDown = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging({ id, mode: "rotate" });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const pt = getSVGPoint(e);
    const shiftKey = e.shiftKey;
    setPositions((prev) => {
      const cur = prev[dragging.id];
      if (!cur) return prev;
      if (dragging.mode === "move") {
        return { ...prev, [dragging.id]: { ...cur, x: pt.x - dragOffset.dx, y: pt.y - dragOffset.dy } };
      }
      const item = items.find((i) => i.id === dragging.id);
      if (!item) return prev;
      const dims = getBaseDimensions(item);
      const cx = cur.x + dims.w / 2;
      const cy = cur.y + dims.h / 2;
      // Griff sitzt oberhalb der Mitte -> +90°, damit 0° = nach oben
      let deg = (Math.atan2(pt.y - cy, pt.x - cx) * 180) / Math.PI + 90;
      const step = shiftKey ? 1 : 5;
      deg = Math.round(deg / step) * step;
      deg = ((deg % 360) + 360) % 360;
      return { ...prev, [dragging.id]: { ...cur, angle: deg, rotated: undefined } };
    });
  };

  const handleMouseUp = () => {
    if (dragging && onPositionsChange) {
      onPositionsChange(positions);
    }
    setDragging(null);
  };

  const totalW = (bounds.maxX - bounds.minX - 2).toFixed(1);
  const totalH = (bounds.maxY - bounds.minY - 2).toFixed(1);

  return (
    <div>
      <svg
        ref={svgRef}
        viewBox={`${bounds.minX} ${bounds.minY} ${vbW} ${vbH}`}
        className="w-full border rounded bg-muted/30 cursor-crosshair select-none tent-visualizer-svg"
        style={{ maxHeight }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <rect
          x={bounds.minX} y={bounds.minY} width={vbW} height={vbH}
          fill="none" stroke="hsl(var(--border))" strokeWidth={0.2} strokeDasharray="1 1"
        />
        {mapImageUrl && imageSize && mapScale && (
          <image
            href={mapImageUrl}
            x={0}
            y={0}
            width={imageSize.width / mapScale}
            height={imageSize.height / mapScale}
            preserveAspectRatio="none"
            className="pointer-events-none"
            opacity={0.55}
          />
        )}
        <text
          x={bounds.minX + vbW / 2} y={bounds.minY + 0.6}
          textAnchor="middle" fontSize={Math.max(0.4, vbW / 40)}
          fill="hsl(var(--muted-foreground))"
          className="select-none pointer-events-none"
        >
          ~{totalW}m
        </text>
        <text
          x={bounds.maxX - 0.3} y={bounds.minY + vbH / 2}
          textAnchor="middle" dominantBaseline="central"
          fontSize={Math.max(0.4, vbH / 40)}
          fill="hsl(var(--muted-foreground))"
          className="select-none pointer-events-none"
          transform={`rotate(90, ${bounds.maxX - 0.3}, ${bounds.minY + vbH / 2})`}
        >
          ~{totalH}m
        </text>

        {items.map((item) => {
          const pos = positions[item.id] || { x: item.x, y: item.y };
          const dims = getBaseDimensions(item);
          const px = pos.x;
          const py = pos.y;
          const pw = dims.w;
          const ph = dims.h;
          const innerW = dims.innerW;
          const innerH = dims.innerH;
          const guyRope = item.guyRope;
          const spacingVal = spacing;
          const isDragged = dragging?.id === item.id;
          const isClub = item.category !== "member";
          const fillColor = isClub ? "hsl(var(--primary) / 0.15)" : "hsl(var(--accent) / 0.3)";
          const strokeColor = isClub ? "hsl(var(--primary))" : "hsl(var(--accent-foreground) / 0.5)";
          const canRotate = item.shape === "rect";
          const angle = item.shape === "rect" ? getAngle(pos) : 0;
          const cx = px + pw / 2;
          const cy = py + ph / 2;
          const fontSize = Math.max(0.4, Math.min(0.7, Math.min(pw, ph) / 8));
          const groupTransform = angle !== 0 ? `rotate(${angle} ${cx} ${cy})` : undefined;

          return (
            <g
              key={item.id}
              transform={groupTransform}
              onMouseDown={(e) => handleMouseDown(item.id, e)}
              style={{ cursor: isDragged ? "grabbing" : "grab" }}
            >
              {item.shape === "circle" ? (
                <>
                  <ellipse
                    cx={px + pw / 2} cy={py + ph / 2}
                    rx={pw / 2} ry={ph / 2}
                    fill="none" stroke="hsl(var(--border))" strokeWidth={0.15} strokeDasharray="0.5 0.5"
                  />
                  {guyRope > 0 && (
                    <ellipse
                      cx={px + pw / 2} cy={py + ph / 2}
                      rx={(pw / 2) - spacingVal} ry={(ph / 2) - spacingVal}
                      fill="none" stroke={strokeColor} strokeWidth={0.2} strokeDasharray="0.8 0.5" opacity={0.5}
                    />
                  )}
                  <ellipse
                    cx={px + pw / 2} cy={py + ph / 2}
                    rx={innerW / 2} ry={innerH / 2}
                    fill={fillColor} stroke={strokeColor} strokeWidth={0.2}
                  />
                </>
              ) : (
                <>
                  <rect
                    x={px} y={py} width={pw} height={ph}
                    fill="none" stroke="hsl(var(--border))" strokeWidth={0.15} strokeDasharray="0.5 0.5" rx={0.2}
                  />
                  {guyRope > 0 && (
                    <rect
                      x={px + spacingVal} y={py + spacingVal}
                      width={pw - 2 * spacingVal} height={ph - 2 * spacingVal}
                      fill="none" stroke={strokeColor} strokeWidth={0.2} strokeDasharray="0.8 0.5" opacity={0.5} rx={0.2}
                    />
                  )}
                  <rect
                    x={px + guyRope + spacingVal} y={py + guyRope + spacingVal}
                    width={innerW} height={innerH}
                    fill={fillColor} stroke={strokeColor} strokeWidth={0.2} rx={0.3}
                  />
                </>
              )}

              <text
                x={px + pw / 2} y={py + ph / 2 - fontSize * 0.3}
                textAnchor="middle" dominantBaseline="central"
                fontSize={fontSize} fill="hsl(var(--foreground))"
                fontWeight={isClub ? "600" : "400"} className="select-none pointer-events-none"
              >
                {item.label.length > 16 ? item.label.slice(0, 14) + "…" : item.label}
              </text>
              <text
                x={px + pw / 2} y={py + ph / 2 + fontSize * 0.9}
                textAnchor="middle" dominantBaseline="central"
                fontSize={fontSize * 0.8} fill="hsl(var(--muted-foreground))"
                className="select-none pointer-events-none"
              >
                ({item.area.toFixed(1)} m²)
              </text>

              {item.shape === "rect" && innerW > 1.5 && (
                <>
                  <text
                    x={px + pw / 2} y={py + guyRope + spacingVal - 0.2}
                    textAnchor="middle" fontSize={Math.max(0.3, fontSize * 0.6)}
                    fill="hsl(var(--muted-foreground))" className="select-none pointer-events-none"
                  >
                    {innerW}m
                  </text>
                  <text
                    x={px + guyRope + spacingVal + innerW + 0.3} y={py + ph / 2}
                    textAnchor="start" dominantBaseline="central"
                    fontSize={Math.max(0.3, fontSize * 0.6)}
                    fill="hsl(var(--muted-foreground))"
                    className="select-none pointer-events-none"
                    transform={`rotate(90, ${px + guyRope + spacingVal + innerW + 0.3}, ${py + ph / 2})`}
                  >
                    {innerH}m
                  </text>
                </>
              )}

              {item.shape === "circle" && innerW > 1.5 && (
                <>
                  <line
                    x1={px + pw / 2 - innerW / 2} y1={py + ph / 2 + innerH / 2 + 0.2}
                    x2={px + pw / 2 + innerW / 2} y2={py + ph / 2 + innerH / 2 + 0.2}
                    stroke="hsl(var(--muted-foreground))" strokeWidth={0.1}
                  />
                  <text
                    x={px + pw / 2} y={py + ph / 2 + innerH / 2 + 0.7}
                    textAnchor="middle" fontSize={Math.max(0.3, fontSize * 0.6)}
                    fill="hsl(var(--muted-foreground))" className="select-none pointer-events-none"
                  >
                    Ø{innerW}m
                  </text>
                </>
              )}

              {canRotate && (
                <g
                  onMouseDown={(e) => handleRotateDown(item.id, e)}
                  style={{ cursor: "grab" }}
                >
                  {/* Griff-Linie von der Mitte nach oben */}
                  <line
                    x1={cx} y1={py}
                    x2={cx} y2={py - 1.2}
                    stroke="hsl(var(--primary))" strokeWidth={0.12}
                  />
                  <circle
                    cx={cx} cy={py - 1.4}
                    r={0.5} fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth={0.15}
                  />
                  <text
                    x={cx} y={py - 1.35}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={0.55} fill="hsl(var(--primary))"
                    className="select-none pointer-events-none"
                  >
                    ↻
                  </text>
                </g>
              )}
            </g>
          );
        })}

      </svg>
      <p className="text-xs text-muted-foreground mt-1 text-center">
        Gesamtfläche: ~{totalW}×{totalH}m = ~{(Number(totalW) * Number(totalH)).toFixed(0)} m²
      </p>
    </div>
  );
}
