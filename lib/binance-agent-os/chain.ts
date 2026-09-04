/**
 * ChainedMarketDataProvider — explicit primary → fallback provider chain.
 *
 * This provider composes one or more `MarketDataProvider` implementations into
 * a fallback chain:
 *
 *   Primary:     Binance Public Market Data API
 *   Secondary:   CoinGecko Public Market Data API (verified fallback)
 *
 * Behavior:
 *   1. Try the primary provider first.
 *   2. If it succeeds, return that provider's data (source = primary).
 *   3. If it throws (network, availability, geographic restriction), try the
 *      next provider in line.
 *   4. If a fallback succeeds, return its real data with the source clearly
 *      marked as the fallback provider (never claimed as Binance).
 *   5. If ALL providers fail, rethrow the primary provider's error so the
 *      caller sees the original reason.
 *
 * No data is ever silently merged between providers. Each successful call
 * comes from exactly one provider, identified in the response.
 */

import type {
  Kline,
  KlineInterval,
  MarketDataProvider,
  MarketSnapshot,
  SymbolInfo,
  Ticker24h,
} from "./types";

export class ChainedMarketDataProvider implements MarketDataProvider {
  /**
   * The primary provider's id/name. Normally Binance. Exposed so the UI can
   * label the "primary" source even when a fallback is actually used.
   */
  readonly id: MarketDataProvider["id"];
  readonly name: string;

  private readonly primary: MarketDataProvider;
  private readonly fallbacks: MarketDataProvider[];

  constructor(primary: MarketDataProvider, ...fallbacks: MarketDataProvider[]) {
    this.primary = primary;
    this.fallbacks = fallbacks;
    this.id = primary.id;
    this.name = primary.name;
  }

  /**
   * Which provider answered the most recent call, or null if none answered.
   * Used by consumers to report the active/last-used source.
   */
  lastActiveProvider: MarketDataProvider | null = null;

  isSymbolValid(symbol: string): Promise<boolean> {
    return this.runChain("isSymbolValid", (p) => p.isSymbolValid(symbol));
  }

  getSymbolInfo(symbol: string): Promise<SymbolInfo> {
    return this.runChain("getSymbolInfo", (p) => p.getSymbolInfo(symbol));
  }

  getTicker24h(symbol: string): Promise<Ticker24h> {
    return this.runChain("getTicker24h", (p) => p.getTicker24h(symbol));
  }

  getKlines(
    symbol: string,
    interval: KlineInterval,
    limit?: number
  ): Promise<Kline[]> {
    return this.runChain("getKlines", (p) => p.getKlines(symbol, interval, limit));
  }

  getMarketSnapshot(
    symbol: string,
    opts?: { interval?: KlineInterval; klineLimit?: number }
  ): Promise<MarketSnapshot> {
    return this.runChain("getMarketSnapshot", (p) =>
      p.getMarketSnapshot(symbol, opts)
    );
  }

  /**
   * Execute `fn` across the provider chain. The FIRST provider to resolve
   * without throwing wins; its value is returned. This keeps the chain
   * fail-fast on the primary and failover to the next provider.
   */
  private async runChain<T>(
    method: string,
    fn: (provider: MarketDataProvider) => Promise<T>
  ): Promise<T> {
    const providers = [this.primary, ...this.fallbacks];
    let firstError: unknown = null;

    for (const provider of providers) {
      try {
        const value = await fn(provider);
        this.lastActiveProvider = provider;
        return value;
      } catch (err) {
        if (firstError === null) firstError = err;
        // Try the next provider in the chain.
      }
    }

    // All providers failed. Rethrow the primary error so callers see the
    // original reason (e.g. Binance restricted-location message).
    throw firstError;
  }
}

export type { MarketDataProvider };
