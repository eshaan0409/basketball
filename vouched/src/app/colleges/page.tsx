import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";

export const metadata: Metadata = { title: "For colleges and scholarship programs" };

const POINTS = [
  {
    title: "Read a list you can trust",
    body: "Every statement carries who confirmed it, their title, when, and whether they answered from the organization's own email domain. Corrections stay visible.",
  },
  {
    title: "Find students by what they've verifiably done",
    body: "Students who opt in can be reached by programs looking for, say, organization-confirmed entrepreneurship or service leadership. You message them; you never receive their data.",
  },
  {
    title: "No list buying, no surprises",
    body: "Students are never sold as names. They choose to be discoverable, can stop at any time, and see which programs contacted them.",
  },
];

export default function CollegesPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-12 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-4">
        <p className="text-sm font-medium tracking-wide text-brand uppercase">For admissions and scholarship teams</p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          The part of the application nobody checks, checked at the source.
        </h1>
        <p className="max-w-2xl text-lg text-ink-2">
          Transcripts are verified. Activities mostly aren&apos;t: there is no national database to confirm them, and
          follow-up checks are rare.{" "}
          <a
            className="text-brand underline-offset-2 hover:underline"
            href="https://theivyinst.org/blog/how-do-colleges-verify-extracurricular-activities-outside-your-high-school"
          >
            Source
          </a>
          {" "}Vouched asks the coach, manager or client to confirm each claim before you ever read it.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {POINTS.map((p) => (
          <div key={p.title} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-6">
            <h2 className="font-semibold">{p.title}</h2>
            <p className="text-[15px] text-ink-2">{p.body}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="text-lg font-semibold">How it&apos;s paid for</h2>
        <p className="mt-2 text-[15px] text-ink-2">
          Students never pay. Colleges, scholarship programs and summer programs pay to reach students who have opted in,
          filtered by verified activity. Pricing is being set with early partners.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/demo" className="rounded-md bg-brand px-4 py-2.5 font-medium text-brand-ink hover:opacity-90">
            See an example record
          </Link>
          {site.contactEmail && (
            <a
              href={`mailto:${site.contactEmail}?subject=Vouched%20for%20admissions`}
              className="rounded-md border border-line px-4 py-2.5 font-medium hover:bg-surface-2"
            >
              Talk to us
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
