"use client";

import { useState } from "react";
import { dayName } from "@/lib/time";
import { CATEGORIES, type Category } from "@/lib/types";

export interface ShopDraft {
  name: string;
  category: Category;
  description: string;
  address: { street: string; city: string; state: string; zip: string };
  phone: string;
  ownerSms: string;
  timezone: string;
  /** One open interval per day in this form; null = closed. */
  days: ({ open: string; close: string } | null)[];
  services: { id?: string; name: string; durationMinutes: number; priceText: string; description: string }[];
  capacity: number;
  leadMinutes: number;
  horizonDays: number;
  replyWindowMinutes: number;
}

export function emptyShop(): ShopDraft {
  const weekday = { open: "09:00", close: "17:00" };
  return {
    name: "",
    category: "Auto repair",
    description: "",
    address: { street: "", city: "", state: "CA", zip: "" },
    phone: "",
    ownerSms: "",
    timezone: "America/Los_Angeles",
    days: [null, weekday, weekday, weekday, weekday, weekday, { open: "09:00", close: "13:00" }],
    services: [{ name: "", durationMinutes: 30, priceText: "", description: "" }],
    capacity: 1,
    leadMinutes: 60,
    horizonDays: 14,
    replyWindowMinutes: 30,
  };
}

/** The API's shape: hours as a list of intervals per day. */
export function toPayload(d: ShopDraft) {
  const { days, ...rest } = d;
  return { ...rest, hours: days.map((x) => (x ? [x] : [])), published: true };
}

const ZONES = [
  ["America/Los_Angeles", "Pacific"],
  ["America/Denver", "Mountain"],
  ["America/Phoenix", "Arizona"],
  ["America/Chicago", "Central"],
  ["America/New_York", "Eastern"],
  ["America/Anchorage", "Alaska"],
  ["Pacific/Honolulu", "Hawaii"],
];

const input = "w-full rounded-md border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";
const label = "flex flex-col gap-1.5 text-sm font-medium";

export function ShopForm({
  initial,
  submitLabel,
  busy,
  error,
  onSubmit,
}: {
  initial: ShopDraft;
  submitLabel: string;
  busy: boolean;
  error: string | null;
  onSubmit: (d: ShopDraft) => void;
}) {
  const [d, setD] = useState<ShopDraft>(initial);
  const set = <K extends keyof ShopDraft>(k: K, v: ShopDraft[K]) => setD((x) => ({ ...x, [k]: v }));

  return (
    <form
      className="flex flex-col gap-8"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(d);
      }}
    >
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-lg font-semibold">The shop</legend>
        <label className={label}>
          Shop name
          <input className={input} value={d.name} onChange={(e) => set("name", e.target.value)} required maxLength={80} />
        </label>
        <label className={label}>
          Type of shop
          <select className={input} value={d.category} onChange={(e) => set("category", e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className={`${label} sm:col-span-2`}>
          One line about the shop (optional)
          <input className={input} value={d.description} onChange={(e) => set("description", e.target.value)} maxLength={300} placeholder="Family-run since 1997. Foreign and domestic." />
        </label>
        <label className={`${label} sm:col-span-2`}>
          Street address
          <input className={input} value={d.address.street} onChange={(e) => set("address", { ...d.address, street: e.target.value })} />
        </label>
        <label className={label}>
          City
          <input className={input} value={d.address.city} onChange={(e) => set("address", { ...d.address, city: e.target.value })} required />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className={label}>
            State
            <input className={input} value={d.address.state} onChange={(e) => set("address", { ...d.address, state: e.target.value })} maxLength={20} />
          </label>
          <label className={label}>
            ZIP
            <input className={input} value={d.address.zip} onChange={(e) => set("address", { ...d.address, zip: e.target.value })} inputMode="numeric" maxLength={10} />
          </label>
        </div>
        <label className={label}>
          Shop phone (customers see this)
          <input className={input} value={d.phone} onChange={(e) => set("phone", e.target.value)} required inputMode="tel" />
        </label>
        <label className={label}>
          Cell for booking texts (private)
          <input className={input} value={d.ownerSms} onChange={(e) => set("ownerSms", e.target.value)} required inputMode="tel" />
        </label>
        <label className={label}>
          Time zone
          <select className={input} value={d.timezone} onChange={(e) => set("timezone", e.target.value)}>
            {ZONES.map(([z, n]) => (
              <option key={z} value={z}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-3 text-lg font-semibold">Hours</legend>
        {d.days.map((day, i) => (
          <div key={i} className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line pb-2 last:border-0 sm:flex-nowrap">
            <span className="w-24 text-[15px] sm:w-28">{dayName(i, true)}</span>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[var(--brand)]"
                checked={day !== null}
                onChange={(e) => set("days", d.days.map((x, j) => (j === i ? (e.target.checked ? { open: "09:00", close: "17:00" } : null) : x)))}
              />
              Open
            </label>
            {day ? (
              <span className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
                <input
                  aria-label={`${dayName(i, true)} opens`}
                  type="time"
                  className={`${input} min-w-0 flex-1 sm:w-36 sm:flex-none`}
                  value={day.open}
                  onChange={(e) => set("days", d.days.map((x, j) => (j === i && x ? { ...x, open: e.target.value } : x)))}
                />
                <span className="text-muted">–</span>
                <input
                  aria-label={`${dayName(i, true)} closes`}
                  type="time"
                  className={`${input} min-w-0 flex-1 sm:w-36 sm:flex-none`}
                  value={day.close}
                  onChange={(e) => set("days", d.days.map((x, j) => (j === i && x ? { ...x, close: e.target.value } : x)))}
                />
              </span>
            ) : (
              <span className="text-sm text-muted">Closed</span>
            )}
          </div>
        ))}
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-3 text-lg font-semibold">Services</legend>
        {d.services.map((s, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_7rem_8rem_auto]">
            <input
              aria-label="Service name"
              className={input}
              value={s.name}
              placeholder="Oil change"
              required
              onChange={(e) => set("services", d.services.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                aria-label="Minutes"
                type="number"
                min={5}
                max={480}
                step={5}
                className={input}
                value={s.durationMinutes}
                onChange={(e) => set("services", d.services.map((x, j) => (j === i ? { ...x, durationMinutes: Number(e.target.value) } : x)))}
              />
              min
            </label>
            <input
              aria-label="Price"
              className={input}
              value={s.priceText}
              placeholder="$49"
              onChange={(e) => set("services", d.services.map((x, j) => (j === i ? { ...x, priceText: e.target.value } : x)))}
            />
            <button
              type="button"
              disabled={d.services.length === 1}
              onClick={() => set("services", d.services.filter((_, j) => j !== i))}
              className="rounded-md border border-line px-3 py-2 text-sm hover:bg-surface-2 disabled:opacity-40"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => set("services", [...d.services, { name: "", durationMinutes: 30, priceText: "", description: "" }])}
          className="self-start text-sm font-medium text-brand underline-offset-2 hover:underline"
        >
          + Add a service
        </button>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-3 text-lg font-semibold">Booking rules</legend>
        <label className={label}>
          Customers you can take at the same time
          <input type="number" min={1} max={20} className={input} value={d.capacity} onChange={(e) => set("capacity", Number(e.target.value))} />
          <span className="text-xs font-normal text-muted">Bays, chairs, or staff working at once.</span>
        </label>
        <label className={label}>
          Time to answer a request
          <select className={input} value={d.replyWindowMinutes} onChange={(e) => set("replyWindowMinutes", Number(e.target.value))}>
            {[15, 30, 60, 120].map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} minutes` : `${m / 60} hour${m > 60 ? "s" : ""}`}
              </option>
            ))}
          </select>
          <span className="text-xs font-normal text-muted">After that the request expires and the customer is told.</span>
        </label>
        <label className={label}>
          Minimum notice
          <select className={input} value={d.leadMinutes} onChange={(e) => set("leadMinutes", Number(e.target.value))}>
            {[
              [0, "None"],
              [30, "30 minutes"],
              [60, "1 hour"],
              [120, "2 hours"],
              [1440, "1 day"],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Take bookings up to
          <select className={input} value={d.horizonDays} onChange={(e) => set("horizonDays", Number(e.target.value))}>
            {[7, 14, 30, 60].map((v) => (
              <option key={v} value={v}>
                {v} days ahead
              </option>
            ))}
          </select>
        </label>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn-ink">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy} className="self-start rounded-md bg-brand px-5 py-2.5 font-medium text-brand-ink hover:opacity-90 disabled:opacity-60">
        {busy ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
