import { currentOwner, handle, json, readBody } from "@/lib/http";
import { createShare } from "@/lib/service";
import { getStore } from "@/lib/store";
import { ownerView } from "@/lib/views";

export async function POST(request: Request) {
  return handle(async () => {
    const profile = await currentOwner();
    const share = await createShare(getStore(), profile, await readBody(request));
    return json({ token: share.token, view: ownerView(profile) }, 201);
  });
}
