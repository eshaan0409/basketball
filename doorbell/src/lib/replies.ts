export type ReplyAction = "confirm" | "decline" | "help" | "unknown";

export interface ParsedReply {
  action: ReplyAction;
  /** The booking code the owner referred to, if any. */
  code: number | null;
  /** Anything after the yes/no, passed to the customer: "try 4pm", "only Saturday". */
  note: string;
}

const YES = new Set(["y", "yes", "yeah", "yep", "yup", "ok", "okay", "k", "confirm", "confirmed", "sure", "book", "booked", "👍", "✅"]);
const NO = new Set(["n", "no", "nope", "decline", "declined", "cant", "can't", "cannot", "full", "busy", "pass", "👎", "❌"]);
const HELP = new Set(["help", "?", "info", "commands"]);

/**
 * Owners answer in whatever way is natural on a phone: "Y12", "y 12", "yes 12", "12 yes", "Y", "no 12 try 4pm".
 * The code is optional when there is only one open request.
 */
export function parseReply(text: string): ParsedReply {
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (!cleaned) return { action: "unknown", code: null, note: "" };

  // "Y12" / "N7" glued together.
  const glued = /^([a-z]+|👍|👎|✅|❌)(\d{1,5})\b\s*(.*)$/iu.exec(cleaned);
  let tokens: string[];
  if (glued) {
    tokens = [glued[1], glued[2], ...(glued[3] ? glued[3].split(" ") : [])];
  } else {
    tokens = cleaned.split(" ");
  }

  let action: ReplyAction = "unknown";
  let code: number | null = null;
  const rest: string[] = [];
  for (const raw of tokens) {
    const t = raw.toLowerCase().replace(/[.,!]+$/, "");
    if (action === "unknown" && rest.length === 0 && YES.has(t)) action = "confirm";
    else if (action === "unknown" && rest.length === 0 && NO.has(t)) action = "decline";
    else if (action === "unknown" && rest.length === 0 && HELP.has(t)) action = "help";
    else if (code === null && rest.length === 0 && /^#?\d{1,5}$/.test(t)) code = Number(t.replace("#", ""));
    else rest.push(raw);
  }
  // Text before any keyword ("sorry, full 12") still counts if a keyword appears later.
  if (action === "unknown") {
    const lower = cleaned.toLowerCase();
    if (/\b(no|can't|cannot|full|decline)\b/.test(lower)) action = "decline";
    else if (/^(yes|yep|ok|okay)\b/.test(lower)) action = "confirm";
    if (code === null) {
      const m = /#?\b(\d{1,5})\b/.exec(lower);
      if (m && action !== "unknown") code = Number(m[1]);
    }
    return { action, code, note: action === "decline" ? cleaned : "" };
  }
  return { action, code, note: rest.join(" ").trim() };
}

/** Normalize US numbers to E.164 (+1XXXXXXXXXX). Accepts already-E.164 numbers for other countries. */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (/^\+[1-9]\d{7,14}$/.test(trimmed.replace(/[\s().-]/g, ""))) return trimmed.replace(/[\s().-]/g, "");
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10 && /^[2-9]/.test(digits)) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1") && /^[2-9]/.test(digits.slice(1))) return `+${digits}`;
  return null;
}

/** "+19165551234" -> "(916) 555-1234" for US numbers. */
export function formatPhone(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

/** "(916) 555-0142" style but with the middle hidden, for places other people can see. */
export function maskPhone(e164: string): string {
  const m = /^\+1(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `(${m[1]}) •••-${m[3]}` : `•••${e164.slice(-4)}`;
}
