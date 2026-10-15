import { currentOwner, handle, json, readBody } from "@/lib/http";
import { deleteActivity, updateActivity } from "@/lib/service";
import { getStore } from "@/lib/store";
import { ownerView } from "@/lib/views";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Ctx) {
  return handle(async () => {
    const profile = await currentOwner();
    await updateActivity(getStore(), profile, (await params).id, await readBody(request));
    return json(ownerView(profile));
  });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  return handle(async () => {
    const profile = await currentOwner();
    await deleteActivity(getStore(), profile, (await params).id);
    return json(ownerView(profile));
  });
}
