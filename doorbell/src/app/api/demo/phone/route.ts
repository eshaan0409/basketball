import { handle, json, ready } from "@/lib/http";
import { maskPhone } from "@/lib/replies";
import { demoPhone } from "@/lib/service";

/** Messages on a demo shop's simulated phone, limited to the bookings this visitor made. */
export async function GET(request: Request) {
  return handle(async () => {
    const q = new URL(request.url).searchParams;
    const mine = new Set((q.get("bookings") ?? "").split(",").filter(Boolean).slice(0, 20));
    const db = await ready();
    const phone = await demoPhone(db, q.get("slug") ?? "");
    const mask = (s: string) => s.replace(/\(\d{3}\) \d{3}-(\d{4})/g, (_m, last) => `(•••) •••-${last}`);
    const visible = (m: { bookingId: string | null }) => m.bookingId !== null && mine.has(m.bookingId);
    return json({
      shop: phone.shop,
      ownerPhone: maskPhone(phone.ownerSms),
      messages: phone.messages.filter(visible).map((m) => ({ ...m, phone: maskPhone(m.phone), body: mask(m.body) })),
      customerMessages: phone.customerMessages.filter(visible).map((m) => ({ ...m, phone: maskPhone(m.phone), body: mask(m.body) })),
    });
  });
}
