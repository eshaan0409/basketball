import { LEVEL_LABELS } from "@/lib/assurance";
import type { PublicView } from "@/lib/views";
import { LevelBadge, LevelIcon } from "./Badge";
import { StatementList } from "./StatementList";

export function SharedRecord({ view }: { view: PublicView }) {
  const s = view.summary;
  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <p className="text-sm font-medium text-brand">Verified activity record</p>
        <h1 className="text-3xl font-semibold tracking-tight">{view.name}</h1>
        <p className="text-ink-2">
          {[view.school, view.gradYear ? `Class of ${view.gradYear}` : ""].filter(Boolean).join(" · ")}
        </p>
      </header>

      <section aria-label="Summary" className="grid gap-3 sm:grid-cols-3">
        <SummaryTile level={2} count={s.organizationConfirmed} total={s.activities} />
        <SummaryTile level={1} count={s.personConfirmed} total={s.activities} />
        <SummaryTile level={0} count={s.selfReported} total={s.activities} />
      </section>

      <ol className="flex flex-col gap-4">
        {view.activities.map((a) => (
          <li key={a.id} className="rounded-xl border border-line bg-surface p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-xs font-medium tracking-wide text-muted uppercase">{a.category}</p>
                <h2 className="mt-1 text-lg font-semibold">{a.position}</h2>
                <p className="text-ink-2">{a.organization}</p>
              </div>
              <LevelBadge level={a.assurance.coreLevel} />
            </div>
            {a.description && <p className="mt-3 text-[15px] text-ink-2">{a.description}</p>}
            <div className="mt-4 border-t border-line pt-4">
              <StatementList statements={a.assurance.statements} audience="reader" />
            </div>
          </li>
        ))}
      </ol>

      <section className="rounded-xl border border-line bg-surface-2 p-5 text-sm text-ink-2">
        <h2 className="font-semibold text-ink">How to read this</h2>
        <ul className="mt-2 flex flex-col gap-2">
          <li className="flex gap-2">
            <span className="mt-0.5 text-brand">
              <LevelIcon level={2} />
            </span>
            <span>
              <strong className="text-ink">{LEVEL_LABELS[2]}:</strong> a supervisor, coach, teacher or client answered from
              an email address at the organization&apos;s own domain and signed their name. The domain is shown next to
              each answer so you can judge it.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-ink">
              <LevelIcon level={1} />
            </span>
            <span>
              <strong className="text-ink">{LEVEL_LABELS[1]}:</strong> a named person who is not family confirmed it, from
              a personal or outside address.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="mt-0.5 text-muted">
              <LevelIcon level={0} />
            </span>
            <span>
              <strong className="text-ink">{LEVEL_LABELS[0]}:</strong> the student&apos;s own statement. Not checked yet.
            </span>
          </li>
        </ul>
        <p className="mt-3">
          An activity&apos;s overall level is the lowest of its role, dates and time. If the student edits a statement
          after it was verified, it goes back to self-reported.
        </p>
      </section>
    </div>
  );
}

function SummaryTile({ level, count, total }: { level: 0 | 1 | 2; count: number; total: number }) {
  return (
    <div className="flex flex-col items-start gap-1 rounded-xl border border-line bg-surface p-4">
      <LevelBadge level={level} short />
      <p className="mt-1 text-2xl font-semibold">
        {count} <span className="text-base font-normal text-muted">of {total} activities</span>
      </p>
    </div>
  );
}
