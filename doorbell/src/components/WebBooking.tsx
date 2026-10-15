"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/client";

interface Slot {
  start: string;
  display: string;
}
interface BookingView {
  booking_id: string;
  status: string;
  message: string;
}

const input = "w-full rounded-md border border-line bg-surface px-3 py-2 text-[15px] text-ink outline-none focus:border-brand";

/** The same REST API assistants use, for people who'd rather tap. */
export function WebBooking({ slug, services }: { slug: string; services: { id: string; name: string; priceText: string }[] }) {
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slot, setSlot] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notify, setNotify] = useState(true);
  const [booking, setBooking] = useState<BookingView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    setSlots(null);
    setSlot("");
    api<{ slots: Slot[] }>(`/api/v1/shops/${slug}/availability?service_id=${encodeURIComponent(serviceId)}`)
      .then((r) => live && setSlots(r.slots))
      .catch((e) => live && setError((e as Error).message));
    return () => {
      live = false;
    };
  }, [slug, serviceId]);

  useEffect(() => {
    if (!booking || booking.status !== "pending") return;
    const t = setInterval(async () => {
      try {
        const b = await api<BookingView>(`/api/v1/bookings/${booking.booking_id}`);
        if (b.status !== "pending") setBooking(b);
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [booking]);

  if (booking) {
    return (
      <div role="status" className="rounded-md border border-line bg-surface-2 px-4 py-3">
        <p className="font-semibold capitalize">{booking.status}</p>
        <p className="text-[15px] text-ink-2">{booking.message}</p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          setBooking(
            await api<BookingView>(`/api/v1/shops/${slug}/bookings`, {
              method: "POST",
              body: { service_id: serviceId, start: slot, customer_name: name, customer_phone: phone, notify_customer_by_text: notify, agent_name: "web" },
            }),
          );
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        Service
        <select className={input} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
          {services.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} {s.priceText ? `(${s.priceText})` : ""}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-sm font-medium">Soonest open times</legend>
        {slots === null ? (
          <p className="text-sm text-muted">Loading…</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted">No open times soon. Call the shop.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((s) => (
              <label
                key={s.start}
                className={`cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium ${slot === s.start ? "border-brand bg-brand-soft text-brand" : "border-line hover:bg-surface-2"}`}
              >
                <input type="radio" name="slot" value={s.start} className="sr-only" checked={slot === s.start} onChange={() => setSlot(s.start)} required />
                {s.display}
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Your name
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Phone
          <input className={input} value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" autoComplete="tel" />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-[var(--brand)]" />
        Text me when the shop answers
      </label>
      {error && (
        <p role="alert" className="rounded-md bg-warn-bg px-3 py-2 text-sm text-warn-ink">
          {error}
        </p>
      )}
      <button type="submit" disabled={busy || !slot} className="self-start rounded-md bg-brand px-4 py-2 font-medium text-brand-ink hover:opacity-90 disabled:opacity-60">
        {busy ? "Sending…" : "Request this time"}
      </button>
    </form>
  );
}
