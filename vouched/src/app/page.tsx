import Link from "next/link";
import { LevelBadge } from "@/components/Badge";

const STEPS = [
  {
    title: "List what you actually do",
    body: "Role, dates, hours, and the specific results: games shot, money raised, people trained. Character counters match the Common App and UC limits as you type.",
  },
  {
    title: "Ask the person who saw it",
    body: "Your coach, manager, client or advisor gets a link. They mark each statement accurate, correct it, or say they can't tell. Two minutes, no account.",
  },
  {
    title: "Share one link",
    body: "Readers see each statement with who confirmed it and how. Corrections show as corrections. You can turn any link off.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_1fr] lg:py-24">
          <div className="flex flex-col gap-6">
            <p className="text-sm font-medium tracking-wide text-brand uppercase">Verified, not padded</p>
            <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
              Your activities, verified by the people who saw you do them.
            </h1>
            <p className="max-w-xl text-lg text-ink-2">
              Anyone can write &quot;founder&quot; on an application. Vouched turns your activity list into a record where
              every claim says who checked it. It&apos;s free for students, and you control who sees it.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/start" className="rounded-md bg-brand px-4 py-2.5 font-medium text-brand-ink hover:opacity-90">
                Start your record
              </Link>
              <Link href="/demo" className="rounded-md border border-line bg-surface px-4 py-2.5 font-medium hover:bg-surface-2">
                See an example
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-line bg-page p-5" aria-label="Example statements">
            <p className="text-sm text-ink-2">What a reader sees (fictional example)</p>
            <Example
              label="Role"
              text="Founder, sports photographer at Lee Sports Media"
              level={2}
              by="Dana Ortiz, Athletic Director · work address at the district"
            />
            <Example label="Impact" text="Photographed 41 varsity games" level={2} by="Dana Ortiz, Athletic Director" />
            <Example label="Impact" text="Trained about 15 new volunteers" level={2} by="Corrected by the coordinator from “25”" />
            <Example label="Revenue" text="About $3,800 in revenue over the 2025–26 school year" level={0} by="Not checked yet" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-6">
              <span className="tabular flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                {i + 1}
              </span>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-[15px] text-ink-2">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3">
          <div>
            <h2 className="text-lg font-semibold">Three levels, no fake precision</h2>
            <div className="mt-3 flex flex-col items-start gap-2">
              <LevelBadge level={2} />
              <LevelBadge level={1} />
              <LevelBadge level={0} />
            </div>
            <p className="mt-3 text-[15px] text-ink-2">
              The organization level needs someone answering from the organization&apos;s own email domain. Family members
              can&apos;t verify. Edit a verified statement and it goes back to self-reported.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">It catches padding before a reader does</h2>
            <p className="mt-3 text-[15px] text-ink-2">
              Overlapping activities that add up to more than 40 hours a week, dates that don&apos;t work, big titles and
              big numbers nobody has confirmed. You see the same doubts an admissions reader would have, while you can
              still fix them.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Your data stays yours</h2>
            <p className="mt-3 text-[15px] text-ink-2">
              No public profiles. Nothing is shared until you make a link, and you can turn links off. Verifier emails are
              never shown. We will never sell student data.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Example({ label, text, level, by }: { label: string; text: string; level: 0 | 1 | 2; by: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted uppercase">{label}</span>
        <LevelBadge level={level} short />
      </div>
      <p className="text-[15px]">{text}</p>
      <p className="text-xs text-ink-2">{by}</p>
    </div>
  );
}
