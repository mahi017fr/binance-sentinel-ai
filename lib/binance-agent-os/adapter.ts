/**
 * Market-data adapter / provider resolver.
 *
 * The agent pipeline never talks to a concrete market-data source directly.
 * Instead it asks this module for the active `MarketDataProvider` and uses
 * the generic capability contract from `./types.ts`.
 *
 * Provider selection:
 *   - By default the adapter returns a `ChainedMarketDataProvider`:
 *       Primary:   Binance Public Market Data API
 *       Secondary: CoinGecko Public Market Data API (verified real fallback)
 *   - The chain tries Binance first; if Binance is unavailable from the
 *     deployment environment (geographic / eligibility restriction, network,
 *     availability), it fails over to CoinGecko and clearly labels the result
 *     source as CoinGecko — it never claims fallback data is Binance.
 *   - `BINANCE_MARKET_DATA_PROVIDER` env var can force a specific backend for
 *     testing (e.g. "coingecko-public-api" to bypass the chain).
 *
 * No fake "Agent OS" integration is claimed here: the Agent OS-backed
 * provider is registered only when actually implemented.
 */

import type {
  MarketDataProvider,
  MarketDataSourceId,
  MarketDataSourceInfo,
} from "./types";
import { BinancePublicMarketDataProvider } from "./market-data";
import { CoinGeckoMarketDataProvider } from "./coingecko";
import { ChainedMarketDataProvider } from "./chain";

const BINANCE_ID: MarketDataSourceId = "binance-public-api";
const COINGECKO_ID: MarketDataSourceId = "coingecko-public-api";

/**
 * Registry of available standalone providers. New backends (e.g. a future
 * Binance Agent OS / Binance MCP provider) are added here.
 */
const providers: Map<MarketDataSourceId, MarketDataProvider> = new Map();
providers.set(BINANCE_ID, new BinancePublicMarketDataProvider());
providers.set(COINGECKO_ID, new CoinGeckoMarketDataProvider());

/**
 * The default chained provider (Binance → CoinGecko). Lazily constructed and
 * cached. Its `lastActiveProvider` records which provider actually served the
 * most recent successful call.
 */
let defaultChain: ChainedMarketDataProvider | null = null;

function getDefaultChain(): ChainedMarketDataProvider {
  if (!defaultChain) {
    defaultChain = new ChainedMarketDataProvider(
      providers.get(BINANCE_ID)!,
      providers.get(COINGECKO_ID)!
    );
  }
  return defaultChain;
}

function configuredProviderId(): MarketDataSourceId | null {
  const raw = process.env.BINANCE_MARKET_DATA_PROVIDER?.trim();
  if (!raw) return null;
  return raw as MarketDataSourceId;
}

/**
 * Return the active market-data provider.
 *
 * Unless overridden by env var, this is the chained Binance → CoinGecko
 * provider that automatically fails over on the primary source's unavailability.
 */
export function getMarketDataProvider(): MarketDataProvider {
  const configured = configuredProviderId();
  if (configured) {
    const provider = providers.get(configured);
    if (provider) return provider;
  }

  return getDefaultChain();
}

/**
 * Return a snapshot of the currently active data source (for UI/debugging).
 * Describes the resolved chain: primary + fallbacks.
 */
export function getActiveProviderInfo(): {
  primary: MarketDataSourceInfo;
  fallbacks: MarketDataSourceInfo[];
} {
  const provider = getMarketDataProvider();

  if (provider instanceof ChainedMarketDataProvider) {
    return {
      primary: { id: BINANCE_ID, name: "Binance Public Market Data API" },
      fallbacks: [
        { id: COINGECKO_ID, name: "CoinGecko Public Market Data API" },
      ],
    };
  }

  // Single provider (forced via env var) — report it as the only source.
  return {
    primary: { id: provider.id, name: provider.name },
    fallbacks: [],
  };
}

/**
 * Return the provider that actually served the most recent call through the
 * default chain, or null if none answered. Used to report the active source
 * honestly. When a single provider is forced via env var (bypassing the
 * chain), returns that provider's identity always.
 */
export function getLastActiveProviderInfo(): MarketDataSourceInfo | null {
  const configured = configuredProviderId();
  if (configured) {
    const provider = providers.get(configured);
    if (provider) return { id: provider.id, name: provider.name };
  }
  if (!defaultChain) return null;
  const active = defaultChain.lastActiveProvider;
  return active ? { id: active.id, name: active.name } : null;
}

// Kept for future registration of an Agent OS-backed provider without
// changing the consumer interface.
export function registerProvider(provider: MarketDataProvider): void {
  providers.set(provider.id, provider);
}
