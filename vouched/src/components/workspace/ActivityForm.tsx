"use client";

import { useState } from "react";
import { COMMON_APP, UC_APP } from "@/lib/checks";
import { CATEGORIES, type Activity, type CustomClaim } from "@/lib/types";

export type ActivityDraft = Omit<Activity, "id" | "createdAt" | "updatedAt" | "endMonth"> & { endMonth: string };

export function emptyDraft(): ActivityDraft {
  return {
    category: "Other",
    position: "",
    organization: "",
    orgDomain: "",
    startMonth: "",
    endMonth: "",
    hoursPerWeek: 0,
    weeksPerYear: 0,
    description: "",
    claims: [],
  };
}

export function toDraft(a: Activity): ActivityDraft {
  return { ...a, endMonth: a.endMonth ?? "" };
}

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

function Counter({ length, limit, second }: { length: number; limit: number; second?: { label: string; limit: number } }) {
  const over = length > limit;
  return (
    <span className={`tabular text-xs ${over ? "font-medium text-critical" : "text-muted"}`}>
      {length}/{limit} Common App{second ? ` · ${second.label} ${second.limit}` : ""}
    </span>
  );
}

export function ActivityForm({
  initial,
  submitLabel,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  initial: ActivityDraft;
  submitLabel: string;
  busy: boolean;
  error: string | null;
  onSubmit: (draft: ActivityDraft) => void;
  onCancel: () => void;
}) {
  const [d, setD] = useState<ActivityDraft>(initial);
  const set = <K extends keyof ActivityDraft>(key: K, value: ActivityDraft[K]) => setD((x) => ({ ...x, [key]: value }));
  const setClaim = (i: number, patch: Partial<CustomClaim>) =>
    setD((x) => ({ ...x, claims: x.claims.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(d);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Category
          <select className={input} value={d.category} onChange={(e) => set("category", e.target.value as ActivityDraft["category"])}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          <span className="flex items-baseline justify-between">
            Position or role <Counter length={d.position.length} limit={COMMON_APP.position} />
          </span>
          <input className={input} value={d.position} onChange={(e) => set("position", e.target.value)} placeholder="Founder, sports photographer" required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          <span className="flex items-baseline justify-between">
            Organization <Counter length={d.organization.length} limit={COMMON_APP.organization} />
          </span>
          <input className={input} value={d.organization} onChange={(e) => set("organization", e.target.value)} placeholder="Inderkum High School athletics" required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Organization website
          <input className={input} value={d.orgDomain} onChange={(e) => set("orgDomain", e.target.value)} placeholder="natomasunified.org" />
          <span className="text-xs font-normal text-muted">
            Verifiers emailing from this domain count as the organization itself.
          </span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Started
          <input className={input} type="month" value={d.startMonth} onChange={(e) => set("startMonth", e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Ended
          <input className={input} type="month" value={d.endMonth} onChange={(e) => set("endMonth", e.target.value)} />
          <span className="text-xs font-normal text-muted">Leave empty if you still do it.</span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Hours per week
          <input
            className={input}
            type="number"
            min={0}
            max={100}
            step={0.5}
            inputMode="decimal"
            value={d.hoursPerWeek}
            onChange={(e) => set("hoursPerWeek", Number(e.target.value))}
          />
          <span className="text-xs font-normal text-muted">A typical week, not your busiest.</span>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Weeks per year
          <input
            className={input}
            type="number"
            min={0}
            max={52}
            inputMode="numeric"
            value={d.weeksPerYear}
            onChange={(e) => set("weeksPerYear", Number(e.target.value))}
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        <span className="flex items-baseline justify-between">
          Description <Counter length={d.description.length} limit={COMMON_APP.description} second={{ label: "UC", limit: UC_APP.description }} />
        </span>
        <textarea className={`${input} min-h-24`} value={d.description} onChange={(e) => set("description", e.target.value)} />
      </label>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-medium">Specific claims (optional)</legend>
        <p className="-mt-1 text-sm text-ink-2">
          Numbers and results a verifier can confirm: games shot, money raised, people trained, awards. Each one gets its
          own check.
        </p>
        {d.claims.map((c, i) => (
          <div key={c.id} className="flex flex-col gap-2 sm:flex-row">
            <select
              aria-label="Claim type"
              className={`${input} sm:w-36`}
              value={c.kind}
              onChange={(e) => setClaim(i, { kind: e.target.value as CustomClaim["kind"] })}
            >
              <option value="impact">Impact</option>
              <option value="revenue">Revenue</option>
              <option value="award">Award</option>
            </select>
            <input
              aria-label="Claim"
              className={input}
              value={c.text}
              maxLength={200}
              onChange={(e) => setClaim(i, { text: e.target.value })}
              placeholder="Photographed 41 varsity games"
            />
            <button
              type="button"
              className="rounded-md border border-line px-3 py-2 text-sm hover:bg-surface-2"
              onClick={() => setD((x) => ({ ...x, claims: x.claims.filter((_, j) => j !== i) }))}
            >
              Remove
            </button>
          </div>
        ))}
        {d.claims.length < 6 && (
          <button
            type="button"
            className="self-start text-sm font-medium text-brand underline-offset-2 hover:underline"
            onClick={() =>
              setD((x) => ({ ...x, claims: [...x.claims, { id: `new${Date.now().toString(36)}${x.claims.length}`, kind: "impact", text: "" }] }))
            }
          >
            + Add a claim
          </button>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn-ink">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="rounded-md bg-brand px-4 py-2 font-medium text-brand-ink hover:opacity-90 disabled:opacity-60">
          {busy ? "Saving…" : submitLabel}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-line px-4 py-2 font-medium hover:bg-surface-2">
          Cancel
        </button>
      </div>
    </form>
  );
}
