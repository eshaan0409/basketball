import { addMonths, toMonth } from "./months";
import { createRng, fitLine, percentile, type LinearFit } from "./stats";
import {
  DEFAULT_OPTIONS,
  type AccountResult,
  type Enrollment,
  type ExcludedAccount,
  type Group,
  type Intervention,
  type MeterRead,
  type MonthlyPoint,
  type VerifyInput,
  type VerifyOptions,
  type VerifyResult,
  type WeatherMonth,
} from "./types";

/**
 * Verified outdoor water savings, in five steps:
 *
 * 1. Roll every account's meter reads up to monthly totals.
 * 2. Estimate indoor use as the average of the account's lowest-use months before
 *    the measure went in. Everything above that is treated as outdoor use.
 * 3. Fit outdoor use against irrigation demand (ET0 minus effective rain) over the
 *    pre-install months, then predict what the home would have used afterwards.
 * 4. Subtract the change seen in control homes over the same calendar months, so
 *    rate increases, drought messaging and other shared trends are not counted.
 * 5. Bootstrap over homes for a confidence interval, and credit only its lower bound.
 */
export function verifySavings(input: VerifyInput, overrides: Partial<VerifyOptions> = {}): VerifyResult {
  const options: VerifyOptions = { ...DEFAULT_OPTIONS, ...overrides };
  const warnings: string[] = [];
  const excluded: ExcludedAccount[] = [];

  const series = aggregateMonthly(input.reads);
  const demand = irrigationDemandByMonth(input.weather, options.effectiveRainFraction);

  const missingWeather = new Set<string>();
  for (const months of series.values()) {
    for (const month of months.keys()) {
      if (!demand.has(month)) missingWeather.add(month);
    }
  }
  if (missingWeather.size > 0) {
    warnings.push(
      `Weather data is missing for ${missingWeather.size} month(s) that have meter reads (${summarizeMonths(missingWeather)}). Those months were skipped.`,
    );
  }

  const enrollmentByAccount = new Map<string, { installMonth: string; intervention: Intervention }>();
  let duplicateEnrollments = 0;
  let enrolledWithoutReads = 0;
  for (const e of input.enrollments) {
    const installMonth = toMonth(e.installDate);
    if (!installMonth) {
      excluded.push({ accountId: e.accountId, group: "treatment", reason: `Install date "${e.installDate}" is not a date.` });
      continue;
    }
    if (!series.has(e.accountId)) {
      enrolledWithoutReads++;
      continue;
    }
    const existing = enrollmentByAccount.get(e.accountId);
    if (existing) {
      duplicateEnrollments++;
      if (installMonth < existing.installMonth) {
        enrollmentByAccount.set(e.accountId, { installMonth, intervention: e.intervention });
      }
      continue;
    }
    enrollmentByAccount.set(e.accountId, { installMonth, intervention: e.intervention });
  }
  if (enrolledWithoutReads > 0) {
    warnings.push(`${enrolledWithoutReads} enrolled home(s) have no meter reads and were left out.`);
  }
  if (duplicateEnrollments > 0) {
    warnings.push(`${duplicateEnrollments} home(s) were enrolled more than once. The earliest install date was used.`);
  }

  const installMonths = [...enrollmentByAccount.values()].map((e) => e.installMonth).sort();
  const programStartMonth = installMonths[0] ?? null;

  const treated: PreparedAccount[] = [];
  const controls: PreparedAccount[] = [];

  for (const [accountId, months] of series) {
    const enrollment = enrollmentByAccount.get(accountId);
    if (enrollment) {
      const prepared = prepareAccount({
        accountId,
        group: "treatment",
        months,
        demand,
        preEndExclusive: enrollment.installMonth,
        // The install month is a transition month: not baseline, not savings.
        postStart: addMonths(enrollment.installMonth, 1),
        options,
      });
      if ("reason" in prepared) {
        excluded.push(prepared);
        continue;
      }
      if (prepared.postMonths.length === 0) {
        excluded.push({ accountId, group: "treatment", reason: "No meter reads after the install month." });
        continue;
      }
      treated.push({ ...prepared, intervention: enrollment.intervention, installMonth: enrollment.installMonth });
    } else if (programStartMonth) {
      const prepared = prepareAccount({
        accountId,
        group: "control",
        months,
        demand,
        preEndExclusive: programStartMonth,
        postStart: programStartMonth,
        options,
      });
      if ("reason" in prepared) {
        excluded.push(prepared);
        continue;
      }
      controls.push(prepared);
    }
  }

  if (!programStartMonth) {
    warnings.push("No enrolled homes matched the meter data, so there is nothing to verify yet.");
  }
  if (treated.length > 0 && treated.length < 30) {
    warnings.push(`Only ${treated.length} treated home(s) could be verified. Expect a wide interval below about 30.`);
  }
  if (programStartMonth && controls.length === 0) {
    warnings.push(
      "No control homes could be modeled, so savings are not adjusted for shared trends such as rate changes or drought messaging. Buyers will not accept unadjusted savings.",
    );
  } else if (controls.length > 0 && controls.length < 30) {
    warnings.push(`Only ${controls.length} control home(s) could be modeled. Aim for at least as many control homes as treated ones.`);
  }
  const shortPost = treated.filter((t) => t.postMonths.length < 12).length;
  if (shortPost > 0) {
    warnings.push(
      `${shortPost} treated home(s) have under 12 months of data after install, so they are left out of first-year savings.`,
    );
  }
  const excludedCount = excluded.length;
  if (excludedCount > 0) {
    warnings.push(`${excludedCount} home(s) were excluded. The list below gives the reason for each.`);
  }

  // Month index shared by every per-month array below.
  const allMonths = new Set<string>();
  for (const a of [...treated, ...controls]) {
    for (const m of a.expected.keys()) allMonths.add(m);
  }
  const monthList = [...allMonths].sort();
  const monthIndex = new Map(monthList.map((m, i) => [m, i]));

  const controlAdjustment = controlAdjustmentByMonth(controls, monthIndex, monthList.length);
  let monthsWithoutControls = 0;
  if (controls.length > 0) {
    for (const t of treated) {
      for (const m of t.postMonths) {
        if (Number.isNaN(controlAdjustment[monthIndex.get(m)!])) monthsWithoutControls++;
      }
    }
  }
  if (monthsWithoutControls > 0) {
    warnings.push(
      `${monthsWithoutControls} treated home-month(s) had no control data for the same month and were left unadjusted.`,
    );
  }

  const treatmentResults = treated.map((t) => toAccountResult(t, controlAdjustment, monthIndex));
  const controlResults = controls.map((c) => toAccountResult(c, null, monthIndex));

  const grossSavingsGallons = sum(treatmentResults.map((r) => r.grossSavingsGallons));
  const netSavingsGallons = sum(treatmentResults.map((r) => r.netSavingsGallons));
  const expectedPostUseGallons = sum(treated.map((t) => sum(t.postMonths.map((m) => t.expected.get(m)!))));

  const boot = bootstrap(treated, controls, monthIndex, monthList.length, options);
  const firstYearHomes = treatmentResults.filter((r) => r.firstYearNetSavingsGallons !== null);

  const monthly = buildMonthly(monthList, treated, controls, controlAdjustment, monthIndex, programStartMonth);

  const postMonthsAll = treated.flatMap((t) => t.postMonths).sort();

  const interventionCounts: Partial<Record<Intervention, number>> = {};
  for (const t of treated) {
    if (t.intervention) interventionCounts[t.intervention] = (interventionCounts[t.intervention] ?? 0) + 1;
  }

  return {
    options,
    programStartMonth,
    measurementStartMonth: postMonthsAll[0] ?? null,
    measurementEndMonth: postMonthsAll[postMonthsAll.length - 1] ?? null,
    treatment: treatmentResults,
    control: controlResults,
    excluded,
    monthly,
    totals: {
      grossSavingsGallons,
      controlAdjustmentGallons: grossSavingsGallons - netSavingsGallons,
      netSavingsGallons,
      netSavingsInterval: boot.period,
      creditableGallons: Math.max(0, boot.period.low),
      firstYear:
        firstYearHomes.length > 0 && boot.firstYear
          ? {
              homes: firstYearHomes.length,
              netSavingsGallons: sum(firstYearHomes.map((r) => r.firstYearNetSavingsGallons!)),
              interval: boot.firstYear,
              creditableGallons: Math.max(0, boot.firstYear.low),
            }
          : null,
      expectedPostUseGallons,
      netSavingsPct: expectedPostUseGallons > 0 ? netSavingsGallons / expectedPostUseGallons : 0,
    },
    interventionCounts,
    warnings,
  };
}

interface PreparedAccount {
  accountId: string;
  group: Group;
  intervention?: Intervention;
  installMonth?: string;
  indoor: number;
  fit: LinearFit;
  preMonths: string[];
  /** Sorted months at or after the post start that have reads and weather. */
  postMonths: string[];
  actual: Map<string, number>;
  /** Indoor baseline plus modeled outdoor use, for every month with weather. */
  expected: Map<string, number>;
}

export function aggregateMonthly(reads: MeterRead[]): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  for (const r of reads) {
    const month = toMonth(r.period);
    if (!month || !Number.isFinite(r.gallons)) continue;
    let months = out.get(r.accountId);
    if (!months) {
      months = new Map();
      out.set(r.accountId, months);
    }
    months.set(month, (months.get(month) ?? 0) + r.gallons);
  }
  return out;
}

/** Irrigation demand in inches: reference ET minus the share of rain that reaches roots. */
export function irrigationDemandByMonth(weather: WeatherMonth[], effectiveRainFraction: number): Map<string, number> {
  const out = new Map<string, number>();
  for (const w of weather) {
    const month = toMonth(w.month);
    if (!month) continue;
    out.set(month, Math.max(0, w.et0In - effectiveRainFraction * w.rainIn));
  }
  return out;
}

/** Average of the k lowest monthly totals: a standard proxy for indoor use. */
export function estimateIndoorBaseline(monthlyTotals: number[], k: number): number {
  const sorted = [...monthlyTotals].sort((a, b) => a - b);
  const take = sorted.slice(0, Math.max(1, Math.min(k, sorted.length)));
  return sum(take) / take.length;
}

function prepareAccount(args: {
  accountId: string;
  group: Group;
  months: Map<string, number>;
  demand: Map<string, number>;
  preEndExclusive: string;
  postStart: string;
  options: VerifyOptions;
}): Omit<PreparedAccount, "intervention" | "installMonth"> | ExcludedAccount {
  const { accountId, group, months, demand, preEndExclusive, postStart, options } = args;
  const usable = [...months.keys()].filter((m) => demand.has(m)).sort();
  const preMonths = usable.filter((m) => m < preEndExclusive);

  if (preMonths.length < options.minPreMonths) {
    return {
      accountId,
      group,
      reason: `Only ${preMonths.length} month(s) of history before ${group === "treatment" ? "install" : "the program began"}; ${options.minPreMonths} needed.`,
    };
  }

  const indoor = estimateIndoorBaseline(
    preMonths.map((m) => months.get(m)!),
    options.indoorBaselineMonths,
  );
  const xs = preMonths.map((m) => demand.get(m)!);
  const ys = preMonths.map((m) => Math.max(0, months.get(m)! - indoor));
  const fit = fitLine(xs, ys);

  if (fit.slope <= 0 || fit.r2 < options.minModelR2) {
    return {
      accountId,
      group,
      reason: `Outdoor use does not track the weather closely enough to model (R² ${fit.r2.toFixed(2)}, minimum ${options.minModelR2}).`,
    };
  }

  const expected = new Map<string, number>();
  for (const m of usable) {
    expected.set(m, indoor + Math.max(0, fit.intercept + fit.slope * demand.get(m)!));
  }

  return {
    accountId,
    group,
    indoor,
    fit,
    preMonths,
    postMonths: usable.filter((m) => m >= postStart),
    actual: new Map(usable.map((m) => [m, months.get(m)!])),
    expected,
  };
}

function residual(account: PreparedAccount, month: string): number {
  return account.expected.get(month)! - account.actual.get(month)!;
}

/** Mean control-home residual per month after the program began. NaN where no control has data. */
function controlAdjustmentByMonth(
  controls: PreparedAccount[],
  monthIndex: Map<string, number>,
  size: number,
): Float64Array {
  const sums = new Float64Array(size);
  const counts = new Float64Array(size);
  for (const c of controls) {
    for (const m of c.postMonths) {
      const i = monthIndex.get(m)!;
      sums[i] += residual(c, m);
      counts[i] += 1;
    }
  }
  const out = new Float64Array(size).fill(controls.length === 0 ? 0 : NaN);
  for (let i = 0; i < size; i++) {
    if (counts[i] > 0) out[i] = sums[i] / counts[i];
  }
  return out;
}

function adjustmentAt(adjustment: Float64Array, i: number): number {
  const v = adjustment[i];
  return Number.isNaN(v) ? 0 : v;
}

function toAccountResult(
  account: PreparedAccount,
  adjustment: Float64Array | null,
  monthIndex: Map<string, number>,
): AccountResult {
  let gross = 0;
  let net = 0;
  let firstYear = 0;
  let expectedPost = 0;
  account.postMonths.forEach((m, k) => {
    const r = residual(account, m);
    const n = adjustment ? r - adjustmentAt(adjustment, monthIndex.get(m)!) : r;
    gross += r;
    net += n;
    if (k < 12) firstYear += n;
    expectedPost += account.expected.get(m)!;
  });
  return {
    accountId: account.accountId,
    group: account.group,
    intervention: account.intervention,
    installMonth: account.installMonth,
    preMonths: account.preMonths.length,
    postMonths: account.postMonths.length,
    indoorBaselineGallonsPerMonth: account.indoor,
    modelIntercept: account.fit.intercept,
    modelSlope: account.fit.slope,
    modelR2: account.fit.r2,
    grossSavingsGallons: gross,
    netSavingsGallons: net,
    firstYearNetSavingsGallons: account.postMonths.length >= 12 ? firstYear : null,
    netSavingsPct: expectedPost > 0 ? net / expectedPost : 0,
  };
}

/** Resample homes with replacement to get an interval on total net savings. */
function bootstrap(
  treated: PreparedAccount[],
  controls: PreparedAccount[],
  monthIndex: Map<string, number>,
  size: number,
  options: VerifyOptions,
): { period: { low: number; high: number }; firstYear: { low: number; high: number } | null } {
  if (treated.length === 0) {
    return { period: { low: 0, high: 0 }, firstYear: null };
  }

  const toVectors = (a: PreparedAccount) => ({
    idx: Int32Array.from(a.postMonths.map((m) => monthIndex.get(m)!)),
    res: Float64Array.from(a.postMonths.map((m) => residual(a, m))),
  });
  const t = treated.map(toVectors);
  const c = controls.map(toVectors);
  const hasFirstYear = treated.some((a) => a.postMonths.length >= 12);

  const rng = createRng(options.seed);
  const periodTotals: number[] = [];
  const firstYearTotals: number[] = [];
  const sums = new Float64Array(size);
  const counts = new Float64Array(size);
  const adj = new Float64Array(size);

  for (let iter = 0; iter < options.bootstrapIterations; iter++) {
    sums.fill(0);
    counts.fill(0);
    for (let k = 0; k < c.length; k++) {
      const pick = c[Math.floor(rng() * c.length)];
      for (let j = 0; j < pick.idx.length; j++) {
        sums[pick.idx[j]] += pick.res[j];
        counts[pick.idx[j]] += 1;
      }
    }
    for (let i = 0; i < size; i++) adj[i] = counts[i] > 0 ? sums[i] / counts[i] : 0;

    let period = 0;
    let firstYear = 0;
    for (let k = 0; k < t.length; k++) {
      const pick = t[Math.floor(rng() * t.length)];
      const eligible = pick.idx.length >= 12;
      for (let j = 0; j < pick.idx.length; j++) {
        const n = pick.res[j] - adj[pick.idx[j]];
        period += n;
        if (eligible && j < 12) firstYear += n;
      }
    }
    periodTotals.push(period);
    firstYearTotals.push(firstYear);
  }

  const tail = (1 - options.confidence) / 2;
  const interval = (xs: number[]) => ({ low: percentile(xs, tail), high: percentile(xs, 1 - tail) });
  return {
    period: interval(periodTotals),
    firstYear: hasFirstYear ? interval(firstYearTotals) : null,
  };
}

function buildMonthly(
  monthList: string[],
  treated: PreparedAccount[],
  controls: PreparedAccount[],
  adjustment: Float64Array,
  monthIndex: Map<string, number>,
  programStartMonth: string | null,
): MonthlyPoint[] {
  return monthList.map((month) => {
    const avg = (accounts: PreparedAccount[], pick: (a: PreparedAccount) => number | undefined) => {
      const values = accounts.map(pick).filter((v): v is number => v !== undefined);
      return values.length > 0 ? sum(values) / values.length : null;
    };
    const i = monthIndex.get(month)!;
    let net = 0;
    for (const t of treated) {
      if (t.postMonths.includes(month)) net += residual(t, month) - adjustmentAt(adjustment, i);
    }
    const afterStart = programStartMonth !== null && month >= programStartMonth;
    return {
      month,
      treatmentActualAvg: avg(treated, (a) => a.actual.get(month)),
      treatmentExpectedAvg: avg(treated, (a) => a.expected.get(month)),
      controlActualAvg: avg(controls, (a) => a.actual.get(month)),
      controlExpectedAvg: avg(controls, (a) => a.expected.get(month)),
      controlAdjustmentPerHome: afterStart && controls.length > 0 && !Number.isNaN(adjustment[i]) ? adjustment[i] : null,
      netSavingsGallons: net,
    };
  });
}

function sum(values: number[]): number {
  let s = 0;
  for (const v of values) s += v;
  return s;
}

function summarizeMonths(months: Set<string>): string {
  const sorted = [...months].sort();
  return sorted.length <= 3 ? sorted.join(", ") : `${sorted[0]} … ${sorted[sorted.length - 1]}`;
}

export type { Enrollment, MeterRead, WeatherMonth };
