import { assessActivity, summarize, type ActivityAssurance, type ProfileSummary } from "./assurance";
import { reviewActivities, type Finding } from "./checks";
import type { Activity, Profile, ShareLink, VerificationRequest } from "./types";

export interface OwnerRequest {
  id: string;
  token: string;
  activityId: string;
  verifierName: string;
  verifierEmail: string;
  verifierTitle: string;
  relationship: VerificationRequest["relationship"];
  status: VerificationRequest["status"] | "expired";
  createdAt: string;
  expiresAt: string;
  respondedAt: string | null;
  comment: string;
}

export interface OwnerView {
  name: string;
  gradYear: number | null;
  school: string;
  activities: Activity[];
  assessments: ActivityAssurance[];
  requests: OwnerRequest[];
  shares: ShareLink[];
  findings: Finding[];
  summary: ProfileSummary;
}

function sortActivities(activities: Activity[], assessments: ActivityAssurance[]): Activity[] {
  const level = new Map(assessments.map((a) => [a.activityId, a.coreLevel]));
  return [...activities].sort(
    (a, b) => (level.get(b.id) ?? 0) - (level.get(a.id) ?? 0) || b.startMonth.localeCompare(a.startMonth),
  );
}

export function ownerView(profile: Profile, now = new Date()): OwnerView {
  const assessments = profile.activities.map((a) => assessActivity(a, profile.requests, now));
  const today = now.toISOString().slice(0, 7);
  return {
    name: profile.name,
    gradYear: profile.gradYear,
    school: profile.school,
    activities: profile.activities,
    assessments,
    requests: profile.requests.map((r) => ({
      id: r.id,
      token: r.token,
      activityId: r.activityId,
      verifierName: r.verifierName,
      verifierEmail: r.verifierEmail,
      verifierTitle: r.verifierTitle,
      relationship: r.relationship,
      status: r.status === "pending" && new Date(r.expiresAt) <= now ? "expired" : r.status,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
      respondedAt: r.response?.respondedAt ?? null,
      comment: r.response?.comment ?? "",
    })),
    shares: profile.shares,
    findings: reviewActivities(profile.activities, assessments, today),
    summary: summarize(assessments),
  };
}

/** What anyone holding a share link sees. No emails, no tokens, no internal ids beyond activity ids. */
export interface PublicActivity {
  id: string;
  category: Activity["category"];
  position: string;
  organization: string;
  description: string;
  assurance: ActivityAssurance;
}

export interface PublicView {
  name: string;
  gradYear: number | null;
  school: string;
  activities: PublicActivity[];
  summary: ProfileSummary;
}

export function publicView(profile: Profile, now = new Date()): PublicView {
  const assessments = profile.activities.map((a) => assessActivity(a, profile.requests, now));
  const byId = new Map(assessments.map((a) => [a.activityId, a]));
  return {
    name: profile.name,
    gradYear: profile.gradYear,
    school: profile.school,
    activities: sortActivities(profile.activities, assessments).map((a) => {
      const assurance = byId.get(a.id)!;
      return {
        id: a.id,
        category: a.category,
        position: a.position,
        organization: a.organization,
        description: a.description,
        assurance: { ...assurance, pendingRequests: 0 },
      };
    }),
    summary: summarize(assessments),
  };
}
