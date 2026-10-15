import type { Activity, Profile, VerificationRequest } from "./types";
import { statementsFor } from "./statements";

/**
 * A FICTIONAL student used for the public demo. Names, organizations and people are invented;
 * domains use the reserved .example TLD so nothing points at a real school or business.
 */
export function demoProfile(): Profile {
  const at = "2026-09-01T12:00:00.000Z";
  const activity = (a: Omit<Activity, "createdAt" | "updatedAt">): Activity => ({ ...a, createdAt: at, updatedAt: at });

  const activities: Activity[] = [
    activity({
      id: "act-photo",
      category: "Entrepreneurship",
      position: "Founder, sports photographer",
      organization: "Lee Sports Media",
      orgDomain: "riverdaleusd.example",
      startMonth: "2024-08",
      endMonth: null,
      hoursPerWeek: 8,
      weeksPerYear: 36,
      description: "Shoot and edit varsity games for two high schools; sell game galleries and highlight reels to families.",
      claims: [
        { id: "c-games", kind: "impact", text: "Photographed 41 varsity games across football, soccer and water polo" },
        { id: "c-rev", kind: "revenue", text: "About $3,800 in revenue over the 2025–26 school year" },
      ],
    }),
    activity({
      id: "act-foodbank",
      category: "Community service",
      position: "Saturday shift lead",
      organization: "Northside Community Food Bank",
      orgDomain: "northsidefood.example",
      startMonth: "2023-09",
      endMonth: null,
      hoursPerWeek: 4,
      weeksPerYear: 40,
      description: "Run the Saturday intake line; train new volunteers.",
      claims: [{ id: "c-train", kind: "impact", text: "Trained 25 new volunteers" }],
    }),
    activity({
      id: "act-soccer",
      category: "Athletics",
      position: "Varsity soccer, captain",
      organization: "Riverdale High School",
      orgDomain: "riverdaleusd.example",
      startMonth: "2024-11",
      endMonth: null,
      hoursPerWeek: 12,
      weeksPerYear: 14,
      description: "Center back; captain senior year.",
      claims: [],
    }),
    activity({
      id: "act-debate",
      category: "Leadership and government",
      position: "President",
      organization: "Riverdale Debate Club",
      orgDomain: "",
      startMonth: "2025-08",
      endMonth: null,
      hoursPerWeek: 3,
      weeksPerYear: 30,
      description: "Run weekly practice rounds.",
      claims: [],
    }),
  ];

  const submitted = (
    id: string,
    activityId: string,
    verifier: { name: string; email: string; title: string; relationship: VerificationRequest["relationship"] },
    respondedAt: string,
    answers: Record<string, { verdict: "confirmed" | "corrected" | "unknown"; correction?: string }>,
    comment = "",
  ): VerificationRequest => {
    const activityRecord = activities.find((a) => a.id === activityId)!;
    const statements = statementsFor(activityRecord);
    return {
      id,
      token: `demo-${id}`,
      activityId,
      verifierName: verifier.name,
      verifierEmail: verifier.email,
      verifierTitle: verifier.title,
      relationship: verifier.relationship,
      statements,
      status: "submitted",
      createdAt: "2026-09-02T12:00:00.000Z",
      expiresAt: "2026-10-02T12:00:00.000Z",
      response: {
        respondedAt,
        statements: statements.map((s) => ({ key: s.key, ...(answers[s.key] ?? { verdict: "confirmed" as const }) })),
        comment,
        signedName: verifier.name,
        signedTitle: verifier.title,
      },
    };
  };

  const requests: VerificationRequest[] = [
    submitted(
      "r1",
      "act-photo",
      { name: "Dana Ortiz", email: "dortiz@riverdaleusd.example", title: "Athletic Director", relationship: "supervisor" },
      "2026-09-05T16:20:00.000Z",
      { "claim:c-rev": { verdict: "unknown" } },
      "Jordan has shot our home games for two seasons and delivers on time.",
    ),
    submitted(
      "r2",
      "act-photo",
      { name: "Priya Shah", email: "priya.shah@gmail.com", title: "Parent, client", relationship: "client" },
      "2026-09-06T09:10:00.000Z",
      { "claim:c-games": { verdict: "unknown" }, "claim:c-rev": { verdict: "unknown" } },
    ),
    submitted(
      "r3",
      "act-foodbank",
      { name: "Marcus Bell", email: "mbell@northsidefood.example", title: "Volunteer Coordinator", relationship: "supervisor" },
      "2026-09-08T18:45:00.000Z",
      { "claim:c-train": { verdict: "corrected", correction: "Trained about 15 new volunteers" } },
    ),
    submitted(
      "r4",
      "act-soccer",
      { name: "Coach Ana Ruiz", email: "aruiz@riverdaleusd.example", title: "Head Coach, Girls Varsity Soccer", relationship: "supervisor" },
      "2026-09-03T20:00:00.000Z",
      {},
    ),
  ];

  return {
    id: "demo",
    ownerHash: "demo",
    name: "Jordan Lee",
    gradYear: 2027,
    school: "Riverdale High School",
    activities,
    requests,
    shares: [],
    createdAt: at,
  };
}
