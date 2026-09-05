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
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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

/** Create a fresh, state-free Sentinel MCP server instance. */
export function createSentinelMcpServer(): McpServer {
  const server = new McpServer(
    { name: SENTINEL_MCP_NAME, version: SENTINEL_MCP_VERSION },
    { capabilities: { tools: {} } }
  );

  server.registerTool(
    "get_current_price",
    {
      title: "Get Current Price",
      description:
        "Get the latest public market price and 24h statistics for a supported Binance symbol.",
      inputSchema: { symbol: z.string().describe(SYMBOL_DESCRIPTION) },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ symbol }) => {
      try {
        return textResult(await getCurrentPrice(symbol));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "get_market_data",
    {
      title: "Get Market Data",
      description:
        "Get structured public market data (price, 24h range, volume, recent bars) for a supported Binance symbol.",
      inputSchema: { symbol: z.string().describe(SYMBOL_DESCRIPTION) },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ symbol }) => {
      try {
        return textResult(await getMarketData(symbol));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  server.registerTool(
    "analyze_market",
    {
      title: "Analyze Market",
      description:
        "Run Binance Sentinel AI's research-only market intelligence analysis for a supported symbol (risk score, trade readiness, directional signal, confidence, evidence).",
      inputSchema: { symbol: z.string().describe(SYMBOL_DESCRIPTION) },
      annotations: { readOnlyHint: true, destructiveHint: false },
    },
    async ({ symbol }) => {
      try {
        return textResult(await analyzeMarketTool(symbol));
      } catch (err) {
        return errorResult(err);
      }
    }
  );

  return server;
}