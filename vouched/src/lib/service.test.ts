import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  acceptCorrection,
  addActivity,
  cancelRequest,
  createProfile,
  createRequest,
  createShare,
  getRequestForVerifier,
  getSharedProfile,
  requireOwner,
  revokeShare,
  ServiceError,
  submitResponse,
  updateActivity,
} from "./service";
import { FileStore, MemoryStore } from "./store";
import { ownerView, publicView } from "./views";

const photo = {
  category: "Entrepreneurship",
  position: "Founder, sports photographer",
  organization: "Natomas Unified athletics",
  orgDomain: "https://www.natomasunified.org/",
  startMonth: "2024-08",
  endMonth: "",
  hoursPerWeek: 8,
  weeksPerYear: 36,
  description: "Game photos for two high schools.",
  claims: [{ kind: "impact", text: "Shot 41 varsity games" }],
};

async function setup() {
  const store = new MemoryStore();
  const { profile, secret } = await createProfile(store, { name: "Test Student", gradYear: 2028, school: "Inderkum" });
  const activity = await addActivity(store, profile, photo);
  return { store, secret, activityId: activity.id };
}

const confirmAll = (view: Awaited<ReturnType<typeof getRequestForVerifier>>) => ({
  attest: true,
  signedName: "Dana Ortiz",
  signedTitle: "Athletic Director",
  statements: view.statements.map((s) => ({ key: s.key, verdict: "confirmed" })),
});

describe("profile and activity", () => {
  it("authenticates by secret and normalizes input", async () => {
    const { store, secret } = await setup();
    const profile = await requireOwner(store, secret);
    expect(profile.activities[0].orgDomain).toBe("natomasunified.org");
    expect(profile.activities[0].endMonth).toBeNull();
    await expect(requireOwner(store, "wrong")).rejects.toBeInstanceOf(ServiceError);
    await expect(requireOwner(store, undefined)).rejects.toMatchObject({ status: 401 });
  });

  it("rejects activities without the essentials", async () => {
    const { store, secret } = await setup();
    const profile = await requireOwner(store, secret);
    await expect(addActivity(store, profile, { ...photo, position: " " })).rejects.toThrow("position");
    await expect(addActivity(store, profile, { ...photo, startMonth: "2024-13" })).rejects.toThrow("start month");
  });
});

describe("verification flow", () => {
  it("goes from request to organization-confirmed and shows up on a shared page without private data", async () => {
    const { store, secret, activityId } = await setup();
    let profile = await requireOwner(store, secret);
    const request = await createRequest(store, profile, activityId, {
      verifierName: "Dana Ortiz",
      verifierEmail: "DOrtiz@Natomasunified.org",
      verifierTitle: "Athletic Director",
      relationship: "supervisor",
    });
    expect(request.statements.map((s) => s.key)).toEqual(["role", "dates", "time", `claim:${profile.activities[0].claims[0].id}`]);

    const view = await getRequestForVerifier(store, request.token);
    expect(view.status).toBe("pending");
    expect(JSON.stringify(view)).not.toContain("ownerHash");
    await submitResponse(store, request.token, confirmAll(view));

    profile = await requireOwner(store, secret);
    const owner = ownerView(profile);
    expect(owner.assessments[0].coreLevel).toBe(2);
    expect(owner.requests[0].status).toBe("submitted");

    const share = await createShare(store, profile, { label: "UC application" });
    const shared = publicView(await getSharedProfile(store, share.token));
    const json = JSON.stringify(shared);
    expect(json).not.toContain("natomasunified.org\"");
    expect(json).not.toContain("dortiz@");
    expect(json).not.toContain(request.token);
    expect(json).not.toContain(profile.ownerHash);
    expect(shared.summary.organizationConfirmed).toBe(1);

    await revokeShare(store, profile, share.token);
    await expect(getSharedProfile(store, share.token)).rejects.toMatchObject({ status: 404 });
  });

  it("refuses family verifiers and duplicate asks", async () => {
    const { store, secret, activityId } = await setup();
    const profile = await requireOwner(store, secret);
    await expect(
      createRequest(store, profile, activityId, { verifierName: "Mom", verifierEmail: "mom@gmail.com", relationship: "family" }),
    ).rejects.toThrow("Family");
    await createRequest(store, profile, activityId, { verifierName: "A", verifierEmail: "a@gmail.com", relationship: "client" });
    await expect(
      createRequest(store, profile, activityId, { verifierName: "A", verifierEmail: "a@gmail.com", relationship: "client" }),
    ).rejects.toThrow("already asked");
  });

  it("answers once, rejects late answers, and requires every statement", async () => {
    const { store, secret, activityId } = await setup();
    const profile = await requireOwner(store, secret);
    const created = new Date("2026-01-01T00:00:00Z");
    const request = await createRequest(
      store,
      profile,
      activityId,
      { verifierName: "A", verifierEmail: "a@gmail.com", relationship: "client" },
      created,
    );
    const view = await getRequestForVerifier(store, request.token, created);
    await expect(
      submitResponse(store, request.token, { attest: true, signedName: "A", statements: [] }, created),
    ).rejects.toThrow("Answer every statement");
    await expect(submitResponse(store, request.token, { ...confirmAll(view), attest: false }, created)).rejects.toThrow("accurate");

    const late = new Date("2026-03-01T00:00:00Z");
    expect((await getRequestForVerifier(store, request.token, late)).status).toBe("expired");
    await expect(submitResponse(store, request.token, confirmAll(view), late)).rejects.toMatchObject({ status: 410 });

    await submitResponse(store, request.token, confirmAll(view), created);
    await expect(submitResponse(store, request.token, confirmAll(view), created)).rejects.toMatchObject({ status: 409 });
  });

  it("lets a verifier decline", async () => {
    const { store, secret, activityId } = await setup();
    const profile = await requireOwner(store, secret);
    const request = await createRequest(store, profile, activityId, { verifierName: "A", verifierEmail: "a@x.org", relationship: "other" });
    await submitResponse(store, request.token, { decline: true, comment: "I don't know this student." });
    const owner = ownerView(await requireOwner(store, secret));
    expect(owner.requests[0].status).toBe("declined");
    expect(owner.assessments[0].coreLevel).toBe(0);
  });

  it("accepting a correction keeps the claim verified; editing it drops verification", async () => {
    const { store, secret, activityId } = await setup();
    let profile = await requireOwner(store, secret);
    const claimKey = `claim:${profile.activities[0].claims[0].id}`;
    const request = await createRequest(store, profile, activityId, {
      verifierName: "Dana",
      verifierEmail: "d@natomasunified.org",
      relationship: "supervisor",
    });
    const view = await getRequestForVerifier(store, request.token);
    await submitResponse(store, request.token, {
      ...confirmAll(view),
      statements: view.statements.map((s) =>
        s.key === claimKey ? { key: s.key, verdict: "corrected", correction: "Shot 30 varsity games" } : { key: s.key, verdict: "confirmed" },
      ),
    });

    profile = await requireOwner(store, secret);
    let claim = ownerView(profile).assessments[0].statements.find((s) => s.key === claimKey)!;
    expect(claim.corrected).toBe(true);
    expect(claim.shown).toBe("Shot 30 varsity games");

    await acceptCorrection(store, profile, activityId, claimKey);
    profile = await requireOwner(store, secret);
    claim = ownerView(profile).assessments[0].statements.find((s) => s.key === claimKey)!;
    expect(claim).toMatchObject({ level: 2, corrected: false, claimed: "Shot 30 varsity games" });

    await updateActivity(store, profile, activityId, { hoursPerWeek: 20 });
    profile = await requireOwner(store, secret);
    const owner = ownerView(profile);
    expect(owner.assessments[0].coreLevel).toBe(0);
    expect(owner.findings.some((f) => f.message.includes("after it was verified"))).toBe(true);
  });

  it("withdraws open requests and invalidates their links", async () => {
    const { store, secret, activityId } = await setup();
    const profile = await requireOwner(store, secret);
    const request = await createRequest(store, profile, activityId, { verifierName: "A", verifierEmail: "a@x.org", relationship: "other" });
    await cancelRequest(store, profile, request.id);
    await expect(getRequestForVerifier(store, request.token)).rejects.toMatchObject({ status: 404 });
  });
});

describe("FileStore", () => {
  it("persists across instances", async () => {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "vouched-")), "data.json");
    const a = new FileStore(file);
    const { secret } = await createProfile(a, { name: "Persisted" });
    const b = new FileStore(file);
    expect((await requireOwner(b, secret)).name).toBe("Persisted");
    expect(JSON.parse(readFileSync(file, "utf8")).profiles).toHaveLength(1);
  });
});
