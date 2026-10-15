import { describe, expect, it } from "vitest";
import { assessActivity, checkVerifier, classifyEmail, normalizeDomain, summarize } from "./assurance";
import { demoProfile } from "./demo";

describe("normalizeDomain", () => {
  it("strips scheme, www, paths and case", () => {
    expect(normalizeDomain("https://www.Example.org/about?x=1")).toBe("example.org");
    expect(normalizeDomain(" natomasunified.org ")).toBe("natomasunified.org");
  });
});

describe("classifyEmail", () => {
  it("recognizes organization, subdomain, personal and other addresses", () => {
    expect(classifyEmail("coach@natomasunified.org", "natomasunified.org")).toBe("organization");
    expect(classifyEmail("coach@inderkum.natomasunified.org", "natomasunified.org")).toBe("organization");
    expect(classifyEmail("coach@gmail.com", "natomasunified.org")).toBe("personal");
    expect(classifyEmail("coach@other.org", "natomasunified.org")).toBe("other");
    expect(classifyEmail("not an email", "x.org")).toBe("invalid");
  });

  it("does not let a look-alike domain pass", () => {
    expect(classifyEmail("a@evilnatomasunified.org", "natomasunified.org")).toBe("other");
  });
});

describe("checkVerifier", () => {
  it("rejects family members", () => {
    const r = checkVerifier({ email: "mom@school.org", relationship: "family", orgDomain: "school.org", name: "Mom" });
    expect(r.ok).toBe(false);
  });

  it("gives organization level only to non-peers at the org domain", () => {
    expect(checkVerifier({ email: "boss@co.com", relationship: "supervisor", orgDomain: "co.com", name: "B" }).maxLevel).toBe(2);
    expect(checkVerifier({ email: "pal@co.com", relationship: "peer", orgDomain: "co.com", name: "P" }).maxLevel).toBe(1);
    expect(checkVerifier({ email: "boss@gmail.com", relationship: "supervisor", orgDomain: "co.com", name: "B" }).maxLevel).toBe(1);
  });

  it("requires a name and a valid email", () => {
    expect(checkVerifier({ email: "x@co.com", relationship: "client", orgDomain: "", name: " " }).ok).toBe(false);
    expect(checkVerifier({ email: "nope", relationship: "client", orgDomain: "", name: "N" }).ok).toBe(false);
  });
});

describe("assessActivity on the demo profile", () => {
  const profile = demoProfile();
  const byId = (id: string) => assessActivity(profile.activities.find((a) => a.id === id)!, profile.requests);

  it("rates the photo business as organization-confirmed and leaves revenue self-reported", () => {
    const a = byId("act-photo");
    expect(a.coreLevel).toBe(2);
    const revenue = a.statements.find((s) => s.key === "claim:c-rev")!;
    expect(revenue.level).toBe(0);
    const games = a.statements.find((s) => s.key === "claim:c-games")!;
    expect(games.level).toBe(2);
    expect(games.verifiedBy?.name).toBe("Dana Ortiz");
  });

  it("shows the verifier's correction instead of the student's claim", () => {
    const a = byId("act-foodbank");
    const s = a.statements.find((x) => x.key === "claim:c-train")!;
    expect(s.corrected).toBe(true);
    expect(s.shown).toBe("Trained about 15 new volunteers");
    expect(s.claimed).toBe("Trained 25 new volunteers");
  });

  it("marks an activity with no requests as self-reported", () => {
    expect(byId("act-debate").coreLevel).toBe(0);
  });

  it("summarizes levels", () => {
    const s = summarize(profile.activities.map((a) => assessActivity(a, profile.requests)));
    expect(s).toEqual({ activities: 4, organizationConfirmed: 3, personConfirmed: 0, selfReported: 1 });
  });

  it("drops a verification when the student edits the statement afterwards", () => {
    const edited = structuredClone(profile);
    edited.activities.find((a) => a.id === "act-soccer")!.hoursPerWeek = 20;
    const a = assessActivity(edited.activities.find((x) => x.id === "act-soccer")!, edited.requests);
    const time = a.statements.find((s) => s.key === "time")!;
    expect(time.level).toBe(0);
    expect(time.changedSinceVerified).toBe(true);
    expect(a.coreLevel).toBe(0);
  });

  it("keeps the verification when the student adopts the exact correction", () => {
    const edited = structuredClone(profile);
    edited.activities.find((a) => a.id === "act-foodbank")!.claims[0].text = "Trained about 15 new volunteers";
    const a = assessActivity(edited.activities.find((x) => x.id === "act-foodbank")!, edited.requests);
    const s = a.statements.find((x) => x.key === "claim:c-train")!;
    expect(s.level).toBe(2);
    expect(s.corrected).toBe(false);
  });
});

describe("gaming the organization level", () => {
  it("never treats a free email provider as the organization", () => {
    expect(classifyEmail("anyone@gmail.com", "gmail.com")).toBe("personal");
    expect(checkVerifier({ email: "anyone@gmail.com", relationship: "supervisor", orgDomain: "https://gmail.com", name: "A" }).maxLevel).toBe(1);
  });

  it("tells readers which domain an answer came from, never the address", () => {
    const profile = demoProfile();
    const a = assessActivity(profile.activities.find((x) => x.id === "act-soccer")!, profile.requests);
    expect(a.statements[0].verifiedBy?.emailDomain).toBe("riverdaleusd.example");
    expect(JSON.stringify(a)).not.toContain("aruiz@");
  });
});
