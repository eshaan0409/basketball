"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, mcpTool, type McpExchange } from "@/lib/client";

interface ShopSummary {
  slug: string;
  name: string;
  address: string;
  services: { id: string; name: string; durationMinutes: number; priceText: string }[];
}
interface Slot {
  start: string;
  display: string;
}
interface BookingView {
  booking_id: string;
  status: string;
  message: string;
  start_display: string;
  service: string;
  shop: { name: string };
}
interface PhoneMessage {
  id: string;
  direction: "in" | "out";
  to: "owner" | "customer";
  body: string;
  at: string;
}

const SCENARIOS = [
  { label: "Oil change near downtown Sacramento", ask: "Can you book me an oil change at a shop near downtown Sacramento? Soonest is fine.", query: "oil change", service: "oil-change" },
  { label: "A fade haircut this week", ask: "Find me a barber for a fade this week and book the earliest time.", query: "fade", service: "fade" },
];

const STORAGE_KEY = "doorbell-demo-bookings";

type Line = { who: "person" | "assistant" | "tool"; text: string };

export function DemoBooth() {
  const [lines, setLines] = useState<Line[]>([]);
  const [log, setLog] = useState<McpExchange[]>([]);
  const [shop, setShop] = useState<ShopSummary | null>(null);
  const [serviceId, setServiceId] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [name, setName] = useState("Alex Demo");
  const [phone, setPhone] = useState("(916) 555-0110");
  const [notify, setNotify] = useState(true);
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerMessages, setOwnerMessages] = useState<PhoneMessage[]>([]);
  const [customerMessages, setCustomerMessages] = useState<PhoneMessage[]>([]);
  const [reply, setReply] = useState("");
  const myBookings = useRef<string[]>([]);

  useEffect(() => {
    try {
      myBookings.current = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    } catch {
      myBookings.current = [];
    }
  }, []);

  const say = (line: Line) => setLines((l) => [...l, line]);
  const call = async <T,>(tool: string, args: Record<string, unknown>) => {
    try {
      const { result, exchange } = await mcpTool<T>(tool, { ...args });
      setLog((l) => [...l, exchange]);
      return result;
    } catch (e) {
      const exchange = (e as { exchange?: McpExchange }).exchange;
      if (exchange) setLog((l) => [...l, exchange]);
      throw e;
    }
  };

  const start = async (s: (typeof SCENARIOS)[number]) => {
    setBusy(true);
    setError(null);
    setLines([{ who: "person", text: s.ask }]);
    setLog([]);
    setShop(null);
    setSlots([]);
    setSlot(null);
    setBooking(null);
    try {
      const found = await call<{ shops: ShopSummary[] }>("search_shops", { query: s.query, city: "Sacramento" });
      say({ who: "tool", text: `search_shops → ${found.shops.length} shop${found.shops.length === 1 ? "" : "s"}` });
      const first = found.shops[0];
      if (!first) throw new Error("No demo shop found.");
      setShop(first);
      setServiceId(s.service);
      const open = await call<{ slots: Slot[] }>("check_availability", { shop: first.slug, service_id: s.service });
      say({ who: "tool", text: `check_availability → ${open.slots.length} open times` });
      setSlots(open.slots);
      const svc = first.services.find((x) => x.id === s.service);
      say({
        who: "assistant",
        text: `${first.name} can do ${svc?.name.toLowerCase()} (${svc?.priceText}). The soonest times are below. Which works, and what name and number should I give them?`,
      });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const request = async () => {
    if (!shop || !slot) return;
    setBusy(true);
    setError(null);
    say({ who: "person", text: `${slot.display} works. I'm ${name}, ${phone}.${notify ? " Text me when they answer." : ""}` });
    try {
      const b = await call<BookingView>("request_booking", {
        shop: shop.slug,
        service_id: serviceId,
        start: slot.start,
        customer_name: name,
        customer_phone: phone,
        notify_customer_by_text: notify,
        agent_name: "Demo assistant",
      });
      say({ who: "tool", text: "request_booking → pending" });
      say({ who: "assistant", text: `I've asked ${shop.name} for ${slot.display}. They confirm by text, usually within minutes. I'll let you know.` });
      setBooking(b);
      myBookings.current = [...myBookings.current.slice(-9), b.booking_id];
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(myBookings.current));
      } catch {}
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const refreshPhone = useCallback(async () => {
    if (!shop) return;
    try {
      const data = await api<{ messages: PhoneMessage[]; customerMessages: PhoneMessage[] }>(
        `/api/demo/phone?slug=${encodeURIComponent(shop.slug)}&bookings=${encodeURIComponent(myBookings.current.join(","))}`,
      );
      setOwnerMessages(data.messages);
      setCustomerMessages(data.customerMessages);
    } catch {}
  }, [shop]);

  // Poll the owner's phone, and the booking status while it's pending.
  useEffect(() => {
    if (!shop) return;
    refreshPhone();
    const t = setInterval(refreshPhone, 2500);
    return () => clearInterval(t);
  }, [shop, refreshPhone]);

  useEffect(() => {
    if (!booking || booking.status !== "pending") return;
    const t = setInterval(async () => {
      try {
        const b = await call<BookingView>("get_booking_status", { booking_id: booking.booking_id });
        if (b.status !== "pending") {
          setBooking(b);
          say({ who: "tool", text: `get_booking_status → ${b.status}` });
          say({ who: "assistant", text: b.message });
        }
      } catch {}
    }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [booking]);

  const sendReply = async (text: string) => {
    if (!shop || !text.trim()) return;
    setReply("");
    try {
      await api("/api/sms/simulate", { method: "POST", body: { slug: shop.slug, body: text, bookingId: booking?.booking_id } });
      await refreshPhone();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const bubble = "max-w-[88%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug";

  return (
    <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
      <section aria-label="AI assistant" className="flex min-w-0 flex-col gap-4 rounded-xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">An AI assistant</h2>
          <span className="text-xs text-muted">calls Doorbell&apos;s real MCP tools</span>
        </div>
        {lines.length === 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-ink-2">Pick what the person asks for:</p>
            {SCENARIOS.map((s) => (
              <button
                key={s.label}
                type="button"
                disabled={busy}
                onClick={() => start(s)}
                className="rounded-lg border border-line px-4 py-3 text-left text-[15px] font-medium hover:bg-surface-2"
              >
                “{s.ask}”
              </button>
            ))}
          </div>
        )}
        <ol className="flex flex-col gap-2" aria-live="polite">
          {lines.map((l, i) =>
            l.who === "tool" ? (
              <li key={i} className="self-center font-mono text-xs text-muted">
                {l.text}
              </li>
            ) : (
              <li key={i} className={`${bubble} ${l.who === "person" ? "self-end bg-brand text-brand-ink" : "self-start bg-surface-2 text-ink"}`}>
                {l.text}
              </li>
            ),
          )}
        </ol>

        {slots.length > 0 && !booking && (
          <div className="flex flex-col gap-3 border-t border-line pt-4">
            <div className="flex flex-wrap gap-2">
              {slots.slice(0, 8).map((s) => (
                <button
                  key={s.start}
                  type="button"
                  onClick={() => setSlot(s)}
                  className={`rounded-md border px-3 py-1.5 text-sm font-medium ${slot?.start === s.start ? "border-brand bg-brand-soft text-brand" : "border-line hover:bg-surface-2"}`}
                  aria-pressed={slot?.start === s.start}
                >
                  {s.display}
                </button>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Name
                <input className="rounded-md border border-line bg-surface px-3 py-2 text-[15px]" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="flex flex-col gap-1 text-sm font-medium">
                Phone (fictional is fine)
                <input className="rounded-md border border-line bg-surface px-3 py-2 text-[15px]" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
              Text me when the shop answers (shown on screen, nothing is sent)
            </label>
            <button
              type="button"
              disabled={!slot || busy}
              onClick={request}
              className="self-start rounded-md bg-brand px-4 py-2 font-medium text-brand-ink hover:opacity-90 disabled:opacity-60"
            >
              {slot ? `Request ${slot.display}` : "Pick a time"}
            </button>
          </div>
        )}

        {booking && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line bg-surface-2 px-3 py-2 text-sm">
            <span>
              Booking status: <strong className="font-semibold">{booking.status}</strong>
            </span>
            {booking.status !== "pending" && (
              <button type="button" className="font-medium text-brand underline-offset-2 hover:underline" onClick={() => setLines([])}>
                Start over
              </button>
            )}
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn-ink">
            {error}
          </p>
        )}

        {log.length > 0 && (
          <details className="border-t border-line pt-3 text-sm">
            <summary className="cursor-pointer font-medium text-ink-2">What the assistant sent ({log.length} MCP calls)</summary>
            <div className="mt-2 flex max-h-80 flex-col gap-2 overflow-auto">
              {log.map((x, i) => (
                <pre key={i} className="overflow-x-auto rounded-md bg-surface-2 p-2 text-xs">
                  {JSON.stringify(x.request, null, 1)}
                  {"\n→ "}
                  {JSON.stringify((x.response as { result?: { structuredContent?: unknown } }).result?.structuredContent ?? x.response, null, 1).slice(0, 900)}
                </pre>
              ))}
            </div>
          </details>
        )}
      </section>

      <div className="flex min-w-0 flex-col gap-6">
        <section aria-label="Owner's phone" className="flex flex-col gap-3 rounded-[1.75rem] border border-line bg-page p-4">
          <div className="text-center">
            <p className="text-sm font-semibold">Shop owner&apos;s phone</p>
            <p className="text-xs text-muted">{shop ? shop.name : "Pick a request to start"}</p>
          </div>
          <ol className="flex min-h-48 flex-col gap-2" aria-live="polite">
            {ownerMessages.length === 0 && <li className="self-center pt-12 text-sm text-muted">No texts yet</li>}
            {ownerMessages.map((m) => (
              <li
                key={m.id}
                className={`${bubble} ${m.direction === "in" ? "self-end bg-brand text-brand-ink" : "self-start bg-surface-2 text-ink"}`}
              >
                {m.body}
              </li>
            ))}
          </ol>
          {booking?.status === "pending" && (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button type="button" onClick={() => sendReply("Y")} className="flex-1 rounded-md bg-brand px-3 py-2 text-sm font-medium text-brand-ink">
                  Reply Y
                </button>
                <button type="button" onClick={() => sendReply("N try 4pm")} className="flex-1 rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-surface-2">
                  Reply “N try 4pm”
                </button>
              </div>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendReply(reply);
                }}
              >
                <input
                  aria-label="Reply as the owner"
                  className="min-w-0 flex-1 rounded-full border border-line bg-surface px-3 py-2 text-sm"
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Text message"
                />
                <button type="submit" className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-page">
                  Send
                </button>
              </form>
            </div>
          )}
        </section>

        {customerMessages.length > 0 && (
          <section aria-label="Customer's phone" className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4">
            <p className="text-sm font-semibold">Customer&apos;s phone</p>
            {customerMessages.map((m) => (
              <p key={m.id} className={`${bubble} self-start bg-surface-2`}>
                {m.body}
              </p>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
