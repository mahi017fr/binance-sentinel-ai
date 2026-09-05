/**
 * Sentinel MCP server factory.
 *
 * Builds the remote MCP server exposed to Claude Custom Connectors at
 * `/api/mcp`. Read-only by design: every tool is annotated `readOnlyHint`,
 * no tool can mutate state, and only the supported Sentinel symbol universe
 * is accepted.
 *
 * The server is a pure factory so a fresh stateless instance can be created
 * per HTTP request (the pattern required for serverless / Vercel).
 *
 * Branding:
 *   "Binance Sentinel AI" is a community-built, research-only project that
 *   consumes Binance PUBLIC market data. It is not an official Binance
 *   product. The MCP protocol (2025-11-25) has no server/connector-level icon
 *   metadata, so this factory exposes a custom icon through the supported
 *   per-tool `icons` field of `tools/list`, plus a disclaimer via
 *   `InitializeResult.instructions`. The icon itself is an original Sentinel
 *   mark in Binance's brand palette — the official Binance trademark is not
 *   used (Binance's own brand terms restrict it to press/media use).
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  ListToolsRequestSchema,
  type Icon,
  type ListToolsResult,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  analyzeMarketTool,
  getCurrentPrice,
  getMarketData,
  McpToolError,
  SUPPORTED_SYMBOLS,
} from "./sentinel-tools";

export const SENTINEL_MCP_NAME = "Binance Sentinel AI";
export const SENTINEL_MCP_VERSION = "1.0.0";

const SYMBOL_DESCRIPTION =
  "Binance SPOT trading pair, e.g. BTCUSDT. Supported: " + SUPPORTED_SYMBOLS.join(", ");

/**
 * Disclaimer surfaced to the model via `InitializeResult.instructions`.
 * Keeps the branding honest: community-built, research-only, not affiliated.
 */
const SENTINEL_MCP_INSTRUCTIONS =
  "This connector ('Binance Sentinel AI') is a community-built, research-only " +
  "project that reads PUBLIC market data from Binance (with a CoinGecko " +
  "fallback). It is NOT an official Binance product and is not affiliated with " +
  "or endorsed by Binance. It cannot place orders, access accounts, or perform " +
  "trades. All tools are read-only.";

/** Wrap a structured result for the MCP content protocol. */
function textResult(result: object) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
    structuredContent: result as Record<string, unknown>,
  };
}

/** Convert a safe McpToolError (or unexpected failure) into a tool-error result. */
function errorResult(err: unknown) {
  if (err instanceof McpToolError) {
    return {
      content: [{ type: "text" as const, text: err.message }],
      isError: true,
    };
  }
  return {
    content: [
      {
        type: "text" as const,
        text: "Sentinel MCP tool failed unexpectedly. Please retry.",
      },
    ],
    isError: true,
  };
}

interface SentinelToolDefinition {
  name: string;
  title: string;
  description: string;
  handler: (symbol: string) => Promise<object>;
}

/** Single source of truth for the three read-only tools (metadata + handler). */
const SENTINEL_TOOL_DEFINITIONS: readonly SentinelToolDefinition[] = [
  {
    name: "get_current_price",
    title: "Get Current Price",
    description:
      "Get the latest public market price and 24h statistics for a supported Binance symbol.",
    handler: getCurrentPrice,
  },
  {
    name: "get_market_data",
    title: "Get Market Data",
    description:
      "Get structured public market data (price, 24h range, volume, recent bars) for a supported Binance symbol.",
    handler: getMarketData,
  },
  {
    name: "analyze_market",
    title: "Analyze Market",
    description:
      "Run Binance Sentinel AI's research-only market intelligence analysis for a supported symbol (risk score, trade readiness, directional signal, confidence, evidence).",
    handler: analyzeMarketTool,
  },
];

/**
 * Branding options for the branded tool metadata.
 */
export interface SentinelMcpBranding {
  /**
   * Absolute public URL of our own branded icon asset (e.g.
   * `https://<host>/icon.svg`). When set, each tool advertises it via the
   * MCP `Tool.icons` field so capable clients (Claude) can render it.
   */
  iconUrl?: string;
}

/**
 * Build the `Tool.icons` array from a self-hosted icon asset. SVG is declared
 * as scalable ("any" size) and a PNG is offered for clients that only support
 * raster images.
 */
function toolIcons(iconUrl: string): Icon[] {
  const icons: Icon[] = [
    {
      src: iconUrl,
      mimeType: "image/svg+xml",
      sizes: ["any"],
      theme: "dark",
    },
  ];
  const pngUrl = iconUrl.replace(/\.svg$/, "-96.png");
  if (pngUrl !== iconUrl) {
    icons.push({
      src: pngUrl,
      mimeType: "image/png",
      sizes: ["96x96"],
      theme: "dark",
    });
  }
  return icons;
}

/**
 * Create a fresh, state-free Sentinel MCP server instance.
 *
 * Call behavior is registered through the SDK's high-level `McpServer`
 * (unchanged). When `branding.iconUrl` is supplied, the `tools/list` handler
 * is replaced — via the SDK's documented `setRequestHandler` replace
 * semantics, before any transport connects — so every advertised tool also
 * carries the `icons` metadata.
 */
export function createSentinelMcpServer(): McpServer {
  return createSentinelMcpServerWithBranding({});
}

/** Branded variant for `handleMcpRequest` (see `lib/mcp/transport.ts`). */
export function createSentinelMcpServerWithBranding(
  branding: SentinelMcpBranding
): McpServer {
  const server = new McpServer(
    { name: SENTINEL_MCP_NAME, version: SENTINEL_MCP_VERSION },
    {
      capabilities: { tools: {} },
      instructions: SENTINEL_MCP_INSTRUCTIONS,
    }
  );

  for (const def of SENTINEL_TOOL_DEFINITIONS) {
    server.registerTool(
      def.name,
      {
        title: def.title,
        description: def.description,
        inputSchema: { symbol: z.string().describe(SYMBOL_DESCRIPTION) },
        annotations: { readOnlyHint: true, destructiveHint: false },
      },
      async ({ symbol }) => {
        try {
          return textResult(await def.handler(symbol));
        } catch (err) {
          return errorResult(err);
        }
      }
    );
  }

  if (branding.iconUrl) {
    decorateWithIcons(server, branding.iconUrl);
  }

  return server;
}

/**
 * Attach branded `icons` to every advertised tool. Uses the SDK's
 * `setRequestHandler` replace semantics on the underlying `Server`; runs
 * before the transport connects so the handler is in place for the first
 * `tools/list` exchange.
 */
function decorateWithIcons(server: McpServer, iconUrl: string): void {
  const icons = toolIcons(iconUrl);
  const inputSchema = z
    .object({ symbol: z.string().describe(SYMBOL_DESCRIPTION) })
    .toJSONSchema() as unknown as ListToolsResult["tools"][number]["inputSchema"];

  server.server.setRequestHandler(ListToolsRequestSchema, (): ListToolsResult => ({
    tools: SENTINEL_TOOL_DEFINITIONS.map((def) => ({
      name: def.name,
      title: def.title,
      description: def.description,
      inputSchema,
      annotations: { readOnlyHint: true, destructiveHint: false },
      icons,
    })),
  }));
}