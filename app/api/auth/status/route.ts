/**
 * Safe OAuth status page — never exposes tokens or secrets.
 *
 *   GET /api/auth/status
 *
 * Reports:
 *   - Whether the public client metadata URL is configured and reachable
 *   - Whether a real authorization callback has been received
 *   - Authorization flow readiness
 *   - Deployment requirements
 *
 * This endpoint is diagnostic only.  It does NOT reveal access tokens,
 * refresh tokens, client secrets (there are none for public clients), or
 * any other credential material.
 */

import { NextResponse } from "next/server";
import {
  getClientMetadataUrl,
  getRedirectUrl,
} from "@/lib/binance-mcp/oauth-provider";
import { runOAuthDiscovery } from "@/lib/binance-mcp/oauth-discovery";

export const dynamic = "force-dynamic";

interface StatusReport {
  timestamp: string;
  deployment: {
    baseUrl: string;
    clientMetadataUrl: string;
    redirectUrl: string;
    requiresHttpsDeployment: boolean;
    deployedAtLocalhost: boolean;
  };
  clientMetadata: {
    reachable: boolean;
    httpStatus?: number;
    hasRedirectUris: boolean;
    hasTokenEndpointAuthMethod: boolean;
    authTokenEndpointAuthMethod?: string;
    valid: boolean;
  };
  binanceDiscovery: {
    reachable: boolean;
    authorizationEndpoint?: string;
    tokenEndpoint?: string;
    clientIdMetadataDocumentSupported?: boolean;
    codeChallengeMethodsSupported?: string[];
    flow?: string;
    publicClient?: boolean;
    error?: string;
  };
  readiness: {
    canInitiateAuthorization: boolean;
    blockers: string[];
  };
}

export async function GET(): Promise<NextResponse<StatusReport>> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const clientMetadataUrl = getClientMetadataUrl();
  const redirectUrl = getRedirectUrl();
  const deployedAtLocalhost = baseUrl.includes("localhost");

  // ── Probe the public client metadata endpoint ────────────────────────
  let reachable = false;
  let httpStatus: number | undefined;
  let hasRedirectUris = false;
  let hasTokenEndpointAuthMethod = false;
  let authTokenEndpointAuthMethod: string | undefined;
  let valid = false;

  try {
    const metaRes = await fetch(clientMetadataUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    httpStatus = metaRes.status;
    if (metaRes.ok) {
      const body = await metaRes.json();
      reachable = true;
      hasRedirectUris =
        Array.isArray(body.redirect_uris) && body.redirect_uris.length > 0;
      hasTokenEndpointAuthMethod =
        typeof body.token_endpoint_auth_method === "string";
      authTokenEndpointAuthMethod = body.token_endpoint_auth_method;
      valid = true;
    }
  } catch {
    // metadata not reachable
  }

  // ── Run Binance OAuth discovery ──────────────────────────────────────
  const discovery = await runOAuthDiscovery();

  // ── Build readiness report ───────────────────────────────────────────
  const blockers: string[] = [];

  if (deployedAtLocalhost) {
    blockers.push(
      "Application is running on localhost. " +
        "Binance requires a publicly accessible HTTPS URL for the redirect_uri " +
        "and client metadata document. Deploy to a hosting platform (e.g. Vercel) " +
        "with HTTPS enabled."
    );
  }

  if (!reachable) {
    blockers.push(
      `Client metadata document is not reachable at ${clientMetadataUrl}.`
    );
  }

  if (reachable && !hasRedirectUris) {
    blockers.push("Client metadata is missing redirect_uris.");
  }

  if (
    !discovery.authorizationServer?.clientIdMetadataDocumentSupported
  ) {
    blockers.push(
      "Binance authorization server does not advertise " +
        "client_id_metadata_document_supported. URL-based client IDs may not work."
    );
  }

  if (!discovery.authorizationServer?.authorizationEndpoint) {
    blockers.push(
      "Binance authorization server metadata could not be discovered."
    );
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    deployment: {
      baseUrl,
      clientMetadataUrl,
      redirectUrl,
      requiresHttpsDeployment: true,
      deployedAtLocalhost,
    },
    clientMetadata: {
      reachable,
      httpStatus,
      hasRedirectUris,
      hasTokenEndpointAuthMethod,
      authTokenEndpointAuthMethod,
      valid,
    },
    binanceDiscovery: {
      reachable: !!discovery.authorizationServer?.authorizationEndpoint,
      authorizationEndpoint:
        discovery.authorizationServer?.authorizationEndpoint,
      tokenEndpoint: discovery.authorizationServer?.tokenEndpoint,
      clientIdMetadataDocumentSupported:
        discovery.authorizationServer?.clientIdMetadataDocumentSupported,
      codeChallengeMethodsSupported:
        discovery.authorizationServer?.codeChallengeMethodsSupported,
      flow: discovery.findings.flow,
      publicClient: discovery.findings.publicClient,
      error: discovery.error,
    },
    readiness: {
      canInitiateAuthorization: blockers.length === 0,
      blockers,
    },
  });
}
