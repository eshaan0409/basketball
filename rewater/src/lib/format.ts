import { gallonsToAcreFeet, gallonsToCubicMeters } from "./engine/units";

const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** 1,284 / 12.9K / 4.2M */
export function formatCompact(value: number): string {
  return Math.abs(value) < 1000 ? whole.format(value) : compact.format(value);
}

export function formatWhole(value: number): string {
  return whole.format(value);
}

export function formatGallons(gallons: number): string {
  return `${formatCompact(gallons)} gal`;
}

export function formatAcreFeet(gallons: number): string {
  const af = gallonsToAcreFeet(gallons);
  return `${af.toLocaleString("en-US", { maximumFractionDigits: af < 10 ? 2 : 1 })} acre-ft`;
}

export function formatCubicMeters(gallons: number): string {
  return `${formatCompact(gallonsToCubicMeters(gallons))} m³`;
}

export function formatPct(fraction: number, digits = 1): string {
  return `${(fraction * 100).toFixed(digits)}%`;
}
