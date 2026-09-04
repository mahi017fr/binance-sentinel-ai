/**
 * Market-data adapter / provider resolver.
 *
 * The agent pipeline never talks to a concrete market-data source directly.
 * Instead it asks this module for the active `MarketDataProvider` and uses
 * the generic capability contract from `./types.ts`.
 *
 * Provider selection:
 *   - First, an environment flag can force a specific backend
 *     (`BINANCE_MARKET_DATA_PROVIDER`), which is where a Binance Agent OS /
 *     Binance MCP-backed provider would be registered and selected once its
 *     official integration is implemented and verified.
 *   - Otherwise it falls back to the public Binance REST API provider so the
 *     app is fully functional without any Agent OS / MCP setup.
 *
 * No fake "Agent OS" integration is claimed here: the Agent OS-backed
 * provider is registered only when actually implemented.
 */

import type { MarketDataProvider, MarketDataSourceId } from "./types";
import { BinancePublicMarketDataProvider } from "./market-data";

const PUBLIC_BUILTIN_ID: MarketDataSourceId = "binance-public-api";

/**
 * Registry of available providers. New backends (e.g. a future
 * Binance Agent OS / Binance MCP provider) are added here.
 *
 * The public Binance REST fallback is a built-in singleton.
 */
const providers: Map<MarketDataSourceId, MarketDataProvider> = new Map();
providers.set(PUBLIC_BUILTIN_ID, new BinancePublicMarketDataProvider());

function configuredProviderId(): MarketDataSourceId | null {
  const raw = process.env.BINANCE_MARKET_DATA_PROVIDER?.trim();
  if (!raw) return null;
  return raw as MarketDataSourceId;
}

/**
 * Return the active market-data provider.
 *
 * Resolution order:
 *   1. Explicitly configured provider id (must be registered).
 *   2. Built-in public Binance API fallback.
 */
export function getMarketDataProvider(): MarketDataProvider {
  const configured = configuredProviderId();
  if (configured) {
    const provider = providers.get(configured);
    if (provider) return provider;
  }

  const fallback = providers.get(PUBLIC_BUILTIN_ID);
  if (fallback) return fallback;

  throw new Error("No market-data provider is registered.");
}

/**
 * Return a snapshot of the currently active data source (for UI/debugging).
 */
export function getActiveProviderInfo(): { id: MarketDataSourceId; name: string } {
  const provider = getMarketDataProvider();
  return { id: provider.id, name: provider.name };
}

// Kept for future registration of an Agent OS-backed provider without
// changing the consumer interface.
export function registerProvider(provider: MarketDataProvider): void {
  providers.set(provider.id, provider);
}
