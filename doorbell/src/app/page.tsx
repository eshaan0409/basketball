import Link from "next/link";

const STEPS = [
  {
    title: "A customer asks their assistant",
    body: "“Get me an oil change tomorrow morning near downtown.” The assistant finds your shop through Doorbell and sees your real hours and open times.",
  },
  {
    title: "You get a text",
    body: "“New booking via Claude: Oil change, Tue 10 AM. Maria, (916) 555-0110. Reply Y12 to confirm.” No app, no login, no new software.",
  },
  {
    title: "Reply Y or N",
    body: "The customer hears back right away. Add a note to a no, like “try 2pm”, and it's passed along. Requests you don't answer simply expire.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="border-b border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div className="flex flex-col gap-6">
            <p className="text-sm font-medium tracking-wide text-brand uppercase">For shops with no booking software</p>
            <h1 className="text-4xl leading-tight font-semibold tracking-tight text-balance sm:text-5xl">
              Let AI assistants book your shop. You answer by text.
            </h1>
            <p className="max-w-xl text-lg text-ink-2">
              When someone asks an AI assistant to find and book a service, it can only book places it can see. If your
              shop has no website or booking system, that&apos;s not you. Doorbell gives your shop a listing assistants
              can read and book, and sends every request to your phone as a text.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/demo" className="rounded-md bg-brand px-4 py-2.5 font-medium text-brand-ink hover:opacity-90">
                Watch an assistant book a demo shop
              </Link>
              <Link href="/owner/start" className="rounded-md border border-line bg-surface px-4 py-2.5 font-medium hover:bg-surface-2">
                Set up your shop
              </Link>
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <Phone />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
        <ol className="mt-8 grid gap-6 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-6">
              <span className="tabular flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-sm font-semibold text-brand">
                {i + 1}
              </span>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-[15px] text-ink-2">{s.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3">
          <div>
            <h2 className="text-lg font-semibold">Ten minutes to set up</h2>
            <p className="mt-3 text-[15px] text-ink-2">
              Your hours, your services and what they cost, how many customers you can take at once, and the phone number
              for booking texts. That&apos;s the whole setup.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">You stay in charge</h2>
            <p className="mt-3 text-[15px] text-ink-2">
              Nothing is booked until you say yes. Requests only land in your open hours, with the notice you choose, and
              never more at once than you can handle.
            </p>
          </div>
          <div>
            <h2 className="text-lg font-semibold">Works with any assistant</h2>
            <p className="mt-3 text-[15px] text-ink-2">
              Doorbell speaks MCP, the open standard assistants like Claude use for tools, and plain REST for everything
              else.{" "}
              <Link href="/agents" className="text-brand underline-offset-2 hover:underline">
                Details for developers
              </Link>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Phone() {
  const bubble = "max-w-[85%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug";
  return (
    <div className="mx-auto w-full max-w-sm rounded-[2rem] border border-line bg-page p-4 shadow-sm" aria-label="Example text conversation">
      <p className="mb-3 text-center text-xs text-muted">Text messages · example</p>
      <div className="flex flex-col gap-2">
        <div className={`${bubble} self-start bg-surface-2 text-ink`}>
          New booking via Claude: Oil change, Tue Oct 20, 10 AM (30 min). Maria Lopez, (916) 555-0110. Note: &quot;2014
          Civic&quot;. Reply Y12 to confirm or N12 to decline.
        </div>
        <div className={`${bubble} self-end bg-brand text-brand-ink`}>Y12</div>
        <div className={`${bubble} self-start bg-surface-2 text-ink`}>Confirmed #12: Maria Lopez, Oil change, Tue Oct 20, 10 AM.</div>
      </div>
    </div>
  );
}
