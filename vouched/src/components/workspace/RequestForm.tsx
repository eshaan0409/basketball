"use client";

import { useState } from "react";
import { checkVerifier, LEVEL_LABELS } from "@/lib/assurance";
import { statementsFor } from "@/lib/statements";
import { RELATIONSHIPS, type Activity, type Relationship } from "@/lib/types";
import { LevelBadge } from "../Badge";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

export interface RequestDraft {
  verifierName: string;
  verifierEmail: string;
  verifierTitle: string;
  relationship: Relationship;
  statementKeys: string[];
}

export function RequestForm({
  activity,
  busy,
  error,
  onSubmit,
  onCancel,
}: {
  activity: Activity;
  busy: boolean;
  error: string | null;
  onSubmit: (draft: RequestDraft) => void;
  onCancel: () => void;
}) {
  const statements = statementsFor(activity);
  const [d, setD] = useState<RequestDraft>({
    verifierName: "",
    verifierEmail: "",
    verifierTitle: "",
    relationship: "supervisor",
    statementKeys: statements.map((s) => s.key),
  });
  const check =
    d.verifierEmail.includes("@") || d.relationship === "family"
      ? checkVerifier({ email: d.verifierEmail, relationship: d.relationship, orgDomain: activity.orgDomain, name: d.verifierName || "x" })
      : null;

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
          Their full name
          <input className={input} value={d.verifierName} onChange={(e) => setD({ ...d, verifierName: e.target.value })} required />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Their title
          <input
            className={input}
            value={d.verifierTitle}
            onChange={(e) => setD({ ...d, verifierTitle: e.target.value })}
            placeholder="Athletic Director"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Their email
          <input
            className={input}
            type="email"
            value={d.verifierEmail}
            onChange={(e) => setD({ ...d, verifierEmail: e.target.value })}
            placeholder={activity.orgDomain ? `name@${activity.orgDomain}` : "name@organization.org"}
            required
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          How they know your work
          <select className={input} value={d.relationship} onChange={(e) => setD({ ...d, relationship: e.target.value as Relationship })}>
            {RELATIONSHIPS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {check && (
        <div className="flex flex-col gap-1 rounded-md border border-line bg-surface-2 px-3 py-2 text-sm">
          {check.ok ? (
            <span className="flex flex-wrap items-center gap-2">
              Their answer will show as <LevelBadge level={check.maxLevel} />
            </span>
          ) : (
            <span className="font-medium text-critical">{check.notes[0]}</span>
          )}
          {check.ok && check.notes.map((n) => <span key={n} className="text-ink-2">{n}</span>)}
          {check.ok && check.maxLevel === 1 && (
            <span className="text-muted">For “{LEVEL_LABELS[2]}”, ask someone with an address at the organization&apos;s website domain.</span>
          )}
        </div>
      )}

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">What should they confirm?</legend>
        {statements.map((s) => (
          <label key={s.key} className="flex items-start gap-2 text-[15px]">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-[var(--brand)]"
              checked={d.statementKeys.includes(s.key)}
              onChange={(e) =>
                setD({
                  ...d,
                  statementKeys: e.target.checked ? [...d.statementKeys, s.key] : d.statementKeys.filter((k) => k !== s.key),
                })
              }
            />
            <span>
              <span className="text-xs font-medium tracking-wide text-muted uppercase">{s.label}</span>
              <br />
              {s.text}
            </span>
          </label>
        ))}
      </fieldset>

      {error && (
        <p role="alert" className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn-ink">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy || (check !== null && !check.ok)}
          className="rounded-md bg-brand px-4 py-2 font-medium text-brand-ink hover:opacity-90 disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create verification link"}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md border border-line px-4 py-2 font-medium hover:bg-surface-2">
          Cancel
        </button>
      </div>
    </form>
  );
}
