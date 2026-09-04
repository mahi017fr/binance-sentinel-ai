/**
 * SERVER-ONLY: In-memory session store for the Binance MCP OAuth flow.
 *
 * Stores transient OAuth state (state parameter, PKCE code_verifier,
 * authorization code, tokens) keyed by a cryptographically random session
 * identifier.  Tokens are NEVER exposed to the browser — they stay entirely
 * server-side.
 *
 * WARNING: This is a development-grade in-memory store.  In production you
 * would use an encrypted database or secure cookie.  The store is reset on
 * server restart, which is acceptable for a single-user dev tool.
 */

import type { OAuthTokens } from "@modelcontextprotocol/sdk/shared/auth.js";

export interface OAuthSession {
  /** Cryptographically random state parameter sent to the authorization server. */
  state: string;
  /** PKCE code_verifier (43–128 chars, RFC 7636 §4.1). */
  codeVerifier: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** Binance authorization code, set after callback. */
  authorizationCode?: string;
  /** Binance tokens, set after token exchange. */
  tokens?: OAuthTokens;
  /** Any error encountered during the callback. */
  error?: string;
}

const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes

const store = new Map<string, OAuthSession>();

function gc() {
  const now = Date.now();
  for (const [id, session] of store) {
    if (now - new Date(session.createdAt).getTime() > SESSION_TTL_MS) {
      store.delete(id);
    }
  }
}

export function createSession(
  state: string,
  codeVerifier: string
): { sessionId: string; session: OAuthSession } {
  gc();
  const sessionId = crypto.randomUUID();
  const session: OAuthSession = {
    state,
    codeVerifier,
    createdAt: new Date().toISOString(),
  };
  store.set(sessionId, session);
  return { sessionId, session };
}

export function getSession(sessionId: string): OAuthSession | undefined {
  gc();
  return store.get(sessionId);
}

export function updateSession(
  sessionId: string,
  patch: Partial<OAuthSession>
): void {
  const existing = store.get(sessionId);
  if (existing) {
    Object.assign(existing, patch);
  }
}

export function deleteSession(sessionId: string): void {
  store.delete(sessionId);
}
