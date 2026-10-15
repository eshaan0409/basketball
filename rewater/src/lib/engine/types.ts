export type Intervention = "smart_controller" | "turf_replacement" | "other";

export const INTERVENTION_LABELS: Record<Intervention, string> = {
  smart_controller: "Smart irrigation controller",
  turf_replacement: "Turf replacement",
  other: "Other outdoor measure",
};

/** One meter read. `period` is a day (YYYY-MM-DD) or a whole month (YYYY-MM). */
export interface MeterRead {
  accountId: string;
  period: string;
  gallons: number;
}

/** A home that received an outdoor water-saving measure. */
export interface Enrollment {
  accountId: string;
  /** YYYY-MM-DD */
  installDate: string;
  intervention: Intervention;
}

/** Monthly reference evapotranspiration and rainfall, in inches. */
export interface WeatherMonth {
  /** YYYY-MM */
  month: string;
  et0In: number;
  rainIn: number;
}

export interface VerifyInput {
  reads: MeterRead[];
  enrollments: Enrollment[];
  weather: WeatherMonth[];
}

export interface VerifyOptions {
  /** Share of rainfall that offsets irrigation demand. */
  effectiveRainFraction: number;
  /** Months of pre-install history a home needs before it can be verified. */
  minPreMonths: number;
  /** Number of lowest-use pre-period months averaged to estimate indoor use. */
  indoorBaselineMonths: number;
  /** Homes whose outdoor use explains less than this share of variance are excluded. */
  minModelR2: number;
  bootstrapIterations: number;
  /** Two-sided confidence level for the interval, e.g. 0.9. */
  confidence: number;
  seed: number;
}

export const DEFAULT_OPTIONS: VerifyOptions = {
  effectiveRainFraction: 0.75,
  minPreMonths: 12,
  indoorBaselineMonths: 3,
  minModelR2: 0.5,
  bootstrapIterations: 1000,
  confidence: 0.9,
  seed: 42,
};

export type Group = "treatment" | "control";

export interface AccountResult {
  accountId: string;
  group: Group;
  intervention?: Intervention;
  /** YYYY-MM the measure went in (treatment homes only). */
  installMonth?: string;
  preMonths: number;
  postMonths: number;
  indoorBaselineGallonsPerMonth: number;
  modelIntercept: number;
  modelSlope: number;
  modelR2: number;
  /** Expected minus actual use after install, before the control adjustment. */
  grossSavingsGallons: number;
  /** Savings after subtracting the control group's change in the same months. */
  netSavingsGallons: number;
  /** Net savings over this home's first 12 post-install months, if it has 12. */
  firstYearNetSavingsGallons: number | null;
  /** Net savings as a share of expected use in the post period. */
  netSavingsPct: number;
}

export interface ExcludedAccount {
  accountId: string;
  group: Group;
  reason: string;
}

export interface MonthlyPoint {
  month: string;
  treatmentActualAvg: number | null;
  treatmentExpectedAvg: number | null;
  controlActualAvg: number | null;
  controlExpectedAvg: number | null;
  /** Average control home's expected minus actual, for months after program start. */
  controlAdjustmentPerHome: number | null;
  /** Program-wide net savings in this month (treatment homes past install). */
  netSavingsGallons: number;
}

export interface Interval {
  low: number;
  high: number;
}

export interface VerifyResult {
  options: VerifyOptions;
  programStartMonth: string | null;
  measurementStartMonth: string | null;
  measurementEndMonth: string | null;
  treatment: AccountResult[];
  control: AccountResult[];
  excluded: ExcludedAccount[];
  monthly: MonthlyPoint[];
  totals: {
    grossSavingsGallons: number;
    controlAdjustmentGallons: number;
    netSavingsGallons: number;
    netSavingsInterval: Interval;
    /** The volume we would sell: the lower bound of the interval, never below zero. */
    creditableGallons: number;
    firstYear: {
      homes: number;
      netSavingsGallons: number;
      interval: Interval;
      creditableGallons: number;
    } | null;
    expectedPostUseGallons: number;
    netSavingsPct: number;
  };
  interventionCounts: Partial<Record<Intervention, number>>;
  warnings: string[];
}
