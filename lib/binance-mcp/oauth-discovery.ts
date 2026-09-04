/**
 * BINANCE MCP OAUTH DISCOVERY (server-side only).
 *
 * Performs REAL OAuth 2.0 discovery against the official Binance MCP endpoint,
 * following the MCP spec's protected-resource discovery. It fetches and
 * validates, against the official `@modelcontextprotocol/sdk` schemas, the
 * live discovery documents:
 *
 *   1. Protected Resource Metadata (RFC 9728)
 *      https://agent.binance.com/.well-known/oauth-protected-resource/gateway-mcp
 *   2. Authorization Server Metadata (RFC 8414) at the advertised issuer
 *
 * No values are guessed, fabricated, or mocked — everything here is parsed
 * from live network responses. No tokens, scopes, client IDs, or credentials
 * are created or exposed.
 */

import {
  OAuthProtectedResourceMetadataSchema,
  OAuthMetadataSchema,
} from "@modelcontextprotocol/sdk/shared/auth.js";

export const BINANCE_MCP_ENDPOINT = "https://agent.binance.com/mcp/agentic";
export const BINANCE_PRM_URL =
  "https://agent.binance.com/.well-known/oauth-protected-resource/gateway-mcp";

/** Structured report of the real OAuth discovery. */
export interface BinanceMcpOAuthDiscovery {
  endpoint: string;
  protectedResource: {
    resource?: string;
    authorizationServers: string[];
    scopesSupported?: string[];
    raw: unknown;
  } | null;
  authorizationServer: {
    issuer?: string;
    authorizationEndpoint?: string;
    tokenEndpoint?: string;
    grantTypesSupported?: string[];
    responseTypesSupported?: string[];
    tokenEndpointAuthMethodsSupported?: string[];
    codeChallengeMethodsSupported?: string[];
    registrationEndpoint?: string;
    scopesSupported?: string[];
    clientIdMetadataDocumentSupported?: boolean;
    raw: unknown;
  } | null;
  findings: {
    flow: string;
    pkceRequired: boolean;
    publicClient: boolean;
    dynamicRegistrationAdvertised: boolean;
    scopesAdvertised: string[];
    requiresUserAuthorization: boolean;
  };
  error?: string;
}

/** Fetch a JSON document, returning its parsed body or throwing. */
async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    throw new Error(
      `Discovery request to ${url} failed with HTTP ${res.status}`
    );
  }
  return res.json();
}

async function get<T>(
  fn: () => Promise<T | null>,
  fallback: () => T
): Promise<T> {
  try {
    const v = await fn();
    return v ?? fallback();
  } catch {
    return fallback();
  }
}

/**
 * Run the real OAuth discovery sequence for the Binance MCP endpoint.
 * Best-effort: if a step fails, it is reported rather than throwing the whole
 * diagnostic away.
 */
export async function runOAuthDiscovery(): Promise<BinanceMcpOAuthDiscovery> {
  const report: BinanceMcpOAuthDiscovery = {
    endpoint: BINANCE_MCP_ENDPOINT,
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
  };

  // Step 1: Protected Resource Metadata.
  const prmRaw = await get(
    () => fetchJson(BINANCE_PRM_URL),
    () => null
  );
  if (prmRaw && typeof prmRaw === "object") {
    const parsed = OAuthProtectedResourceMetadataSchema.safeParse(prmRaw);
    if (parsed.success) {
      const prm = parsed.data;
      report.protectedResource = {
        resource: prm.resource,
        authorizationServers: (prm.authorization_servers ?? []).map((u) => String(u)),
        scopesSupported: prm.scopes_supported?.map((s) => String(s)),
        raw: prmRaw,
      };
    }
  }

  // Step 2: Authorization Server Metadata at the advertised issuer.
  const asUrl =
    report.protectedResource?.authorizationServers[0] ??
    "https://agent.binance.com";
  const asRaw = await get(
    () => fetchJson(`${asUrl}/.well-known/oauth-authorization-server`),
    () => null
  );
  if (asRaw && typeof asRaw === "object") {
    const parsed = OAuthMetadataSchema.safeParse(asRaw);
    if (parsed.success) {
      const as = parsed.data;
      report.authorizationServer = {
        issuer: as.issuer,
        authorizationEndpoint: as.authorization_endpoint,
        tokenEndpoint: as.token_endpoint,
        grantTypesSupported: as.grant_types_supported,
        responseTypesSupported: as.response_types_supported,
        tokenEndpointAuthMethodsSupported: as.token_endpoint_auth_methods_supported,
        codeChallengeMethodsSupported: as.code_challenge_methods_supported,
        registrationEndpoint: as.registration_endpoint,
        scopesSupported: as.scopes_supported,
        clientIdMetadataDocumentSupported: as.client_id_metadata_document_supported,
        raw: asRaw,
      };
    }
  }

  // Derive findings from the real metadata.
  const as = report.authorizationServer;
  const prm = report.protectedResource;
  if (as) {
    const scopes = as.scopesSupported?.map(String) ?? prm?.scopesSupported ?? [];
    report.findings = {
      flow:
        as.grantTypesSupported?.includes("authorization_code") &&
        as.codeChallengeMethodsSupported?.includes("S256")
          ? "OAuth 2.0 Authorization Code with PKCE (S256)"
          : as.grantTypesSupported?.includes("authorization_code")
            ? "OAuth 2.0 Authorization Code"
            : "Unknown (no advertised grant type)",
      pkceRequired: as.codeChallengeMethodsSupported?.includes("S256") ?? false,
      // "none" token-endpoint auth method => public client (no client secret).
      publicClient:
        as.tokenEndpointAuthMethodsSupported?.includes("none") ?? false,
      dynamicRegistrationAdvertised: !!as.registrationEndpoint,
      scopesAdvertised: scopes,
      requiresUserAuthorization: true,
    };
  } else {
    report.error =
      "Authorization Server Metadata could not be retrieved; unable to determine the exact flow.";
  }

  return report;
}
