/**
 * OAuth callback handler for the Binance MCP Authorization Code flow.
 *
 *   GET /api/auth/callback?code=...&state=...
 *
 * Binance redirects the user-agent here after the user authorizes (or denies)
 * the application.  This route:
 *
 *   1. Decrypts and validates the `state` parameter against the value stored
 *      in the encrypted, HttpOnly session cookie (Created at /api/auth/authorize).
 *   2. Exchanges the REAL authorization code for access tokens at Binance's
 *      token endpoint (Authorization Code + PKCE S256), using only officially
 *      advertised parameters and the MCP `resource` indicator (RFC 8707).
 *   3. Stores the resulting tokens in an AES-256-GCM encrypted, HttpOnly
 *      cookie so /api/mcp/verify can use them across serverless invocations.
 *      Tokens are NEVER returned to the browser, logged, or exposed.
 *   4. Returns a safe status page ("Authorization successful / MCP connection
 *      pending verification").  No tokens or authorization codes are shown.
 *
 * Refresh tokens are NOT handled here: Binance's authorization server only
 * advertises `grant_types_supported: ["authorization_code"]`, so no
 * refresh-token logic is implemented.
 */

import { type NextRequest, NextResponse } from "next/server";
import { exchangeAuthorization } from "@modelcontextprotocol/sdk/client/auth.js";
import { runOAuthDiscovery } from "@/lib/binance-mcp/oauth-discovery";
import { BINANCE_MCP_ENDPOINT } from "@/lib/binance-mcp/client";
import {
  encryptPayload,
  decryptPayload,
} from "@/lib/binance-mcp/oauth-store";

const SESSION_COOKIE = "binance-oauth-session";
const TOKENS_COOKIE = "binance-mcp-tokens";
const AS_ISSUER = "https://agent.binance.com";
const SESSION_TTL_MS = 10 * 60 * 1000;

interface StoredSession {
  state: string;
  codeVerifier: string;
  createdAt: number;
}

export const dynamic = "force-dynamic";

/** Minimal self-contained HTML so the callback page renders without a bundle. */
function renderPage(title: string, status: "ok" | "error", message: string) {
  const color = status === "ok" ? "#16a34a" : "#dc2626";
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title}</title>
<style>
  body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
       background:#0b0e14;color:#e2e8f0;display:flex;align-items:center;justify-content:center;min-height:100vh}
  .card{max-width:460px;text-align:center;padding:40px 32px}
  .dot{width:14px;height:14px;border-radius:50%;background:${color};margin:0 auto 16px}
  h1{font-size:18px;margin:0 0 8px}
  p{font-size:13px;line-height:1.6;color:#94a3b8;margin:0 0 16px}
  a{color:#f0b90b}
</style>
</head>
<body>
  <div class="card">
    <div class="dot" aria-hidden="true"></div>
    <h1>${title}</h1>
    <p>${message}</p>
    <p><a href="/">Return to Binance Sentinel AI</a></p>
  </div>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get(
    "error_description"
  );

  const baseUrl = request.nextUrl.origin;
  const redirectUrl = `${baseUrl}/api/auth/callback`;
  const clientMetadataUrl = `${baseUrl}/.well-known/oauth-client-metadata.json`;

  const sessions = request.cookies;
  const clearCookies = (res: NextResponse) => {
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(TOKENS_COOKIE);
    return res;
  };

  // ── Error from Binance ────────────────────────────────────────────────
  if (error) {
    return clearCookies(
      new NextResponse(
        renderPage(
          "Authorization not completed",
          "error",
          `Binance could not complete authorization: <strong>${error}</strong>` +
            (errorDescription ? ` — ${errorDescription}` : "") +
            `. You can start the flow again via <a href="/api/auth/authorize">/api/auth/authorize</a>.`
        ),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    );
  }

  // ── Decrypt + validate the session cookie ──────────────────────────────
  const rawCookie = sessions.get(SESSION_COOKIE)?.value;
  const session: StoredSession | null = rawCookie
    ? decryptPayload<StoredSession>(rawCookie)
    : null;

  if (!session) {
    return clearCookies(
      new NextResponse(
        renderPage(
          "Session not found",
          "error",
          "No valid OAuth session was found (it may have expired or the cookie was blocked). Start the flow again via <a href=\"/api/auth/authorize\">/api/auth/authorize</a>."
        ),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    );
  }

  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    return clearCookies(
      new NextResponse(
        renderPage(
          "Session expired",
          "error",
          "The OAuth session has expired (max 10 minutes). Start the flow again via <a href=\"/api/auth/authorize\">/api/auth/authorize</a>."
        ),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    );
  }

  // ── State validation (CSRF protection) ────────────────────────────────
  if (!state || state !== session.state) {
    return clearCookies(
      new NextResponse(
        renderPage(
          "State mismatch",
          "error",
          "The state parameter does not match the session. This may indicate a CSRF attack. The session has been destroyed. Start again via <a href=\"/api/auth/authorize\">/api/auth/authorize</a>."
        ),
        { status: 403, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    );
  }

  // ── Missing authorization code ────────────────────────────────────────
  if (!code) {
    return clearCookies(
      new NextResponse(
        renderPage(
          "No authorization code",
          "error",
          "Binance did not return an authorization code — the user may have denied authorization. Start again via <a href=\"/api/auth/authorize\">/api/auth/authorize</a>."
        ),
        { status: 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    );
  }

  // ── Re-discover Binance authorization server metadata ─────────────────
  const discovery = await runOAuthDiscovery();
  const asMetadata = discovery.authorizationServer;
  if (!asMetadata?.tokenEndpoint) {
    return clearCookies(
      new NextResponse(
        renderPage(
          "Token exchange unavailable",
          "error",
          "Binance authorization server metadata could not be re-discovered to locate a token endpoint. Try again via <a href=\"/api/auth/authorize\">/api/auth/authorize</a>."
        ),
        { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    );
  }

  const authServerMetadata = {
    issuer: asMetadata.issuer ?? AS_ISSUER,
    authorization_endpoint: asMetadata.authorizationEndpoint ?? "",
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

  try {
    // ── REAL Authorization Code -> Token exchange (Auth Code + PKCE) ────
    const tokens = await exchangeAuthorization(new URL(AS_ISSUER), {
      metadata: authServerMetadata,
      clientInformation: { client_id: clientMetadataUrl },
      authorizationCode: code,
      codeVerifier: session.codeVerifier,
      redirectUri: redirectUrl,
      resource: new URL(BINANCE_MCP_ENDPOINT),
    });

    // Store the real tokens in an encrypted HttpOnly cookie for use by
    // /api/mcp/verify across serverless invocations. Never sent to JS.
    const response = new NextResponse(
      renderPage(
        "Authorization successful",
        "ok",
        "Your Binance identity is authorized for market-data access. Token exchange succeeded server-side. MCP connection is pending verification — run <a href=\"/api/mcp/verify\">/api/mcp/verify</a> to continue."
      ),
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
    response.cookies.delete(SESSION_COOKIE);
    response.cookies.set(TOKENS_COOKIE, encryptPayload(tokens), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/api/mcp/verify",
      maxAge: 60 * 60, // 1 hour
    });
    return response;
  } catch (err) {
    const detail =
      err instanceof Error ? err.message : "Unknown token exchange error.";
    return clearCookies(
      new NextResponse(
        renderPage(
          "Token exchange failed",
          "error",
          `The server could not exchange the authorization code for access tokens: <strong>${detail}</strong> No tokens were created or exposed. Start again via <a href="/api/auth/authorize">/api/auth/authorize</a>.`
        ),
        { status: 502, headers: { "Content-Type": "text/html; charset=utf-8" } }
      )
    );
  }
}
