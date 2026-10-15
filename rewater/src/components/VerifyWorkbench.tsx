"use client";

import { useState } from "react";
import { parseEnrollments, parseMeterReads, parseWeather, toCsv } from "@/lib/engine/csv";
import { describeDemo, generateDemoData } from "@/lib/engine/demo";
import type { VerifyInput, VerifyResult } from "@/lib/engine/types";
import { verifySavings } from "@/lib/engine/verify";
import { downloadText } from "@/lib/report";
import { Results } from "./Results";

type FileKey = "reads" | "enrollments" | "weather";

const FILES: { key: FileKey; label: string; hint: string }[] = [
  { key: "reads", label: "Meter reads", hint: "account_id, date, gallons (or ccf). Daily or monthly." },
  { key: "enrollments", label: "Installs", hint: "account_id, install_date, intervention" },
  { key: "weather", label: "Monthly weather", hint: "month, et0_in, rain_in (e.g. from a CIMIS station)" },
];

interface Loaded {
  name: string;
  text: string;
}

export function VerifyWorkbench() {
  const [files, setFiles] = useState<Partial<Record<FileKey, Loaded>>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [dataset, setDataset] = useState<string>("");
  const [running, setRunning] = useState(false);

  const run = (input: VerifyInput, label: string) => {
    setRunning(true);
    setErrors([]);
    // Let the button state paint before the bootstrap runs.
    setTimeout(() => {
      try {
        setResult(verifySavings(input));
        setDataset(label);
      } catch (e) {
        setErrors([e instanceof Error ? e.message : String(e)]);
        setResult(null);
      } finally {
        setRunning(false);
      }
    }, 20);
  };

  const runDemo = () => {
    const demo = generateDemoData();
    run(demo, `Synthetic demo: ${describeDemo(demo.options)}`);
  };

  const runUploads = () => {
    const missing = FILES.filter((f) => !files[f.key]).map((f) => f.label);
    if (missing.length > 0) {
      setErrors([`Add the ${missing.join(" and ")} file${missing.length > 1 ? "s" : ""} first.`]);
      return;
    }
    const reads = parseMeterReads(files.reads!.text);
    const enrollments = parseEnrollments(files.enrollments!.text);
    const weather = parseWeather(files.weather!.text);
    const problems = [
      ...reads.errors.map((e) => `Meter reads: ${e}`),
      ...enrollments.errors.map((e) => `Installs: ${e}`),
      ...weather.errors.map((e) => `Weather: ${e}`),
    ];
    if (reads.rows.length === 0 || enrollments.rows.length === 0 || weather.rows.length === 0) {
      setErrors(problems.length > 0 ? problems : ["One of the files has no usable rows."]);
      return;
    }
    run(
      { reads: reads.rows, enrollments: enrollments.rows, weather: weather.rows },
      `Uploaded: ${FILES.map((f) => files[f.key]!.name).join(", ")}`,
    );
    // Row-level problems are worth showing even when the run goes ahead.
    if (problems.length > 0) setTimeout(() => setErrors(problems), 40);
  };

  const downloadSamples = () => {
    const demo = generateDemoData({ homes: 40 });
    downloadText("sample_meter_reads.csv", toCsv(["account_id", "date", "gallons"], demo.reads.map((r) => [r.accountId, r.period, r.gallons])));
    downloadText(
      "sample_installs.csv",
      toCsv(["account_id", "install_date", "intervention"], demo.enrollments.map((e) => [e.accountId, e.installDate, e.intervention])),
    );
    downloadText("sample_weather.csv", toCsv(["month", "et0_in", "rain_in"], demo.weather.map((w) => [w.month, w.et0In, w.rainIn])));
  };

  const onFile = async (key: FileKey, file: File | undefined) => {
    if (!file) return;
    const text = await file.text();
    setFiles((f) => ({ ...f, [key]: { name: file.name, text } }));
  };

  return (
    <div className="flex flex-col gap-10">
      <section className="no-print grid gap-4 lg:grid-cols-[1fr_1.4fr]">
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
          <h2 className="text-lg font-semibold">Try it with simulated homes</h2>
          <p className="text-[15px] text-ink-2">
            240 simulated homes over three years, half of them upgraded in spring 2025, and a 6% cut in everyone&apos;s
            outdoor use partway through, the kind of shared trend the control group has to catch. No real data.
          </p>
          <button
            type="button"
            onClick={runDemo}
            disabled={running}
            className="self-start rounded-md bg-brand px-4 py-2.5 font-medium text-brand-ink hover:opacity-90 disabled:opacity-60"
          >
            {running ? "Running…" : "Run demo verification"}
          </button>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold">Use your own data</h2>
            <button type="button" onClick={downloadSamples} className="text-sm text-brand underline-offset-2 hover:underline">
              Download sample files
            </button>
          </div>
          <p className="text-sm text-ink-2">Files are read in this browser tab and never uploaded anywhere.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {FILES.map((f) => (
              <label key={f.key} className="flex cursor-pointer flex-col gap-1 rounded-lg border border-dashed border-axis p-3 hover:bg-surface-2">
                <span className="text-sm font-medium">{f.label}</span>
                <span className="text-xs text-muted">{f.hint}</span>
                <span className="mt-1 truncate text-xs text-ink-2">{files[f.key]?.name ?? "Choose a CSV"}</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => onFile(f.key, e.target.files?.[0])}
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={runUploads}
            disabled={running}
            className="self-start rounded-md border border-line bg-surface px-4 py-2.5 font-medium hover:bg-surface-2 disabled:opacity-60"
          >
            Verify uploaded files
          </button>
        </div>
      </section>

      {errors.length > 0 && (
        <div role="alert" className="rounded-lg border border-line bg-warn-bg p-4 text-sm text-warn-ink">
          <p className="font-semibold">Check the files</p>
          <ul className="mt-2 list-disc pl-5">
            {errors.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {result && <Results result={result} dataset={dataset} />}
    </div>
  );
}
