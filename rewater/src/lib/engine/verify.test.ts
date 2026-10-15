import { describe, expect, it } from "vitest";
import { generateDemoData } from "./demo";
import { aggregateMonthly, estimateIndoorBaseline, irrigationDemandByMonth, verifySavings } from "./verify";

describe("aggregateMonthly", () => {
  it("sums daily reads into months and keeps monthly reads as-is", () => {
    const series = aggregateMonthly([
      { accountId: "A", period: "2025-01-01", gallons: 100 },
      { accountId: "A", period: "2025-01-31", gallons: 50 },
      { accountId: "A", period: "2025-02", gallons: 400 },
      { accountId: "B", period: "2025-01-15", gallons: 10 },
    ]);
    expect(series.get("A")?.get("2025-01")).toBe(150);
    expect(series.get("A")?.get("2025-02")).toBe(400);
    expect(series.get("B")?.get("2025-01")).toBe(10);
  });
});

describe("irrigationDemandByMonth", () => {
  it("subtracts effective rain and never goes negative", () => {
    const demand = irrigationDemandByMonth(
      [
        { month: "2025-07", et0In: 8, rainIn: 0 },
        { month: "2025-01", et0In: 1, rainIn: 4 },
      ],
      0.75,
    );
    expect(demand.get("2025-07")).toBe(8);
    expect(demand.get("2025-01")).toBe(0);
  });
});

describe("estimateIndoorBaseline", () => {
  it("averages the lowest months", () => {
    expect(estimateIndoorBaseline([9, 1, 5, 2, 3], 3)).toBe(2);
    expect(estimateIndoorBaseline([4], 3)).toBe(4);
  });
});

describe("verifySavings on synthetic data with known savings", () => {
  const data = generateDemoData();
  const result = verifySavings(data);
  const verifiedIds = new Set(result.treatment.map((t) => t.accountId));
  const trueSavings = [...data.truth.savingsByAccount]
    .filter(([id]) => verifiedIds.has(id))
    .reduce((s, [, v]) => s + v, 0);

  it("verifies most treated homes", () => {
    const treatedHomes = data.enrollments.length;
    expect(result.treatment.length).toBeGreaterThan(treatedHomes * 0.85);
    expect(result.control.length).toBeGreaterThan(50);
  });

  it("recovers true net savings within 12%", () => {
    expect(trueSavings).toBeGreaterThan(0);
    const error = Math.abs(result.totals.netSavingsGallons - trueSavings) / trueSavings;
    expect(error).toBeLessThan(0.12);
  });

  it("puts the true savings inside the confidence interval", () => {
    const { low, high } = result.totals.netSavingsInterval;
    expect(low).toBeLessThan(trueSavings);
    expect(high).toBeGreaterThan(trueSavings);
  });

  it("credits only the conservative lower bound", () => {
    expect(result.totals.creditableGallons).toBeCloseTo(result.totals.netSavingsInterval.low, 6);
    expect(result.totals.creditableGallons).toBeLessThan(result.totals.netSavingsGallons);
  });

  it("removes the shared trend that control homes also show", () => {
    // Everyone cut outdoor use 6%; without controls that cut would be counted as savings.
    expect(result.totals.controlAdjustmentGallons).toBeGreaterThan(0);
    expect(result.totals.grossSavingsGallons).toBeGreaterThan(trueSavings);
  });

  it("reports first-year savings for homes with 12 months of post data", () => {
    expect(result.totals.firstYear).not.toBeNull();
    expect(result.totals.firstYear!.homes).toBe(result.treatment.filter((t) => t.postMonths >= 12).length);
  });

  it("excludes homes without enough history or outdoor use, with reasons", () => {
    expect(result.excluded.length).toBeGreaterThan(0);
    for (const e of result.excluded) expect(e.reason.length).toBeGreaterThan(10);
  });

  it("is deterministic for a fixed seed", () => {
    const again = verifySavings(data);
    expect(again.totals.netSavingsInterval).toEqual(result.totals.netSavingsInterval);
  });
});

describe("verifySavings edge cases", () => {
  it("warns loudly when there is no control group", () => {
    const data = generateDemoData({ homes: 60, treatedShare: 1 });
    const result = verifySavings(data);
    expect(result.control.length).toBe(0);
    expect(result.warnings.some((w) => w.includes("No control homes"))).toBe(true);
    expect(result.totals.controlAdjustmentGallons).toBe(0);
  });

  it("handles no enrollments without throwing", () => {
    const data = generateDemoData({ homes: 20, treatedShare: 0 });
    const result = verifySavings(data);
    expect(result.treatment.length).toBe(0);
    expect(result.totals.netSavingsGallons).toBe(0);
    expect(result.warnings.some((w) => w.includes("nothing to verify"))).toBe(true);
  });

  it("flags enrolled homes that have no meter data", () => {
    const data = generateDemoData({ homes: 40 });
    const result = verifySavings({
      ...data,
      enrollments: [...data.enrollments, { accountId: "GHOST", installDate: "2025-04-01", intervention: "other" }],
    });
    expect(result.warnings.some((w) => w.includes("no meter reads"))).toBe(true);
  });

  it("finds no savings when nothing changed", () => {
    // Enroll homes on paper but generate their usage as if untreated.
    const data = generateDemoData({ homes: 200, treatedShare: 0, seed: 11 });
    const ids = [...new Set(data.reads.map((r) => r.accountId))].slice(0, 100);
    const result = verifySavings({
      ...data,
      enrollments: ids.map((accountId) => ({ accountId, installDate: "2025-04-15", intervention: "smart_controller" as const })),
    });
    const { low, high } = result.totals.netSavingsInterval;
    expect(low).toBeLessThan(0);
    expect(high).toBeGreaterThan(0);
  });
});
