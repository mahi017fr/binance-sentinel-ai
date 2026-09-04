/**
 * SERVER-ONLY: OAuthClientProvider implementation for the Binance MCP OAuth flow.
 *
 * Implements the MCP SDK's `OAuthClientProvider` interface for use with the
 * SDK's `auth()` orchestrator.  State, code_verifier, and tokens are held
 * in-memory on the server and are NEVER exposed to the browser.
 *
 * When the Binance authorization server supports `client_id_metadata_document_supported`
 * (SEP-991), the provider advertises a `clientMetadataUrl` so the SDK can use
 * the URL itself as the client_id without dynamic client registration.
 */

import type {
  OAuthClientInformationMixed,
  OAuthClientMetadata,
  OAuthTokens,
} from "@modelcontextprotocol/sdk/shared/auth.js";
import type {
  OAuthClientProvider,
  OAuthDiscoveryState,
} from "@modelcontextprotocol/sdk/client/auth.js";
import {
  createSession,
  updateSession,
  type OAuthSession,
} from "./oauth-session";

export const BINANCE_MCP_SERVER_URL =
  "https://agent.binance.com/mcp/agentic";

/**
 * Resolve the public base URL for this deployment.
 *
 * In production this should be set via `NEXT_PUBLIC_BASE_URL` (e.g.
 * `https://your-app.vercel.app`).  During local development we fall back
 * to `http://localhost:3000`.
 */
function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
}

export function getClientMetadataUrl(): string {
  return `${getBaseUrl()}/.well-known/oauth-client-metadata.json`;
}

export function getRedirectUrl(): string {
  return `${getBaseUrl()}/api/auth/callback`;
}

export const CLIENT_METADATA: OAuthClientMetadata = {
  redirect_uris: [getRedirectUrl()],
  token_endpoint_auth_method: "none",
  // Binance's authorization server advertises grant_types_supported:
  // ["authorization_code"] only — do not add undeclared grant types.
  grant_types: ["authorization_code"],
  response_types: ["code"],
  client_name: "Binance Sentinel AI",
  client_uri: getBaseUrl(),
};

/**
 * The document served at /.well-known/oauth-client-metadata.json and used as
 * the CIMD client_id. Per SEP-991, this document MUST include a `client_id`
 * field that exactly equals the URL it is served from. The SDK's
 * OAuthClientMetadata type omits `client_id` (it lives in the client
 * information schema), so we use a superset type here.
 */
export interface ClientIdMetadataDocument extends OAuthClientMetadata {
  client_id: string;
}

export const CLIENT_ID_METADATA_DOCUMENT: ClientIdMetadataDocument = {
  client_id: getClientMetadataUrl(),
  redirect_uris: [getRedirectUrl()],
  token_endpoint_auth_method: "none",
  grant_types: ["authorization_code"],
  response_types: ["code"],
  client_name: "Binance Sentinel AI",
  client_uri: getBaseUrl(),
};

export class BinanceOAuthClientProvider implements OAuthClientProvider {
  private _clientInformation: OAuthClientInformationMixed | undefined;
  private _tokens: OAuthTokens | undefined;
  private _codeVerifier: string | undefined;
  private _state: string | undefined;
  private _discoveryState: OAuthDiscoveryState | undefined;
  private _session: OAuthSession | undefined;
  private _sessionId: string | undefined;

  get redirectUrl(): string | URL {
    return getRedirectUrl();
  }

  get clientMetadataUrl(): string {
    return getClientMetadataUrl();
  }

  get clientMetadata(): OAuthClientMetadata {
    return CLIENT_METADATA;
  }

  state(): string | Promise<string> {
    if (!this._state) {
      this._state = crypto.randomUUID();
    }
    return this._state;
  }

  clientInformation(): OAuthClientInformationMixed | undefined {
    return this._clientInformation;
  }

  saveClientInformation(clientInformation: OAuthClientInformationMixed): void {
    this._clientInformation = clientInformation;
  }

  tokens(): OAuthTokens | undefined {
    return this._tokens;
  }

  saveTokens(tokens: OAuthTokens): void {
    this._tokens = tokens;
  }

  redirectToAuthorization(authorizationUrl: URL): void {
    this._authorizationUrl = authorizationUrl;
  }

  saveCodeVerifier(codeVerifier: string): void {
    this._codeVerifier = codeVerifier;
  }

  codeVerifier(): string {
    if (!this._codeVerifier) {
      throw new Error("No code verifier saved — call saveCodeVerifier first.");
    }
    return this._codeVerifier;
  }

  invalidateCredentials(
    scope: "all" | "client" | "tokens" | "verifier" | "discovery"
  ): void {
    switch (scope) {
      case "all":
        this._clientInformation = undefined;
        this._tokens = undefined;
        this._codeVerifier = undefined;
        this._discoveryState = undefined;
        break;
      case "client":
        this._clientInformation = undefined;
        break;
      case "tokens":
        this._tokens = undefined;
        break;
      case "verifier":
        this._codeVerifier = undefined;
        break;
      case "discovery":
        this._discoveryState = undefined;
        break;
    }
  }

  saveDiscoveryState(state: OAuthDiscoveryState): void {
    this._discoveryState = state;
  }

  discoveryState(): OAuthDiscoveryState | undefined {
    return this._discoveryState;
  }

  // --- Session management (server-side only) ---

  /** Create a new session and persist state + code_verifier. */
  startSession(state: string, codeVerifier: string): string {
    const { sessionId, session } = createSession(state, codeVerifier);
    this._sessionId = sessionId;
    this._session = session;
    return sessionId;
  }

  getSessionId(): string | undefined {
    return this._sessionId;
  }

  /** Complete a session after receiving the authorization code. */
  completeSession(authorizationCode: string): void {
    if (this._sessionId) {
      updateSession(this._sessionId, { authorizationCode });
    }
  }

  // Internal: set by redirectToAuthorization for redirect flow
  private _authorizationUrl: URL | undefined;
  get pendingAuthorizationUrl(): URL | undefined {
    return this._authorizationUrl;
  }
}
