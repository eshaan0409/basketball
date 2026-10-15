"use client";

import { useMemo, useState } from "react";
import { formatMonth } from "@/lib/engine/months";
import { INTERVENTION_LABELS, type VerifyResult } from "@/lib/engine/types";
import { formatAcreFeet, formatCompact, formatCubicMeters, formatGallons, formatPct, formatWhole } from "@/lib/format";
import { downloadText, excludedCsv, perHomeCsv, summaryJson } from "@/lib/report";
import { ColumnChart } from "./charts/ColumnChart";
import { LineChart } from "./charts/LineChart";

interface Props {
  result: VerifyResult;
  dataset: string;
}

type SortKey = "net" | "pct" | "r2";

export function Results({ result, dataset }: Props) {
  const t = result.totals;
  const [sort, setSort] = useState<SortKey>("net");
  const generatedAt = useMemo(() => new Date().toISOString(), [result]);

  const installEnd = result.treatment.reduce<string | null>(
    (max, r) => (r.installMonth && (!max || r.installMonth > max) ? r.installMonth : max),
    null,
  );
  const shade =
    result.programStartMonth && installEnd
      ? { from: result.programStartMonth, to: installEnd, label: "Install window" }
      : undefined;

  const yMax = Math.max(
    1,
    ...result.monthly.flatMap((m) => [m.treatmentActualAvg, m.treatmentExpectedAvg, m.controlActualAvg, m.controlExpectedAvg]).filter((v): v is number => v !== null),
  );

  const treatmentLines = result.monthly.map((m) => ({
    x: m.month,
    values: { actual: m.treatmentActualAvg, expected: m.treatmentExpectedAvg },
  }));
  const controlLines = result.monthly.map((m) => ({
    x: m.month,
    values: { actual: m.controlActualAvg, expected: m.controlExpectedAvg },
  }));
  const savingsColumns = result.monthly
    .filter((m) => result.measurementStartMonth && m.month >= result.measurementStartMonth)
    .map((m) => ({ x: m.month, value: m.netSavingsGallons }));

  const sorted = [...result.treatment].sort((a, b) => {
    if (sort === "pct") return b.netSavingsPct - a.netSavingsPct;
    if (sort === "r2") return b.modelR2 - a.modelR2;
    return b.netSavingsGallons - a.netSavingsGallons;
  });

  const hero = t.firstYear
    ? { label: "Creditable first-year volume", gallons: t.firstYear.creditableGallons, note: `${t.firstYear.homes} homes with a full year of post-install data` }
    : { label: "Creditable volume, measurement period", gallons: t.creditableGallons, note: "Not enough post-install data for a first-year figure" };

  const interventions = Object.entries(result.interventionCounts)
    .map(([k, n]) => `${n} ${INTERVENTION_LABELS[k as keyof typeof INTERVENTION_LABELS].toLowerCase()}`)
    .join(", ");

  return (
    <section className="flex flex-col gap-10" aria-label="Verification results">
      <div className="flex flex-col gap-3 border-b border-line pb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Verification report</h2>
            <p className="mt-1 text-sm text-ink-2">{dataset}</p>
            {result.measurementStartMonth && (
              <p className="mt-1 text-sm text-ink-2">
                Savings measured {formatMonth(result.measurementStartMonth)} to {formatMonth(result.measurementEndMonth!)}.
                {interventions && ` Measures: ${interventions}.`}
              </p>
            )}
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <button type="button" onClick={() => window.print()} className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface-2">
              Print report
            </button>
            <button
              type="button"
              onClick={() => downloadText("rewater_summary.json", summaryJson(result, { dataset, generatedAt }), "application/json")}
              className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface-2"
            >
              Summary (JSON)
            </button>
            <button
              type="button"
              onClick={() => downloadText("rewater_homes.csv", perHomeCsv(result))}
              className="rounded-md border border-line px-3 py-1.5 text-sm hover:bg-surface-2"
            >
              Every home (CSV)
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_2fr]">
        <div className="flex flex-col justify-between gap-4 rounded-xl border border-line bg-surface p-6">
          <p className="text-sm text-ink-2">{hero.label}</p>
          <p className="text-5xl font-semibold tracking-tight">{formatAcreFeet(hero.gallons)}</p>
          <p className="text-sm text-ink-2">
            {formatGallons(hero.gallons)} · {formatCubicMeters(hero.gallons)}
          </p>
          <p className="text-sm text-muted">
            Lower bound of the {Math.round(result.options.confidence * 100)}% interval. {hero.note}.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Stat
            label="Net savings, measurement period"
            value={formatGallons(t.netSavingsGallons)}
            detail={`${Math.round(result.options.confidence * 100)}% range ${formatCompact(t.netSavingsInterval.low)} to ${formatCompact(t.netSavingsInterval.high)} gal`}
          />
          <Stat label="Saved vs. weather-expected use" value={formatPct(t.netSavingsPct)} detail="After the control-group adjustment" />
          <Stat
            label="Homes verified"
            value={formatWhole(result.treatment.length)}
            detail={`${formatWhole(result.control.length)} control homes · ${formatWhole(result.excluded.length)} excluded`}
          />
          <Stat
            label="Shared trend removed"
            value={formatGallons(t.controlAdjustmentGallons)}
            detail={`Raw before/after savings were ${formatGallons(t.grossSavingsGallons)}`}
          />
        </div>
      </div>

      {result.warnings.length > 0 && (
        <div className="rounded-lg border border-line bg-warn-bg p-4 text-sm text-warn-ink">
          <p className="font-semibold">Before anyone relies on these numbers</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {result.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="min-w-0 rounded-xl border border-line bg-surface p-5">
          <LineChart
            title="Upgraded homes, average per home"
            description="Measured use against what the weather predicted from each home's own history."
            series={[
              { key: "actual", label: "Measured", color: "var(--series-1)" },
              { key: "expected", label: "Weather-expected", color: "var(--series-2)", dashed: true },
            ]}
            data={treatmentLines}
            formatX={formatMonth}
            formatY={(v) => `${formatCompact(v)}`}
            shade={shade}
            yMax={yMax}
          />
        </div>
        <div className="min-w-0 rounded-xl border border-line bg-surface p-5">
          <LineChart
            title="Control homes, average per home"
            description="No upgrade. Any gap after the program starts is a shared trend, and gets subtracted."
            series={[
              { key: "actual", label: "Measured", color: "var(--series-1)" },
              { key: "expected", label: "Weather-expected", color: "var(--series-2)", dashed: true },
            ]}
            data={controlLines}
            formatX={formatMonth}
            formatY={(v) => `${formatCompact(v)}`}
            shade={shade}
            yMax={yMax}
          />
        </div>
      </div>
      <p className="-mt-6 text-sm text-muted">Monthly gallons per home. Both charts share one scale.</p>

      <div className="min-w-0 rounded-xl border border-line bg-surface p-5">
        <ColumnChart
          title="Net program savings by month, gallons"
          description="All upgraded homes combined, after the control adjustment. Winter months save little because little is irrigated."
          data={savingsColumns}
          formatX={formatMonth}
          formatY={(v) => formatGallons(v)}
          formatTick={formatCompact}
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold">Upgraded homes</h3>
          <label className="no-print flex items-center gap-2 text-sm text-ink-2">
            Sort by
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="rounded-md border border-line bg-surface px-2 py-1 text-ink"
            >
              <option value="net">Net savings</option>
              <option value="pct">Percent saved</option>
              <option value="r2">Model fit (R²)</option>
            </select>
          </label>
        </div>
        <div className="max-h-[28rem] overflow-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="sticky top-0 bg-surface-2 text-ink-2">
              <tr>
                <th className="px-3 py-2 font-medium">Account</th>
                <th className="px-3 py-2 font-medium">Measure</th>
                <th className="px-3 py-2 font-medium">Installed</th>
                <th className="px-3 py-2 text-right font-medium">Months after</th>
                <th className="px-3 py-2 text-right font-medium">Model R²</th>
                <th className="px-3 py-2 text-right font-medium">Net saved (gal)</th>
                <th className="px-3 py-2 text-right font-medium">Saved</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {sorted.map((r) => (
                <tr key={r.accountId} className="border-t border-line">
                  <td className="px-3 py-1.5 font-mono text-xs">{r.accountId}</td>
                  <td className="px-3 py-1.5 text-ink-2">{r.intervention ? INTERVENTION_LABELS[r.intervention] : "–"}</td>
                  <td className="px-3 py-1.5 text-ink-2">{r.installMonth ? formatMonth(r.installMonth) : "–"}</td>
                  <td className="px-3 py-1.5 text-right">{r.postMonths}</td>
                  <td className="px-3 py-1.5 text-right">{r.modelR2.toFixed(2)}</td>
                  <td className="px-3 py-1.5 text-right">{formatWhole(r.netSavingsGallons)}</td>
                  <td className="px-3 py-1.5 text-right">{formatPct(r.netSavingsPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {result.excluded.length > 0 && (
        <details className="rounded-xl border border-line bg-surface p-5">
          <summary className="cursor-pointer font-semibold">
            Excluded homes ({result.excluded.length}) and why
          </summary>
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => downloadText("rewater_excluded.csv", excludedCsv(result))}
              className="no-print text-sm text-brand underline-offset-2 hover:underline"
            >
              Download list
            </button>
          </div>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {result.excluded.map((e) => (
              <li key={`${e.group}-${e.accountId}`} className="flex flex-wrap gap-x-3">
                <span className="font-mono text-xs">{e.accountId}</span>
                <span className="text-muted">{e.group === "treatment" ? "upgraded" : "control"}</span>
                <span className="text-ink-2">{e.reason}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}

function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-line bg-surface p-5">
      <p className="text-sm text-ink-2">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-sm text-muted">{detail}</p>
    </div>
  );
}
