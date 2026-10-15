import { describe, expect, it } from "vitest";
import { formatPhone, maskPhone, normalizePhone, parseReply } from "./replies";

describe("parseReply", () => {
  it.each([
    ["Y12", "confirm", 12, ""],
    ["y 12", "confirm", 12, ""],
    ["yes 12", "confirm", 12, ""],
    ["Yes", "confirm", null, ""],
    ["ok", "confirm", null, ""],
    ["👍", "confirm", null, ""],
    ["12 yes", "confirm", 12, ""],
    ["N7", "decline", 7, ""],
    ["no 7 try 4pm", "decline", 7, "try 4pm"],
    ["N7 only Saturday mornings", "decline", 7, "only Saturday mornings"],
    ["n", "decline", null, ""],
    ["#12 y", "confirm", 12, ""],
    ["help", "help", null, ""],
    ["what?", "unknown", null, ""],
    ["", "unknown", null, ""],
  ])("%s", (text, action, code, note) => {
    expect(parseReply(text)).toEqual({ action, code, note });
  });

  it("catches a decline written as a sentence and keeps it as the note", () => {
    const r = parseReply("sorry we're full today, 14");
    expect(r.action).toBe("decline");
    expect(r.code).toBe(14);
    expect(r.note).toBe("sorry we're full today, 14");
  });

  it("does not treat a stray number as a confirmation", () => {
    expect(parseReply("call me at 4").action).toBe("unknown");
  });
});

describe("phones", () => {
  it("normalizes US formats and rejects junk", () => {
    expect(normalizePhone("(916) 555-0142")).toBe("+19165550142");
    expect(normalizePhone("1-916-555-0142")).toBe("+19165550142");
    expect(normalizePhone("+44 20 7946 0958")).toBe("+442079460958");
    expect(normalizePhone("555-0142")).toBeNull();
    expect(normalizePhone("(116) 555-0142")).toBeNull();
  });

  it("formats and masks", () => {
    expect(formatPhone("+19165550142")).toBe("(916) 555-0142");
    expect(maskPhone("+19165550142")).toBe("(916) •••-0142");
  });
});
