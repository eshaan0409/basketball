export const CATEGORIES = [
  "Athletics",
  "Work (paid)",
  "Entrepreneurship",
  "Community service",
  "Arts and media",
  "Academic and research",
  "Leadership and government",
  "Other",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const RELATIONSHIPS = [
  { value: "supervisor", label: "Supervisor, coach or manager" },
  { value: "teacher", label: "Teacher, advisor or counselor" },
  { value: "client", label: "Client or customer" },
  { value: "peer", label: "Teammate or colleague" },
  { value: "other", label: "Someone else who saw the work" },
  { value: "family", label: "Family member" },
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number]["value"];

/** An extra, checkable statement beyond role, dates and time: "Raised $2,400", "Shot 40 varsity games". */
export interface CustomClaim {
  id: string;
  kind: "impact" | "revenue" | "award";
  text: string;
}

export interface Activity {
  id: string;
  category: Category;
  /** Position or role, e.g. "Founder and lead photographer". */
  position: string;
  organization: string;
  /** The organization's website domain, e.g. "natomasunified.org". Used to judge verifier emails. */
  orgDomain: string;
  /** YYYY-MM */
  startMonth: string;
  /** YYYY-MM, or null if ongoing. */
  endMonth: string | null;
  hoursPerWeek: number;
  weeksPerYear: number;
  description: string;
  claims: CustomClaim[];
  createdAt: string;
  updatedAt: string;
}

/** A statement exactly as it was sent to a verifier. */
export interface Statement {
  key: string;
  label: string;
  text: string;
}

export type Verdict = "confirmed" | "corrected" | "unknown";

export interface StatementResponse {
  key: string;
  verdict: Verdict;
  correction?: string;
}

export interface VerificationRequest {
  id: string;
  /** Secret in the verifier's link. Never shown on shared pages. */
  token: string;
  activityId: string;
  verifierName: string;
  verifierEmail: string;
  verifierTitle: string;
  relationship: Relationship;
  statements: Statement[];
  status: "pending" | "submitted" | "declined";
  createdAt: string;
  expiresAt: string;
  response?: {
    respondedAt: string;
    statements: StatementResponse[];
    comment: string;
    /** The verifier's own name and title as they confirmed them. */
    signedName: string;
    signedTitle: string;
  };
}

export interface ShareLink {
  token: string;
  createdAt: string;
  revokedAt: string | null;
  label: string;
}

export interface Profile {
  id: string;
  /** sha256 of the owner's secret. The secret itself lives only in the owner's cookie. */
  ownerHash: string;
  name: string;
  gradYear: number | null;
  school: string;
  activities: Activity[];
  requests: VerificationRequest[];
  shares: ShareLink[];
  createdAt: string;
}
