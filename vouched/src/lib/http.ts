import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { requireOwner, ServiceError } from "./service";
import { getStore } from "./store";

export const OWNER_COOKIE = "vouched_owner";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

/** Turn ServiceErrors into JSON responses; log and hide anything unexpected. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ServiceError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: "Something went wrong on our side." }, 500);
  }
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : {};
  } catch {
    throw new ServiceError("The request body isn't valid JSON.");
  }
}

export async function currentOwner() {
  const jar = await cookies();
  return requireOwner(getStore(), jar.get(OWNER_COOKIE)?.value);
}

export async function setOwnerCookie(secret: string) {
  const jar = await cookies();
  jar.set(OWNER_COOKIE, secret, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && !process.env.VOUCHED_INSECURE_COOKIE,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
