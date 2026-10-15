/**
 * Shop-local wall-clock time. Bookings are stored as local "YYYY-MM-DDTHH:mm" strings in the shop's timezone,
 * which keeps hours, slots and SMS text in the owner's terms. Only "now" needs a real timezone conversion.
 */

export type LocalDateTime = string; // "YYYY-MM-DDTHH:mm"

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const LDT_RE = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)$/;

export function isDate(value: string): boolean {
  const m = DATE_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
}

export function isTime(value: string): boolean {
  return TIME_RE.test(value);
}

export function isLocalDateTime(value: string): boolean {
  const m = LDT_RE.exec(value);
  return !!m && isDate(m[1]);
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function fromMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 0 = Sunday. */
export function weekday(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** Minutes since an arbitrary epoch, for comparing local date-times. */
export function ldtToMinutes(ldt: LocalDateTime): number {
  const [date, time] = ldt.split("T");
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 60000 + toMinutes(time);
}

export function minutesToLdt(total: number): LocalDateTime {
  const day = Math.floor(total / 1440);
  const date = new Date(day * 86400000).toISOString().slice(0, 10);
  return `${date}T${fromMinutes(total - day * 1440)}`;
}

/** The current wall-clock time in a timezone. */
export function nowInZone(timezone: string, now: Date = new Date()): LocalDateTime {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatClock(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

/** "Tue Oct 21, 2:30 PM" */
export function formatSlot(ldt: LocalDateTime): string {
  const [date, time] = ldt.split("T");
  const [, m, d] = date.split("-").map(Number);
  return `${DAYS[weekday(date)]} ${MONTHS[m - 1]} ${d}, ${formatClock(time)}`;
}

export function dayName(index: number, long = false): string {
  return (long ? DAYS_LONG : DAYS)[index];
}
