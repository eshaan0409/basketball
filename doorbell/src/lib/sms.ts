import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Text messaging. Without Twilio credentials every message goes to an outbox the app shows on screen (the
 * "owner's phone" in the demo). With TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_FROM set, messages go out
 * through Twilio's REST API.
 */
export interface SmsProvider {
  name: "outbox" | "twilio";
  send(to: string, body: string): Promise<"sent" | "queued" | "failed">;
}

export const outboxProvider: SmsProvider = {
  name: "outbox",
  async send() {
    return "queued";
  },
};

export function twilioProvider(accountSid: string, authToken: string, from: string): SmsProvider {
  return {
    name: "twilio",
    async send(to, body) {
      try {
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: to, From: from, Body: body }),
        });
        return res.ok ? "sent" : "failed";
      } catch {
        return "failed";
      }
    },
  };
}

export function getSmsProvider(): SmsProvider {
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM } = process.env;
  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM) {
    return twilioProvider(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM);
  }
  return outboxProvider;
}

/**
 * Twilio webhook signature: base64(HMAC-SHA1(authToken, url + each POST param name+value, sorted by name)).
 * https://www.twilio.com/docs/usage/security#validating-requests
 */
export function twilioSignature(authToken: string, url: string, params: Record<string, string>): string {
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  return createHmac("sha1", authToken).update(payload, "utf8").digest("base64");
}

export function verifyTwilioSignature(authToken: string, url: string, params: Record<string, string>, signature: string): boolean {
  const expected = Buffer.from(twilioSignature(authToken, url, params));
  const given = Buffer.from(signature);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** Minimal TwiML reply. */
export function twiml(message?: string): string {
  const escaped = message?.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${escaped ? `<Message>${escaped}</Message>` : ""}</Response>`;
}
