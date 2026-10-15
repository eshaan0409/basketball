"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { site } from "@/config/site";
import { api } from "@/lib/client";
import { formatPhone } from "@/lib/replies";
import { formatSlot } from "@/lib/time";
import type { Booking, Message, Shop } from "@/lib/types";
import { ShopForm, toPayload, type ShopDraft } from "./ShopForm";

interface Dashboard {
  signedIn: true;
  shop: Shop;
  bookings: Booking[];
  messages: Message[];
  stats: { pending: number; confirmedThisMonth: number; requestsThisMonth: number };
  smsProvider: "outbox" | "twilio";
  durable: boolean;
}

const STATUS_STYLE: Record<Booking["status"], string> = {
  pending: "bg-warn-bg text-warn-ink",
  confirmed: "bg-brand-soft text-brand",
  declined: "bg-surface-2 text-ink-2",
  expired: "bg-surface-2 text-muted",
  cancelled: "bg-surface-2 text-muted",
};

function toDraft(shop: Shop): ShopDraft {
  return { ...shop, days: shop.hours.map((d) => d[0] ?? null) };
}

export function OwnerDashboard() {
  const [view, setView] = useState<Dashboard | null>(null);
  const [signedOut, setSignedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reply, setReply] = useState("");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [key, setKey] = useState("");
  const [shownKey, setShownKey] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api<Dashboard | { signedIn: false }>("/api/owner");
      if (res.signedIn) {
        setView(res);
        setSignedOut(false);
      } else {
        setView(null);
        setSignedOut(true);
      }
    } catch (e) {
      if ((e as { status?: number }).status === 401) setSignedOut(true);
      else setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (signedOut) {
    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">For shops</h1>
          <p className="mt-3 text-[15px] text-ink-2">Get booked by AI assistants and answer by text.</p>
          <Link href="/owner/start" className="mt-5 inline-block rounded-md bg-brand px-4 py-2.5 font-medium text-brand-ink hover:opacity-90">
            Set up your shop
          </Link>
        </div>
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => api("/api/owner/session", { method: "POST", body: { key } }));
          }}
        >
          <h2 className="font-semibold">Already set up?</h2>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="Private key"
              className="w-full rounded-md border border-line bg-surface px-3 py-2 text-[15px] sm:max-w-md"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Paste your private key"
            />
            <button type="submit" disabled={busy} className="rounded-md border border-line px-4 py-2 font-medium hover:bg-surface-2">
              Open dashboard
            </button>
          </div>
          {error && <p className="text-sm text-critical">{error}</p>}
        </form>
      </div>
    );
  }

  if (!view) return <p className="text-ink-2">{error ?? "Loading…"}</p>;

  const { shop, bookings, stats } = view;
  const pending = bookings.filter((b) => b.status === "pending");
  const upcoming = bookings.filter((b) => b.status === "confirmed").sort((a, b) => a.start.localeCompare(b.start));
  const past = bookings.filter((b) => b.status !== "pending" && b.status !== "confirmed").slice(0, 10);
  const phoneLog = view.messages.filter((m) => m.phone === shop.ownerSms);

  return (
    <div className="flex flex-col gap-8">
      {!view.durable && (
        <p className="rounded-lg border border-line bg-warn-bg px-4 py-3 text-sm text-warn-ink">
          This deployment has no database yet, so your shop can disappear when the server restarts.
        </p>
      )}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand">{shop.category}</p>
          <h1 className="text-3xl font-semibold tracking-tight">{shop.name}</h1>
          <p className="text-ink-2">
            Booking texts go to {formatPhone(shop.ownerSms)} ·{" "}
            <Link href={`/s/${shop.slug}`} className="text-brand underline-offset-2 hover:underline">
              public page
            </Link>
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Tile label="Waiting on you" value={stats.pending} />
          <Tile label="Confirmed this month" value={stats.confirmedThisMonth} />
          {site.feePerConfirmedBooking !== null && <Tile label="Fees this month" value={`$${(stats.confirmedThisMonth * site.feePerConfirmedBooking).toFixed(2)}`} />}
        </div>
      </header>

      {view.smsProvider === "outbox" && (
        <p className="rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm text-ink-2">
          Real texting isn&apos;t connected on this server yet, so booking texts appear in the phone below instead of on your
          cell. You can answer them there, or with the buttons.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn-ink">
          {error}
        </p>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Requests waiting on you</h2>
        {pending.length === 0 && <p className="text-[15px] text-muted">Nothing waiting. New requests arrive by text.</p>}
        {pending.map((b) => (
          <article key={b.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">
                #{b.code} · {b.serviceName}, {formatSlot(b.start)}
              </h3>
              <span className="text-sm text-muted">via {b.via} · answer by {new Date(b.respondBy).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
            </div>
            <p className="text-[15px] text-ink-2">
              {b.customerName} ·{" "}
              <a className="text-brand" href={`tel:${b.customerPhone}`}>
                {formatPhone(b.customerPhone)}
              </a>
              {b.notes && ` · “${b.notes}”`}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                disabled={busy}
                onClick={() => act(() => api(`/api/owner/bookings/${b.id}`, { method: "POST", body: { action: "confirm" } }))}
                className="rounded-md bg-brand px-4 py-2 font-medium text-brand-ink hover:opacity-90"
              >
                Confirm
              </button>
              <input
                aria-label="Note for the customer"
                className="min-w-0 flex-1 rounded-md border border-line bg-surface px-3 py-2 text-[15px]"
                placeholder="Note if declining, e.g. try 2pm"
                value={notes[b.id] ?? ""}
                onChange={(e) => setNotes((n) => ({ ...n, [b.id]: e.target.value }))}
              />
              <button
                type="button"
                disabled={busy}
                onClick={() => act(() => api(`/api/owner/bookings/${b.id}`, { method: "POST", body: { action: "decline", note: notes[b.id] ?? "" } }))}
                className="rounded-md border border-line px-4 py-2 font-medium hover:bg-surface-2"
              >
                Decline
              </button>
            </div>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Coming up</h2>
        {upcoming.length === 0 ? (
          <p className="text-[15px] text-muted">No confirmed bookings yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-line rounded-xl border border-line bg-surface">
            {[...upcoming, ...past].map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[15px]">
                <span>
                  {formatSlot(b.start)} · {b.serviceName} · {b.customerName}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status]}`}>{b.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {view.smsProvider === "outbox" && (
        <section aria-label="On-screen phone" className="flex flex-col gap-3 rounded-[1.75rem] border border-line bg-page p-4 sm:max-w-md">
          <p className="text-center text-sm font-semibold">Your texts (on-screen)</p>
          <ol className="flex flex-col gap-2">
            {phoneLog.length === 0 && <li className="self-center py-6 text-sm text-muted">No texts yet</li>}
            {phoneLog.map((m) => (
              <li
                key={m.id}
                className={`max-w-[88%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug ${m.direction === "in" ? "self-end bg-brand text-brand-ink" : "self-start bg-surface-2"}`}
              >
                {m.body}
              </li>
            ))}
          </ol>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const text = reply;
              setReply("");
              act(() => api("/api/sms/simulate", { method: "POST", body: { slug: shop.slug, body: text } }));
            }}
          >
            <input
              aria-label="Reply by text"
              className="min-w-0 flex-1 rounded-full border border-line bg-surface px-3 py-2 text-sm"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Y12, N12 try 2pm, HELP"
            />
            <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-page">
              Send
            </button>
          </form>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5 text-[15px]">
        <h2 className="text-xl font-semibold">How assistants find you</h2>
        <p className="text-ink-2">
          Your listing is part of Doorbell&apos;s directory. Assistants connected to Doorbell find you by what you do and
          where you are, then book through the tools at:
        </p>
        <code className="block overflow-x-auto rounded-md bg-surface-2 px-3 py-2 font-mono text-sm">{origin}/api/mcp</code>
        <p className="text-ink-2">
          Your shop&apos;s handle is <code className="font-mono">{shop.slug}</code>. Your{" "}
          <Link href={`/s/${shop.slug}`} className="text-brand underline-offset-2 hover:underline">
            public page
          </Link>{" "}
          also carries structured data that search engines and AI crawlers read.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Shop details</h2>
          <button type="button" onClick={() => setEditing((e) => !e)} className="text-sm font-medium text-brand underline-offset-2 hover:underline">
            {editing ? "Close" : "Edit hours, services and rules"}
          </button>
        </div>
        {editing && (
          <div className="rounded-xl border border-line bg-surface p-5">
            <ShopForm
              initial={toDraft(shop)}
              submitLabel="Save changes"
              busy={busy}
              error={error}
              onSubmit={(d) =>
                act(async () => {
                  await api("/api/owner", { method: "PATCH", body: toPayload(d) });
                  setEditing(false);
                })
              }
            />
          </div>
        )}
      </section>

      <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5 text-sm">
        <h2 className="font-semibold">Your private key</h2>
        <p className="text-ink-2">Use it to open this dashboard on another device. Don&apos;t share it.</p>
        {shownKey ? (
          <code className="block overflow-x-auto rounded-md bg-surface-2 px-3 py-2">{shownKey}</code>
        ) : (
          <button
            type="button"
            className="self-start font-medium text-brand underline-offset-2 hover:underline"
            onClick={async () => setShownKey((await api<{ key: string }>("/api/owner/session")).key)}
          >
            Show my key
          </button>
        )}
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2">
      <p className="text-2xl font-semibold">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}
