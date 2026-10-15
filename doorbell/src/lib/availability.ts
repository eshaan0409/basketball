import { addDays, fromMinutes, isDate, ldtToMinutes, nowInZone, toMinutes, weekday, type LocalDateTime } from "./time";
import type { Booking, Service, Shop } from "./types";

/** Statuses that occupy capacity. A pending request holds its slot until the owner answers or it expires. */
export function holdsSlot(b: Booking, now: Date): boolean {
  if (b.status === "confirmed") return true;
  return b.status === "pending" && new Date(b.respondBy) > now;
}

/** Most bookings running at the same moment anywhere in [start, end). */
export function peakOverlap(bookings: { start: number; end: number }[], start: number, end: number): number {
  const events: [number, number][] = [];
  for (const b of bookings) {
    if (b.start < end && b.end > start) {
      events.push([Math.max(b.start, start), 1], [Math.min(b.end, end), -1]);
    }
  }
  // Ends sort before starts at the same minute, so back-to-back bookings don't overlap.
  events.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  let current = 0;
  let peak = 0;
  for (const [, delta] of events) {
    current += delta;
    peak = Math.max(peak, current);
  }
  return peak;
}

export type AvailabilityResult =
  | { ok: true; date: string; service: Pick<Service, "id" | "name" | "durationMinutes" | "priceText">; slots: LocalDateTime[] }
  | { ok: false; reason: string };

/** Open start times for a service on a date, in the shop's local time. */
export function availableSlots(shop: Shop, bookings: Booking[], serviceId: string, date: string, now: Date = new Date()): AvailabilityResult {
  const service = shop.services.find((s) => s.id === serviceId);
  if (!service) return { ok: false, reason: `Unknown service "${serviceId}".` };
  if (!isDate(date)) return { ok: false, reason: "Date must be YYYY-MM-DD." };

  const nowLocal = nowInZone(shop.timezone, now);
  const today = nowLocal.slice(0, 10);
  if (date < today) return { ok: false, reason: "That date has passed." };
  const lastDay = addDays(today, shop.horizonDays);
  if (date > lastDay) return { ok: false, reason: `Bookings open ${shop.horizonDays} days ahead (until ${lastDay}).` };
  const summary = { id: service.id, name: service.name, durationMinutes: service.durationMinutes, priceText: service.priceText };
  if (shop.closedDates.includes(date)) return { ok: true, date, service: summary, slots: [] };

  const earliest = ldtToMinutes(nowLocal) + shop.leadMinutes;
  const held = bookings
    .filter((b) => b.shopId === shop.id && holdsSlot(b, now) && b.start.startsWith(date))
    .map((b) => {
      const start = ldtToMinutes(b.start);
      return { start, end: start + b.durationMinutes };
    });

  const slots: LocalDateTime[] = [];
  for (const interval of shop.hours[weekday(date)] ?? []) {
    const open = toMinutes(interval.open);
    const close = toMinutes(interval.close);
    for (let t = open; t + service.durationMinutes <= close; t += shop.slotMinutes) {
      const ldt = `${date}T${fromMinutes(t)}`;
      const start = ldtToMinutes(ldt);
      if (start < earliest) continue;
      if (peakOverlap(held, start, start + service.durationMinutes) >= shop.capacity) continue;
      slots.push(ldt);
    }
  }
  return { ok: true, date, service: summary, slots };
}

/** The next dates (up to `days`) with at least one open slot, for agents that ask "when's the soonest?". */
export function nextOpenings(shop: Shop, bookings: Booking[], serviceId: string, days: number, now: Date = new Date(), limit = 6) {
  const out: LocalDateTime[] = [];
  const today = nowInZone(shop.timezone, now).slice(0, 10);
  for (let i = 0; i <= Math.min(days, shop.horizonDays) && out.length < limit; i++) {
    const res = availableSlots(shop, bookings, serviceId, addDays(today, i), now);
    if (res.ok) out.push(...res.slots.slice(0, limit - out.length));
  }
  return out;
}
