import { statementsFor } from "./statements";
import type { Activity, Relationship, StatementResponse, VerificationRequest } from "./types";

/**
 * How much a reader should trust a statement.
 * 0 self-reported · 1 confirmed by a named person · 2 confirmed by someone at the organization.
 */
export type AssuranceLevel = 0 | 1 | 2;

export const LEVEL_LABELS: Record<AssuranceLevel, string> = {
  0: "Self-reported",
  1: "Confirmed by a named person",
  2: "Confirmed by the organization",
};

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "mail.com",
  "zoho.com",
  "yandex.com",
]);

export type EmailKind = "organization" | "personal" | "other" | "invalid";

export function emailDomain(email: string): string | null {
  const m = /^[^\s@]+@([^\s@]+\.[^\s@]+)$/.exec(email.trim().toLowerCase());
  return m ? m[1] : null;
}

/** Normalize "https://www.Example.org/about" or "example.org" to "example.org". */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[/?#].*$/, "")
    .replace(/\.$/, "");
}

/** Is the verifier's email at the organization's domain (or a subdomain of it)? */
export function classifyEmail(email: string, orgDomain: string): EmailKind {
  const domain = emailDomain(email);
  if (!domain) return "invalid";
  const org = normalizeDomain(orgDomain);
  // A free email provider is never an organization, or every Gmail user could vouch "as the organization".
  if (org && !FREE_EMAIL_DOMAINS.has(org) && (domain === org || domain.endsWith(`.${org}`))) return "organization";
  if (FREE_EMAIL_DOMAINS.has(domain)) return "personal";
  return "other";
}

export interface VerifierCheck {
  ok: boolean;
  /** The level a confirmation from this verifier can reach. */
  maxLevel: AssuranceLevel;
  notes: string[];
}

/** Can this person verify this activity, and how strong will their confirmation be? */
export function checkVerifier(input: {
  email: string;
  relationship: Relationship;
  orgDomain: string;
  name: string;
}): VerifierCheck {
  const notes: string[] = [];
  if (!input.name.trim()) return { ok: false, maxLevel: 0, notes: ["Add the verifier's full name."] };
  const kind = classifyEmail(input.email, input.orgDomain);
  if (kind === "invalid") return { ok: false, maxLevel: 0, notes: ["That email address doesn't look right."] };
  if (input.relationship === "family") {
    return {
      ok: false,
      maxLevel: 0,
      notes: ["Family members can't verify activities. Ask a coach, supervisor, teacher or client instead."],
    };
  }
  if (kind === "organization") {
    if (input.relationship === "peer") {
      notes.push("A teammate or colleague counts as a named person. A supervisor at the same address counts as the organization.");
      return { ok: true, maxLevel: 1, notes };
    }
    return { ok: true, maxLevel: 2, notes };
  }
  if (kind === "personal") {
    notes.push(
      input.orgDomain
        ? `This is a personal address, not one at ${normalizeDomain(input.orgDomain)}, so it will show as confirmed by a named person.`
        : "Add the organization's website so a work address can count as the organization.",
    );
  } else {
    notes.push(
      input.orgDomain
        ? `This address isn't at ${normalizeDomain(input.orgDomain)}, so it will show as confirmed by a named person.`
        : "Add the organization's website so a work address can count as the organization.",
    );
  }
  return { ok: true, maxLevel: 1, notes };
}

export interface StatementAssurance {
  key: string;
  label: string;
  /** What the student claims now. */
  claimed: string;
  /** What a reader should see: the verifier's correction if there was one. */
  shown: string;
  level: AssuranceLevel;
  corrected: boolean;
  /** Verified earlier, but the student has since changed the wording. */
  changedSinceVerified: boolean;
  verifiedBy?: {
    name: string;
    title: string;
    organization: string;
    respondedAt: string;
    emailKind: EmailKind;
    /** The domain the verifier answered from, so readers can judge it themselves. Never the full address. */
    emailDomain: string;
  };
}

export interface ActivityAssurance {
  activityId: string;
  statements: StatementAssurance[];
  /** The weakest level across role, dates and time: an activity is only as verified as its core facts. */
  coreLevel: AssuranceLevel;
  pendingRequests: number;
}

function levelFor(request: VerificationRequest, orgDomain: string): AssuranceLevel {
  const check = checkVerifier({
    email: request.verifierEmail,
    relationship: request.relationship,
    orgDomain,
    name: request.verifierName,
  });
  return check.ok ? check.maxLevel : 0;
}

export function assessActivity(activity: Activity, requests: VerificationRequest[], now = new Date()): ActivityAssurance {
  const mine = requests
    .filter((r) => r.activityId === activity.id)
    .sort((a, b) => (a.response?.respondedAt ?? "").localeCompare(b.response?.respondedAt ?? ""));
  const submitted = mine.filter((r) => r.status === "submitted" && r.response);

  const statements = statementsFor(activity).map((s): StatementAssurance => {
    let best: StatementAssurance = {
      key: s.key,
      label: s.label,
      claimed: s.text,
      shown: s.text,
      level: 0,
      corrected: false,
      changedSinceVerified: false,
    };
    let sawOldWording = false;
    for (const r of submitted) {
      const sent = r.statements.find((x) => x.key === s.key);
      const answer = r.response!.statements.find((x: StatementResponse) => x.key === s.key);
      if (!sent || !answer || answer.verdict === "unknown") continue;
      // A student who adopts the verifier's exact correction keeps the verification.
      const adoptedCorrection = answer.verdict === "corrected" && answer.correction?.trim() === s.text;
      if (sent.text !== s.text && !adoptedCorrection) {
        sawOldWording = true;
        continue;
      }
      const level = levelFor(r, activity.orgDomain);
      if (level === 0) continue;
      const corrected = answer.verdict === "corrected" && !!answer.correction?.trim() && !adoptedCorrection;
      // A correction from a stronger verifier beats a confirmation from a weaker one; ties go to the latest.
      if (level >= best.level) {
        best = {
          ...best,
          shown: corrected ? answer.correction!.trim() : s.text,
          level,
          corrected,
          verifiedBy: {
            name: r.response!.signedName || r.verifierName,
            title: r.response!.signedTitle || r.verifierTitle,
            organization: activity.organization,
            respondedAt: r.response!.respondedAt,
            emailKind: classifyEmail(r.verifierEmail, activity.orgDomain),
            emailDomain: emailDomain(r.verifierEmail) ?? "",
          },
        };
      }
    }
    best.changedSinceVerified = best.level === 0 && sawOldWording;
    return best;
  });

  const core = statements.filter((s) => s.key === "role" || s.key === "dates" || s.key === "time");
  const coreLevel = core.reduce<AssuranceLevel>((min, s) => (s.level < min ? s.level : min), 2);

  return {
    activityId: activity.id,
    statements,
    coreLevel,
    pendingRequests: mine.filter((r) => r.status === "pending" && new Date(r.expiresAt) > now).length,
  };
}

export interface ProfileSummary {
  activities: number;
  organizationConfirmed: number;
  personConfirmed: number;
  selfReported: number;
}

export function summarize(assessments: ActivityAssurance[]): ProfileSummary {
  return {
    activities: assessments.length,
    organizationConfirmed: assessments.filter((a) => a.coreLevel === 2).length,
    personConfirmed: assessments.filter((a) => a.coreLevel === 1).length,
    selfReported: assessments.filter((a) => a.coreLevel === 0).length,
  };
}
