/** Browser helpers. No server imports here. */

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? "GET",
    headers: init.body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error((data as { error?: string }).error ?? `Request failed (${res.status})`) as Error & { status?: number };
    error.status = res.status;
    throw error;
  }
  return data as T;
}

let rpcId = 0;

export interface McpExchange {
  request: unknown;
  response: unknown;
}

/** Call a Doorbell tool over MCP exactly as an assistant would. */
export async function mcpTool<T>(name: string, args: Record<string, unknown>): Promise<{ result: T; exchange: McpExchange }> {
  const request = { jsonrpc: "2.0", id: ++rpcId, method: "tools/call", params: { name, arguments: args } };
  const res = await fetch("/api/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify(request),
  });
  const response = await res.json();
  const exchange = { request, response };
  if (response.error) throw Object.assign(new Error(response.error.message), { exchange });
  if (response.result?.isError) throw Object.assign(new Error(response.result.content?.[0]?.text ?? "Tool error"), { exchange });
  return { result: response.result.structuredContent as T, exchange };
}
