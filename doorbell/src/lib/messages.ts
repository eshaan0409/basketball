import { formatPhone } from "./replies";
import { formatSlot } from "./time";
import type { Booking, Shop } from "./types";

/** Every text the system sends, in one place. Keep them short: one SMS segment is 160 characters. */

export function ownerNewRequest(shop: Shop, b: Booking): string {
  const note = b.notes ? ` Note: "${b.notes}".` : "";
  return (
    `New booking via ${b.via}: ${b.serviceName}, ${formatSlot(b.start)} (${b.durationMinutes} min). ` +
    `${b.customerName}, ${formatPhone(b.customerPhone)}.${note} ` +
    `Reply Y${b.code} to confirm or N${b.code} to decline (add a time to suggest one). ` +
    `Expires in ${shop.replyWindowMinutes} min.`
  );
}

export function ownerAck(b: Booking): string {
  if (b.status === "confirmed") return `Confirmed #${b.code}: ${b.customerName}, ${b.serviceName}, ${formatSlot(b.start)}.`;
  if (b.status === "declined") return `Declined #${b.code}. We told ${b.customerName}${b.ownerNote ? " and passed on your note" : ""}.`;
  return `#${b.code} is ${b.status}.`;
}

export function ownerHelp(pending: Booking[]): string {
  if (pending.length === 0) return "No open booking requests right now. You'll get a text when one comes in.";
  const list = pending
    .slice(0, 3)
    .map((b) => `#${b.code} ${b.serviceName} ${formatSlot(b.start)}`)
    .join("; ");
  return `Open requests: ${list}. Reply Y and the number to confirm (Y${pending[0].code}) or N and the number to decline.`;
}

export function ownerNeedsCode(pending: Booking[]): string {
  return `You have ${pending.length} open requests. ${ownerHelp(pending)}`;
}

export function ownerNotFound(code: number | null): string {
  return code === null ? "Sorry, I didn't catch that. Reply HELP to see open requests." : `No open request #${code}. Reply HELP to see open requests.`;
}

export function ownerTooLate(b: Booking): string {
  return `#${b.code} already ${b.status === "expired" ? "expired and the customer was told" : `was ${b.status}`}.`;
}

export function ownerCancelled(b: Booking): string {
  return `Cancelled by the customer: #${b.code} ${b.serviceName}, ${formatSlot(b.start)} (${b.customerName}).`;
}

export function customerConfirmed(shop: Shop, b: Booking): string {
  const where = [shop.address.street, shop.address.city].filter(Boolean).join(", ");
  return `${shop.name}: you're booked for ${b.serviceName}, ${formatSlot(b.start)}. ${where}. To change it, call ${formatPhone(shop.phone)}.`;
}

export function customerDeclined(shop: Shop, b: Booking): string {
  const note = b.ownerNote ? ` They said: "${b.ownerNote}".` : "";
  return `${shop.name} can't do ${b.serviceName} at ${formatSlot(b.start)}.${note} Ask your assistant for another time, or call ${formatPhone(shop.phone)}.`;
}

export function customerExpired(shop: Shop, b: Booking): string {
  return `${shop.name} didn't answer in time for ${b.serviceName}, ${formatSlot(b.start)}. Nothing is booked. Call ${formatPhone(shop.phone)} or try another time.`;
}

/** A sentence an AI assistant can relay as-is. */
export function statusSentence(shop: Shop, b: Booking): string {
  switch (b.status) {
    case "pending":
      return `Waiting for ${shop.name} to confirm by text. Requests expire if they don't answer by ${new Date(b.respondBy).toISOString()}. Nothing is booked yet.`;
    case "confirmed":
      return `Confirmed: ${b.serviceName} at ${shop.name}, ${formatSlot(b.start)}.`;
    case "declined":
      return `${shop.name} declined this time.${b.ownerNote ? ` Their note: "${b.ownerNote}".` : ""} Nothing is booked.`;
    case "expired":
      return `${shop.name} didn't answer in time. Nothing is booked. Try another time or call ${formatPhone(shop.phone)}.`;
    case "cancelled":
      return "This booking was cancelled.";
  }
}
