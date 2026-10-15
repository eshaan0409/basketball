import type { Activity, Statement } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatMonth(month: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(month);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : month;
}

export function formatRange(start: string, end: string | null): string {
  return `${formatMonth(start)} – ${end ? formatMonth(end) : "present"}`;
}

/**
 * The checkable statements an activity makes. Their text is what a verifier sees and what a
 * verification is tied to: if the student later edits the activity, the text changes and the old
 * confirmation no longer applies to it.
 */
export function statementsFor(activity: Activity): Statement[] {
  const statements: Statement[] = [
    {
      key: "role",
      label: "Role",
      text: `${activity.position.trim()} at ${activity.organization.trim()}`,
    },
    { key: "dates", label: "Dates", text: formatRange(activity.startMonth, activity.endMonth) },
    {
      key: "time",
      label: "Time",
      text: `${activity.hoursPerWeek} hours a week, ${activity.weeksPerYear} weeks a year`,
    },
  ];
  for (const c of activity.claims) {
    if (c.text.trim()) {
      statements.push({
        key: `claim:${c.id}`,
        label: c.kind === "revenue" ? "Revenue" : c.kind === "award" ? "Award" : "Impact",
        text: c.text.trim(),
      });
    }
  }
  return statements;
}
