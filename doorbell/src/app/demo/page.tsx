import type { Metadata } from "next";
import { DemoBooth } from "@/components/demo/DemoBooth";

export const metadata: Metadata = { title: "Demo: an assistant books a shop" };

export default function DemoPage() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:px-6">
      <div className="max-w-3xl">
        <h1 className="text-3xl font-semibold tracking-tight">Watch an assistant book a shop</h1>
        <p className="mt-3 text-[15px] text-ink-2">
          An assistant uses Doorbell&apos;s tools to find a shop, check times and request a booking. The shop owner&apos;s
          phone gets the text: answer it and watch the assistant hear back. The shops are fictional and no real texts are
          sent.
        </p>
      </div>
      <DemoBooth />
    </div>
  );
}
