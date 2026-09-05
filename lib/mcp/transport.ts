/**
 * Sentinel MCP transport wiring (Streamable HTTP, Web Standard).
 *
 * This is the protocol-agnostic part of the `/api/mcp` route: a single
 * `handleMcpRequest` that mounts a fresh, stateless MCP server + transport per
 * HTTP request (the pattern required in serverless / Vercel environments) and
 * a CORS preflight responder.
 *
 * Kept outside the Next.js route file so tests can exercise the EXACT same
 * wiring over real HTTP without a framework harness.
 */

import { LATEST_PROTOCOL_VERSION } from "@modelcontextprotocol/sdk/types.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createSentinelMcpServer } from "./sentinel-server";

const ALLOWED_METHODS = "GET, POST, DELETE, OPTIONS";
const ALLOWED_HEADERS =
  "content-type, mcp-session-id, mcp-protocol-version, last-event-id, authorization";
const EXPOSED_HEADERS = "mcp-session-id, mcp-protocol-version";

function withCorsHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
  headers.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
  headers.set("Access-Control-Expose-Headers", EXPOSED_HEADERS);
  // The spec recommends echoing the negotiated protocol version in responses.
  headers.set("mcp-protocol-version", LATEST_PROTOCOL_VERSION);
  return new Response(response.body, { status: response.status, headers });
}

/** A malformed / non-MCP request must never leak internals. */
function invalidRequestResponse(): Response {
  return new Response(
    JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32000, message: "Invalid MCP request." },
      id: null,
    }),
    {
      status: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
      },
    }
  );
}

export interface McpRequestOptions {
  /** SSE keep-alive interval for open streams. Defaults to the SDK default. */
  keepAliveMs?: number;
}

/**
 * Handle one MCP protocol exchange over Streamable HTTP.
 *
 * Stateless by design: a fresh server + transport is created per request, so
 * any number of concurrent requests are safe and no long-lived memory is held.
 */
export async function handleMcpRequest(
  request: Request,
  options: McpRequestOptions = {}
): Promise<Response> {
  const transportOptions =
    options.keepAliveMs !== undefined ? { keepAliveMs: options.keepAliveMs } : {};
  const transport = new WebStandardStreamableHTTPServerTransport(transportOptions);
  const server = createSentinelMcpServer();

  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    return withCorsHeaders(response);
  } catch {
    return invalidRequestResponse();
  }
}

/** CORS preflight response for MCP clients (Anthropic connects from the cloud). */
export function mcpPreflightResponse(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": ALLOWED_METHODS,
      "Access-Control-Allow-Headers": ALLOWED_HEADERS,
      "Access-Control-Expose-Headers": EXPOSED_HEADERS,
      "Access-Control-Max-Age": "86400",
    },
  });
}