import { handle, json, readBody } from "@/lib/http";
import { submitResponse } from "@/lib/service";
import { getStore } from "@/lib/store";

type Ctx = { params: Promise<{ token: string }> };

/** The verifier's answers. No account needed: the unguessable link is the credential. */
export async function POST(request: Request, { params }: Ctx) {
  return handle(async () => {
    const result = await submitResponse(getStore(), (await params).token, await readBody(request));
    return json({ status: result.status });
  });
}
