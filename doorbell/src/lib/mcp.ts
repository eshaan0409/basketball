import { ServiceError } from "./service";
import { runTool, TOOLS, type ToolContext } from "./tools";

/**
 * A stateless Model Context Protocol server over Streamable HTTP: every JSON-RPC request is a POST and gets a
 * single JSON response. No sessions, no server-sent events. https://modelcontextprotocol.io/specification
 */

export const SUPPORTED_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"];
export const SERVER_INFO = { name: "doorbell", title: "Doorbell", version: "0.1.0" };

const INSTRUCTIONS =
  "Doorbell lets you book appointments at local shops that have no booking software. Flow: search_shops -> get_shop -> " +
  "check_availability -> confirm details with the person -> request_booking -> get_booking_status until it is confirmed, " +
  "declined or expired. The shop owner answers by text, so a request is not a booking until it is confirmed.";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: string | number | null; result: unknown }
  | { jsonrpc: "2.0"; id: string | number | null; error: { code: number; message: string; data?: unknown } };

export const RPC = { PARSE: -32700, INVALID_REQUEST: -32600, METHOD_NOT_FOUND: -32601, INVALID_PARAMS: -32602, INTERNAL: -32603 };

function error(id: JsonRpcResponse["id"], code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/** Returns null for notifications (the HTTP layer answers 202 with no body). */
export async function handleRpc(message: unknown, ctx: ToolContext): Promise<JsonRpcResponse | null> {
  if (Array.isArray(message)) return error(null, RPC.INVALID_REQUEST, "Batch requests are not supported.");
  const req = message as Partial<JsonRpcRequest>;
  if (!req || typeof req !== "object" || req.jsonrpc !== "2.0" || typeof req.method !== "string") {
    return error(null, RPC.INVALID_REQUEST, "Not a JSON-RPC 2.0 request.");
  }
  const isNotification = req.id === undefined;
  if (isNotification) return null;
  const id = req.id ?? null;

  switch (req.method) {
    case "initialize": {
      const requested = typeof req.params?.protocolVersion === "string" ? req.params.protocolVersion : "";
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion: SUPPORTED_VERSIONS.includes(requested) ? requested : SUPPORTED_VERSIONS[0],
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: INSTRUCTIONS,
        },
      };
    }
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: TOOLS.map(({ name, title, description, inputSchema, annotations }) => ({
            name,
            title,
            description,
            inputSchema,
            annotations: { title, ...annotations },
          })),
        },
      };
    case "tools/call": {
      const name = req.params?.name;
      const args = req.params?.arguments ?? {};
      if (typeof name !== "string" || typeof args !== "object" || args === null || Array.isArray(args)) {
        return error(id, RPC.INVALID_PARAMS, "tools/call needs a tool name and an arguments object.");
      }
      if (!TOOLS.some((t) => t.name === name)) return error(id, RPC.INVALID_PARAMS, `Unknown tool "${name}".`);
      try {
        const result = await runTool(name, args as Record<string, unknown>, ctx);
        return {
          jsonrpc: "2.0",
          id,
          result: { content: [{ type: "text", text: JSON.stringify(result, null, 2) }], structuredContent: result, isError: false },
        };
      } catch (e) {
        // Tool failures are results the model can read and react to, not protocol errors.
        if (e instanceof ServiceError) {
          return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: e.message }], isError: true } };
        }
        console.error(e);
        return error(id, RPC.INTERNAL, "Internal error.");
      }
    }
    default:
      return error(id, RPC.METHOD_NOT_FOUND, `Method "${req.method}" is not supported.`);
  }
}
