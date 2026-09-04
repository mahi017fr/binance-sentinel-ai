/**
 * TEMPORARY server-only verification route for the real Binance MCP connection.
 *
 *   GET /api/mcp/verify
 *
 * Performs the REAL MCP initialize/connection handshake against the official
 * Binance Agent MCP endpoint and, if the connection succeeds, calls listTools()
 * to enumerate the real discovered tool names + schemas.
 *
 * Nothing here is mocked or hardcoded — results reflect the live endpoint.
 * No secrets are exposed. This route does NOT integrate MCP into the analysis
 * pipeline; it exists purely to verify connectivity from this environment.
 */

import { NextResponse } from "next/server";
import { verifyBinanceMcp } from "@/lib/binance-mcp/client";

export async function GET() {
  try {
    const result = await verifyBinanceMcp();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        endpoint: "https://agent.binance.com/mcp/agentic",
        connected: false,
        authRequired: false,
        serverVersion: null,
        tools: null,
        error:
          err instanceof Error ? err.message : "MCP verification failed unexpectedly.",
      },
      { status: 500 }
    );
  }
}
