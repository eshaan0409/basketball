import type { StatementAssurance } from "@/lib/assurance";
import { LevelBadge } from "./Badge";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

function emailNote(kind: string, domain: string): string {
  if (kind === "organization") return `answered from a work address at ${domain}`;
  if (kind === "personal") return `answered from a personal address (${domain})`;
  return `answered from an address at ${domain}`;
}

export function StatementList({ statements, audience }: { statements: StatementAssurance[]; audience: "owner" | "reader" }) {
  return (
    <ul className="flex flex-col divide-y divide-line">
      {statements.map((s) => (
        <li key={s.key} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-4">
          <div className="w-20 shrink-0 text-xs font-medium tracking-wide text-muted uppercase sm:pt-0.5">{s.label}</div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="text-[15px] text-ink">{s.shown}</p>
            {s.corrected && (
              <p className="text-sm text-ink-2">
                Corrected by the verifier.{" "}
                {audience === "owner" ? `You wrote: “${s.claimed}”` : `The student originally wrote: “${s.claimed}”`}
              </p>
            )}
            {s.verifiedBy && (
              <p className="text-sm text-ink-2">
                {s.verifiedBy.name}
                {s.verifiedBy.title ? `, ${s.verifiedBy.title}` : ""} · {formatDate(s.verifiedBy.respondedAt)} ·{" "}
                <span className="text-muted">{emailNote(s.verifiedBy.emailKind, s.verifiedBy.emailDomain)}</span>
              </p>
            )}
            {s.changedSinceVerified && audience === "owner" && (
              <p className="text-sm text-warn-ink">Changed after it was verified, so it counts as self-reported again.</p>
            )}
          </div>
          <div className="sm:pt-0.5">
            <LevelBadge level={s.level} short />
          </div>
        </li>
      ))}
    </ul>
  );
}
