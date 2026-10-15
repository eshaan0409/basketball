import { formatMonth } from "./statements";
import type { Activity } from "./types";
import type { ActivityAssurance } from "./assurance";

export type Severity = "error" | "warning" | "tip";

export interface Finding {
  severity: Severity;
  activityId?: string;
  message: string;
}

/** Common App activity fields (characters). */
export const COMMON_APP = { position: 50, organization: 100, description: 150, slots: 10 } as const;
/** UC application activities and awards. */
export const UC_APP = { description: 350, slots: 20 } as const;

/** Weekly hours across simultaneous activities above which readers start doubting the list. */
export const WEEKLY_HOURS_CEILING = 40;

const INFLATED_TITLES = /\b(founder|co-?founder|ceo|president|chief|director|head)\b/i;

function monthIndex(month: string): number {
  return Number(month.slice(0, 4)) * 12 + Number(month.slice(5, 7)) - 1;
}

function indexToMonth(i: number): string {
  return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`;
}

/**
 * The checks a careful admissions reader would run in their head. They flag, they never block:
 * the student decides what to fix.
 */
export function reviewActivities(
  activities: Activity[],
  assessments: ActivityAssurance[],
  today: string,
): Finding[] {
  const findings: Finding[] = [];
  const nowIdx = monthIndex(today);

  for (const a of activities) {
    const name = a.position || a.organization || "An activity";
    if (!/^\d{4}-\d{2}$/.test(a.startMonth)) {
      findings.push({ severity: "error", activityId: a.id, message: `${name}: add a start month.` });
      continue;
    }
    if (a.endMonth && a.endMonth < a.startMonth) {
      findings.push({ severity: "error", activityId: a.id, message: `${name}: ends before it starts.` });
    }
    if (monthIndex(a.startMonth) > nowIdx) {
      findings.push({ severity: "error", activityId: a.id, message: `${name}: starts in the future.` });
    }
    if (a.weeksPerYear > 52 || a.weeksPerYear < 0) {
      findings.push({ severity: "error", activityId: a.id, message: `${name}: a year has 52 weeks.` });
    }
    if (a.hoursPerWeek > 40) {
      findings.push({
        severity: "warning",
        activityId: a.id,
        message: `${name}: ${a.hoursPerWeek} hours a week is more than a full-time job. If it's true, get it verified; if it's a summer peak, use the typical week.`,
      });
    }
    if (a.position.length > COMMON_APP.position) {
      findings.push({
        severity: "tip",
        activityId: a.id,
        message: `${name}: the position is ${a.position.length} characters; the Common App allows ${COMMON_APP.position}.`,
      });
    }
    if (a.organization.length > COMMON_APP.organization) {
      findings.push({
        severity: "tip",
        activityId: a.id,
        message: `${name}: the organization name is over ${COMMON_APP.organization} characters.`,
      });
    }
    if (a.description.length > COMMON_APP.description) {
      findings.push({
        severity: "tip",
        activityId: a.id,
        message: `${name}: the description is ${a.description.length} characters. The Common App allows ${COMMON_APP.description}; the UC application allows ${UC_APP.description}.`,
      });
    }

    const assessment = assessments.find((x) => x.activityId === a.id);
    if (assessment) {
      if (INFLATED_TITLES.test(a.position) && assessment.coreLevel === 0) {
        findings.push({
          severity: "warning",
          activityId: a.id,
          message: `${name}: titles like founder or president are the ones readers doubt most. This one isn't verified yet.`,
        });
      }
      const unverifiedNumbers = assessment.statements.filter(
        (s) => s.key.startsWith("claim:") && s.level === 0 && /\d/.test(s.claimed),
      );
      if (unverifiedNumbers.length > 0) {
        findings.push({
          severity: "tip",
          activityId: a.id,
          message: `${name}: ${unverifiedNumbers.length} number${unverifiedNumbers.length > 1 ? "s" : ""} not verified yet ("${unverifiedNumbers[0].claimed}"). Specific numbers are the most persuasive line on an application once someone confirms them.`,
        });
      }
      const changed = assessment.statements.filter((s) => s.changedSinceVerified);
      if (changed.length > 0) {
        findings.push({
          severity: "warning",
          activityId: a.id,
          message: `${name}: you edited ${changed.map((s) => s.label.toLowerCase()).join(", ")} after it was verified, so it now shows as self-reported. Ask again or change it back.`,
        });
      }
    }
  }

  // Total weekly hours across overlapping activities, month by month.
  const dated = activities.filter((a) => /^\d{4}-\d{2}$/.test(a.startMonth) && a.weeksPerYear > 12);
  if (dated.length > 1) {
    let worst = { month: "", hours: 0, count: 0 };
    const start = Math.min(...dated.map((a) => monthIndex(a.startMonth)));
    for (let i = start; i <= nowIdx; i++) {
      let hours = 0;
      let count = 0;
      for (const a of dated) {
        const s = monthIndex(a.startMonth);
        const e = a.endMonth ? monthIndex(a.endMonth) : nowIdx;
        if (i >= s && i <= e) {
          hours += a.hoursPerWeek;
          count++;
        }
      }
      if (hours > worst.hours) worst = { month: indexToMonth(i), hours, count };
    }
    if (worst.hours > WEEKLY_HOURS_CEILING) {
      findings.push({
        severity: "warning",
        message: `In ${formatMonth(worst.month)} your ${worst.count} activities add up to ${worst.hours} hours a week on top of school. Readers notice totals like that. Use typical weeks, not peak weeks.`,
      });
    }
  }

  if (activities.length > COMMON_APP.slots) {
    findings.push({
      severity: "tip",
      message: `You have ${activities.length} activities. The Common App takes ${COMMON_APP.slots} and the UC application ${UC_APP.slots}; lead with the verified ones.`,
    });
  }

  const order: Record<Severity, number> = { error: 0, warning: 1, tip: 2 };
  return findings.sort((a, b) => order[a.severity] - order[b.severity]);
}
