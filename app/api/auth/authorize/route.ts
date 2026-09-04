/**
 * Initiate Binance MCP OAuth Authorization Code + PKCE flow.
 *
 *   GET /api/auth/authorize
 *
 * This server-side route:
 *   1. Discovers the Binance authorization server metadata
 *   2. Generates a PKCE code_verifier + S256 code_challenge
 *   3. Generates a cryptographically random state parameter
 *   4. Stores state + code_verifier in a server-side session
 *   5. Redirects the browser to Binance's authorization endpoint
 *
 * No tokens, secrets, or client IDs are fabricated.  The client_id used is
 * the URL of the public client metadata document (SEP-991 URL-based Client
 * IDs) — the same URL the Binance authorization server discovers during
 * `client_id_metadata_document_supported` discovery.
 *
 * The session ID is stored in an HttpOnly cookie so the callback route can
 * retrieve the state + code_verifier without exposing them to JavaScript.
 */

import { type NextRequest, NextResponse } from "next/server";
import { startAuthorization } from "@modelcontextprotocol/sdk/client/auth.js";
import { BinanceOAuthClientProvider } from "@/lib/binance-mcp/oauth-provider";
import { runOAuthDiscovery } from "@/lib/binance-mcp/oauth-discovery";
import { encryptPayload } from "@/lib/binance-mcp/oauth-store";

const SESSION_COOKIE = "binance-oauth-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const baseUrl = request.nextUrl.origin;

    // ── Step 1: Discover Binance authorization server metadata ──────────
    const discovery = await runOAuthDiscovery();
    const asMetadata = discovery.authorizationServer;
    if (!asMetadata?.authorizationEndpoint || !asMetadata?.tokenEndpoint) {
      return NextResponse.json(
        {
          error:
            "Could not discover Binance authorization server metadata. " +
            "Run GET /api/mcp/discovery to inspect the current state.",
        },
        { status: 503 }
      );
    }

    // ── Step 2: Determine the client_id (URL-based, SEP-991) ───────────
    const supportsUrlBasedClientId =
      asMetadata.clientIdMetadataDocumentSupported === true;
    if (!supportsUrlBasedClientId) {
      return NextResponse.json(
        {
          error:
            "Binance authorization server does not advertise " +
            "`client_id_metadata_document_supported: true`. " +
            "URL-based client IDs (SEP-991) are required for public clients " +
            "without dynamic client registration.",
        },
        { status: 503 }
      );
    }

    const clientMetadataUrl = `${baseUrl}/.well-known/oauth-client-metadata.json`;
    const redirectUrl = `${baseUrl}/api/auth/callback`;

    // ── Step 3: Build client information (URL-based client_id) ──────────
    const clientInformation = { client_id: clientMetadataUrl };

    // ── Step 4: Create provider and generate state + PKCE ───────────────
    const provider = new BinanceOAuthClientProvider();
    const state = await provider.state();

    // Build the full authorization server metadata object that
    // startAuthorization() expects.
    const authServerMetadata = {
      issuer: asMetadata.issuer ?? "https://accounts.binance.com",
      authorization_endpoint: asMetadata.authorizationEndpoint,
      token_endpoint: asMetadata.tokenEndpoint,
      response_types_supported: asMetadata.responseTypesSupported ?? ["code"],
      code_challenge_methods_supported:
        asMetadata.codeChallengeMethodsSupported ?? ["S256"],
      token_endpoint_auth_methods_supported:
        asMetadata.tokenEndpointAuthMethodsSupported ?? ["none"],
      grant_types_supported: asMetadata.grantTypesSupported ?? [
        "authorization_code",
      ],
      client_id_metadata_document_supported:
        asMetadata.clientIdMetadataDocumentSupported ?? true,
    };

    const { authorizationUrl, codeVerifier } = await startAuthorization(
      new URL(authServerMetadata.issuer),
      {
        metadata: authServerMetadata,
        clientInformation,
        redirectUrl,
        state,
      }
    );

    // RFC 8707 Resource Indicators: the MCP server's canonical URI must be
    // included in the authorization request (MUST since the 2025-06-18 MCP
    // spec revision). The SDK's startAuthorization does not add it, so append
    // it here to match the token exchange, which sends the same `resource`.
    authorizationUrl.searchParams.set(
      "resource",
      "https://agent.binance.com/mcp/agentic"
    );

    // ── Step 5: Persist state + code_verifier (encrypted, serverless-safe) ──
    // The session payload is AES-256-GCM encrypted into an HttpOnly cookie so
    // it survives across serverless invocations (see lib/binance-mcp/oauth-store).
    const sessionCookie = encryptPayload({
      state,
      codeVerifier,
      createdAt: Date.now(),
    });

    // ── Step 6: Set session cookie and redirect to Binance ───────────────
    const response = NextResponse.redirect(authorizationUrl, 302);
    response.cookies.set(SESSION_COOKIE, sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to initiate OAuth authorization.",
      },
      { status: 500 }
    );
  }
}
