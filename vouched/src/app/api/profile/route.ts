import { currentOwner, handle, json, readBody, setOwnerCookie } from "@/lib/http";
import { createProfile, updateProfile } from "@/lib/service";
import { getStore, storageIsDurable } from "@/lib/store";
import { ownerView } from "@/lib/views";

export async function GET() {
  return handle(async () => json({ ...ownerView(await currentOwner()), durable: storageIsDurable() }));
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
