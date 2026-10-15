import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SharedRecord } from "@/components/SharedRecord";
import { getSharedProfile, ServiceError } from "@/lib/service";
import { getStore } from "@/lib/store";
import { publicView } from "@/lib/views";

export const dynamic = "force-dynamic";
// Shared records are private links: keep them out of search engines.
export const metadata: Metadata = { title: "Verified activity record", robots: { index: false, follow: false } };

export default async function SharedPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  try {
    const profile = await getSharedProfile(getStore(), token);
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <SharedRecord view={publicView(profile)} />
      </div>
    );
  } catch (e) {
    if (e instanceof ServiceError) notFound();
    throw e;
  }
}
