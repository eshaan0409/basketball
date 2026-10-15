import { baseUrl, llmsTxt } from "@/lib/discovery";

export function GET(request: Request) {
  return new Response(llmsTxt(baseUrl(request)), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
