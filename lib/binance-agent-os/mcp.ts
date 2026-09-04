/**
 * Binance MCP market-data provider (server-side).
 *
 * Implements the `MarketDataProvider` capability contract from `./types.ts` on
 * top of a REAL Model Context Protocol (MCP) connection:
 *
 *   - Transport:  MCP Streamable HTTP (official `@modelcontextprotocol/sdk`)
 *   - Endpoint:   official Binance Agent MCP endpoint by default
 *                 (override with `BINANCE_MCP_ENDPOINT_URL`)
 *   - Auth:       Bearer access token from `BINANCE_MCP_ACCESS_TOKEN`
 *                 (a server-side secret, NEVER sent to the client)
 *
 * ACTIVATION POLICY (Phase 10.1 rule 7):
 *   The provider is deliberately INACTIVE by default. It is only used when ALL
 *   of these hold:
 *     1. `BINANCE_ENABLE_MCP_PROVIDER` is set to a truthy value in the server
 *        environment, AND
 *     2. a real access token is present in `BINANCE_MCP_ACCESS_TOKEN`, AND
 *     3. the pipeline selects it explicitly (e.g.
 *        `BINANCE_MARKET_DATA_PROVIDER=binance-mcp`) or it is added to a chain.
 *   Without those, every method throws `McpProviderUnavailableError` so the
 *   default Binance → CoinGecko chain serves traffic instead. This provider is
 *   NOT a member of the default chain, and no method ever fabricates data: all
 *   results come from real MCP `tools/list` + `tools/call` responses.
 *
 * SAFETY / SCOPE:
 *   Only market-data tools are ever invoked. Discovered tools are classified
 *   from the REAL `listTools()` response, and any tool whose name matches a
 *   trading / account / balance / transfer / order / position pattern is
 *   explicitly blocked (never called).
 */

import { Client } from "@modelcontextprotocol/sdk/client";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

import type {
  Kline,
  KlineInterval,
  MarketDataProvider,
  MarketSnapshot,
  SymbolInfo,
  Ticker24h,
} from "./types";

/** Official Binance Agent MCP endpoint (Streamable HTTP). */
const DEFAULT_ENDPOINT = "https://agent.binance.com/mcp/agentic";
const DEFAULT_KLINE_LIMIT = 200;
const CONNECT_TIMEOUT_MS = 25_000;

/** Thrown when the MCP provider is not permitted to run (gate not satisfied). */
export class McpProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "McpProviderUnavailableError";
  }
}

/** Thrown when a required market-data tool was not discovered / callable. */
export class McpToolUnavailableError extends Error {
  readonly toolName: string;
  constructor(message: string, toolName: string) {
    super(message);
    this.name = "McpToolUnavailableError";
    this.toolName = toolName;
  }
}

/** A tool exactly as the MCP server reported it in `listTools()`. */
interface DiscoveredTool {
  name: string;
  description?: string;
  inputSchema: unknown;
}

enum ToolRole {
  PRICE = "price",
  STATS = "stats",
  KLINES = "klines",
  BLOCKED = "blocked",
  UNKNOWN = "unknown",
}

/**
 * READ operations only. Any discovered tool matching a blocked pattern is
 * hard-rejected and is never invoked, regardless of its market-data look.
 */
const BLOCKED_TOOL_PATTERNS: readonly RegExp[] = [
  /trade/i,
  /order/i,
  /account/i,
  /balance/i,
  /transfer/i,
  /withdraw/i,
  /deposit/i,
  /\/buy|buy_|_buy|sell_|\/sell/i,
  /position/i,
  /portfolio/i,
  /wallet/i,
  /funding/i,
  /margin/i,
  /futures?/i,
];

/** Market-data tool-name patterns, checked in priority order. */
const ROLE_PATTERNS: ReadonlyArray<{ role: ToolRole; pattern: RegExp }> = [
  { role: ToolRole.KLINES, pattern: /kline|candle|ohlc/i },
  { role: ToolRole.STATS, pattern: /24h|24hr|stats?|statistics/i },
  { role: ToolRole.PRICE, pattern: /price|quote/i },
];

function classifyTool(tool: DiscoveredTool): ToolRole {
  const combined = `${tool.name} ${tool.description ?? ""}`;
  if (BLOCKED_TOOL_PATTERNS.some((p) => p.test(combined))) {
    return ToolRole.BLOCKED;
  }
  for (const { role, pattern } of ROLE_PATTERNS) {
    if (pattern.test(combined)) return role;
  }
  return ToolRole.UNKNOWN;
}

/** Minimal shape of an MCP `tools/call` result we parse. */
interface CallToolResult {
  content?: Array<{ type?: string; text?: string }>;
  isError?: boolean;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`MCP request timed out after ${ms}ms`)),
      ms
    );
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

/** Extract JSON text payload from an MCP call result. */
function parseResult(result: CallToolResult): unknown {
  const text = result.content?.find((c) => c.type === "text")?.text;
  if (!text) {
    throw new Error("MCP server returned no text content");
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Convert a raw Binance kline array into a typed `Kline`. */
function parseKline(raw: unknown[]): Kline {
  return {
    openTime: Number(raw[0]),
    open: Number(raw[1]),
    high: Number(raw[2]),
    low: Number(raw[3]),
    close: Number(raw[4]),
    volume: Number(raw[5]),
    closeTime: Number(raw[6]),
    quoteAssetVolume: Number(raw[7]),
    numberOfTrades: Number(raw[8]),
  };
}

function truthy(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export class BinanceMcpMarketDataProvider implements MarketDataProvider {
  readonly id = "binance-mcp" as const;
  readonly name = "Binance MCP Market Data";

  private client: Client | null = null;
  /** Real tools discovered via `listTools()`, keyed by MCP tool name. */
  private roles: Map<ToolRole, DiscoveredTool> | null = null;
  /** MCP tool names blocked by policy (for diagnostics). */
  private readonly blockedTools = new Map<string, ToolRole>();

  private get endpoint(): string {
    return process.env.BINANCE_MCP_ENDPOINT_URL?.trim() || DEFAULT_ENDPOINT;
  }

  private get accessToken(): string | undefined {
    return process.env.BINANCE_MCP_ACCESS_TOKEN?.trim();
  }

  private get enabled(): boolean {
    return truthy(process.env.BINANCE_ENABLE_MCP_PROVIDER);
  }

  /** Gate check — keeps this provider OUT of the active path unless allowed. */
  private assertPermitted(): void {
    if (!this.enabled) {
      throw new McpProviderUnavailableError(
        "Binance MCP provider is disabled. Set BINANCE_ENABLE_MCP_PROVIDER=1 " +
          "to activate it (and provide BINANCE_MCP_ACCESS_TOKEN). The active " +
          "provider chain is unaffected until then."
      );
    }
    if (!this.accessToken) {
      throw new McpProviderUnavailableError(
        "Binance MCP provider is enabled but no access token is configured. " +
          "Set BINANCE_MCP_ACCESS_TOKEN (server-side secret) to use it."
      );
    }
  }

  /** Lazy, real MCP connection + `listTools()`. Cached for the life of the process. */
  private async ensureConnected(): Promise<void> {
    if (this.client && this.roles) return;

    const transport = new StreamableHTTPClientTransport(new URL(this.endpoint), {
      requestInit: {
        headers: { Authorization: `Bearer ${this.accessToken ?? ""}` },
      },
    });

    const client = new Client(
      { name: "sentinel-mcp-client", version: "0.1.0" },
      { capabilities: {} }
    );

    await withTimeout(client.connect(transport), CONNECT_TIMEOUT_MS);

    const result = await withTimeout(
      client.listTools(),
      CONNECT_TIMEOUT_MS
    );

    const roles = new Map<ToolRole, DiscoveredTool>();
    const blocked = new Map<string, ToolRole>();
    for (const tool of result.tools) {
      const discovered: DiscoveredTool = {
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      };
      const role = classifyTool(discovered);
      if (role === ToolRole.BLOCKED) {
        blocked.set(tool.name, role);
      } else if (role !== ToolRole.UNKNOWN && !roles.has(role)) {
        roles.set(role, discovered);
      }
    }

    if (!roles.has(ToolRole.PRICE) && !roles.has(ToolRole.STATS)) {
      throw new McpToolUnavailableError(
        "The connected MCP server exposes no price or stats market-data tool.",
        "price/stats"
      );
    }

    this.client = client;
    this.roles = roles;
    if (blocked.size > 0) this.blockedTools.clear();
    for (const [name, role] of blocked) this.blockedTools.set(name, role);
  }

  /** Look up the discovered MCP tool for a role. */
  private requireTool(role: ToolRole): DiscoveredTool {
    const tool = this.roles?.get(role);
    if (!tool) {
      throw new McpToolUnavailableError(
        `The connected MCP server exposed no ${role} market-data tool.`,
        role
      );
    }
    return tool;
  }

  /** Invoke a previously discovered tool with arguments; returns parsed JSON. */
  private async callTool(
    tool: DiscoveredTool,
    args: Record<string, unknown>
  ): Promise<unknown> {
    if (!this.client) throw new McpProviderUnavailableError("MCP not connected");
    const result = await withTimeout(
      this.client.callTool({ name: tool.name, arguments: args }),
      CONNECT_TIMEOUT_MS
    );
    if (result.isError) {
      const text = extractErrorText(result as unknown as CallToolResult);
      throw new Error(`MCP tool "${tool.name}" failed: ${text}`);
    }
    return parseResult(result as unknown as CallToolResult);
  }

  private async getPrice(symbol: string): Promise<number> {
    const tool = this.requireTool(ToolRole.PRICE);
    const data = await this.callTool(tool, { symbol: symbol.toUpperCase() });
    if (!isRecord(data)) {
      throw new Error("MCP price result is not an object");
    }
    const price = readNumber(data, ["price", "lastPrice"]);
    if (price === null) {
      throw new Error(`MCP price result did not include a numeric price`);
    }
    return price;
  }

  private async getStats(symbol: string): Promise<Ticker24h> {
    const tool = this.requireTool(ToolRole.STATS);
    const data = await this.callTool(tool, { symbol: symbol.toUpperCase() });
    if (!isRecord(data)) {
      throw new Error("MCP stats result is not an object");
    }
    const lastPrice = readNumber(data, ["lastPrice", "price", "last"]) ?? 0;
    return {
      symbol: symbol.toUpperCase(),
      lastPrice,
      priceChange: readNumber(data, ["priceChange", "price_change"]) ?? 0,
      priceChangePercent:
        readNumber(data, ["priceChangePercent", "price_change_percentage"]) ?? 0,
      highPrice: readNumber(data, ["highPrice", "high_price"]) ?? lastPrice,
      lowPrice: readNumber(data, ["lowPrice", "low_price"]) ?? lastPrice,
      volume: readNumber(data, ["volume", "baseVolume", "base_volume"]) ?? 0,
      quoteVolume:
        readNumber(data, ["quoteVolume", "quote_volume", "volume"]) ?? 0,
      count: readNumber(data, ["count", "trades"]) ?? 0,
    };
  }

  private async getKlineBars(
    symbol: string,
    interval: KlineInterval,
    limit: number
  ): Promise<Kline[]> {
    const tool = this.requireTool(ToolRole.KLINES);
    const data = await this.callTool(tool, {
      symbol: symbol.toUpperCase(),
      interval,
      limit,
    });
    if (!Array.isArray(data)) {
      throw new Error("MCP klines result is not an array");
    }
    return data.map((bar) => parseKline(Array.isArray(bar) ? bar : [bar])).slice(-limit);
  }

  async isSymbolValid(symbol: string): Promise<boolean> {
    this.assertPermitted();
    await this.ensureConnected();
    try {
      if (this.roles?.has(ToolRole.STATS) || this.roles?.has(ToolRole.PRICE)) {
        if (this.roles?.has(ToolRole.STATS)) {
          await this.getStats(symbol);
        } else {
          await this.getPrice(symbol);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  async getTicker24h(symbol: string): Promise<Ticker24h> {
    this.assertPermitted();
    await this.ensureConnected();
    if (this.roles?.has(ToolRole.STATS)) {
      return this.getStats(symbol);
    }
    // Only a price tool is available — expose a minimal, honest ticker.
    const price = await this.getPrice(symbol);
    return {
      symbol: symbol.toUpperCase(),
      lastPrice: price,
      priceChange: 0,
      priceChangePercent: 0,
      highPrice: price,
      lowPrice: price,
      volume: 0,
      quoteVolume: 0,
      count: 0,
    };
  }

  async getKlines(
    symbol: string,
    interval: KlineInterval,
    limit = DEFAULT_KLINE_LIMIT
  ): Promise<Kline[]> {
    this.assertPermitted();
    await this.ensureConnected();
    return this.getKlineBars(symbol, interval, limit);
  }

  async getSymbolInfo(symbol: string): Promise<SymbolInfo> {
    this.assertPermitted();
    await this.ensureConnected();
    const normalized = symbol.toUpperCase();
    // Validate reachability via the real connection before returning metadata.
    await this.getTicker24h(normalized);
    return {
      symbol: normalized,
      baseAsset: deriveBaseAsset(normalized),
      quoteAsset: deriveQuoteAsset(normalized),
      status: "TRADING",
      isSpotTradingAllowed: true,
      baseAssetPrecision: 8,
      quotePrecision: 8,
    };
  }

  async getMarketSnapshot(
    symbol: string,
    opts?: { interval?: KlineInterval; klineLimit?: number }
  ): Promise<MarketSnapshot> {
    this.assertPermitted();
    await this.ensureConnected();
    const normalized = symbol.toUpperCase();
    const interval = opts?.interval ?? "1d";
    const klineLimit = opts?.klineLimit ?? DEFAULT_KLINE_LIMIT;

    const ticker = await this.getTicker24h(normalized);
    const klines = await this.getKlineBars(normalized, interval, klineLimit);

    return {
      symbol: normalized,
      baseAsset: deriveBaseAsset(normalized),
      quoteAsset: deriveQuoteAsset(normalized),
      ticker,
      klines,
      interval,
      source: this.id,
      timestamp: Date.now(),
    };
  }
}

/** Infer the base asset from a SPOT symbol (e.g. "BTCUSDT" -> "BTC"). */
function deriveBaseAsset(symbol: string): string {
  const commonQuotes = ["USDT", "BUSD", "USDC", "FDUSD", "TUSD"];
  for (const quote of commonQuotes) {
    if (symbol.endsWith(quote) && symbol.length > quote.length) {
      return symbol.slice(0, -quote.length);
    }
  }
  return symbol;
}

/** Infer the quote asset from a SPOT symbol (defaults to USDT). */
function deriveQuoteAsset(symbol: string): string {
  const commonQuotes = ["USDT", "BUSD", "USDC", "FDUSD", "TUSD"];
  for (const quote of commonQuotes) {
    if (symbol.endsWith(quote)) return quote;
  }
  return "USDT";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(data: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    if (data[key] !== undefined && data[key] !== null) {
      const n = Number(data[key]);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function extractErrorText(result: { content?: Array<{ type?: string; text?: string }> }): string {
  const text = result.content?.find((c) => c.type === "text")?.text;
  if (text) return text.length > 240 ? `${text.slice(0, 240)}…` : text;
  return "unknown error";
}