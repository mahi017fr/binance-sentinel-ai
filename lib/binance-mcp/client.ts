/**
 * BINANCE MCP CLIENT (server-side only).
 *
 * Minimal real connectivity layer to the official Binance Agent MCP endpoint
 * over the MCP Streamable HTTP transport, using the official
 * `@modelcontextprotocol/sdk` package.
 *
 * IMPORTANT:
 *  - This module performs a REAL connection handshake. It never fabricates or
 *    mocks MCP responses, tool names, or server version.
 *  - It does NOT assume any tool names (no hardcoded `get_ticker`/`get_klines`).
 *  - It is NOT integrated into the analysis pipeline yet — it only verifies
 *    connectivity and (when a connection succeeds) enumerates the real tools.
 *  - No secrets are ever logged or exposed to the client.
 */

import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/** Official Binance Agent MCP endpoint (Streamable HTTP). */
export const BINANCE_MCP_ENDPOINT = "https://agent.binance.com/mcp/agentic";

/** One discovered tool, exactly as reported by the server. */
export interface BinanceMcpTool {
  name: string;
  description?: string;
  inputSchema: unknown;
}

/** Structured result of a real MCP connectivity probe. */
export interface BinanceMcpVerifyResult {
  endpoint: string;
  /** True only if the real MCP initialize handshake + listTools succeeded. */
  connected: boolean;
  /** True if the endpoint rejected the connection with an auth requirement. */
  authRequired: boolean;
  /** HTTP status observed when auth was required, if any. */
  status?: number;
  /** The WWW-Authenticate challenge header (OAuth discovery info), if present. */
  wwwAuthenticate?: string;
  /** Reported server name/version, when a connection succeeds. */
  serverVersion?: { name?: string; version?: string } | null;
  /** Real tools discovered via listTools(), when a connection succeeds. */
  tools?: BinanceMcpTool[] | null;
  /** Safe, human-readable error message (never a stack trace or secret). */
  error?: string;
}

interface CapturedResponse {
  status: number;
  statusText: string;
  wwwAuthenticate?: string;
  body: string;
}

/**
 * Deterministically verify the real Binance MCP connection and, if possible,
 * enumerate its real tools. Runs the genuine SDK handshake and listTools().
 */
export async function verifyBinanceMcp(
  options: { accessToken?: string; timeoutMs?: number } = {}
): Promise<BinanceMcpVerifyResult> {
  const { accessToken, timeoutMs = 20000 } = options;
  let captured: CapturedResponse | undefined;

  const transport = new StreamableHTTPClientTransport(
    new URL(BINANCE_MCP_ENDPOINT),
    {
      // When an access token is supplied, attach it as a Bearer credential so
      // the initialize handshake runs authenticated. Never log or expose it.
      requestInit: {
        headers: accessToken
          ? { Authorization: `Bearer ${accessToken}` }
          : {},
      },
      // Intercept the wire traffic so we can report the exact HTTP/auth
      // response without exposing anything sensitive.
      fetch: async (input, init) => {
        const res = await fetch(input, init);
        try {
          const clone = res.clone();
          const body = await clone.text();
          captured = {
            status: res.status,
            statusText: res.statusText,
            wwwAuthenticate:
              res.headers.get("www-authenticate") ?? undefined,
            body,
          };
        } catch {
          // Ignore body-reading failures — the status still stands.
        }
        return res;
      },
    }
  );

  const client = new Client(
    { name: "sentinel-mcp-client", version: "0.1.0" },
    { capabilities: {} }
  );

  try {
    // Real MCP initialization / connection handshake.
    await withTimeout(client.connect(transport), timeoutMs);
  } catch (err) {
    // Connection failed. Report whether it was an auth requirement.
    const authRequired =
      captured?.status === 401 || isUnauthorizedError(err);
    return {
      endpoint: BINANCE_MCP_ENDPOINT,
      connected: false,
      authRequired,
      status: captured?.status,
      wwwAuthenticate: captured?.wwwAuthenticate,
      serverVersion: null,
      tools: null,
      error: authRequired
        ? "The Binance MCP endpoint requires authentication (HTTP 401). A valid Bearer/API credential is needed to connect; the initialize handshake cannot proceed without it."
        : `Could not connect to the Binance MCP endpoint (${captured?.status ?? "unknown"}).`,
    };
  }

  try {
    const serverVersion = client.getServerVersion();
    const result = await withTimeout(client.listTools(), timeoutMs);
    const tools: BinanceMcpTool[] = result.tools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    }));

    return {
      endpoint: BINANCE_MCP_ENDPOINT,
      connected: true,
      authRequired: false,
      serverVersion: serverVersion
        ? { name: serverVersion.name, version: serverVersion.version }
        : null,
      tools,
    };
  } catch (err) {
    return {
      endpoint: BINANCE_MCP_ENDPOINT,
      connected: false,
      authRequired: false,
      serverVersion: null,
      tools: null,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    try {
      await transport.close();
    } catch {
      // best-effort close
    }
  }
}

function isUnauthorizedError(err: unknown): boolean {
  return (
    err instanceof Error &&
    (err.name === "UnauthorizedError" ||
      /unauthor|401|auth/i.test(err.message || ""))
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`MCP request timed out after ${ms}ms`));
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}
