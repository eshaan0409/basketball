"use client";

import { useId, useState } from "react";
import { labelEvery, linear, niceTicks } from "./scale";
import { useWidth } from "./useWidth";

interface Props {
  title: string;
  description?: string;
  data: { x: string; value: number }[];
  formatX: (x: string) => string;
  formatY: (y: number) => string;
  /** Axis tick format; keep it short (no units) so ticks fit the margin. */
  formatTick?: (y: number) => string;
  color?: string;
  height?: number;
}

const MARGIN = { top: 16, right: 16, bottom: 28, left: 52 };
const MAX_BAR = 24;
const RADIUS = 4;

/** Path for a bar with a rounded data-end and a square baseline. Works for negative values. */
function barPath(x: number, w: number, y0: number, y1: number): string {
  const up = y1 <= y0;
  const h = Math.abs(y0 - y1);
  const r = Math.min(RADIUS, w / 2, h);
  if (up) {
    return `M${x},${y0} V${y1 + r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 + r} V${y0} Z`;
  }
  return `M${x},${y0} V${y1 - r} Q${x},${y1} ${x + r},${y1} H${x + w - r} Q${x + w},${y1} ${x + w},${y1 - r} V${y0} Z`;
}

export function ColumnChart({ title, description, data, formatX, formatY, formatTick = formatY, color = "var(--series-1)", height = 240 }: Props) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();

  const plotW = width - MARGIN.left - MARGIN.right;
  const plotH = height - MARGIN.top - MARGIN.bottom;
  const values = data.map((d) => d.value);
  const maxV = Math.max(0, ...values);
  const minV = Math.min(0, ...values);
  // Ignore negatives too small to see; they stay readable in the tooltip and table.
  const ticks = niceTicks(minV < -0.03 * Math.max(1, maxV) ? minV : 0, maxV);
  const floor = ticks[0];
  const y = linear([ticks[0], ticks[ticks.length - 1]], [plotH, 0]);
  const band = plotW / Math.max(1, data.length);
  const barW = Math.max(2, Math.min(MAX_BAR, band - 2));
  const every = labelEvery(data.length, plotW);

  const activeBar = active !== null ? data[active] : null;
  const tipLeft = active !== null ? MARGIN.left + band * active + band / 2 : 0;
  const flip = tipLeft > width * 0.6;

  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <figcaption>
        <div id={titleId} className="text-[15px] font-semibold text-ink">
          {title}
        </div>
        {description && <p className="mt-0.5 text-sm text-ink-2">{description}</p>}
      </figcaption>
      <div ref={ref} className="relative w-full min-w-0 overflow-hidden">
        <svg width={width} height={height} role="img" aria-labelledby={titleId} className="block">
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {ticks.map((t) => (
              <g key={t}>
                <line x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={1} />
                <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" className="tabular fill-muted text-[11px]">
                  {formatTick(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) => {
              const bx = band * i + (band - barW) / 2;
              return (
                <g key={d.x}>
                  <path
                    d={barPath(bx, barW, y(0), y(Math.max(floor, d.value)))}
                    fill={color}
                    opacity={active === null || active === i ? 1 : 0.55}
                  />
                  {/* Hit target: the whole band, not just the painted bar. */}
                  <rect
                    x={band * i}
                    y={0}
                    width={band}
                    height={plotH}
                    fill="transparent"
                    tabIndex={0}
                    role="button"
                    aria-label={`${formatX(d.x)}: ${formatY(d.value)}`}
                    className="outline-none focus-visible:stroke-brand"
                    onPointerEnter={() => setActive(i)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                  />
                  {i % every === 0 && (
                    <text x={band * i + band / 2} y={plotH + 18} textAnchor="middle" className="fill-muted text-[11px]">
                      {formatX(d.x)}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
        {activeBar && (
          <div
            className="pointer-events-none absolute top-2 z-10 rounded-md border border-line bg-surface px-3 py-2 text-sm shadow-lg"
            style={flip ? { right: width - tipLeft + 12 } : { left: tipLeft + 12 }}
            role="status"
          >
            <div className="text-xs text-muted">{formatX(activeBar.x)}</div>
            <div className="tabular font-semibold text-ink">{formatY(activeBar.value)}</div>
          </div>
        )}
      </div>
      <button
        type="button"
        className="no-print self-start text-sm text-brand underline-offset-2 hover:underline"
        onClick={() => setShowTable((v) => !v)}
        aria-expanded={showTable}
      >
        {showTable ? "Hide data table" : "Show data table"}
      </button>
      {showTable && (
        <div className="max-h-72 overflow-auto rounded border border-line">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-surface-2 text-ink-2">
              <tr>
                <th className="px-3 py-2 font-medium">Month</th>
                <th className="px-3 py-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {data.map((d) => (
                <tr key={d.x} className="border-t border-line">
                  <td className="px-3 py-1.5 text-ink-2">{formatX(d.x)}</td>
                  <td className="px-3 py-1.5 text-right">{formatY(d.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
