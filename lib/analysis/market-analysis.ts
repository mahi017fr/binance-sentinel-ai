/**
 * Unified Market Analysis engine.
 *
 * This is the single entry point the agent pipeline (and the verification
 * route) will call to produce a complete, deterministic market analysis.
 *
 * It:
 *   1. Resolves the active `MarketDataProvider` via the adapter — this is the
 *      ONLY dependency on data sourcing, so the pipeline never knows whether
 *      the source is the Binance public API, Binance Agent OS, or Binance MCP.
 *   2. Fetches the 24h ticker and klines.
 *   3. Runs every deterministic analysis module (trend, volatility, drawdown,
 *      liquidity/activity, price stats, range).
 *   4. Computes the explainable RISK score and the separate TRADE READINESS
 *      score.
 *   5. Returns a single strongly-typed `MarketAnalysisResult`.
 *
 * No LLM is involved — this phase is fully deterministic.
 */

import type { KlineInterval, MarketSnapshot } from "@/lib/binance-agent-os/types";
import { getMarketDataProvider } from "@/lib/binance-agent-os/adapter";
import { analyzeTrend } from "./trend";
import { analyzeVolatility } from "./volatility";
import { analyzeDrawdown } from "./drawdown";
import { analyzeLiquidity } from "./liquidity";
import { computeRisk } from "@/lib/risk/scoring";
import { computeReadiness } from "@/lib/readiness/scoring";
import { max, mean, min, stddev } from "./indicators";
import type {
  MarketAnalysisResult,
  PriceStats,
  RecentRange,
} from "./types";

export interface MarketAnalysisOptions {
  /** Kline interval to fetch and analyze. Defaults to "1d". */
  interval?: KlineInterval;
  /** Number of klines to fetch. Defaults to 200. */
  klineLimit?: number;
}

const DEFAULT_INTERVAL: KlineInterval = "1d";
const DEFAULT_KLINE_LIMIT = 200;

function computeStats(snapshot: MarketSnapshot): PriceStats {
  const closes = snapshot.klines.map((k) => k.close);
  return {
    count: closes.length,
    mean: mean(closes),
    min: min(closes),
    max: max(closes),
    stddev: stddev(closes),
    first: closes[0] ?? 0,
    last: closes[closes.length - 1] ?? 0,
  };
}

function computeRecentRange(snapshot: MarketSnapshot): RecentRange {
  const highs = snapshot.klines.map((k) => k.high);
  const lows = snapshot.klines.map((k) => k.low);
  const high = max(highs);
  const low = min(lows);
  const last = snapshot.klines[snapshot.klines.length - 1]?.close ?? 0;

  const widthPercent = low > 0 ? (high - low) / low : 0;
  const position = high > low ? (last - low) / (high - low) : 0;

  return {
    high,
    low,
    widthPercent,
    position,
  };
}

export async function analyzeMarket(
  rawSymbol: string,
  options: MarketAnalysisOptions = {}
): Promise<MarketAnalysisResult> {
  const interval = options.interval ?? DEFAULT_INTERVAL;
  const klineLimit = options.klineLimit ?? DEFAULT_KLINE_LIMIT;

  const provider = getMarketDataProvider();
  const symbol = rawSymbol.trim().toUpperCase();

  if (!symbol) {
    throw new Error("A symbol is required (e.g. BTCUSDT).");
  }

  const valid = await provider.isSymbolValid(symbol);
  if (!valid) {
    throw new Error(
      `Unknown or non-tradeable market symbol: ${symbol}. Expected a Binance SPOT pair such as BTCUSDT.`
    );
  }

  const snapshot = await provider.getMarketSnapshot(symbol, {
    interval,
    klineLimit,
  });

  const trend = analyzeTrend(snapshot.klines);
  const volatility = analyzeVolatility(snapshot.klines, interval);
  const drawdown = analyzeDrawdown(snapshot.klines);
  const liquidity = analyzeLiquidity(snapshot.ticker);

  const risk = computeRisk({ volatility, trend, drawdown, liquidity });
  const readiness = computeReadiness({
    volatility,
    trend,
    liquidity,
    riskLevel: risk.level,
  });

  return {
    symbol,
    interval,
    snapshot,
    stats: computeStats(snapshot),
    recentRange: computeRecentRange(snapshot),
    trend,
    volatility,
    drawdown,
    liquidity,
    risk,
    readiness,
    source: snapshot.source,
    timestamp: snapshot.timestamp,
  };
}
