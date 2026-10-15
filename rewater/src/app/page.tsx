import Link from "next/link";
import { site } from "@/config/site";

const SIDES = [
  {
    who: "Homeowners",
    get: "A free smart irrigation controller or lawn replacement.",
    why: "Lower summer bills, and plants that stop drowning in clay soil. The upgrade is paid for by the companies buying the savings.",
  },
  {
    who: "Water utilities",
    get: "Measured outdoor savings toward state water-use targets, at no program cost.",
    why: "Utilities already run rebates but most cannot prove what outdoor programs save. We measure it from the smart meters they already own.",
  },
  {
    who: "Companies with water pledges",
    get: "Local, verified gallons in the same basin as their data centers.",
    why: "Measured from meters rather than estimated from engineering tables, with a control group and a conservative credit at the low end of the range.",
  },
];

const STEPS = [
  {
    title: "Enroll homes that overwater",
    body: "The utility flags accounts whose summer use is far above what their landscape needs. Those homes get offered a free upgrade.",
  },
  {
    title: "Install the measure",
    body: "A weather-based irrigation controller, or replacing thirsty lawn with native plants. Install dates go into the program record.",
  },
  {
    title: "Measure against the weather",
    body: "Each home's past outdoor use is modeled against evapotranspiration and rain. After install, actual use is compared with what the weather says it would have been.",
  },
  {
    title: "Subtract what everyone else did",
    body: "Homes without an upgrade are tracked over the same months. If everyone cut back because of a rate increase, that cut is removed.",
  },
  {
    title: "Credit only the low end",
    body: "A confidence range is built by resampling homes. Buyers are credited the lower bound, so the volume sold is the volume we are most sure of.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-24">
          <div className="flex flex-col gap-6">
            <p className="text-sm font-medium tracking-wide text-brand uppercase">Water replenishment from cities</p>
            <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
              Turn overwatered lawns into verified water for the companies that need it.
            </h1>
            <p className="max-w-xl text-lg text-ink-2">
              {site.name} pays for water-saving upgrades in homes, measures the savings with the utility&apos;s own smart
              meters, and sells the verified gallons to companies that have promised to replenish more water than they use.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/verify" className="rounded-md bg-brand px-4 py-2.5 font-medium text-brand-ink hover:opacity-90">
                See a verification on demo data
              </Link>
              {site.contactEmail ? (
                <a
                  href={`mailto:${site.contactEmail}?subject=Rewater%20pilot`}
                  className="rounded-md border border-line bg-surface px-4 py-2.5 font-medium text-ink hover:bg-surface-2"
                >
                  Pilot with us
                </a>
              ) : (
                <Link
                  href="/methodology"
                  className="rounded-md border border-line bg-surface px-4 py-2.5 font-medium text-ink hover:bg-surface-2"
                >
                  Read the methodology
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-col justify-center gap-4 rounded-xl border border-line bg-page p-6">
            <p className="text-sm font-medium text-ink-2">Why this market exists</p>
            <ul className="flex flex-col gap-4 text-[15px]">
              <li>
                Google, Microsoft, Amazon and Meta have each committed to replenish more water than they consume by
                2030.{" "}
                <a className="text-brand underline-offset-2 hover:underline" href="https://www.esgdive.com/news/google-commits-to-replenish-more-water-than-it-uses-by-2030/822021/">
                  Source
                </a>
              </li>
              <li>
                Google runs an open request for new replenishment projects.{" "}
                <a className="text-brand underline-offset-2 hover:underline" href="https://datacenters.google/water-rfi/">
                  Source
                </a>
              </li>
              <li>
                Verified water savings are already sold to companies from farms. Nobody we found does it for city
                landscapes, where measurement has been the blocker.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">Three sides, one transaction</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {SIDES.map((s) => (
            <div key={s.who} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-6">
              <h3 className="text-sm font-medium text-ink-2">{s.who}</h3>
              <p className="text-lg font-semibold">{s.get}</p>
              <p className="text-[15px] text-ink-2">{s.why}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="how" className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="text-2xl font-semibold tracking-tight">How a gallon gets verified</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-5">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex flex-col gap-2">
                <span className="tabular flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                  {i + 1}
                </span>
                <h3 className="font-semibold">{s.title}</h3>
                <p className="text-[15px] text-ink-2">{s.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/verify" className="rounded-md bg-brand px-4 py-2.5 font-medium text-brand-ink hover:opacity-90">
              Run it on demo data
            </Link>
            <Link href="/methodology" className="rounded-md border border-line px-4 py-2.5 font-medium hover:bg-surface-2">
              Methodology and limits
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">For utilities: your data stays with you</h2>
            <p className="mt-3 text-[15px] text-ink-2">
              The verification page runs entirely in your browser. Meter files you load there are never uploaded. Export
              account IDs, dates and gallons (or CCF), plus the install list and monthly weather, and see what your
              outdoor program actually saved.
            </p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">For buyers: conservative by design</h2>
            <p className="mt-3 text-[15px] text-ink-2">
              Homes whose use does not follow the weather are excluded. Shared trends are subtracted using control homes.
              The credited volume is the lower bound of a 90% interval, and every home-level number is downloadable.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
