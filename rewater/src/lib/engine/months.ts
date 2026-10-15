const MONTH_RE = /^(\d{4})-(\d{2})$/;

/** "2025-03-14" or "2025-03" -> "2025-03". Returns null if the value is not a date. */
export function toMonth(value: string): string | null {
  const trimmed = value.trim();
  const m = /^(\d{4})-(\d{1,2})(?:-(\d{1,2}))?/.exec(trimmed);
  if (m) {
    const month = Number(m[2]);
    if (month < 1 || month > 12) return null;
    return `${m[1]}-${String(month).padStart(2, "0")}`;
  }
  // US-style M/D/YYYY, common in utility exports.
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (us) {
    const month = Number(us[1]);
    if (month < 1 || month > 12) return null;
    return `${us[3]}-${String(month).padStart(2, "0")}`;
  }
  return null;
}

export function addMonths(month: string, n: number): string {
  const m = MONTH_RE.exec(month);
  if (!m) throw new Error(`Not a YYYY-MM month: ${month}`);
  const index = Number(m[1]) * 12 + (Number(m[2]) - 1) + n;
  const year = Math.floor(index / 12);
  const mon = (index % 12) + 1;
  return `${year}-${String(mon).padStart(2, "0")}`;
}

/** Inclusive list of months from start to end. */
export function monthRange(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addMonths(cur, 1);
  }
  return out;
}

export function daysInMonth(month: string): number {
  const m = MONTH_RE.exec(month);
  if (!m) throw new Error(`Not a YYYY-MM month: ${month}`);
  return new Date(Date.UTC(Number(m[1]), Number(m[2]), 0)).getUTCDate();
}

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonth(month: string): string {
  const m = MONTH_RE.exec(month);
  if (!m) return month;
  return `${MONTH_NAMES[Number(m[2]) - 1]} ${m[1]}`;
}
