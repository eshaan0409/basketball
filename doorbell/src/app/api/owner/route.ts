import { handle, json, ownerSecret, readJson, ready, setOwnerCookie } from "@/lib/http";
import { createShop, ownerDashboard, ServiceError, updateShop } from "@/lib/service";
import { getSmsProvider } from "@/lib/sms";
import { storageIsDurable } from "@/lib/db";

export async function GET() {
  return handle(async () => {
    const db = await ready();
    const secret = await ownerSecret();
    // Being signed out is a normal state for this page, so answer 200 rather than an error.
    const view = await ownerDashboard(db, getSmsProvider(), secret ?? "").catch((e) => {
      if (e instanceof ServiceError && e.status === 401) return null;
      throw e;
    });
    if (!view) return json({ signedIn: false });
    return json({ signedIn: true, ...view, smsProvider: getSmsProvider().name, durable: storageIsDurable() });
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const db = await ready();
    const { shop, secret } = await createShop(db, await readJson(request));
    await setOwnerCookie(secret);
    return json({ key: secret, slug: shop.slug }, 201);
  });
}

export async function PATCH(request: Request) {
  return handle(async () => {
    const db = await ready();
    const shop = await updateShop(db, (await ownerSecret()) ?? "", await readJson(request));
    return json({ slug: shop.slug });
  });
}
