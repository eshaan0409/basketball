import { cookies } from "next/headers";
import { handle, json, OWNER_COOKIE, ownerSecret, readJson, ready, setOwnerCookie } from "@/lib/http";
import { getOwnerShop, ServiceError } from "@/lib/service";

export async function GET() {
  return handle(async () => {
    const secret = await ownerSecret();
    await getOwnerShop(await ready(), secret);
    return json({ key: secret });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const { key } = await readJson(request);
    if (typeof key !== "string" || !key.trim()) throw new ServiceError("Paste your private key.");
    try {
      await getOwnerShop(await ready(), key.trim());
    } catch {
      throw new ServiceError("That key doesn't match a shop.", 401);
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
