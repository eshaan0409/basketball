"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

export function StartForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [school, setSchool] = useState("");
  const [gradYear, setGradYear] = useState("");
  const [key, setKey] = useState<string | null>(null);
  const [restore, setRestore] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (key) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-brand bg-brand-soft p-5" role="status">
        <h2 className="text-lg font-semibold">Save your private key</h2>
        <p className="text-[15px] text-ink-2">
          This browser will remember you. To open your record anywhere else, you&apos;ll need this key. Save it in your
          notes or password manager. Don&apos;t share it.
        </p>
        <code className="block overflow-x-auto rounded-md border border-line bg-surface px-3 py-2 text-sm">{key}</code>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md border border-line bg-surface px-3 py-1.5 text-sm font-medium hover:bg-surface-2"
            onClick={() => navigator.clipboard?.writeText(key).catch(() => undefined)}
          >
            Copy key
          </button>
          <button
            type="button"
            className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-brand-ink hover:opacity-90"
            onClick={() => router.push("/record")}
          >
            I saved it, continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10">
      <form
        className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            const res = await api<{ key: string }>("/api/profile", { method: "POST", body: { name, school, gradYear } });
            setKey(res.key);
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Your name, as it appears on your applications
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" />
        </label>
        <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            High school
            <input className={input} value={school} onChange={(e) => setSchool(e.target.value)} maxLength={120} />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Class of
            <input className={input} value={gradYear} onChange={(e) => setGradYear(e.target.value)} inputMode="numeric" placeholder="2028" maxLength={4} />
          </label>
        </div>
        {error && (
          <p role="alert" className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn-ink">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="self-start rounded-md bg-brand px-4 py-2.5 font-medium text-brand-ink hover:opacity-90 disabled:opacity-60">
          {busy ? "Creating…" : "Create my record"}
        </button>
      </form>

      <form
        className="flex flex-col gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          try {
            await api("/api/session", { method: "POST", body: { key: restore } });
            router.push("/record");
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h2 className="font-semibold">Already have a record?</h2>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input aria-label="Private key" className={input} value={restore} onChange={(e) => setRestore(e.target.value)} placeholder="Paste your private key" />
          <button type="submit" disabled={busy} className="rounded-md border border-line px-4 py-2 font-medium hover:bg-surface-2">
            Open
          </button>
        </div>
      </form>
    </div>
  );
}
