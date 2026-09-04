/**
 * OAuth callback handler for the Binance MCP Authorization Code flow.
 *
 *   GET /api/auth/callback?code=...&state=...
 *
 * Binance redirects the user-agent here after the user authorizes (or denies)
 * the application.  This route:
 *
 *   1. Validates the `state` parameter against the server-side session
 *   2. Records whether an authorization code was received
 *   3. Stores the code in the session for later token exchange
 *   4. Returns a safe, human-readable confirmation page
 *
 * Token exchange is NOT executed here — it will be performed by a separate
 * server-side endpoint when the code is present and the session is valid.
 * No tokens or secrets are ever exposed to the browser.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  getSession,
  updateSession,
  deleteSession,
} from "@/lib/binance-mcp/oauth-session";

const SESSION_COOKIE = "binance-oauth-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");
  const errorDescription = request.nextUrl.searchParams.get(
    "error_description"
  );

  const sessionId = request.cookies.get(SESSION_COOKIE)?.value;

  // ── Always clear the session cookie ───────────────────────────────────
  const clearCookie = (res: NextResponse) => {
    res.cookies.delete(SESSION_COOKIE);
    return res;
  };

  // ── Error from Binance ────────────────────────────────────────────────
  if (error) {
    if (sessionId) {
      updateSession(sessionId, {
        error: `${error}: ${errorDescription ?? "no description"}`,
      });
      deleteSession(sessionId);
    }
    const res = NextResponse.json(
      {
        status: "authorization_denied",
        error,
        errorDescription,
        timestamp: new Date().toISOString(),
      },
      { status: 400 }
    );
    return clearCookie(res);
  }

  // ── Missing session cookie ────────────────────────────────────────────
  if (!sessionId) {
    return clearCookie(
      NextResponse.json(
        {
          status: "session_not_found",
          message:
            "No OAuth session cookie was found. " +
            "The session may have expired or the cookie was blocked. " +
            "Start the flow again via GET /api/auth/authorize.",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    );
  }

  // ── Session lookup ────────────────────────────────────────────────────
  const session = getSession(sessionId);
  if (!session) {
    return clearCookie(
      NextResponse.json(
        {
          status: "session_expired",
          message:
            "The OAuth session has expired (max 10 minutes). " +
            "Start the flow again via GET /api/auth/authorize.",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    );
  }

  // ── State validation ──────────────────────────────────────────────────
  if (!state || state !== session.state) {
    deleteSession(sessionId);
    return clearCookie(
      NextResponse.json(
        {
          status: "state_mismatch",
          message:
            "The state parameter does not match the session. " +
            "This may indicate a CSRF attack. Session has been destroyed.",
          timestamp: new Date().toISOString(),
        },
        { status: 403 }
      )
    );
  }

  // ── Missing authorization code ────────────────────────────────────────
  if (!code) {
    deleteSession(sessionId);
    return clearCookie(
      NextResponse.json(
        {
          status: "no_code",
          message:
            "Binance did not return an authorization code. " +
            "The user may have denied authorization.",
          timestamp: new Date().toISOString(),
        },
        { status: 400 }
      )
    );
  }

  // ── Authorization code received — store it server-side ────────────────
  updateSession(sessionId, { authorizationCode: code });

  return clearCookie(
    NextResponse.json(
      {
        status: "authorization_code_received",
        message:
          "A real authorization code was received from Binance. " +
          "Token exchange has NOT been executed yet — it will be " +
          "performed by a separate server-side endpoint.",
        codePrefix: code.substring(0, 8) + "...",
        sessionId,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    )
  );
}
