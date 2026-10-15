import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getDb } from "./db";
import { ensureDemoShops } from "./demo";
import { ServiceError } from "./service";

export const OWNER_COOKIE = "doorbell_owner";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Protocol-Version, Mcp-Session-Id",
};

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store", ...headers } });
}

export async function handle(fn: () => Promise<Response>, headers: Record<string, string> = {}): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ServiceError) return json({ error: e.message }, e.status, headers);
    console.error(e);
    return json({ error: "Something went wrong on our side." }, 500, headers);
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : {};
  } catch {
    throw new ServiceError("The request body isn't valid JSON.");
  }
}

const g = globalThis as typeof globalThis & { __doorbellReady?: Promise<void>; __doorbellHits?: Map<string, number[]> };

/** The database, with demo shops present. */
export async function ready() {
  const db = getDb();
  g.__doorbellReady ??= ensureDemoShops(db).catch((e) => {
    g.__doorbellReady = undefined;
    throw e;
  });
  await g.__doorbellReady;
  return db;
}

/** In-memory sliding-window limit per process. Enough to stop a runaway agent from texting an owner 100 times. */
export function rateLimit(key: string, limit: number, windowMs: number): void {
  const hits = (g.__doorbellHits ??= new Map<string, number[]>());
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t: number) => now - t < windowMs);
  if (recent.length >= limit) throw new ServiceError("Too many requests. Slow down and try again in a minute.", 429);
  recent.push(now);
  hits.set(key, recent);
}

export function clientIp(request: Request): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
}

export async function ownerSecret(): Promise<string | undefined> {
  return (await cookies()).get(OWNER_COOKIE)?.value;
}

export async function setOwnerCookie(secret: string) {
  (await cookies()).set(OWNER_COOKIE, secret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !process.env.DOORBELL_INSECURE_COOKIE,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
