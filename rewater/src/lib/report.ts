import { toCsv } from "./engine/csv";
import { gallonsToAcreFeet, gallonsToCubicMeters } from "./engine/units";
import type { VerifyResult } from "./engine/types";

export function perHomeCsv(result: VerifyResult): string {
  const headers = [
    "account_id",
    "group",
    "intervention",
    "install_month",
    "pre_months",
    "post_months",
    "indoor_baseline_gal_per_month",
    "model_r2",
    "gross_savings_gal",
    "net_savings_gal",
    "first_year_net_savings_gal",
    "net_savings_pct",
  ];
  const rows = [...result.treatment, ...result.control].map((r) => [
    r.accountId,
    r.group,
    r.intervention ?? "",
    r.installMonth ?? "",
    r.preMonths,
    r.postMonths,
    Math.round(r.indoorBaselineGallonsPerMonth),
    r.modelR2.toFixed(3),
    Math.round(r.grossSavingsGallons),
    Math.round(r.netSavingsGallons),
    r.firstYearNetSavingsGallons === null ? "" : Math.round(r.firstYearNetSavingsGallons),
    (r.netSavingsPct * 100).toFixed(2),
  ]);
  return toCsv(headers, rows);
}

export function excludedCsv(result: VerifyResult): string {
  return toCsv(
    ["account_id", "group", "reason"],
    result.excluded.map((e) => [e.accountId, e.group, e.reason]),
  );
}

/** Machine-readable summary a buyer or verifier can audit. */
export function summaryJson(result: VerifyResult, meta: { dataset: string; generatedAt: string }): string {
  const t = result.totals;
  const volumes = (gallons: number) => ({
    gallons: Math.round(gallons),
    acreFeet: Number(gallonsToAcreFeet(gallons).toFixed(3)),
    cubicMeters: Math.round(gallonsToCubicMeters(gallons)),
  });
  return JSON.stringify(
    {
      dataset: meta.dataset,
      generatedAt: meta.generatedAt,
      method: "Weather-normalized pre/post with control-group adjustment; home-level bootstrap interval; credit = interval lower bound",
      options: result.options,
      programStartMonth: result.programStartMonth,
      measurementPeriod: { start: result.measurementStartMonth, end: result.measurementEndMonth },
      homes: { treatment: result.treatment.length, control: result.control.length, excluded: result.excluded.length },
      interventions: result.interventionCounts,
      measurementPeriodSavings: {
        gross: volumes(t.grossSavingsGallons),
        controlAdjustment: volumes(t.controlAdjustmentGallons),
        net: volumes(t.netSavingsGallons),
        interval: { confidence: result.options.confidence, low: volumes(t.netSavingsInterval.low), high: volumes(t.netSavingsInterval.high) },
        creditable: volumes(t.creditableGallons),
        netSavingsPctOfExpectedUse: Number((t.netSavingsPct * 100).toFixed(2)),
      },
      firstYear: t.firstYear
        ? {
            homes: t.firstYear.homes,
            net: volumes(t.firstYear.netSavingsGallons),
            interval: { low: volumes(t.firstYear.interval.low), high: volumes(t.firstYear.interval.high) },
            creditable: volumes(t.firstYear.creditableGallons),
          }
        : null,
      warnings: result.warnings,
    },
    null,
    2,
  );
}

export function downloadText(filename: string, text: string, type = "text/csv") {
  const blob = new Blob([text], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
