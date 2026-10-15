import { toMonth } from "./months";
import { GALLONS_PER_CCF } from "./units";
import type { Enrollment, Intervention, MeterRead, WeatherMonth } from "./types";

export interface ParseResult<T> {
  rows: T[];
  errors: string[];
}

const MAX_ERRORS = 20;

/** RFC 4180-style CSV: quoted fields, escaped quotes, CRLF or LF, optional BOM. */
export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) out.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) out.push(row);
  return out;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function findColumn(headers: string[], aliases: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const i = normalized.indexOf(alias);
    if (i !== -1) return i;
  }
  return -1;
}

function parseNumber(value: string | undefined): number {
  if (value === undefined) return NaN;
  const cleaned = value.trim().replace(/,/g, "");
  return cleaned === "" ? NaN : Number(cleaned);
}

function withTable<T>(
  text: string,
  build: (headers: string[], rows: string[][], errors: string[]) => T[],
): ParseResult<T> {
  const errors: string[] = [];
  const table = parseCsv(text);
  if (table.length === 0) return { rows: [], errors: ["The file is empty."] };
  const [headers, ...rows] = table;
  const result = build(headers, rows, errors);
  if (errors.length > MAX_ERRORS) {
    const extra = errors.length - MAX_ERRORS;
    errors.length = MAX_ERRORS;
    errors.push(`…and ${extra} more problem(s).`);
  }
  return { rows: result, errors };
}

const ACCOUNT_ALIASES = ["account_id", "account", "account_number", "meter_id", "service_id", "premise_id"];

/**
 * Columns: account_id, date (YYYY-MM-DD, YYYY-MM or M/D/YYYY), and gallons.
 * Usage in CCF/HCF (hundred cubic feet) is converted to gallons.
 */
export function parseMeterReads(text: string): ParseResult<MeterRead> {
  return withTable(text, (headers, rows, errors) => {
    const account = findColumn(headers, ACCOUNT_ALIASES);
    const date = findColumn(headers, ["date", "read_date", "period", "month", "billing_month", "usage_date"]);
    const gallons = findColumn(headers, ["gallons", "usage_gallons", "gal", "volume_gallons", "consumption_gallons"]);
    const ccf = findColumn(headers, ["ccf", "hcf", "usage_ccf", "usage_hcf"]);
    if (account === -1) errors.push("Missing an account column (account_id).");
    if (date === -1) errors.push("Missing a date column (date).");
    if (gallons === -1 && ccf === -1) errors.push("Missing a usage column (gallons, or ccf/hcf).");
    if (errors.length > 0) return [];

    const out: MeterRead[] = [];
    rows.forEach((row, i) => {
      const line = i + 2;
      const id = row[account]?.trim();
      const period = row[date]?.trim() ?? "";
      const month = toMonth(period);
      const volume = gallons !== -1 ? parseNumber(row[gallons]) : parseNumber(row[ccf]) * GALLONS_PER_CCF;
      if (!id) return void errors.push(`Row ${line}: missing account.`);
      if (!month) return void errors.push(`Row ${line}: "${period}" is not a date.`);
      if (!Number.isFinite(volume) || volume < 0) return void errors.push(`Row ${line}: usage is not a non-negative number.`);
      out.push({ accountId: id, period: /^\d{4}-\d{2}-\d{2}$/.test(period) ? period : month, gallons: volume });
    });
    return out;
  });
}

const INTERVENTION_ALIASES: Record<string, Intervention> = {
  smart_controller: "smart_controller",
  controller: "smart_controller",
  smart_irrigation_controller: "smart_controller",
  weather_based_controller: "smart_controller",
  turf_replacement: "turf_replacement",
  turf: "turf_replacement",
  lawn_replacement: "turf_replacement",
  cash_for_grass: "turf_replacement",
};

/** Columns: account_id, install_date, intervention (optional; unrecognized values become "other"). */
export function parseEnrollments(text: string): ParseResult<Enrollment> {
  return withTable(text, (headers, rows, errors) => {
    const account = findColumn(headers, ACCOUNT_ALIASES);
    const date = findColumn(headers, ["install_date", "installed_on", "date", "installation_date", "completion_date"]);
    const kind = findColumn(headers, ["intervention", "measure", "type", "program"]);
    if (account === -1) errors.push("Missing an account column (account_id).");
    if (date === -1) errors.push("Missing an install date column (install_date).");
    if (errors.length > 0) return [];

    const out: Enrollment[] = [];
    rows.forEach((row, i) => {
      const line = i + 2;
      const id = row[account]?.trim();
      const installDate = row[date]?.trim() ?? "";
      if (!id) return void errors.push(`Row ${line}: missing account.`);
      if (!toMonth(installDate)) return void errors.push(`Row ${line}: "${installDate}" is not a date.`);
      const raw = kind === -1 ? "" : normalizeHeader(row[kind] ?? "");
      out.push({ accountId: id, installDate, intervention: INTERVENTION_ALIASES[raw] ?? "other" });
    });
    return out;
  });
}

/** Columns: month, et0_in (reference evapotranspiration, inches), rain_in (inches). */
export function parseWeather(text: string): ParseResult<WeatherMonth> {
  return withTable(text, (headers, rows, errors) => {
    const month = findColumn(headers, ["month", "date", "period"]);
    const et0 = findColumn(headers, ["et0_in", "eto_in", "et0", "eto", "reference_et_in", "total_eto_in"]);
    const rain = findColumn(headers, ["rain_in", "precip_in", "rain", "precipitation_in", "total_precip_in"]);
    if (month === -1) errors.push("Missing a month column (month).");
    if (et0 === -1) errors.push("Missing an evapotranspiration column (et0_in).");
    if (rain === -1) errors.push("Missing a rainfall column (rain_in).");
    if (errors.length > 0) return [];

    const out: WeatherMonth[] = [];
    rows.forEach((row, i) => {
      const line = i + 2;
      const m = toMonth(row[month] ?? "");
      const e = parseNumber(row[et0]);
      const r = parseNumber(row[rain]);
      if (!m) return void errors.push(`Row ${line}: "${row[month]}" is not a month.`);
      if (!Number.isFinite(e) || e < 0) return void errors.push(`Row ${line}: ET0 is not a non-negative number.`);
      if (!Number.isFinite(r) || r < 0) return void errors.push(`Row ${line}: rain is not a non-negative number.`);
      out.push({ month: m, et0In: e, rainIn: r });
    });
    return out;
  });
}

function escapeField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  return [headers, ...rows].map((r) => r.map(escapeField).join(",")).join("\n") + "\n";
}
