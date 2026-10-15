import type { Metadata } from "next";
import { OwnerDashboard } from "@/components/owner/OwnerDashboard";

export const metadata: Metadata = { title: "Your shop", robots: { index: false, follow: false } };

export default function OwnerPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <OwnerDashboard />
    </div>
  );
}
