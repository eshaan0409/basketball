export const GALLONS_PER_ACRE_FOOT = 325_851;
export const GALLONS_PER_CUBIC_METER = 264.172;
/** Utilities often bill in CCF / HCF: one hundred cubic feet. */
export const GALLONS_PER_CCF = 748.052;

export function gallonsToAcreFeet(gallons: number): number {
  return gallons / GALLONS_PER_ACRE_FOOT;
}

export function gallonsToCubicMeters(gallons: number): number {
  return gallons / GALLONS_PER_CUBIC_METER;
}
