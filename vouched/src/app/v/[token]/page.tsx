import type { Metadata } from "next";
import { VerifierForm } from "@/components/verifier/VerifierForm";
import { getRequestForVerifier, ServiceError, type VerifierView } from "@/lib/service";
import { getStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verify an activity", robots: { index: false, follow: false } };

export default async function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let view: VerifierView | null = null;
  let problem: string | null = null;
  try {
    view = await getRequestForVerifier(getStore(), token);
  } catch (e) {
    if (!(e instanceof ServiceError)) throw e;
    problem = e.message;
  }

  if (!view) {
    return <Notice title="This link doesn't work" body={problem ?? "Ask the student to send a new one."} />;
  }
  if (view.status === "submitted") {
    return <Notice title="Already answered" body="This request has been answered. Thank you." />;
  }
  if (view.status === "declined") {
    return <Notice title="Declined" body="This request was declined. Nothing about it is shown." />;
  }
  if (view.status === "expired") {
    return <Notice title="This request expired" body={`Ask ${view.studentName} to send a new link.`} />;
  }

  const first = view.studentName.split(" ")[0] || view.studentName;
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12 sm:px-6">
      <header className="flex flex-col gap-3">
        <p className="text-sm font-medium text-brand">Verification request</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          {view.studentName} asked you to confirm their work with {view.activity.organization}
        </h1>
        <p className="text-[15px] text-ink-2">
          {first} listed this on their activity record{view.school ? ` (${view.school})` : ""}. Mark each statement as
          accurate, correct it, or say you can&apos;t tell. It takes about two minutes and needs no account.
        </p>
        {view.activity.description && (
          <blockquote className="border-l-2 border-line pl-4 text-[15px] text-ink-2">{view.activity.description}</blockquote>
        )}
      </header>
      <VerifierForm token={token} view={view} />
    </div>
  );
}

function Notice({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 sm:px-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-ink-2">{body}</p>
    </div>
  );
}
