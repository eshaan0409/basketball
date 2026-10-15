"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { VerifierView } from "@/lib/service";
import type { Verdict } from "@/lib/types";

const input =
  "w-full rounded-md border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/30";

const OPTIONS: { value: Verdict; label: string }[] = [
  { value: "confirmed", label: "Accurate" },
  { value: "corrected", label: "Needs a correction" },
  { value: "unknown", label: "I can't say" },
];

export function VerifierForm({ token, view }: { token: string; view: VerifierView }) {
  const first = view.studentName.split(" ")[0] || view.studentName;
  const [answers, setAnswers] = useState<Record<string, { verdict?: Verdict; correction: string }>>(
    Object.fromEntries(view.statements.map((s) => [s.key, { correction: "" }])),
  );
  const [signedName, setSignedName] = useState(view.verifierName);
  const [signedTitle, setSignedTitle] = useState(view.verifierTitle);
  const [comment, setComment] = useState("");
  const [attest, setAttest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"submitted" | "declined" | null>(null);
  const [declining, setDeclining] = useState(false);

  const send = async (body: Record<string, unknown>, outcome: "submitted" | "declined") => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/verify/${token}`, { method: "POST", body });
      setDone(outcome);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6" role="status">
        <h2 className="text-xl font-semibold">{done === "submitted" ? "Thank you" : "Got it"}</h2>
        <p className="mt-2 text-ink-2">
          {done === "submitted"
            ? `Your answers are now part of ${first}'s record. You can close this page.`
            : `We've let ${first} know you can't verify this. Nothing about it will be shown.`}
        </p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(e) => {
        e.preventDefault();
        send(
          {
            attest,
            signedName,
            signedTitle,
            comment,
            statements: view.statements.map((s) => ({ key: s.key, verdict: answers[s.key]?.verdict, correction: answers[s.key]?.correction })),
          },
          "submitted",
        );
      }}
    >
      <ol className="flex flex-col gap-4">
        {view.statements.map((s, i) => {
          const a = answers[s.key];
          return (
            <li key={s.key} className="rounded-xl border border-line bg-surface p-5">
              <fieldset className="flex flex-col gap-3">
                <legend className="w-full">
                  <span className="text-xs font-medium tracking-wide text-muted uppercase">
                    {i + 1}. {s.label}
                  </span>
                  <span className="mt-1 block text-[17px] text-ink">{s.text}</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {OPTIONS.map((o) => (
                    <label
                      key={o.value}
                      className={`cursor-pointer rounded-md border px-3 py-2 text-sm font-medium ${
                        a.verdict === o.value ? "border-brand bg-brand-soft text-brand" : "border-line hover:bg-surface-2"
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name={`v-${s.key}`}
                        value={o.value}
                        checked={a.verdict === o.value}
                        onChange={() => setAnswers((x) => ({ ...x, [s.key]: { ...x[s.key], verdict: o.value } }))}
                        required
                      />
                      {o.label}
                    </label>
                  ))}
                </div>
                {a.verdict === "corrected" && (
                  <label className="flex flex-col gap-1.5 text-sm font-medium">
                    What&apos;s accurate?
                    <input
                      className={input}
                      value={a.correction}
                      maxLength={200}
                      onChange={(e) => setAnswers((x) => ({ ...x, [s.key]: { ...x[s.key], correction: e.target.value } }))}
                      placeholder={s.text}
                      required
                    />
                  </label>
                )}
              </fieldset>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-5">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Anything you&apos;d add? (optional)
          <textarea className={`${input} min-h-20`} value={comment} maxLength={500} onChange={(e) => setComment(e.target.value)} />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Your full name
            <input className={input} value={signedName} onChange={(e) => setSignedName(e.target.value)} required />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Your title
            <input className={input} value={signedTitle} onChange={(e) => setSignedTitle(e.target.value)} />
          </label>
        </div>
        <label className="flex items-start gap-2 text-[15px]">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--brand)]" checked={attest} onChange={(e) => setAttest(e.target.checked)} required />
          <span>
            My answers are accurate to the best of my knowledge, and I am not a member of {first}&apos;s family.
          </span>
        </label>
        <p className="text-sm text-muted">
          Your name, title and answers will be shown to people {first} chooses to share their record with. Your email
          address is never shown.
        </p>
        {error && (
          <p role="alert" className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn-ink">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" disabled={busy} className="rounded-md bg-brand px-5 py-2.5 font-medium text-brand-ink hover:opacity-90 disabled:opacity-60">
            {busy ? "Sending…" : "Submit answers"}
          </button>
          {!declining ? (
            <button type="button" className="text-sm text-ink-2 underline-offset-2 hover:underline" onClick={() => setDeclining(true)}>
              I can&apos;t verify this
            </button>
          ) : (
            <span className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-2">Decline this request?</span>
              <button
                type="button"
                disabled={busy}
                className="rounded-md border border-line px-3 py-1.5 font-medium hover:bg-surface-2"
                onClick={() => send({ decline: true, comment, signedName, signedTitle }, "declined")}
              >
                Yes, decline
              </button>
              <button type="button" className="text-ink-2" onClick={() => setDeclining(false)}>
                Cancel
              </button>
            </span>
          )}
        </div>
      </div>
    </form>
  );
}
