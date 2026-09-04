/**
 * Live Market Scanner engine.
 *
 * Fetches real public Binance market data for the Sentinel Market Universe
 * and classifies each asset using transparent deterministic formulas.
 *
 * Data source: Binance public REST API (no authentication required).
 * The scanner reuses the existing `MarketDataProvider` abstraction via
 * the adapter, so it automatically benefits from any future provider swap
 * (e.g. Binance MCP fallback).
 *
 * Deterministic formulas:
 *
 * VOLATILITY (24h range-based):
 *   value = ((highPrice - lowPrice) / lastPrice) * 100
 *   Bands:
 *     < 2%        → Low
 *     2% – 5%     → Moderate
 *     5% – 10%    → High
 *     >= 10%      → Extreme
 *
 * MOMENTUM (24h directional):
 *   Uses the 24h price change percentage from the ticker.
 *   direction:
 *     change >= +2%  → bullish
 *     change <= -2%  → bearish
 *     otherwise      → neutral
 *
 * RISK (reuses the existing deterministic risk engine):
 *   Runs the full analysis pipeline (trend, volatility, drawdown, liquidity)
 *   and uses the explainable risk score. Falls back to a lightweight
 *   volatility-based estimate if full klines are unavailable.
 *
 * ACTIVITY (relative to universe):
 *   Based on 24h USDT quote volume.
 *   Classified against the scanned universe's volume distribution.
 *
 * IMPORTANT: This is research and decision-support only. No buy/sell
 * recommendations, no profit predictions, no trading functionality.
 */

import { getMarketDataProvider } from "@/lib/binance-agent-os/adapter";
import type { Ticker24h } from "@/lib/binance-agent-os/types";
import { SCANNER_UNIVERSE } from "./universe";
import {
  type MarketScanAsset,
  type MarketScanResult,
  type ScannerFailure,
  type ScannerHighlights,
  MarketScanResultSchema,
} from "./types";

// ---------------------------------------------------------------------------
// Volatility classification
// ---------------------------------------------------------------------------

function classifyVolatility(
  highPrice: number,
  lowPrice: number,
  currentPrice: number
): MarketScanAsset["volatility"] {
  if (currentPrice <= 0) {
    return {
      value: 0,
      band: "Low",
      explanation: "Unable to compute volatility (price is zero or negative).",
    };
  }

  const rangePct = ((highPrice - lowPrice) / currentPrice) * 100;

  let band: string;
  if (rangePct >= 10) band = "Extreme";
  else if (rangePct >= 5) band = "High";
  else if (rangePct >= 2) band = "Moderate";
  else band = "Low";

  return {
    value: Math.round(rangePct * 100) / 100,
    band,
    explanation: `24h range: ((high ${highPrice.toFixed(2)} − low ${lowPrice.toFixed(2)}) / price ${currentPrice.toFixed(2)}) × 100 = ${rangePct.toFixed(2)}%`,
  };
}

// ---------------------------------------------------------------------------
// Momentum classification
// ---------------------------------------------------------------------------

function classifyMomentum(change24hPct: number): MarketScanAsset["momentum"] {
  let direction: "bullish" | "bearish" | "neutral";
  if (change24hPct >= 2) direction = "bullish";
  else if (change24hPct <= -2) direction = "bearish";
  else direction = "neutral";

  const directionLabel = direction.charAt(0).toUpperCase() + direction.slice(1);

  return {
    value: Math.round(change24hPct * 100) / 100,
    direction,
    explanation: `${directionLabel} — 24h price change of ${change24hPct >= 0 ? "+" : ""}${change24hPct.toFixed(2)}%`,
  };
}

// ---------------------------------------------------------------------------
// Activity classification (relative to scanned universe)
// ---------------------------------------------------------------------------

function classifyActivity(
  quoteVolume: number,
  universeAvgVolume: number
): MarketScanAsset["activity"] {
  let level: string;
  if (universeAvgVolume > 0) {
    const ratio = quoteVolume / universeAvgVolume;
    if (ratio >= 1.5) level = "Very High";
    else if (ratio >= 0.8) level = "High";
    else if (ratio >= 0.4) level = "Moderate";
    else if (quoteVolume >= 50_000_000) level = "Moderate";
    else level = "Low";
  } else {
    if (quoteVolume >= 500_000_000) level = "High";
    else if (quoteVolume >= 100_000_000) level = "Moderate";
    else level = "Low";
  }

  return {
    level,
    value: Math.round(
      (universeAvgVolume > 0
        ? Math.min(1, quoteVolume / universeAvgVolume)
        : quoteVolume / 1_000_000_000) * 100
    ) / 100,
  };
}

// ---------------------------------------------------------------------------
// Lightweight risk estimate (used when full pipeline is too expensive)
//
// This is NOT a replacement for the full risk engine — it is a lightweight
// heuristic for the scanner context where we only have ticker data.
// The full risk pipeline is still the authoritative source in the Analyze view.
// ---------------------------------------------------------------------------

function estimateRiskFromTicker(
  ticker: Ticker24h
): MarketScanAsset["risk"] {
  const currentPrice = ticker.lastPrice;
  const highPrice = ticker.highPrice;
  const lowPrice = ticker.lowPrice;

  // Volatility component: 24h range / price
  const rangePct =
    currentPrice > 0 ? (highPrice - lowPrice) / currentPrice : 0;
  const volatilitySignal = Math.min(1, rangePct / 0.15); // 15% range → max

  // Momentum uncertainty: how far from zero the change is
  const changePct = Math.abs(ticker.priceChangePercent) / 100;
  const momentumSignal = Math.min(1, changePct / 0.1); // 10% change → max

  // Activity signal: lower volume = higher risk
  const activitySignal = Math.min(
    1,
    Math.max(0, 1 - ticker.quoteVolume / 2_000_000_000)
  );

  // Weighted combination
  const score =
    0.45 * volatilitySignal + 0.3 * momentumSignal + 0.25 * activitySignal;
  const normalizedScore = Math.round(Math.min(1, Math.max(0, score)) * 100 * 100) / 100;

  let band: string;
  if (normalizedScore >= 75) band = "Very High";
  else if (normalizedScore >= 50) band = "High";
  else if (normalizedScore >= 25) band = "Moderate";
  else band = "Low";

  return { score: normalizedScore, band };
}

// ---------------------------------------------------------------------------
// Build highlights from scanned assets
// ---------------------------------------------------------------------------

function buildHighlights(assets: MarketScanAsset[]): ScannerHighlights {
  const highVolatility = assets
    .filter((a) => a.volatility.band === "High" || a.volatility.band === "Extreme")
    .sort((a, b) => b.volatility.value - a.volatility.value)
    .map((a) => a.symbol);

  const strongMomentum = assets
    .filter((a) => a.momentum.direction !== "neutral")
    .sort((a, b) => Math.abs(b.momentum.value) - Math.abs(a.momentum.value))
    .map((a) => a.symbol);

  const elevatedRisk = assets
    .filter((a) => a.risk.band === "High" || a.risk.band === "Very High")
    .sort((a, b) => b.risk.score - a.risk.score)
    .map((a) => a.symbol);

  const highActivity = assets
    .filter((a) => a.activity.level === "High" || a.activity.level === "Very High")
    .sort((a, b) => b.activity.value - a.activity.value)
    .map((a) => a.symbol);

  const topMovers = [...assets]
    .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
    .slice(0, 5)
    .map((a) => a.symbol);

  return {
    highVolatility,
    strongMomentum,
    elevatedRisk,
    highActivity,
    topMovers,
  };
}

// ---------------------------------------------------------------------------
// Main scanner entry point
// ---------------------------------------------------------------------------

export async function scanMarketUniverse(): Promise<MarketScanResult> {
  const provider = getMarketDataProvider();
  const universe = [...SCANNER_UNIVERSE];

  // Fetch all tickers in parallel — one call per symbol.
  // We use getTicker24h (public, no auth) for each symbol.
  const results = await Promise.allSettled(
    universe.map(async (sym) => {
      const ticker = await provider.getTicker24h(sym);
      return { symbol: sym, ticker };
    })
  );

  // Separate successes from failures.
  const tickers: { symbol: string; ticker: Ticker24h }[] = [];
  const failures: ScannerFailure[] = [];

  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    if (result.status === "fulfilled") {
      tickers.push(result.value);
    } else {
      const sym = universe[i];
      failures.push({
        symbol: sym,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : "Market data temporarily unavailable",
      });
    }
  }

  // Compute universe average volume for relative activity classification.
  const totalVolume = tickers.reduce((sum, t) => sum + t.ticker.quoteVolume, 0);
  const avgVolume = tickers.length > 0 ? totalVolume / tickers.length : 0;

  // Classify each asset.
  const assets: MarketScanAsset[] = tickers.map(({ ticker }) => {
    const volatility = classifyVolatility(
      ticker.highPrice,
      ticker.lowPrice,
      ticker.lastPrice
    );

    const momentum = classifyMomentum(ticker.priceChangePercent);

    const risk = estimateRiskFromTicker(ticker);

    const activity = classifyActivity(ticker.quoteVolume, avgVolume);

    return {
      symbol: ticker.symbol,
      price: ticker.lastPrice,
      change24h: ticker.priceChangePercent,
      volume24h: ticker.quoteVolume,
      high24h: ticker.highPrice,
      low24h: ticker.lowPrice,
      volatility,
      momentum,
      risk,
      activity,
    };
  });

  const highlights = buildHighlights(assets);

  const scanResult: MarketScanResult = {
    scannedAt: new Date().toISOString(),
    universe,
    assets,
    highlights,
    failures: failures.length > 0 ? failures : undefined,
  };

  // Validate the result shape.
  const validated = MarketScanResultSchema.parse(scanResult);
  return validated;
}
