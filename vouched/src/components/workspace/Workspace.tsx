"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatRange } from "@/lib/statements";
import type { OwnerRequest, OwnerView } from "@/lib/views";
import { RELATIONSHIPS } from "@/lib/types";
import { LevelBadge } from "../Badge";
import { StatementList } from "../StatementList";
import { ActivityForm, emptyDraft, toDraft, type ActivityDraft } from "./ActivityForm";
import { RequestForm, type RequestDraft } from "./RequestForm";

type View = OwnerView & { durable?: boolean };
type Mode = { kind: "none" } | { kind: "new" } | { kind: "edit"; id: string } | { kind: "request"; id: string };

export function Workspace() {
  const router = useRouter();
  const [view, setView] = useState<View | null>(null);
  const [mode, setMode] = useState<Mode>({ kind: "none" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fresh, setFresh] = useState<{ activityId: string; token: string; name: string; email: string } | null>(null);
  const [origin, setOrigin] = useState("");

  const load = useCallback(async () => {
    try {
      setView(await api<View>("/api/profile"));
    } catch (e) {
      if ((e as { status?: number }).status === 401) router.replace("/start");
      else setError((e as Error).message);
    }
  }, [router]);

  useEffect(() => {
    setOrigin(window.location.origin);
    load();
  }, [load]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const saveActivity = (draft: ActivityDraft, id?: string) =>
    run(async () => {
      const body = { ...draft, endMonth: draft.endMonth || null };
      const next = id
        ? await api<View>(`/api/activities/${id}`, { method: "PATCH", body })
        : await api<View>("/api/activities", { method: "POST", body });
      setView((v) => ({ ...next, durable: v?.durable }));
      setMode({ kind: "none" });
    });

  const createRequest = (activityId: string, draft: RequestDraft) =>
    run(async () => {
      const res = await api<{ token: string; view: View }>(`/api/activities/${activityId}/requests`, { method: "POST", body: draft });
      setView((v) => ({ ...res.view, durable: v?.durable }));
      setFresh({ activityId, token: res.token, name: draft.verifierName, email: draft.verifierEmail });
      setMode({ kind: "none" });
    });

  const mutate = (path: string, method: string, body?: unknown) =>
    run(async () => {
      const next = await api<View>(path, { method, body });
      setView((v) => ({ ...next, durable: v?.durable }));
    });

  if (!view) {
    return <p className="text-ink-2">{error ?? "Loading your record…"}</p>;
  }

  const activityById = new Map(view.activities.map((a) => [a.id, a]));
  const ordered = [...view.assessments]
    .sort((a, b) => b.coreLevel - a.coreLevel)
    .map((a) => ({ activity: activityById.get(a.activityId)!, assessment: a }));

  return (
    <div className="flex flex-col gap-8">
      {view.durable === false && (
        <p className="rounded-lg border border-line bg-warn-bg px-4 py-3 text-sm text-warn-ink">
          This deployment has no database yet, so records can disappear when the server restarts. Fine for trying it; not
          for real applications.
        </p>
      )}

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand">Your record</p>
          <h1 className="text-3xl font-semibold tracking-tight">{view.name}</h1>
          <p className="text-ink-2">{[view.school, view.gradYear ? `Class of ${view.gradYear}` : ""].filter(Boolean).join(" · ")}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Stat level={2} count={view.summary.organizationConfirmed} />
          <Stat level={1} count={view.summary.personConfirmed} />
          <Stat level={0} count={view.summary.selfReported} />
        </div>
      </header>

      {view.findings.length > 0 && (
        <section aria-label="Before a reader sees this" className="rounded-xl border border-line bg-surface p-5">
          <h2 className="font-semibold">Before a reader sees this</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {view.findings.map((f) => (
              <li key={f.message} className="flex gap-2">
                <span
                  className={`mt-0.5 inline-block shrink-0 rounded px-1.5 text-[11px] font-semibold uppercase ${
                    f.severity === "error" ? "bg-critical text-white" : f.severity === "warning" ? "bg-warn-bg text-warn-ink" : "bg-surface-2 text-ink-2"
                  }`}
                >
                  {f.severity === "error" ? "Fix" : f.severity === "warning" ? "Check" : "Tip"}
                </span>
                <span className="text-ink-2">{f.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && mode.kind === "none" && (
        <p role="alert" className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn-ink">
          {error}
        </p>
      )}

      {fresh && (
        <NewLink
          url={`${origin}/v/${fresh.token}`}
          name={fresh.name}
          email={fresh.email}
          student={view.name}
          organization={activityById.get(fresh.activityId)?.organization ?? ""}
          onClose={() => setFresh(null)}
        />
      )}

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-semibold">Activities</h2>
          {mode.kind !== "new" && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setMode({ kind: "new" });
              }}
              className="rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-ink hover:opacity-90"
            >
              Add an activity
            </button>
          )}
        </div>

        {mode.kind === "new" && (
          <div className="rounded-xl border border-line bg-surface p-5">
            <h3 className="mb-4 font-semibold">New activity</h3>
            <ActivityForm initial={emptyDraft()} submitLabel="Add activity" busy={busy} error={error} onSubmit={(d) => saveActivity(d)} onCancel={() => setMode({ kind: "none" })} />
          </div>
        )}

        {ordered.length === 0 && mode.kind !== "new" && (
          <div className="rounded-xl border border-dashed border-axis p-8 text-center text-ink-2">
            Add your first activity: a job, a team, a business, a cause. Then ask the person who saw your work to confirm it.
          </div>
        )}

        {ordered.map(({ activity, assessment }) => (
          <article key={activity.id} className="rounded-xl border border-line bg-surface p-5">
            {mode.kind === "edit" && mode.id === activity.id ? (
              <>
                <h3 className="mb-4 font-semibold">Edit activity</h3>
                <p className="mb-4 text-sm text-ink-2">Changing a verified statement sends it back to self-reported until it is confirmed again.</p>
                <ActivityForm
                  initial={toDraft(activity)}
                  submitLabel="Save changes"
                  busy={busy}
                  error={error}
                  onSubmit={(d) => saveActivity(d, activity.id)}
                  onCancel={() => setMode({ kind: "none" })}
                />
              </>
            ) : (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium tracking-wide text-muted uppercase">{activity.category}</p>
                    <h3 className="mt-1 text-lg font-semibold">{activity.position}</h3>
                    <p className="text-ink-2">
                      {activity.organization} · {formatRange(activity.startMonth, activity.endMonth)}
                    </p>
                  </div>
                  <LevelBadge level={assessment.coreLevel} />
                </div>
                <div className="mt-4 border-t border-line pt-4">
                  <StatementList statements={assessment.statements} audience="owner" />
                </div>
                {assessment.statements
                  .filter((s) => s.corrected && s.key.startsWith("claim:"))
                  .map((s) => (
                    <div key={s.key} className="mt-3 flex flex-wrap items-center gap-3 rounded-md bg-surface-2 px-3 py-2 text-sm">
                      <span className="text-ink-2">Use the verifier&apos;s wording for “{s.shown}”?</span>
                      <button
                        type="button"
                        disabled={busy}
                        className="font-medium text-brand underline-offset-2 hover:underline"
                        onClick={() => mutate(`/api/activities/${activity.id}/accept`, "POST", { statementKey: s.key })}
                      >
                        Accept correction
                      </button>
                    </div>
                  ))}

                <Requests
                  requests={view.requests.filter((r) => r.activityId === activity.id)}
                  origin={origin}
                  busy={busy}
                  onWithdraw={(id) => mutate(`/api/requests/${id}`, "DELETE")}
                />

                {mode.kind === "request" && mode.id === activity.id ? (
                  <div className="mt-4 border-t border-line pt-4">
                    <h4 className="mb-3 font-semibold">Ask someone to verify this</h4>
                    <RequestForm
                      activity={activity}
                      busy={busy}
                      error={error}
                      onSubmit={(d) => createRequest(activity.id, d)}
                      onCancel={() => setMode({ kind: "none" })}
                    />
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4 text-sm">
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setFresh(null);
                        setMode({ kind: "request", id: activity.id });
                      }}
                      className="rounded-md bg-brand px-3 py-1.5 font-medium text-brand-ink hover:opacity-90"
                    >
                      Ask someone to verify
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setError(null);
                        setMode({ kind: "edit", id: activity.id });
                      }}
                      className="rounded-md border border-line px-3 py-1.5 font-medium hover:bg-surface-2"
                    >
                      Edit
                    </button>
                    <DeleteButton
                      disabled={busy}
                      label={activity.position}
                      onConfirm={() => mutate(`/api/activities/${activity.id}`, "DELETE")}
                    />
                  </div>
                )}
              </>
            )}
          </article>
        ))}
      </section>

      <SharePanel view={view} origin={origin} busy={busy} onCreate={(label) => run(async () => {
        const res = await api<{ view: View }>("/api/shares", { method: "POST", body: { label } });
        setView((v) => ({ ...res.view, durable: v?.durable }));
      })} onRevoke={(token) => mutate(`/api/shares/${token}`, "DELETE")} />

      <KeyPanel />
    </div>
  );
}

function Stat({ level, count }: { level: 0 | 1 | 2; count: number }) {
  return (
    <span className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
      <span className="text-lg font-semibold">{count}</span>
      <LevelBadge level={level} short />
    </span>
  );
}

function relationshipLabel(value: string) {
  return RELATIONSHIPS.find((r) => r.value === value)?.label ?? value;
}

const STATUS: Record<OwnerRequest["status"], string> = {
  pending: "Waiting for answer",
  submitted: "Answered",
  declined: "Declined",
  expired: "Expired",
};

function Requests({
  requests,
  origin,
  busy,
  onWithdraw,
}: {
  requests: OwnerRequest[];
  origin: string;
  busy: boolean;
  onWithdraw: (id: string) => void;
}) {
  if (requests.length === 0) return null;
  return (
    <div className="mt-4 border-t border-line pt-4">
      <h4 className="text-sm font-semibold">Verification requests</h4>
      <ul className="mt-2 flex flex-col gap-2 text-sm">
        {requests.map((r) => (
          <li key={r.id} className="flex flex-col gap-1 rounded-md bg-surface-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="min-w-0">
              <span className="font-medium">{r.verifierName}</span>
              <span className="text-ink-2">
                {" "}
                · {relationshipLabel(r.relationship)} · {r.verifierEmail}
              </span>
              {r.comment && <span className="block text-ink-2">“{r.comment}”</span>}
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <span className={r.status === "submitted" ? "font-medium text-brand" : "text-muted"}>{STATUS[r.status]}</span>
              {r.status === "pending" && (
                <>
                  <CopyButton text={`${origin}/v/${r.token}`} label="Copy link" />
                  <button type="button" disabled={busy} className="text-ink-2 underline-offset-2 hover:underline" onClick={() => onWithdraw(r.id)}>
                    Withdraw
                  </button>
                </>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function NewLink({
  url,
  name,
  email,
  student,
  organization,
  onClose,
}: {
  url: string;
  name: string;
  email: string;
  student: string;
  organization: string;
  onClose: () => void;
}) {
  const first = name.split(" ")[0] || name;
  const subject = `Could you confirm my work with ${organization}?`;
  const body = `Hi ${first},\n\nI'm putting together a verified record of my activities for college applications. Could you confirm a few details about my work with ${organization}? It takes about two minutes and you don't need an account:\n\n${url}\n\nThank you,\n${student}`;
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-brand bg-brand-soft p-5" aria-live="polite">
      <h2 className="font-semibold text-ink">Link ready for {name}</h2>
      <p className="text-sm text-ink-2">
        Send it from your own email or text. Anyone with this link can answer, so send it only to {first}. It expires in 30
        days.
      </p>
      <code className="block overflow-x-auto rounded-md border border-line bg-surface px-3 py-2 text-sm">{url}</code>
      <div className="flex flex-wrap gap-2 text-sm">
        <CopyButton text={url} label="Copy link" primary />
        <CopyButton text={body} label="Copy message" />
        <a
          className="rounded-md border border-line bg-surface px-3 py-1.5 font-medium hover:bg-surface-2"
          href={`mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
        >
          Open in email
        </a>
        <button type="button" onClick={onClose} className="px-3 py-1.5 text-ink-2 underline-offset-2 hover:underline">
          Done
        </button>
      </div>
    </section>
  );
}

function CopyButton({ text, label, primary = false }: { text: string; label: string; primary?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          window.prompt("Copy this:", text);
        }
      }}
      className={
        primary
          ? "rounded-md bg-brand px-3 py-1.5 font-medium text-brand-ink hover:opacity-90"
          : "rounded-md border border-line bg-surface px-3 py-1.5 font-medium hover:bg-surface-2"
      }
    >
      {copied ? "Copied" : label}
    </button>
  );
}

function DeleteButton({ label, disabled, onConfirm }: { label: string; disabled: boolean; onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button type="button" onClick={() => setArmed(true)} className="rounded-md px-3 py-1.5 font-medium text-ink-2 hover:bg-surface-2">
        Delete
      </button>
    );
  }
  return (
    <span className="flex items-center gap-2">
      <span className="text-ink-2">Delete “{label}” and its verifications?</span>
      <button type="button" disabled={disabled} onClick={onConfirm} className="rounded-md bg-critical px-3 py-1.5 font-medium text-white">
        Delete
      </button>
      <button type="button" onClick={() => setArmed(false)} className="px-2 py-1.5 text-ink-2">
        Keep
      </button>
    </span>
  );
}

function SharePanel({
  view,
  origin,
  busy,
  onCreate,
  onRevoke,
}: {
  view: OwnerView;
  origin: string;
  busy: boolean;
  onCreate: (label: string) => void;
  onRevoke: (token: string) => void;
}) {
  const [label, setLabel] = useState("");
  const active = view.shares.filter((s) => !s.revokedAt);
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-line bg-surface p-5">
      <h2 className="text-xl font-semibold">Share your record</h2>
      <p className="text-sm text-ink-2">
        Make a private link for each place you share it: an application, a scholarship, a recommender. Turn any link off
        and it stops working. Readers see names and titles of your verifiers, never their emails.
      </p>
      <form
        className="flex flex-col gap-2 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          onCreate(label);
          setLabel("");
        }}
      >
        <input
          aria-label="Link label"
          className="w-full rounded-md border border-line bg-surface px-3 py-2 text-[15px] outline-none focus:border-brand sm:max-w-sm"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="UC application"
          maxLength={60}
        />
        <button type="submit" disabled={busy} className="rounded-md bg-brand px-4 py-2 font-medium text-brand-ink hover:opacity-90 disabled:opacity-60">
          Create link
        </button>
      </form>
      {active.length > 0 && (
        <ul className="flex flex-col gap-2 text-sm">
          {active.map((s) => (
            <li key={s.token} className="flex flex-col gap-2 rounded-md bg-surface-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="min-w-0">
                <span className="font-medium">{s.label}</span>
                <code className="mt-0.5 block truncate text-xs text-ink-2">{`${origin}/p/${s.token}`}</code>
              </span>
              <span className="flex shrink-0 items-center gap-3">
                <Link href={`/p/${s.token}`} className="font-medium text-brand underline-offset-2 hover:underline" target="_blank">
                  Preview
                </Link>
                <CopyButton text={`${origin}/p/${s.token}`} label="Copy" />
                <button type="button" disabled={busy} onClick={() => onRevoke(s.token)} className="text-ink-2 underline-offset-2 hover:underline">
                  Turn off
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function KeyPanel() {
  const [key, setKey] = useState<string | null>(null);
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-5 text-sm">
      <h2 className="font-semibold">Your private key</h2>
      <p className="text-ink-2">
        There are no passwords yet. This browser remembers you; to open your record on another device, you need this key.
        Keep it somewhere safe and don&apos;t share it.
      </p>
      {key ? (
        <code className="block overflow-x-auto rounded-md border border-line bg-surface-2 px-3 py-2">{key}</code>
      ) : (
        <button
          type="button"
          className="self-start font-medium text-brand underline-offset-2 hover:underline"
          onClick={async () => setKey((await api<{ key: string }>("/api/session")).key)}
        >
          Show my key
        </button>
      )}
    </section>
  );
}

