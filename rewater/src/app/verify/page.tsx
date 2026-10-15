import type { Metadata } from "next";
import { VerifyWorkbench } from "@/components/VerifyWorkbench";

export const metadata: Metadata = { title: "Run a verification" };

export default function VerifyPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div className="no-print max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Run a verification</h1>
        <p className="mt-3 text-[15px] text-ink-2">
          Load meter reads, install dates and monthly weather. The page estimates each upgraded home&apos;s savings
          against its own weather-adjusted history, subtracts the change seen in control homes, and reports the
          conservative volume that could be sold.
        </p>
      </div>
      <VerifyWorkbench />
    </div>
  );
}
