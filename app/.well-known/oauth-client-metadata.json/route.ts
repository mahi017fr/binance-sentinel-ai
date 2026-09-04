/**
 * Public OAuth Client Metadata Document (RFC 7591 / SEP-991).
 *
 *   GET /.well-known/oauth-client-metadata.json
 *
 * This endpoint is publicly accessible (no auth required) and returns the
 * JSON client metadata for this application.  When the Binance authorization
 * server advertises `client_id_metadata_document_supported: true`, the
 * metadata URL itself serves as the client_id (URL-based Client IDs,
 * SEP-991), eliminating the need for dynamic client registration.
 *
 * The document conforms to the `OAuthClientMetadataSchema` from the
 * `@modelcontextprotocol/sdk` and contains only specification-required and
 * specification-standard fields.  No scopes are invented — the `scope` field
 * is intentionally empty/absent.
 */

import { NextResponse } from "next/server";
import { CLIENT_METADATA } from "@/lib/binance-mcp/oauth-provider";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(CLIENT_METADATA, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
