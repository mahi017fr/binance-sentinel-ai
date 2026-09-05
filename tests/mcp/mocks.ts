/**
 * Shared test fixtures for the Sentinel MCP tests.
 *
 * Provides a controllable fake `MarketDataProvider` plus deterministic
 * Binance-shaped fixtures (ticker, klines, snapshot), so tool tests can run
 * entirely offline while still exercising the real analysis pipeline.
 */

import type {
  Kline,
  KlineInterval,
  MarketDataProvider,
  MarketDataSourceId,
  MarketSnapshot,
  SymbolInfo,
  Ticker24h,
} from "@/lib/binance-agent-os/types";
import { SCANNER_UNIVERSE } from "@/lib/scanner/universe";
import { setSharedProvider } from "./state";

export const DAY_MS = 86_400_000;

export function makeTicker(
  symbol = "BTCUSDT",
  overrides: Partial<Ticker24h> = {}
): Ticker24h {
  return {
    symbol,
    lastPrice: 100_000,
    priceChange: 1_500,
    priceChangePercent: 1.52,
    highPrice: 102_000,
    lowPrice: 97_000,
    volume: 20_000,
    quoteVolume: 2_000_000_000,
    count: 1_500_000,
    ...overrides,
  };
}

export function makeKlines(count = 30, opts: { start?: number; step?: number } = {}): Kline[] {
  const start = opts.start ?? 100_000;
  const step = opts.step ?? 0.01;
  const now = Date.now();

  return Array.from({ length: count }, (_, i) => {
    const open = start * Math.pow(1 + step, i);
    const close = open * (1 + step);
    const high = Math.max(open, close) * 1.01;
    const low = Math.min(open, close) * 0.995;
    const volume = 10_000 + (i * 100) % 5_000;
    const openTime = now - (count - i) * DAY_MS;

    return {
      openTime,
      open,
      high,
      low,
      close,
      volume,
      closeTime: openTime + DAY_MS - 1,
      quoteAssetVolume: volume * open,
      numberOfTrades: 100_000 + i,
    };
  });
}

export function makeSnapshot(
  symbol = "BTCUSDT",
  opts: {
    interval?: KlineInterval;
    klineCount?: number;
    source?: MarketDataSourceId;
    tickerOverrides?: Partial<Ticker24h>;
    step?: number;
  } = {}
): MarketSnapshot {
  const interval = opts.interval ?? "1d";
  const source = opts.source ?? "binance-public-api";
  const klines = makeKlines(opts.klineCount ?? 30, { step: opts.step ?? 0.01 });
  const ticker = makeTicker(symbol, { lastPrice: klines[klines.length - 1].close, ...opts.tickerOverrides });

  return {
    symbol,
    baseAsset: symbol.replace(/USDT$/, ""),
    quoteAsset: "USDT",
    ticker,
    klines,
    interval,
    source,
    timestamp: Date.now(),
  };
}

export interface FakeProviderConfig {
  id?: MarketDataSourceId;
  name?: string;
  validSymbols?: string[];
  failTicker?: boolean;
  failSnapshot?: boolean;
  failValidation?: boolean;
  throwProviderError?: Error;
}

/**
 * Offline, configurable provider standing in for the real Binance → CoinGecko
 * chain so tool tests assert behavior (labels, fallback flags, error paths).
 */
export class FakeProvider implements MarketDataProvider {
  id: MarketDataSourceId;
  name: string;
  lastActive: boolean;

  private validSymbols: Set<string>;
  private failTicker: boolean;
  private failSnapshot: boolean;
  private failValidation: boolean;
  private throwProviderError: Error | undefined;

  constructor(config: FakeProviderConfig = {}) {
    this.id = config.id ?? "binance-public-api";
    this.name = config.name ?? "Fake Binance Public Market Data";
    this.validSymbols = new Set(config.validSymbols ?? SCANNER_UNIVERSE);
    this.failTicker = config.failTicker ?? false;
    this.failSnapshot = config.failSnapshot ?? false;
    this.failValidation = config.failValidation ?? false;
    this.throwProviderError = config.throwProviderError;
    this.lastActive = false;
  }

  configure(config: Partial<FakeProviderConfig>): void {
    if (config.id) this.id = config.id;
    if (config.name) this.name = config.name;
    if (config.validSymbols) this.validSymbols = new Set(config.validSymbols);
    if (config.failTicker !== undefined) this.failTicker = config.failTicker;
    if (config.failSnapshot !== undefined) this.failSnapshot = config.failSnapshot;
    if (config.failValidation !== undefined) this.failValidation = config.failValidation;
    if (config.throwProviderError) this.throwProviderError = config.throwProviderError;
  }

  private maybeThrow(): void {
    if (this.throwProviderError) throw this.throwProviderError;
  }

  async isSymbolValid(symbol: string): Promise<boolean> {
    if (this.failValidation) throw new Error("validation provider unavailable");
    return this.validSymbols.has(symbol);
  }

  async getTicker24h(symbol: string): Promise<Ticker24h> {
    if (this.failTicker) throw new Error("binance unavailable");
    this.maybeThrow();
    this.lastActive = true;
    return makeTicker(symbol);
  }

  async getKlines(symbol: string, interval: KlineInterval, limit?: number): Promise<Kline[]> {
    const opts = {
      start: makeTicker(symbol).lastPrice,
    };
    void opts;
    const bars = makeKlines(limit ?? 30);
    void interval;
    return bars;
  }

  async getSymbolInfo(symbol: string): Promise<SymbolInfo> {
    this.maybeThrow();
    return {
      symbol,
      baseAsset: symbol.replace(/USDT$/, ""),
      quoteAsset: "USDT",
      status: "TRADING",
      isSpotTradingAllowed: true,
      baseAssetPrecision: 8,
      quotePrecision: 8,
    };
  }

  async getMarketSnapshot(
    symbol: string,
    opts: { interval?: KlineInterval; klineLimit?: number } = {}
  ): Promise<MarketSnapshot> {
    if (this.failSnapshot) throw new Error("binance unavailable");
    this.maybeThrow();
    this.lastActive = true;
    return makeSnapshot(symbol, {
      interval: opts.interval ?? "1d",
      klineCount: opts.klineLimit ?? 30,
      source: this.id,
      tickerOverrides: { lastPrice: makeKlines(1)[0].close },
    });
  }
}

/** Reset the shared fake to default behavior (call in beforeEach). */
export function resetFakeProvider(config: FakeProviderConfig = {}): FakeProvider {
  const provider = new FakeProvider(config);
  setSharedProvider(provider);
  return provider;
}