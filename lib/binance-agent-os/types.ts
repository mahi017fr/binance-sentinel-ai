/**
 * Shared domain types for the Binance Sentinel AI market-data abstraction.
 *
 * These types describe the *capability contract* consumed by the agent
 * pipeline. They are intentionally provider-agnostic: any data source
 * (Binance Agent OS / Binance MCP, or the public Binance REST API fallback)
 * must produce these shapes so the pipeline never changes when a source is
 * swapped.
 */

export type KlineInterval =
  | "1m"
  | "3m"
  | "5m"
  | "15m"
  | "30m"
  | "1h"
  | "2h"
  | "4h"
  | "6h"
  | "8h"
  | "12h"
  | "1d"
  | "3d"
  | "1w"
  | "1M";

/** 24-hour rolling statistics for a single trading pair. */
export interface Ticker24h {
  symbol: string;
  lastPrice: number;
  priceChange: number;
  priceChangePercent: number;
  highPrice: number;
  lowPrice: number;
  volume: number; // base asset volume
  quoteVolume: number; // quote asset volume (USDT etc.)
  count: number; // number of trades
}

/** A single candlestick (klines) bar. */
export interface Kline {
  openTime: number; // ms epoch
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  closeTime: number; // ms epoch
  quoteAssetVolume: number;
  numberOfTrades: number;
}

/** Static exchange metadata for a trading pair. */
export interface SymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  isSpotTradingAllowed: boolean;
  baseAssetPrecision: number;
  quotePrecision: number;
  filters?: Record<string, unknown>;
}

/**
 * Normalized market-data snapshot. This is the primary output of the
 * market-data capability and is what the risk / research agents consume.
 */
export interface MarketSnapshot {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  ticker: Ticker24h;
  /** OHLCV bars ordered oldest -> newest. */
  klines: Kline[];
  /** Requested interval the klines were fetched at. */
  interval: KlineInterval;
  /** Source identifier, e.g. "binance-public-api" or "binance-agent-os". */
  source: MarketDataSourceId;
  /** Epoch ms at which the snapshot was captured. */
  timestamp: number;
}

export type MarketDataSourceId =
  | "binance-public-api"
  | "coingecko-public-api"
  | "binance-agent-os"
  | "binance-mcp";

/** Optional metadata describing the source backend used for a snapshot. */
export interface MarketDataSourceInfo {
  id: MarketDataSourceId;
  name: string;
}

/**
 * Source metadata returned with every scan/analysis response.
 * Exposes which provider actually served the data and whether a fallback was used.
 */
export interface ScanSourceMetadata {
  /** The provider that actually served the data. */
  provider: MarketDataSourceId;
  /** Human-readable provider name. */
  providerLabel: string;
  /** Whether a fallback provider was used (i.e., primary provider failed). */
  fallbackUsed: boolean;
  /** ISO timestamp of when the data was fetched. */
  fetchedAt: string;
}

/**
 * The market-data capability contract.
 *
 * Implementations (public Binance REST fallback today, Binance Agent OS /
 * MCP later) must satisfy this interface. The rest of the system depends
 * only on this abstraction.
 */
export interface MarketDataProvider {
  readonly id: MarketDataSourceId;
  readonly name: string;

  /** Validate that a trading pair symbol is tradeable/available. */
  isSymbolValid(symbol: string): Promise<boolean>;

  /** Fetch 24h ticker stats for a symbol. */
  getTicker24h(symbol: string): Promise<Ticker24h>;

  /** Fetch OHLCV candlesticks for a symbol. */
  getKlines(
    symbol: string,
    interval: KlineInterval,
    limit?: number
  ): Promise<Kline[]>;

  /** Fetch normalized metadata + stats for a symbol. */
  getSymbolInfo(symbol: string): Promise<SymbolInfo>;

  /** Compose a normalized market snapshot in a single call. */
  getMarketSnapshot(
    symbol: string,
    opts?: { interval?: KlineInterval; klineLimit?: number }
  ): Promise<MarketSnapshot>;
}
