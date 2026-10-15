import { describe, expect, it } from "vitest";
import { niceTicks } from "@/components/charts/scale";

describe("scaffold", () => {
  it("runs tests", () => {
    expect(niceTicks(0, 95)).toEqual([0, 25, 50, 75, 100]);
  });
});
