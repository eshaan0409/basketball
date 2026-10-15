import { currentOwner, handle, json, readBody, setOwnerCookie } from "@/lib/http";
import { createProfile, ServiceError, updateProfile } from "@/lib/service";
import { getStore, storageIsDurable } from "@/lib/store";
import { ownerView } from "@/lib/views";

export async function GET() {
  return handle(async () => {
    // No record yet is a normal state (the page sends people to /start), so answer 200 rather than an error.
    const profile = await currentOwner().catch((e) => {
      if (e instanceof ServiceError && e.status === 401) return null;
      throw e;
    });
    if (!profile) return json({ signedIn: false });
    return json({ signedIn: true, ...ownerView(profile), durable: storageIsDurable() });
  });
}

/** Start a new record. Returns the private key once so the student can save it. */
export async function POST(request: Request) {
  return handle(async () => {
    const { profile, secret } = await createProfile(getStore(), await readBody(request));
    await setOwnerCookie(secret);
    return json({ key: secret, view: ownerView(profile) }, 201);
  });
}

export async function PATCH(request: Request) {
  return handle(async () => {
    const profile = await updateProfile(getStore(), await currentOwner(), await readBody(request));
    return json(ownerView(profile));
  });
}
