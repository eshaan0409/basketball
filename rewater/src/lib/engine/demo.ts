import { daysInMonth, monthRange } from "./months";
import { createRng, normal } from "./stats";
import type { Enrollment, Intervention, MeterRead, VerifyInput, WeatherMonth } from "./types";

/**
 * SYNTHETIC data for demos and tests. Nothing here is measured.
 *
 * The climate numbers are rough Sacramento-like monthly shapes chosen to look
 * plausible, not CIMIS normals. Homes, usage and savings are all simulated, and
 * the generator also returns the true savings so tests can check the engine
 * recovers them.
 */

const ET0_SHAPE = [1.2, 2.0, 3.4, 5.0, 6.4, 7.4, 8.1, 7.1, 5.4, 3.7, 1.8, 1.1];
const RAIN_SHAPE = [3.6, 3.5, 2.6, 1.2, 0.6, 0.2, 0.0, 0.05, 0.2, 0.9, 2.0, 3.2];

/** Gallons of water to cover one square foot with one inch. */
const GALLONS_PER_SQFT_INCH = 0.623;

export interface DemoOptions {
  homes: number;
  treatedShare: number;
  seed: number;
  startMonth: string;
  endMonth: string;
  /** Months during which installs happen (inclusive). */
  installWindow: [string, string];
  /** Month from which every home's outdoor use drops by `sharedTrendDrop`. */
  sharedTrendStart: string;
  /** e.g. 0.06 = a 6% cut everyone makes (a rate increase), which the control group must catch. */
  sharedTrendDrop: number;
}

export const DEFAULT_DEMO_OPTIONS: DemoOptions = {
  homes: 240,
  treatedShare: 0.5,
  seed: 7,
  startMonth: "2023-10",
  endMonth: "2026-09",
  installWindow: ["2025-03", "2025-06"],
  sharedTrendStart: "2025-04",
  sharedTrendDrop: 0.06,
};

export interface DemoTruth {
  /** True savings per treated home over its post-install months (after the install month). */
  savingsByAccount: Map<string, number>;
}

export interface DemoDataset extends VerifyInput {
  truth: DemoTruth;
  options: DemoOptions;
}

export function generateDemoData(overrides: Partial<DemoOptions> = {}): DemoDataset {
  const options: DemoOptions = { ...DEFAULT_DEMO_OPTIONS, ...overrides };
  const rng = createRng(options.seed);
  const uniform = (lo: number, hi: number) => lo + (hi - lo) * rng();
  const months = monthRange(options.startMonth, options.endMonth);

  // Each water year (Oct–Sep) gets its own hotter/cooler and wetter/drier character.
  const yearHeat = new Map<number, number>();
  const yearWet = new Map<number, number>();
  const waterYear = (month: string) => Number(month.slice(0, 4)) + (Number(month.slice(5, 7)) >= 10 ? 1 : 0);

  const weather: WeatherMonth[] = months.map((month) => {
    const wy = waterYear(month);
    if (!yearHeat.has(wy)) {
      yearHeat.set(wy, uniform(0.92, 1.08));
      yearWet.set(wy, uniform(0.5, 1.5));
    }
    const idx = Number(month.slice(5, 7)) - 1;
    return {
      month,
      et0In: round(ET0_SHAPE[idx] * yearHeat.get(wy)! * (1 + 0.05 * normal(rng)), 2),
      rainIn: round(Math.max(0, RAIN_SHAPE[idx] * yearWet.get(wy)! * (1 + 0.3 * normal(rng))), 2),
    };
  });
  // The "true" physics uses a slightly different effective-rain share than the engine assumes.
  const trueDemand = new Map(weather.map((w) => [w.month, Math.max(0, w.et0In - 0.7 * w.rainIn)]));

  const reads: MeterRead[] = [];
  const enrollments: Enrollment[] = [];
  const savingsByAccount = new Map<string, number>();
  const [installStart, installEnd] = options.installWindow;
  const installMonths = monthRange(installStart, installEnd);

  for (let h = 0; h < options.homes; h++) {
    const accountId = `DEMO-${String(h + 1).padStart(4, "0")}`;
    const people = 1 + Math.floor(rng() * 5);
    const gallonsPerPersonDay = uniform(45, 70);
    // About 5% of accounts have no irrigated landscape at all (condos, xeriscape).
    const landscapeSqft = rng() < 0.05 ? 0 : uniform(800, 4000);
    const cropFactor = uniform(0.6, 0.9);
    const overwatering = uniform(1.1, 1.9);
    // A few accounts moved in recently and lack a full baseline.
    const firstMonth = rng() < 0.03 ? "2024-10" : options.startMonth;

    const treated = rng() < options.treatedShare;
    let installMonth: string | null = null;
    let intervention: Intervention | null = null;
    let afterOverwatering = overwatering;
    let afterSqft = landscapeSqft;
    if (treated) {
      installMonth = installMonths[Math.floor(rng() * installMonths.length)];
      intervention = rng() < 0.8 ? "smart_controller" : "turf_replacement";
      if (intervention === "smart_controller") {
        // A weather-based controller removes most, not all, of the overwatering.
        afterOverwatering = 1 + (overwatering - 1) * uniform(0.25, 0.5);
      } else {
        afterSqft = landscapeSqft * uniform(0.25, 0.6);
      }
      enrollments.push({
        accountId,
        installDate: `${installMonth}-${String(1 + Math.floor(rng() * 27)).padStart(2, "0")}`,
        intervention,
      });
    }

    let trueSavings = 0;
    for (const month of months) {
      if (month < firstMonth) continue;
      const indoor = people * gallonsPerPersonDay * daysInMonth(month) * (1 + 0.04 * normal(rng));
      const trend = month >= options.sharedTrendStart ? 1 - options.sharedTrendDrop : 1;
      const noise = Math.max(0.5, 1 + 0.08 * normal(rng));
      const d = trueDemand.get(month)!;
      const counterfactualOutdoor = landscapeSqft * GALLONS_PER_SQFT_INCH * cropFactor * d * overwatering * trend * noise;
      let outdoor = counterfactualOutdoor;
      if (installMonth && month >= installMonth) {
        outdoor = afterSqft * GALLONS_PER_SQFT_INCH * cropFactor * d * afterOverwatering * trend * noise;
        if (month > installMonth) trueSavings += counterfactualOutdoor - outdoor;
      }
      reads.push({ accountId, period: month, gallons: Math.round(indoor + outdoor) });
    }
    if (installMonth) savingsByAccount.set(accountId, trueSavings);
  }

  return { reads, enrollments, weather, truth: { savingsByAccount }, options };
}

/** One-line description of a demo dataset, for display. */
export function describeDemo(options: DemoOptions): string {
  return `${options.homes} simulated homes, ${options.startMonth} to ${options.endMonth}, installs ${options.installWindow[0]} to ${options.installWindow[1]}, and a ${Math.round(options.sharedTrendDrop * 100)}% drop in everyone's outdoor use from ${options.sharedTrendStart}.`;
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
