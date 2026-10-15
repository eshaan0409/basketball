import { describe, expect, it } from "vitest";
import { assessActivity } from "./assurance";
import { reviewActivities } from "./checks";
import type { Activity } from "./types";

const base: Activity = {
  id: "a",
  category: "Other",
  position: "Volunteer",
  organization: "Org",
  orgDomain: "",
  startMonth: "2025-01",
  endMonth: null,
  hoursPerWeek: 5,
  weeksPerYear: 40,
  description: "",
  claims: [],
  createdAt: "",
  updatedAt: "",
};

function review(activities: Activity[], today = "2026-10") {
  return reviewActivities(activities, activities.map((a) => assessActivity(a, [])), today);
}

describe("reviewActivities", () => {
  it("flags impossible dates and weeks as errors", () => {
    const f = review([
      { ...base, id: "x", endMonth: "2024-12" },
      { ...base, id: "y", startMonth: "2027-01" },
      { ...base, id: "z", weeksPerYear: 60 },
    ]);
    expect(f.filter((x) => x.severity === "error").map((x) => x.activityId)).toEqual(["x", "y", "z"]);
  });

  it("warns when overlapping activities exceed 40 hours a week", () => {
    const f = review([
      { ...base, id: "a", hoursPerWeek: 20 },
      { ...base, id: "b", hoursPerWeek: 15 },
      { ...base, id: "c", hoursPerWeek: 10, startMonth: "2025-06" },
    ]);
    const total = f.find((x) => x.message.includes("add up to"));
    expect(total?.message).toContain("45 hours a week");
  });

  it("ignores summer-only activities in the weekly total", () => {
    const f = review([
      { ...base, id: "a", hoursPerWeek: 30 },
      { ...base, id: "b", hoursPerWeek: 30, weeksPerYear: 8 },
    ]);
    expect(f.some((x) => x.message.includes("add up to"))).toBe(false);
  });

  it("points out unverified big titles and numbers", () => {
    const f = review([
      { ...base, position: "Founder and CEO", claims: [{ id: "c1", kind: "revenue", text: "$12,000 in sales" }] },
    ]);
    expect(f.some((x) => x.message.includes("founder or president"))).toBe(true);
    expect(f.some((x) => x.message.includes("not verified yet"))).toBe(true);
  });

  it("checks Common App character limits", () => {
    const f = review([{ ...base, position: "x".repeat(51), description: "y".repeat(151) }]);
    expect(f.filter((x) => x.severity === "tip").length).toBe(2);
  });

  it("orders errors before warnings before tips", () => {
    const f = review([
      { ...base, id: "a", description: "y".repeat(151) },
      { ...base, id: "b", endMonth: "2020-01" },
      { ...base, id: "c", hoursPerWeek: 50 },
    ]);
    expect(f.map((x) => x.severity)).toEqual(["error", "warning", "warning", "tip"]);
  });
});
