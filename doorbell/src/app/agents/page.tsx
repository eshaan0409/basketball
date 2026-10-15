import type { Metadata } from "next";
import { headers } from "next/headers";
import { TOOLS } from "@/lib/tools";

export const metadata: Metadata = { title: "For AI assistants and developers" };

export default async function AgentsPage() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") ?? `${proto}://${host}`;
  const code = "block overflow-x-auto rounded-md border border-line bg-surface-2 px-3 py-2 font-mono text-sm";

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-4 py-12 sm:px-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">For AI assistants and developers</h1>
        <p className="mt-3 text-[15px] text-ink-2">
          Doorbell is a booking layer for local shops that have no software. Every shop exposes the same six tools. A
          booking request goes to the owner by text and stays <em>pending</em> until they answer.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">MCP server</h2>
        <p className="text-[15px] text-ink-2">Streamable HTTP, stateless, no authentication. Add it as a custom connector in any MCP client:</p>
        <code className={code}>{base}/api/mcp</code>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Tools</h2>
        <ul className="flex flex-col gap-3">
          {TOOLS.map((t) => (
            <li key={t.name} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <code className="font-mono text-[15px] font-semibold">{t.name}</code>
                <span className="text-sm text-muted">{t.annotations.readOnlyHint ? "read-only" : "changes state"}</span>
              </div>
              <p className="mt-1 text-[15px] text-ink-2">{t.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">REST</h2>
        <p className="text-[15px] text-ink-2">The same operations as plain HTTP, described in OpenAPI 3.1:</p>
        <code className={code}>{base}/api/openapi.json</code>
        <code className={code}>{`curl "${base}/api/v1/shops?query=oil+change"`}</code>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Rules for assistants</h2>
        <ul className="list-disc space-y-2 pl-5 text-[15px] text-ink-2">
          <li>Confirm the shop, service, time, name and phone number with the person before calling request_booking.</li>
          <li>Set notify_customer_by_text only if the person agreed to receive texts.</li>
          <li>A pending request is not a booking. Tell the person it&apos;s waiting on the shop, then check status.</li>
          <li>Times are wall-clock times in the shop&apos;s timezone, formatted YYYY-MM-DDTHH:mm.</li>
        </ul>
        <p className="text-[15px] text-ink-2">
          A plain-text summary for language models lives at <code className="font-mono">{base}/llms.txt</code>.
        </p>
      </section>
    </div>
  );
}
