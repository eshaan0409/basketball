import { createHash, randomBytes } from "node:crypto";
import { checkVerifier, normalizeDomain } from "./assurance";
import { statementsFor } from "./statements";
import type { Store } from "./store";
import {
  CATEGORIES,
  RELATIONSHIPS,
  type Activity,
  type Category,
  type CustomClaim,
  type Profile,
  type Relationship,
  type ShareLink,
  type StatementResponse,
  type VerificationRequest,
} from "./types";

export class ServiceError extends Error {
  constructor(
    message: string,
    readonly status = 400,
  ) {
    super(message);
  }
}

export const REQUEST_TTL_DAYS = 30;
const MAX_PENDING_PER_ACTIVITY = 5;
const MAX_ACTIVE_SHARES = 10;
const MAX_ACTIVITIES = 30;

export function newToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function num(value: unknown, min: number, max: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n * 10) / 10));
}

function month(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value) ? value : null;
}

// ---------- profiles ----------

export async function createProfile(store: Store, input: { name?: unknown; gradYear?: unknown; school?: unknown }, now = new Date()) {
  const name = str(input.name, 80);
  if (!name) throw new ServiceError("Add your name.");
  const secret = newToken(32);
  const gradYear = Number(input.gradYear);
  const profile: Profile = {
    id: newToken(12),
    ownerHash: hashSecret(secret),
    name,
    gradYear: Number.isInteger(gradYear) && gradYear >= 2000 && gradYear <= 2100 ? gradYear : null,
    school: str(input.school, 120),
    activities: [],
    requests: [],
    shares: [],
    createdAt: now.toISOString(),
  };
  await store.save(profile);
  return { profile, secret };
}

export async function requireOwner(store: Store, secret: string | undefined | null): Promise<Profile> {
  if (!secret) throw new ServiceError("Not signed in.", 401);
  const profile = await store.getByOwnerHash(hashSecret(secret));
  if (!profile) throw new ServiceError("Not signed in.", 401);
  return profile;
}

export async function updateProfile(store: Store, profile: Profile, input: Record<string, unknown>) {
  if ("name" in input) {
    const name = str(input.name, 80);
    if (!name) throw new ServiceError("Your name can't be empty.");
    profile.name = name;
  }
  if ("school" in input) profile.school = str(input.school, 120);
  if ("gradYear" in input) {
    const y = Number(input.gradYear);
    profile.gradYear = Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : null;
  }
  await store.save(profile);
  return profile;
}

// ---------- activities ----------

function readClaims(value: unknown, existing: CustomClaim[] = []): CustomClaim[] {
  if (!Array.isArray(value)) return existing;
  return value
    .slice(0, 6)
    .map((c): CustomClaim | null => {
      const kind = c?.kind === "revenue" || c?.kind === "award" ? c.kind : "impact";
      const text = str(c?.text, 200);
      if (!text) return null;
      const id = typeof c?.id === "string" && /^[A-Za-z0-9_-]{4,40}$/.test(c.id) ? c.id : newToken(6);
      return { id, kind, text };
    })
    .filter((c): c is CustomClaim => c !== null);
}

function readActivity(input: Record<string, unknown>, base?: Activity, now = new Date()): Activity {
  const category = (CATEGORIES as readonly string[]).includes(input.category as string)
    ? (input.category as Category)
    : (base?.category ?? "Other");
  const position = "position" in input ? str(input.position, 120) : (base?.position ?? "");
  const organization = "organization" in input ? str(input.organization, 160) : (base?.organization ?? "");
  if (!position) throw new ServiceError("Add your position or role.");
  if (!organization) throw new ServiceError("Add the organization's name.");
  const startMonth = "startMonth" in input ? month(input.startMonth) : (base?.startMonth ?? null);
  if (!startMonth) throw new ServiceError("Add a start month.");
  const endMonth = "endMonth" in input ? (input.endMonth ? month(input.endMonth) : null) : (base?.endMonth ?? null);
  if (input.endMonth && !endMonth) throw new ServiceError("The end month isn't a valid month.");
  return {
    id: base?.id ?? newToken(8),
    category,
    position,
    organization,
    orgDomain: "orgDomain" in input ? normalizeDomain(str(input.orgDomain, 253)) : (base?.orgDomain ?? ""),
    startMonth,
    endMonth,
    hoursPerWeek: "hoursPerWeek" in input ? num(input.hoursPerWeek, 0, 100) : (base?.hoursPerWeek ?? 0),
    weeksPerYear: "weeksPerYear" in input ? num(input.weeksPerYear, 0, 52) : (base?.weeksPerYear ?? 0),
    description: "description" in input ? str(input.description, 1000) : (base?.description ?? ""),
    claims: "claims" in input ? readClaims(input.claims, base?.claims) : (base?.claims ?? []),
    createdAt: base?.createdAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function addActivity(store: Store, profile: Profile, input: Record<string, unknown>, now = new Date()) {
  if (profile.activities.length >= MAX_ACTIVITIES) throw new ServiceError(`You can list up to ${MAX_ACTIVITIES} activities.`);
  const activity = readActivity(input, undefined, now);
  profile.activities.push(activity);
  await store.save(profile);
  return activity;
}

export async function updateActivity(store: Store, profile: Profile, id: string, input: Record<string, unknown>, now = new Date()) {
  const i = profile.activities.findIndex((a) => a.id === id);
  if (i === -1) throw new ServiceError("That activity doesn't exist.", 404);
  profile.activities[i] = readActivity(input, profile.activities[i], now);
  await store.save(profile);
  return profile.activities[i];
}

export async function deleteActivity(store: Store, profile: Profile, id: string) {
  if (!profile.activities.some((a) => a.id === id)) throw new ServiceError("That activity doesn't exist.", 404);
  profile.activities = profile.activities.filter((a) => a.id !== id);
  profile.requests = profile.requests.filter((r) => r.activityId !== id);
  await store.save(profile);
}

// ---------- verification ----------

export async function createRequest(
  store: Store,
  profile: Profile,
  activityId: string,
  input: Record<string, unknown>,
  now = new Date(),
): Promise<VerificationRequest> {
  const activity = profile.activities.find((a) => a.id === activityId);
  if (!activity) throw new ServiceError("That activity doesn't exist.", 404);
  const relationship = RELATIONSHIPS.some((r) => r.value === input.relationship) ? (input.relationship as Relationship) : null;
  if (!relationship) throw new ServiceError("Say how this person knows your work.");
  const verifierName = str(input.verifierName, 100);
  const verifierEmail = str(input.verifierEmail, 200).toLowerCase();
  const check = checkVerifier({ email: verifierEmail, relationship, orgDomain: activity.orgDomain, name: verifierName });
  if (!check.ok) throw new ServiceError(check.notes[0]);
  const pending = profile.requests.filter(
    (r) => r.activityId === activityId && r.status === "pending" && new Date(r.expiresAt) > now,
  );
  if (pending.length >= MAX_PENDING_PER_ACTIVITY) {
    throw new ServiceError("This activity already has five open requests. Wait for answers first.");
  }
  if (pending.some((r) => r.verifierEmail === verifierEmail)) {
    throw new ServiceError("You already asked this person. Their link is in the list below.");
  }

  const all = statementsFor(activity);
  const keys = Array.isArray(input.statementKeys) ? new Set(input.statementKeys.filter((k) => typeof k === "string")) : null;
  const statements = keys ? all.filter((s) => keys.has(s.key)) : all;
  if (statements.length === 0) throw new ServiceError("Pick at least one thing to verify.");

  const request: VerificationRequest = {
    id: newToken(8),
    token: newToken(24),
    activityId,
    verifierName,
    verifierEmail,
    verifierTitle: str(input.verifierTitle, 100),
    relationship,
    statements,
    status: "pending",
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + REQUEST_TTL_DAYS * 86_400_000).toISOString(),
  };
  profile.requests.push(request);
  await store.save(profile);
  return request;
}

export async function cancelRequest(store: Store, profile: Profile, requestId: string) {
  const request = profile.requests.find((r) => r.id === requestId);
  if (!request) throw new ServiceError("That request doesn't exist.", 404);
  if (request.status !== "pending") throw new ServiceError("Only open requests can be withdrawn.");
  profile.requests = profile.requests.filter((r) => r.id !== requestId);
  await store.save(profile);
}

/** What the verifier's page needs. Deliberately excludes everything else on the profile. */
export interface VerifierView {
  studentName: string;
  school: string;
  activity: Pick<Activity, "position" | "organization" | "category" | "description">;
  verifierName: string;
  verifierTitle: string;
  statements: VerificationRequest["statements"];
  status: VerificationRequest["status"] | "expired";
  expiresAt: string;
}

export async function getRequestForVerifier(store: Store, token: string, now = new Date()): Promise<VerifierView> {
  const profile = await store.getByRequestToken(token);
  const request = profile?.requests.find((r) => r.token === token);
  const activity = profile?.activities.find((a) => a.id === request?.activityId);
  if (!profile || !request || !activity) throw new ServiceError("This link isn't valid. It may have been withdrawn.", 404);
  const expired = request.status === "pending" && new Date(request.expiresAt) <= now;
  return {
    studentName: profile.name,
    school: profile.school,
    activity: {
      position: activity.position,
      organization: activity.organization,
      category: activity.category,
      description: activity.description,
    },
    verifierName: request.verifierName,
    verifierTitle: request.verifierTitle,
    statements: request.statements,
    status: expired ? "expired" : request.status,
    expiresAt: request.expiresAt,
  };
}

export async function submitResponse(store: Store, token: string, input: Record<string, unknown>, now = new Date()) {
  const profile = await store.getByRequestToken(token);
  const request = profile?.requests.find((r) => r.token === token);
  if (!profile || !request) throw new ServiceError("This link isn't valid. It may have been withdrawn.", 404);
  if (request.status !== "pending") throw new ServiceError("This request has already been answered.", 409);
  if (new Date(request.expiresAt) <= now) throw new ServiceError("This request has expired. Ask the student to send a new one.", 410);

  if (input.decline === true) {
    request.status = "declined";
    request.response = {
      respondedAt: now.toISOString(),
      statements: [],
      comment: str(input.comment, 500),
      signedName: str(input.signedName, 100),
      signedTitle: str(input.signedTitle, 100),
    };
    await store.save(profile);
    return request;
  }

  if (input.attest !== true) throw new ServiceError("Please confirm that your answers are accurate to your knowledge.");
  const signedName = str(input.signedName, 100);
  if (!signedName) throw new ServiceError("Type your full name to sign.");
  const answers = Array.isArray(input.statements) ? input.statements : [];
  const responses: StatementResponse[] = request.statements.map((s) => {
    const a = answers.find((x: { key?: unknown }) => x?.key === s.key) as Record<string, unknown> | undefined;
    const verdict = a?.verdict === "confirmed" || a?.verdict === "corrected" || a?.verdict === "unknown" ? a.verdict : null;
    if (!verdict) throw new ServiceError(`Answer every statement ("${s.label}" is missing).`);
    const correction = str(a?.correction, 200);
    if (verdict === "corrected" && !correction) throw new ServiceError(`Write the correct version of "${s.label}".`);
    return verdict === "corrected" ? { key: s.key, verdict, correction } : { key: s.key, verdict };
  });

  request.status = "submitted";
  request.response = {
    respondedAt: now.toISOString(),
    statements: responses,
    comment: str(input.comment, 500),
    signedName,
    signedTitle: str(input.signedTitle, 100),
  };
  await store.save(profile);
  return request;
}

/** Replace a custom claim's text with a verifier's correction, keeping the verification. */
export async function acceptCorrection(store: Store, profile: Profile, activityId: string, statementKey: string, now = new Date()) {
  const activity = profile.activities.find((a) => a.id === activityId);
  if (!activity) throw new ServiceError("That activity doesn't exist.", 404);
  if (!statementKey.startsWith("claim:")) {
    throw new ServiceError("Edit the role, dates or hours directly, then ask again.");
  }
  const claim = activity.claims.find((c) => `claim:${c.id}` === statementKey);
  if (!claim) throw new ServiceError("That statement doesn't exist.", 404);
  const correction = profile.requests
    .filter((r) => r.activityId === activityId && r.status === "submitted" && r.response)
    .sort((a, b) => b.response!.respondedAt.localeCompare(a.response!.respondedAt))
    .flatMap((r) => r.response!.statements)
    .find((s) => s.key === statementKey && s.verdict === "corrected" && s.correction)?.correction;
  if (!correction) throw new ServiceError("There's no correction to accept.");
  claim.text = correction;
  activity.updatedAt = now.toISOString();
  await store.save(profile);
  return activity;
}

// ---------- sharing ----------

export async function createShare(store: Store, profile: Profile, input: { label?: unknown }, now = new Date()): Promise<ShareLink> {
  if (profile.shares.filter((s) => !s.revokedAt).length >= MAX_ACTIVE_SHARES) {
    throw new ServiceError(`You can have ${MAX_ACTIVE_SHARES} active links. Turn one off first.`);
  }
  const share: ShareLink = { token: newToken(18), createdAt: now.toISOString(), revokedAt: null, label: str(input.label, 60) || "Shared link" };
  profile.shares.push(share);
  await store.save(profile);
  return share;
}

export async function revokeShare(store: Store, profile: Profile, token: string, now = new Date()) {
  const share = profile.shares.find((s) => s.token === token);
  if (!share) throw new ServiceError("That link doesn't exist.", 404);
  share.revokedAt = share.revokedAt ?? now.toISOString();
  await store.save(profile);
}

export async function getSharedProfile(store: Store, token: string): Promise<Profile> {
  const profile = await store.getByShareToken(token);
  const share = profile?.shares.find((s) => s.token === token);
  if (!profile || !share || share.revokedAt) throw new ServiceError("This link isn't active.", 404);
  return profile;
}
