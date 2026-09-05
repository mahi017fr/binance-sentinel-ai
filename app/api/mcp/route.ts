/**
 * Binance Sentinel AI — remote MCP endpoint (Streamable HTTP).
 *
 * Claude Custom Connectors connect to this public, read-only endpoint from
 * Anthropic's cloud infrastructure. The protocol logic lives in
 * `lib/mcp/transport.ts` (a fresh, stateless server+transport per request) so
 * the same wiring is unit-tested over real HTTP.
 *
 * Supported methods:
 *   POST   — MCP protocol messages (initialize, tools/list, tools/call, ...)
 *   GET    — SSE streams required by the protocol (delegated to the transport)
 *   DELETE — client-side session termination
 *   OPTIONS— CORS preflight
 *
 * No authentication is required: all tools only read public market data and
 * the endpoint never advertises OAuth metadata. No secrets are exposed.
 */

import { NextRequest } from "next/server";
import { handleMcpRequest, mcpPreflightResponse } from "@/lib/mcp/transport";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function GET(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleMcpRequest(request);
}

export async function OPTIONS() {
  return mcpPreflightResponse();
}