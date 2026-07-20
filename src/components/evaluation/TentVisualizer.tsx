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

type PackedRect = { id: string; x: number; y: number; w: number; h: number };
const PACKING_EPSILON = 1e-6;

function overlaps(a: PackedRect, b: PackedRect) {
  return (
    a.x < b.x + b.w - PACKING_EPSILON &&
    a.x + a.w > b.x + PACKING_EPSILON &&
    a.y < b.y + b.h - PACKING_EPSILON &&
    a.y + a.h > b.y + PACKING_EPSILON
  );
}

function uniqueSortedNumbers(values: number[]) {
  return [...new Set(values.filter((v) => Number.isFinite(v)))].sort((a, b) => a - b);
}

function packTentsIntoWidth(
  tents: TentItem[],
  fixedRects: PackedRect[],
  widthLimit: number,
  rightBiasStart: number
) {
  const positions: Record<string, { x: number; y: number }> = {};
  const placed: PackedRect[] = [...fixedRects];

  const minX = Math.min(0, ...placed.map((r) => r.x));
  const minY = Math.min(0, ...placed.map((r) => r.y));
  let maxX = Math.max(0, ...placed.map((r) => r.x + r.w));
  let maxY = Math.max(0, ...placed.map((r) => r.y + r.h));

  for (const tent of tents) {
    if (tent.w > widthLimit + PACKING_EPSILON) return null;

    const candidateXs = uniqueSortedNumbers([0, ...placed.flatMap((r) => [r.x, r.x + r.w])]);
    const candidateYs = uniqueSortedNumbers([0, ...placed.flatMap((r) => [r.y, r.y + r.h])]);

    let best: { x: number; y: number; score: number; area: number } | null = null;

    for (const x of candidateXs) {
      if (x + tent.w > widthLimit + PACKING_EPSILON) continue;
      for (const y of candidateYs) {
        const candidate: PackedRect = { id: tent.id, x, y, w: tent.w, h: tent.h };
        if (placed.some((r) => overlaps(candidate, r))) continue;

        const nextMaxX = Math.max(maxX, candidate.x + candidate.w);
        const nextMaxY = Math.max(maxY, candidate.y + candidate.h);
        const area = (nextMaxX - minX) * (nextMaxY - minY);

        const rightBiasPenalty =
          tent.category === "member" && candidate.x < rightBiasStart
            ? (rightBiasStart - candidate.x) * 4
            : 0;

        const score = area + rightBiasPenalty;

        if (
          !best ||
          score < best.score - PACKING_EPSILON ||
          (Math.abs(score - best.score) <= PACKING_EPSILON &&
            (candidate.y < best.y - PACKING_EPSILON ||
              (Math.abs(candidate.y - best.y) <= PACKING_EPSILON && candidate.x < best.x)))
        ) {
          best = { x: candidate.x, y: candidate.y, score, area };
        }
      }
    }

    if (!best) return null;

    positions[tent.id] = { x: best.x, y: best.y };
    const rect: PackedRect = { id: tent.id, x: best.x, y: best.y, w: tent.w, h: tent.h };
    placed.push(rect);
    maxX = Math.max(maxX, rect.x + rect.w);
    maxY = Math.max(maxY, rect.y + rect.h);
  }

  return { positions, area: (maxX - minX) * (maxY - minY) };
}

export function autoLayout(items: TentItem[]) {
  if (items.length === 0) return;

  const scheune = items.find((i) => i.category === "scheune");
  const kitchen = items.filter((i) => i.category === "kitchen");
  const supply = items.filter((i) => i.category === "supply");
  const sleepTents = items.filter((i) => i.category === "member").sort((a, b) => b.w * b.h - a.w * a.h);
  const rest = items.filter((i) => !["scheune", "kitchen", "supply", "member"].includes(i.category));

  const gap = 0;

  const leftColumn = [...kitchen, ...supply];
  let leftColW = 0;
  let leftCursorY = 0;

  for (const t of leftColumn) {
    t.x = 0;
    t.y = leftCursorY;
    leftCursorY += t.h + gap;
    leftColW = Math.max(leftColW, t.w);
  }

  const leftColH = Math.max(0, leftCursorY - (leftColumn.length > 0 ? gap : 0));

  if (scheune) {
    scheune.x = leftColW + (leftColumn.length > 0 ? gap : 0);
    scheune.y = Math.max(0, (leftColH - scheune.h) / 2);
  }

  const fixedRects: PackedRect[] = [
    ...leftColumn.map((t) => ({ id: t.id, x: t.x, y: t.y, w: t.w, h: t.h })),
    ...(scheune ? [{ id: scheune.id, x: scheune.x, y: scheune.y, w: scheune.w, h: scheune.h }] : []),
  ];

  const remaining = [...sleepTents, ...rest].sort((a, b) => b.w * b.h - a.w * a.h);
  if (remaining.length === 0) return;

  const fixedMaxX = Math.max(0, ...fixedRects.map((r) => r.x + r.w));
  const fixedMaxY = Math.max(0, ...fixedRects.map((r) => r.y + r.h));
  const maxTentW = Math.max(...remaining.map((t) => t.w));
  const minWidth = Math.max(fixedMaxX, maxTentW);
  const maxWidth = Math.max(minWidth, fixedMaxX + remaining.reduce((sum, t) => sum + t.w, 0));
  const widthStep = 0.5;
  const rightBiasStart = scheune ? scheune.x + scheune.w : leftColW;

  let best: { area: number; width: number; positions: Record<string, { x: number; y: number }> } | null = null;

  for (let width = minWidth; width <= maxWidth + PACKING_EPSILON; width += widthStep) {
    const packed = packTentsIntoWidth(remaining, fixedRects, width, rightBiasStart);
    if (!packed) continue;

    if (
      !best ||
      packed.area < best.area - PACKING_EPSILON ||
      (Math.abs(packed.area - best.area) <= PACKING_EPSILON && width < best.width)
    ) {
      best = { area: packed.area, width, positions: packed.positions };
    }
  }

  if (!best) {
    let x = 0;
    let y = fixedMaxY + gap;
    let rowH = 0;
    for (const tent of remaining) {
      if (x + tent.w > minWidth && x > 0) {
        x = 0;
        y += rowH + gap;
        rowH = 0;
      }
      tent.x = x;
      tent.y = y;
      x += tent.w + gap;
      rowH = Math.max(rowH, tent.h);
    }
    return;
  }

  for (const tent of remaining) {
    const pos = best.positions[tent.id];
    if (!pos) continue;
    tent.x = pos.x;
    tent.y = pos.y;
  }
}

interface TentVisualizerProps {
  items: TentItem[];
  spacing: number;
  maxHeight: number;
  onPositionsChange?: (positions: Record<string, { x: number; y: number; rotated?: boolean }>) => void;
  savedPositions?: Record<string, { x: number; y: number; rotated?: boolean }>;
  layoutVersion: number;
  mapImageUrl?: string;
  mapScale?: number;
}

export default function TentVisualizer({
  items, spacing, maxHeight,
  onPositionsChange, savedPositions, layoutVersion,
  mapImageUrl, mapScale,
}: TentVisualizerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const [positions, setPositions] = useState<Record<string, { x: number; y: number; rotated?: boolean }>>({});
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  const lastLayoutVersion = useRef(layoutVersion);

  const itemsKey = items.map((i) => i.id).join(",");

  useEffect(() => {
    const isAutoLayout = layoutVersion !== lastLayoutVersion.current;
    lastLayoutVersion.current = layoutVersion;

    const pos: Record<string, { x: number; y: number; rotated?: boolean }> = {};
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

  const getEffectiveDimensions = (item: TentItem) => {
    const pos = positions[item.id];
    const rotated = pos?.rotated || false;
    if (rotated && item.shape === "rect") {
      return { w: item.h, h: item.w, innerW: item.innerH, innerH: item.innerW };
    }
    return { w: item.w, h: item.h, innerW: item.innerW, innerH: item.innerH };
  };

  const computeBoundsRotated = () => {
    if (items.length === 0) return { minX: 0, minY: 0, maxX: 10, maxY: 10 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const item of items) {
      const pos = positions[item.id] || { x: item.x, y: item.y };
      const dims = getEffectiveDimensions(item);
      minX = Math.min(minX, pos.x);
      minY = Math.min(minY, pos.y);
      maxX = Math.max(maxX, pos.x + dims.w);
      maxY = Math.max(maxY, pos.y + dims.h);
    }
    return { minX: minX - 1, minY: minY - 1, maxX: maxX + 1, maxY: maxY + 1 };
  };

  const bounds = computeBoundsRotated();
  const vbW = bounds.maxX - bounds.minX;
  const vbH = bounds.maxY - bounds.minY;

  const getSVGPoint = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * vbW + bounds.minX;
    const y = ((e.clientY - rect.top) / rect.height) * vbH + bounds.minY;
    return { x, y };
  };

  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    const pt = getSVGPoint(e as any);
    const pos = positions[id] || { x: 0, y: 0 };
    setDragOffset({ dx: pt.x - pos.x, dy: pt.y - pos.y });
    setDragging(id);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!dragging) return;
    const pt = getSVGPoint(e);
    setPositions((prev) => ({
      ...prev,
      [dragging]: { ...prev[dragging], x: pt.x - dragOffset.dx, y: pt.y - dragOffset.dy },
    }));
  };

  const handleMouseUp = () => {
    if (dragging && onPositionsChange) {
      onPositionsChange(positions);
    }
    setDragging(null);
  };

  const toggleRotation = (id: string) => {
    setPositions((prev) => {
      const next = { ...prev, [id]: { ...prev[id], rotated: !prev[id]?.rotated } };
      if (onPositionsChange) onPositionsChange(next);
      return next;
    });
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
          const dims = getEffectiveDimensions(item);
          const px = pos.x;
          const py = pos.y;
          const pw = dims.w;
          const ph = dims.h;
          const innerW = dims.innerW;
          const innerH = dims.innerH;
          const guyRope = item.guyRope;
          const spacingVal = spacing;
          const isDragged = dragging === item.id;
          const isClub = item.category !== "member";
          const fillColor = isClub ? "hsl(var(--primary) / 0.15)" : "hsl(var(--accent) / 0.3)";
          const strokeColor = isClub ? "hsl(var(--primary))" : "hsl(var(--accent-foreground) / 0.5)";
          const canRotate = item.shape === "rect" && item.innerW !== item.innerH;
          const fontSize = Math.max(0.4, Math.min(0.7, Math.min(pw, ph) / 8));

          return (
            <g
              key={item.id}
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

              {canRotate && !isDragged && (
                <g
                  onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); toggleRotation(item.id); }}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    cx={px + pw - 0.5} cy={py + 0.5}
                    r={0.5} fill="hsl(var(--background))" stroke="hsl(var(--border))" strokeWidth={0.1}
                  />
                  <text
                    x={px + pw - 0.5} y={py + 0.55}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize={0.5} fill="hsl(var(--foreground))"
                    className="select-none"
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
