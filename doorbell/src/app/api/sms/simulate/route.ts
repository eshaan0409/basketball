import { handle, json, ownerSecret, readJson, ready } from "@/lib/http";
import { parseReply } from "@/lib/replies";
import { getOwnerShop, handleOwnerText, ServiceError } from "@/lib/service";
import { getSmsProvider } from "@/lib/sms";

/**
 * The on-screen phone: lets someone play the owner and reply by "text". Works for demo shops, and for an
 * owner's own shop while real SMS isn't configured.
 */
export async function POST(request: Request) {
  return handle(async () => {
    const { slug, body, bookingId } = await readJson(request);
    if (typeof slug !== "string" || typeof body !== "string" || !body.trim()) throw new ServiceError("Type a reply.");
    const db = await ready();
    const sms = getSmsProvider();
    const shop = await db.read((d) => d.shops.find((s) => s.slug === slug));
    if (!shop) throw new ServiceError("No such shop.", 404);
    if (!shop.demo) {
      if (sms.name !== "outbox") throw new ServiceError("Real texting is on; reply from your phone.", 403);
      const owner = await getOwnerShop(db, await ownerSecret());
      if (owner.id !== shop.id) throw new ServiceError("Not your shop.", 403);
    }
    // On the shared demo, a bare "Y" from this visitor means their own request.
    let text = body.trim().slice(0, 300);
    const parsed = parseReply(text);
    if (parsed.code === null && typeof bookingId === "string" && (parsed.action === "confirm" || parsed.action === "decline")) {
      const mine = await db.read((d) => d.bookings.find((b) => b.id === bookingId && b.shopId === shop.id && b.status === "pending"));
      if (mine) text = `${parsed.action === "confirm" ? "Y" : "N"}${mine.code} ${parsed.note}`.trim();
    }
    const reply = await handleOwnerText(db, sms, shop.ownerSms, text);
    return json({ reply });
  });
}
