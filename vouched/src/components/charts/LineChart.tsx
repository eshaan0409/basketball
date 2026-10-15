"use client";

import { useId, useState, type KeyboardEvent, type PointerEvent } from "react";
import { labelEvery, linear, niceTicks } from "./scale";
import { useWidth } from "./useWidth";

export interface LineSeries {
  key: string;
  label: string;
  /** A CSS color, normally a var(--series-n) token. */
  color: string;
  /** Dashed reads as "modeled, not measured". Use it for counterfactuals only. */
  dashed?: boolean;
}

export interface LinePoint {
  x: string;
  values: Record<string, number | null>;
}

interface Props {
  title: string;
  description?: string;
  series: LineSeries[];
  data: LinePoint[];
  formatX: (x: string) => string;
  formatY: (y: number) => string;
  /** Inclusive x-range to shade, e.g. the install window. */
  shade?: { from: string; to: string; label: string };
  height?: number;
  /** Share a y-domain across small multiples. */
  yMax?: number;
}

const MARGIN = { top: 16, right: 16, bottom: 28, left: 52 };

export function LineChart({ title, description, series, data, formatX, formatY, shade, height = 260, yMax }: Props) {
  const { ref, width } = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();

  const plotW = width - MARGIN.left - MARGIN.right;
  const plotH = height - MARGIN.top - MARGIN.bottom;
  const allValues = data.flatMap((d) => series.map((s) => d.values[s.key])).filter((v): v is number => v !== null);
  const ticks = niceTicks(0, yMax ?? Math.max(1, ...allValues));
  const y = linear([0, ticks[ticks.length - 1]], [plotH, 0]);
  const x = linear([0, Math.max(1, data.length - 1)], [0, plotW]);
  const every = labelEvery(data.length, plotW);

  const path = (key: string) => {
    let d = "";
    let pen = false;
    data.forEach((p, i) => {
      const v = p.values[key];
      if (v === null || v === undefined) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  const shadeFrom = shade ? data.findIndex((d) => d.x >= shade.from) : -1;
  const shadeToIdx = shade ? data.map((d) => d.x <= shade.to).lastIndexOf(true) : -1;

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - MARGIN.left;
    const i = Math.round((px / Math.max(1, plotW)) * (data.length - 1));
    setActive(Math.min(data.length - 1, Math.max(0, i)));
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowRight") setActive((a) => Math.min(data.length - 1, (a ?? -1) + 1));
    else if (e.key === "ArrowLeft") setActive((a) => Math.max(0, (a ?? data.length) - 1));
    else if (e.key === "Escape") setActive(null);
    else return;
    e.preventDefault();
  };

  const activePoint = active !== null ? data[active] : null;
  const tooltipLeft = active !== null ? MARGIN.left + x(active) : 0;
  const flip = tooltipLeft > width * 0.6;

  return (
    <figure className="flex min-w-0 flex-col gap-3">
      <figcaption>
        <div id={titleId} className="text-[15px] font-semibold text-ink">
          {title}
        </div>
        {description && <p className="mt-0.5 text-sm text-ink-2">{description}</p>}
      </figcaption>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-2" aria-label="Legend">
        {series.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <svg width="20" height="8" aria-hidden="true">
              <line x1="1" y1="4" x2="19" y2="4" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeDasharray={s.dashed ? "4 3" : undefined} />
            </svg>
            {s.label}
          </li>
        ))}
        {shade && (
          <li className="flex items-center gap-2">
            <span className="inline-block h-3 w-4 rounded-sm bg-ink/10" aria-hidden="true" />
            {shade.label}
          </li>
        )}
      </ul>
      <div ref={ref} className="relative w-full min-w-0 overflow-hidden">
        <svg
          width={width}
          height={height}
          role="img"
          aria-labelledby={titleId}
          tabIndex={0}
          className="block touch-pan-y rounded outline-none focus-visible:ring-2 focus-visible:ring-brand"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setActive(null)}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
        >
          <g transform={`translate(${MARGIN.left},${MARGIN.top})`}>
            {shadeFrom >= 0 && shadeToIdx >= shadeFrom && (
              <rect
                x={x(shadeFrom) - (plotW / Math.max(1, data.length - 1)) / 2}
                y={0}
                width={x(shadeToIdx) - x(shadeFrom) + plotW / Math.max(1, data.length - 1)}
                height={plotH}
                fill="var(--ink)"
                opacity={0.06}
              />
            )}
            {ticks.map((t) => (
              <g key={t}>
                <line x1={0} x2={plotW} y1={y(t)} y2={y(t)} stroke={t === 0 ? "var(--axis)" : "var(--grid)"} strokeWidth={1} />
                <text x={-8} y={y(t)} dy="0.32em" textAnchor="end" className="tabular fill-muted text-[11px]">
                  {formatY(t)}
                </text>
              </g>
            ))}
            {data.map((d, i) =>
              i % every === 0 ? (
                <text key={d.x} x={x(i)} y={plotH + 18} textAnchor="middle" className="fill-muted text-[11px]">
                  {formatX(d.x)}
                </text>
              ) : null,
            )}
            {series.map((s) => (
              <path
                key={s.key}
                d={path(s.key)}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
                strokeDasharray={s.dashed ? "5 4" : undefined}
              />
            ))}
            {activePoint && (
              <g pointerEvents="none">
                <line x1={x(active!)} x2={x(active!)} y1={0} y2={plotH} stroke="var(--muted)" strokeWidth={1} />
                {series.map((s) => {
                  const v = activePoint.values[s.key];
                  if (v === null || v === undefined) return null;
                  return <circle key={s.key} cx={x(active!)} cy={y(v)} r={4} fill={s.color} stroke="var(--surface)" strokeWidth={2} />;
                })}
              </g>
            )}
          </g>
        </svg>
        {activePoint && (
          <div
            className="pointer-events-none absolute top-2 z-10 min-w-40 rounded-md border border-line bg-surface px-3 py-2 text-sm shadow-lg"
            style={flip ? { right: width - tooltipLeft + 12 } : { left: tooltipLeft + 12 }}
            role="status"
          >
            <div className="mb-1 text-xs text-muted">{formatX(activePoint.x)}</div>
            {series.map((s) => {
              const v = activePoint.values[s.key];
              return (
                <div key={s.key} className="flex items-center gap-2 py-0.5">
                  <svg width="12" height="6" aria-hidden="true">
                    <line x1="1" y1="3" x2="11" y2="3" stroke={s.color} strokeWidth="2" strokeDasharray={s.dashed ? "3 2" : undefined} />
                  </svg>
                  <span className="tabular font-semibold text-ink">{v === null || v === undefined ? "–" : formatY(v)}</span>
                  <span className="text-ink-2">{s.label}</span>
                </div>
              );
            })}
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
                {series.map((s) => (
                  <th key={s.key} className="px-3 py-2 text-right font-medium">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="tabular">
              {data.map((d) => (
                <tr key={d.x} className="border-t border-line">
                  <td className="px-3 py-1.5 text-ink-2">{formatX(d.x)}</td>
                  {series.map((s) => {
                    const v = d.values[s.key];
                    return (
                      <td key={s.key} className="px-3 py-1.5 text-right">
                        {v === null || v === undefined ? "–" : formatY(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </figure>
  );
}
