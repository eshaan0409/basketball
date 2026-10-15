import { baseUrl, openApi } from "@/lib/discovery";
import { CORS } from "@/lib/http";

export function GET(request: Request) {
  return Response.json(openApi(baseUrl(request)), { headers: CORS });
}
