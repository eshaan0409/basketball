import type { Metadata } from "next";
import Link from "next/link";
import { DEFAULT_OPTIONS } from "@/lib/engine/types";

export const metadata: Metadata = { title: "Methodology" };

const STEPS = [
  {
    title: "1. Monthly totals",
    body: "Meter reads (daily or monthly, in gallons or CCF) are summed into calendar months per account. Months without weather data are skipped and reported.",
  },
  {
    title: "2. Indoor baseline",
    body: `Indoor use is estimated as the average of the ${DEFAULT_OPTIONS.indoorBaselineMonths} lowest-use months before the upgrade, when little or nothing is irrigated. Everything above that line is treated as outdoor use. This assumes indoor use does not change because of an outdoor measure.`,
  },
  {
    title: "3. Weather model per home",
    body: `Irrigation demand each month is reference evapotranspiration minus ${DEFAULT_OPTIONS.effectiveRainFraction * 100}% of rainfall. Each home's pre-upgrade outdoor use is fit to that demand with a straight line. Homes need at least ${DEFAULT_OPTIONS.minPreMonths} months of history, and the fit must explain at least ${DEFAULT_OPTIONS.minModelR2 * 100}% of the variation (R² ≥ ${DEFAULT_OPTIONS.minModelR2}); otherwise the home is excluded rather than guessed at.`,
  },
  {
    title: "4. Savings after the install month",
    body: "For each month after the install month, expected use (indoor baseline plus modeled outdoor use under that month's actual weather) minus measured use is the raw saving. The install month itself is skipped as a transition month.",
  },
  {
    title: "5. Control-group adjustment",
    body: "Homes without an upgrade are modeled the same way using history before the program began. Their average gap between expected and measured use in each calendar month is subtracted from every upgraded home's saving in that month. Rate increases, drought messaging, and a cool summer the model missed all show up here instead of being sold as savings.",
  },
  {
    title: "6. Interval and credit",
    body: `Upgraded and control homes are resampled with replacement ${DEFAULT_OPTIONS.bootstrapIterations.toLocaleString()} times to build a ${DEFAULT_OPTIONS.confidence * 100}% interval on total savings. The creditable volume is the interval's lower bound, never below zero. First-year volume uses only homes with 12 full months of post-install data.`,
  },
];

const LIMITS = [
  "The engine has been tested on simulated data only. On simulated programs it recovers the known savings within a few percent and its interval contains the truth, but real utility data will be messier.",
  "Control homes are every account that was not upgraded. A real program should match controls to upgraded homes on lot size, past summer use and neighborhood, because the homes that sign up are not random.",
  "Persistence is not yet modeled. A controller that is later unplugged stops saving; multi-year credits need multi-year measurement.",
  "Weather comes from one station per file. Large service areas should use the nearest station per home.",
  "A utility may count the same gallons toward its state water-use objective. Who can claim what needs a written agreement before any sale.",
  "No third party has reviewed this method yet. Buyers will expect an independent verifier and alignment with Volumetric Water Benefit Accounting (VWBA).",
];

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <h1 className="text-3xl font-semibold tracking-tight">Methodology</h1>
      <p className="mt-3 text-[15px] text-ink-2">
        How upgraded homes&apos; meter data becomes a volume of water someone can buy, and where the method is still
        thin. Everything here is implemented in the engine behind the{" "}
        <Link href="/verify" className="text-brand underline-offset-2 hover:underline">
          verification page
        </Link>
        .
      </p>

      <section className="mt-10 flex flex-col gap-6">
        {STEPS.map((s) => (
          <div key={s.title}>
            <h2 className="text-lg font-semibold">{s.title}</h2>
            <p className="mt-1 text-[15px] text-ink-2">{s.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Inputs</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="bg-surface-2 text-ink-2">
              <tr>
                <th className="px-3 py-2 font-medium">File</th>
                <th className="px-3 py-2 font-medium">Columns</th>
                <th className="px-3 py-2 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-t border-line">
                <td className="px-3 py-2">Meter reads</td>
                <td className="px-3 py-2 font-mono text-xs">account_id, date, gallons</td>
                <td className="px-3 py-2 text-ink-2">Daily or monthly. A ccf or hcf column is converted at 748.052 gal.</td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-3 py-2">Installs</td>
                <td className="px-3 py-2 font-mono text-xs">account_id, install_date, intervention</td>
                <td className="px-3 py-2 text-ink-2">Every account not listed here is a candidate control home.</td>
              </tr>
              <tr className="border-t border-line">
                <td className="px-3 py-2">Weather</td>
                <td className="px-3 py-2 font-mono text-xs">month, et0_in, rain_in</td>
                <td className="px-3 py-2 text-ink-2">Monthly totals in inches, e.g. from the nearest CIMIS station in California.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-lg font-semibold">Known limits</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] text-ink-2">
          {LIMITS.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
