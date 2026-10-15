import { currentOwner, handle, json, readBody } from "@/lib/http";
import { addActivity } from "@/lib/service";
import { getStore } from "@/lib/store";
import { ownerView } from "@/lib/views";

export async function POST(request: Request) {
  return handle(async () => {
    const profile = await currentOwner();
    await addActivity(getStore(), profile, await readBody(request));
    return json(ownerView(profile), 201);
  });
}
