import { describe, expect, it } from "vitest";
import { addMonths, daysInMonth, monthRange, toMonth } from "./months";
import { createRng, fitLine, percentile } from "./stats";

describe("fitLine", () => {
  it("recovers an exact line", () => {
    const fit = fitLine([0, 1, 2, 3], [1, 3, 5, 7]);
    expect(fit.intercept).toBeCloseTo(1);
    expect(fit.slope).toBeCloseTo(2);
    expect(fit.r2).toBeCloseTo(1);
  });

  it("returns a flat line when x has no spread", () => {
    expect(fitLine([2, 2, 2], [1, 2, 3])).toEqual({ intercept: 2, slope: 0, r2: 0 });
  });
});

describe("percentile", () => {
  it("interpolates", () => {
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(percentile([0, 10], 0.25)).toBe(2.5);
  });
});

describe("createRng", () => {
  it("is repeatable and in [0, 1)", () => {
    const a = createRng(5);
    const b = createRng(5);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
});

describe("months", () => {
  it("parses and steps months", () => {
    expect(toMonth("2025-3-9")).toBe("2025-03");
    expect(toMonth("2025-13")).toBeNull();
    expect(addMonths("2025-11", 3)).toBe("2026-02");
    expect(addMonths("2025-01", -1)).toBe("2024-12");
    expect(monthRange("2025-11", "2026-02")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(daysInMonth("2024-02")).toBe(29);
  });
});
