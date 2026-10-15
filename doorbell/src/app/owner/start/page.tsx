"use client";

import Link from "next/link";
import { useState } from "react";
import { emptyShop, ShopForm, toPayload } from "@/components/owner/ShopForm";
import { api } from "@/lib/client";

export default function OwnerStartPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ key: string; slug: string } | null>(null);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Set up your shop</h1>
        <p className="mt-3 text-[15px] text-ink-2">
          About ten minutes. When you&apos;re done, AI assistants can see your hours and services and send you booking
          requests by text.
        </p>
      </div>
      {done ? (
        <div className="flex flex-col gap-4 rounded-xl border border-brand bg-brand-soft p-5" role="status">
          <h2 className="text-lg font-semibold">Your shop is live</h2>
          <p className="text-[15px] text-ink-2">
            Save this private key. It&apos;s how you open your dashboard on another phone or computer. Don&apos;t share it.
          </p>
          <code className="block overflow-x-auto rounded-md border border-line bg-surface px-3 py-2 text-sm">{done.key}</code>
          <div className="flex flex-wrap gap-3">
            <Link href="/owner" className="rounded-md bg-brand px-4 py-2 font-medium text-brand-ink hover:opacity-90">
              Open my dashboard
            </Link>
            <Link href={`/s/${done.slug}`} className="rounded-md border border-line bg-surface px-4 py-2 font-medium hover:bg-surface-2">
              See my public page
            </Link>
          </div>
        </div>
      ) : (
        <ShopForm
          initial={emptyShop()}
          submitLabel="Create my shop"
          busy={busy}
          error={error}
          onSubmit={async (d) => {
            setBusy(true);
            setError(null);
            try {
              setDone(await api<{ key: string; slug: string }>("/api/owner", { method: "POST", body: toPayload(d) }));
              window.scrollTo({ top: 0 });
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      )}
    </div>
  );
}
