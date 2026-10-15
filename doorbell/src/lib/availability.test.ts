import { describe, expect, it } from "vitest";
import { availableSlots, nextOpenings, peakOverlap } from "./availability";
import { addDays, formatSlot, ldtToMinutes, minutesToLdt, nowInZone, weekday } from "./time";
import type { Booking, Shop } from "./types";

const nineToFive = [{ open: "09:00", close: "17:00" }];
const shop: Shop = {
  id: "s1",
  slug: "test",
  ownerHash: "",
  name: "Test Auto",
  category: "Auto repair",
  description: "",
  address: { street: "1 Main", city: "Sacramento", state: "CA", zip: "95833" },
  phone: "+19165550100",
  ownerSms: "+19165550101",
  timezone: "America/Los_Angeles",
  hours: [[], nineToFive, nineToFive, nineToFive, nineToFive, nineToFive, [{ open: "09:00", close: "12:00" }]],
  closedDates: ["2026-11-26"],
  services: [
    { id: "oil", name: "Oil change", durationMinutes: 30, priceText: "$49", description: "" },
    { id: "brakes", name: "Brake inspection", durationMinutes: 60, priceText: "Free", description: "" },
  ],
  capacity: 2,
  slotMinutes: 30,
  leadMinutes: 60,
  horizonDays: 14,
  replyWindowMinutes: 30,
  published: true,
  demo: false,
  nextCode: 1,
  createdAt: "",
};

// Monday Oct 19 2026, 8:00 AM in Los Angeles (PDT, UTC-7).
const NOW = new Date("2026-10-19T15:00:00Z");

function booking(start: string, durationMinutes: number, status: Booking["status"] = "confirmed", respondBy = "2026-10-19T23:00:00Z"): Booking {
  return {
    id: Math.random().toString(36),
    code: 1,
    shopId: "s1",
    serviceId: "oil",
    serviceName: "Oil change",
    start,
    durationMinutes,
    customerName: "A",
    customerPhone: "+19165550199",
    notifyCustomer: false,
    notes: "",
    via: "test",
    status,
    createdAt: "",
    respondBy,
    decidedAt: null,
    ownerNote: "",
  };
}

describe("time helpers", () => {
  it("converts now into the shop's zone, including DST", () => {
    expect(nowInZone("America/Los_Angeles", NOW)).toBe("2026-10-19T08:00");
    expect(nowInZone("America/Los_Angeles", new Date("2026-12-01T20:00:00Z"))).toBe("2026-12-01T12:00");
  });

  it("does weekday and date math", () => {
    expect(weekday("2026-10-19")).toBe(1);
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(minutesToLdt(ldtToMinutes("2026-10-19T23:30") + 45)).toBe("2026-10-20T00:15");
    expect(formatSlot("2026-10-20T14:30")).toBe("Tue Oct 20, 2:30 PM");
  });
});

describe("peakOverlap", () => {
  it("counts simultaneous bookings, not total overlapping ones", () => {
    const bs = [
      { start: 0, end: 30 },
      { start: 30, end: 60 },
      { start: 15, end: 45 },
    ];
    expect(peakOverlap(bs, 0, 60)).toBe(2);
    expect(peakOverlap(bs, 60, 90)).toBe(0);
  });
});

describe("availableSlots", () => {
  it("respects hours, lead time and duration", () => {
    const today = availableSlots(shop, [], "oil", "2026-10-19", NOW);
    if (!today.ok) throw new Error(today.reason);
    // Opens 9:00 but 8:00 + 60 min lead means 9:00 is the first slot; last 30-min slot starts 16:30.
    expect(today.slots[0]).toBe("2026-10-19T09:00");
    expect(today.slots.at(-1)).toBe("2026-10-19T16:30");
    const brakes = availableSlots(shop, [], "brakes", "2026-10-24", NOW);
    if (!brakes.ok) throw new Error(brakes.reason);
    expect(brakes.slots).toEqual(["2026-10-24T09:00", "2026-10-24T09:30", "2026-10-24T10:00", "2026-10-24T10:30", "2026-10-24T11:00"]);
  });

  it("is empty on Sundays and closed dates", () => {
    const sunday = availableSlots(shop, [], "oil", "2026-10-25", NOW);
    expect(sunday.ok && sunday.slots).toEqual([]);
    const thanksgiving = availableSlots({ ...shop, horizonDays: 60 }, [], "oil", "2026-11-26", NOW);
    expect(thanksgiving.ok && thanksgiving.slots).toEqual([]);
  });

  it("removes a slot only when capacity is full", () => {
    const bs = [booking("2026-10-20T10:00", 60), booking("2026-10-20T10:30", 30)];
    const res = availableSlots(shop, bs, "oil", "2026-10-20", NOW);
    if (!res.ok) throw new Error(res.reason);
    expect(res.slots).toContain("2026-10-20T10:00"); // one booking at 10:00–10:30, capacity 2
    expect(res.slots).not.toContain("2026-10-20T10:30"); // two bookings at 10:30–11:00
    expect(res.slots).toContain("2026-10-20T11:00");
  });

  it("lets pending requests hold a slot only until they expire", () => {
    const pending = [booking("2026-10-20T10:00", 30, "pending"), booking("2026-10-20T10:00", 30, "pending")];
    const held = availableSlots(shop, pending, "oil", "2026-10-20", NOW);
    expect(held.ok && held.slots.includes("2026-10-20T10:00")).toBe(false);
    const expired = pending.map((b) => ({ ...b, respondBy: "2026-10-19T14:00:00Z" }));
    const freed = availableSlots(shop, expired, "oil", "2026-10-20", NOW);
    expect(freed.ok && freed.slots.includes("2026-10-20T10:00")).toBe(true);
    const declined = pending.map((b) => ({ ...b, status: "declined" as const }));
    const free2 = availableSlots(shop, declined, "oil", "2026-10-20", NOW);
    expect(free2.ok && free2.slots.includes("2026-10-20T10:00")).toBe(true);
  });

  it("rejects past dates, far dates, bad dates and unknown services", () => {
    expect(availableSlots(shop, [], "oil", "2026-10-18", NOW).ok).toBe(false);
    expect(availableSlots(shop, [], "oil", "2026-11-30", NOW).ok).toBe(false);
    expect(availableSlots(shop, [], "oil", "2026-02-30", NOW).ok).toBe(false);
    expect(availableSlots(shop, [], "nope", "2026-10-20", NOW).ok).toBe(false);
  });
});

describe("nextOpenings", () => {
  it("returns the soonest slots across days", () => {
    const late = new Date("2026-10-20T00:30:00Z"); // Mon 5:30 PM local, after close
    const slots = nextOpenings(shop, [], "oil", 7, late, 3);
    expect(slots).toEqual(["2026-10-20T09:00", "2026-10-20T09:30", "2026-10-20T10:00"]);
  });
});
