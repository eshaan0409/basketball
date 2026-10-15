import { cookies } from "next/headers";
import { handle, json, OWNER_COOKIE, readBody, setOwnerCookie } from "@/lib/http";
import { requireOwner, ServiceError } from "@/lib/service";
import { getStore } from "@/lib/store";

/** Show the signed-in student their own private key so they can save it. */
export async function GET() {
  return handle(async () => {
    const key = (await cookies()).get(OWNER_COOKIE)?.value;
    await requireOwner(getStore(), key);
    return json({ key });
  });
}

/** Restore access on a new device with the private key. */
export async function POST(request: Request) {
  return handle(async () => {
    const { key } = await readBody(request);
    if (typeof key !== "string" || !key.trim()) throw new ServiceError("Paste your private key.");
    try {
      await requireOwner(getStore(), key.trim());
    } catch {
      throw new ServiceError("That key doesn't match a record.", 401);
    }
    await setOwnerCookie(key.trim());
    return json({ ok: true });
  });
}

export async function DELETE() {
  return handle(async () => {
    (await cookies()).delete(OWNER_COOKIE);
    return json({ ok: true });
  });
}
