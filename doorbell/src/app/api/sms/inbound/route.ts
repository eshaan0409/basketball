import { ready } from "@/lib/http";
import { handleOwnerText } from "@/lib/service";
import { getSmsProvider, twiml, verifyTwilioSignature } from "@/lib/sms";

/**
 * Twilio's incoming-message webhook. Point the Twilio number's "A message comes in" webhook here.
 * Every request must carry a valid X-Twilio-Signature; without TWILIO_AUTH_TOKEN this endpoint is off.
 */
export async function POST(request: Request) {
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!token) return new Response("SMS is not configured.", { status: 403 });

  const form = await request.formData();
  const params: Record<string, string> = {};
  form.forEach((value, key) => {
    if (typeof value === "string") params[key] = value;
  });
  // Twilio signs the public URL it called. Behind a proxy, set PUBLIC_BASE_URL so we rebuild the same URL.
  const url = process.env.PUBLIC_BASE_URL ? `${process.env.PUBLIC_BASE_URL.replace(/\/$/, "")}/api/sms/inbound` : request.url;
  if (!verifyTwilioSignature(token, url, params, request.headers.get("x-twilio-signature") ?? "")) {
    return new Response("Bad signature.", { status: 403 });
  }

  const db = await ready();
  const reply = await handleOwnerText(db, getSmsProvider(), params.From ?? "", params.Body ?? "");
  // Unknown senders get no reply at all.
  return new Response(twiml(reply ?? undefined), { headers: { "Content-Type": "text/xml" } });
}
