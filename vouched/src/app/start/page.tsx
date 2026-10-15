import type { Metadata } from "next";
import { StartForm } from "./StartForm";

export const metadata: Metadata = { title: "Start your record" };

export default function StartPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-8 px-4 py-12 sm:px-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Start your record</h1>
        <p className="mt-3 text-[15px] text-ink-2">
          Free for students. You decide who sees it. We only ask for what a reader needs to know who you are.
        </p>
      </div>
      <StartForm />
    </div>
  );
}
