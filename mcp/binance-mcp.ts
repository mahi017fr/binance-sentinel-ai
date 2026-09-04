import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "binance-sentinel",
  version: "1.0.0",
});

const BINANCE_API = "https://api.binance.com";

async function binanceFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${BINANCE_API}${path}`);

  if (!response.ok) {
    throw new Error(`Binance API error: ${response.status}`);
  }

  return (await response.json()) as T;
}

interface RawTicker24h {
  symbol: string;
  priceChangePercent: string;
}

// Tool 1: Get current price
server.tool(
  "get_price",
  "Get the latest price for a Binance trading symbol.",
  {
    symbol: z.string().describe("Trading symbol, e.g. BTCUSDT"),
  },
  async ({ symbol }) => {
    const data = await binanceFetch<{ symbol: string; price: string }>(
      `/api/v3/ticker/price?symbol=${symbol.toUpperCase()}`
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

// Tool 2: 24h market statistics
server.tool(
  "get_24h_stats",
  "Get 24-hour market statistics for a Binance trading symbol.",
  {
    symbol: z.string().describe("Trading symbol, e.g. BTCUSDT"),
  },
  async ({ symbol }) => {
    const data = await binanceFetch<Record<string, string>>(
      `/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

// Tool 3: Top market movers
server.tool(
  "get_market_tickers",
  "Get current 24-hour ticker statistics from Binance.",
  {},
  async () => {
    const data = await binanceFetch<RawTicker24h[]>("/api/v3/ticker/24hr");

    const top = data
      .filter((item) => item.symbol.endsWith("USDT"))
      .sort(
        (a, b) =>
          Math.abs(Number(b.priceChangePercent)) -
          Math.abs(Number(a.priceChangePercent))
      )
      .slice(0, 20);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(top, null, 2),
        },
      ],
    };
  }
);

// Tool 4: Market candles
server.tool(
  "get_klines",
  "Get candlestick market data for technical analysis.",
  {
    symbol: z.string().describe("Trading symbol, e.g. BTCUSDT"),
    interval: z
      .string()
      .describe("Candle interval, e.g. 1m, 5m, 1h, 4h, 1d"),
    limit: z.number().min(1).max(500).optional(),
  },
  async ({ symbol, interval, limit }) => {
    const params = new URLSearchParams({
      symbol: symbol.toUpperCase(),
      interval,
      limit: String(limit ?? 100),
    });

    const data = await binanceFetch<unknown[][]>(`/api/v3/klines?${params}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(data, null, 2),
        },
      ],
    };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("Binance Sentinel MCP server running");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});