/**
 * TEMPORARY server-only OAuth discovery/diagnostic route for the Binance MCP.
 *
 *   GET /api/mcp/discovery
 *
 * Runs the REAL OAuth discovery sequence against the official Binance MCP
 * endpoint and returns the parsed, validated discovery documents and the
 * derived flow/PKCE/scope findings. Nothing is mocked. No tokens, client IDs,
 * or credentials are created or exposed. It does NOT modify the analysis
 * pipeline.
 */

import { NextResponse } from "next/server";
import { runOAuthDiscovery } from "@/lib/binance-mcp/oauth-discovery";

export async function GET() {
  try {
    const result = await runOAuthDiscovery();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      {
        endpoint: "https://agent.binance.com/mcp/agentic",
        protectedResource: null,
        authorizationServer: null,
        findings: {
          flow: "unknown",
          pkceRequired: false,
          publicClient: false,
          dynamicRegistrationAdvertised: false,
          scopesAdvertised: [],
          requiresUserAuthorization: true,
        },
        error:
          err instanceof Error
            ? err.message
            : "OAuth discovery failed unexpectedly.",
      },
      { status: 500 }
    );
  }
}
