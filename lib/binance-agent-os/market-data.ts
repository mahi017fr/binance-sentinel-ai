/**
 * Binance public market-data client.
 *
 * This is the *fallback* market-data provider for Binance Sentinel AI. It
 * talks to Binance's public REST API (no authentication required) and
 * satisfies the `MarketDataProvider` capability contract defined in
 * `./types.ts`.
 *
 * It is deliberately provider-agnostic at the consumer level — future
 * integration with Binance Agent OS / Binance MCP will implement the same
 * `MarketDataProvider` interface and can be swapped in without touching the
 * agent pipeline.
 */

import type {
  Kline,
  KlineInterval,
  MarketDataProvider,
  MarketSnapshot,
  SymbolInfo,
  Ticker24h,
} from "./types";

const DEFAULT_BASE_URL = "https://api.binance.com";
const DEFAULT_KLINE_LIMIT = 200;

function resolveBaseUrl(): string {
  const configured = process.env.BINANCE_API_BASE_URL?.trim();
  return configured?.length ? configured : DEFAULT_BASE_URL;
}

export class BinanceApiError extends Error {
  readonly status: number;
  readonly code?: number;

  constructor(message: string, status: number, code?: number) {
    super(message);
    this.name = "BinanceApiError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${resolveBaseUrl()}${path}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (cause) {
    throw new BinanceApiError(
      `Network error while contacting Binance: ${(cause as Error).message}`,
      0
    );
  }

  if (!res.ok) {
    let message = `Binance API error (${res.status})`;
    let code: number | undefined;
    try {
      const body = await res.json();
      message = body?.msg ?? message;
      code = body?.code;
    } catch {
      // keep default message if body is not JSON
    }
    throw new BinanceApiError(message, res.status, code);
  }

  return (await res.json()) as T;
}

/**
 * Convert a raw Binance kline array into a typed `Kline`.
 * Raw format is an array of arrays:
 * [openTime, open, high, low, close, volume, closeTime, quoteVol, trades, ...]
 */
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

interface RawTicker24h {
  symbol: string;
  lastPrice: string;
  priceChange: string;
  priceChangePercent: string;
  highPrice: string;
  lowPrice: string;
  volume: string;
  quoteVolume: string;
  count: number;
}

interface RawSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  isSpotTradingAllowed: boolean;
  baseAssetPrecision: number;
  quotePrecision: number;
  filters?: Record<string, unknown>[];
}

export class BinancePublicMarketDataProvider implements MarketDataProvider {
  readonly id = "binance-public-api" as const;
  readonly name = "Binance Public Market Data API";

  private async fetchAllSymbols(): Promise<RawSymbolInfo[]> {
    const data = await request<{ symbols: RawSymbolInfo[] }>("/api/v3/exchangeInfo");
    return data.symbols;
  }

  async isSymbolValid(symbol: string): Promise<boolean> {
    const info = await this.getSymbolInfo(symbol);
    return (
      info.status === "TRADING" &&
      info.isSpotTradingAllowed &&
      info.symbol === symbol.toUpperCase()
    );
  }

  async getSymbolInfo(symbol: string): Promise<SymbolInfo> {
    const normalized = symbol.toUpperCase();
    const symbols = await this.fetchAllSymbols();
    const raw = symbols.find((s) => s.symbol === normalized);

    if (!raw) {
      throw new BinanceApiError(`Unknown market symbol: ${normalized}`, 404);
    }

    return {
      symbol: raw.symbol,
      baseAsset: raw.baseAsset,
      quoteAsset: raw.quoteAsset,
      status: raw.status,
      isSpotTradingAllowed: raw.isSpotTradingAllowed,
      baseAssetPrecision: raw.baseAssetPrecision,
      quotePrecision: raw.quotePrecision,
      filters: raw.filters as unknown as Record<string, unknown>,
    };
  }

  async getTicker24h(symbol: string): Promise<Ticker24h> {
    const normalized = symbol.toUpperCase();
    const raw = await request<RawTicker24h>("/api/v3/ticker/24hr", {
      symbol: normalized,
    });

    return {
      symbol: raw.symbol,
      lastPrice: Number(raw.lastPrice),
      priceChange: Number(raw.priceChange),
      priceChangePercent: Number(raw.priceChangePercent),
      highPrice: Number(raw.highPrice),
      lowPrice: Number(raw.lowPrice),
      volume: Number(raw.volume),
      quoteVolume: Number(raw.quoteVolume),
      count: Number(raw.count),
    };
  }

  async getKlines(
    symbol: string,
    interval: KlineInterval,
    limit = DEFAULT_KLINE_LIMIT
  ): Promise<Kline[]> {
    const normalized = symbol.toUpperCase();
    const raw = await request<unknown[][]>("/api/v3/klines", {
      symbol: normalized,
      interval,
      limit: String(limit),
    });

    return raw.map(parseKline);
  }

  async getMarketSnapshot(
    symbol: string,
    opts?: { interval?: KlineInterval; klineLimit?: number }
  ): Promise<MarketSnapshot> {
    const normalized = symbol.toUpperCase();
    const interval = opts?.interval ?? "1d";
    const klineLimit = opts?.klineLimit ?? DEFAULT_KLINE_LIMIT;

    const [ticker, klines, symbolInfo] = await Promise.all([
      this.getTicker24h(normalized),
      this.getKlines(normalized, interval, klineLimit),
      this.getSymbolInfo(normalized),
    ]);

    return {
      symbol: normalized,
      baseAsset: symbolInfo.baseAsset,
      quoteAsset: symbolInfo.quoteAsset,
      ticker,
      klines,
      interval,
      source: this.id,
      timestamp: Date.now(),
    };
  }
}

/**
 * Parse a human-friendly symbol reference into a standard Binance SPOT
 * symbol. E.g. "BTC" -> "BTCUSDT", "btcusdt" -> "BTCUSDT", "ETH/USDT" -> "ETHUSDT".
 *
 * Returns `null` if the input can't be normalized confidently.
 */
export function normalizeSymbol(raw: string, quote = "USDT"): string | null {
  const cleaned = raw
    .trim()
    .toUpperCase()
    .replace(/[/\\-]/g, "")
    .replace(/\./g, "");

  if (!cleaned) return null;

  // Already a full pair (ends with the quote asset).
  if (cleaned.endsWith(quote)) return cleaned;

  // Bare base asset -> append quote.
  return `${cleaned}${quote}`;
}
