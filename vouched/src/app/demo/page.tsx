import type { Metadata } from "next";
import Link from "next/link";
import { SharedRecord } from "@/components/SharedRecord";
import { demoProfile } from "@/lib/demo";
import { publicView } from "@/lib/views";

export const metadata: Metadata = { title: "Example record" };

export default function DemoPage() {
  const view = publicView(demoProfile(), new Date("2026-10-01T00:00:00Z"));
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12 sm:px-6">
      <p className="rounded-lg border border-line bg-warn-bg px-4 py-3 text-sm text-warn-ink">
        Example only. Jordan Lee, the school, the organizations and every verifier on this page are fictional.
      </p>
      <SharedRecord view={view} />
      <div className="flex flex-wrap gap-3">
        <Link href="/start" className="rounded-md bg-brand px-4 py-2.5 font-medium text-brand-ink hover:opacity-90">
          Start your own record
        </Link>
        <Link href="/colleges" className="rounded-md border border-line px-4 py-2.5 font-medium hover:bg-surface-2">
          For colleges
        </Link>
      </div>
    </div>
  );
}
