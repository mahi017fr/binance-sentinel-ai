/**
 * Sentinel MCP tool implementations.
 *
 * This module is the read-only capability layer behind the remote Claude MCP
 * connector. It reuses the EXACT existing market-data and analysis pipeline:
 *
 *   Binance Public Market Data  →  CoinGecko fallback  →  Sentinel analysis
 *
 * No trading, no order placement, no portfolio access, no account mutation.
 * Only public market data is consumed. No secrets are ever read or exposed.
 *
 * Every handler:
 *   - validates the symbol against the Sentinel supported universe first,
 *   - fetches REAL data through the existing `MarketDataProvider` chain,
 *   - returns a structured result derived directly from that data, and
 *   - converts failures into a safe, human-readable `McpToolError` (never a
 *     stack trace, never an internal detail).
 */

import { analyzeMarket } from "@/lib/analysis/market-analysis";
import { toReportMarketData } from "@/lib/analysis/report-data";
import type { MarketAnalysisResult } from "@/lib/analysis/types";
import {
  getLastActiveProviderInfo,
  getMarketDataProvider,
} from "@/lib/binance-agent-os/adapter";
import type { MarketDataSourceId } from "@/lib/binance-agent-os/types";
import { mockMarketThesis, mockRiskInterpretation } from "@/lib/llm/mock";
import type { ReportAsset } from "@/lib/llm/schema";
import { computeDirectionalSignal } from "@/lib/prediction/directional";
import { SCANNER_UNIVERSE } from "@/lib/scanner/universe";

/** The supported symbol universe for the Sentinel MCP (mirrors the dashboard). */
export const SUPPORTED_SYMBOLS: readonly string[] = SCANNER_UNIVERSE;

/** Human-readable provider labels (consistent with the existing SOURCE_LABELS maps). */
const SOURCE_LABELS: Record<string, string> = {
  "binance-public-api": "Binance Public Market Data",
  "binance-cli-public-api": "Binance CLI (Public Market Data)",
  "binance-mcp": "Binance MCP",
  "coingecko-public-api": "CoinGecko Public Market Data",
};

export type McpToolErrorKind = "invalid-symbol" | "provider" | "analysis";

/** A safe, structured tool-level error. Never carries internals or secrets. */
export class McpToolError extends Error {
  readonly kind: McpToolErrorKind;

  constructor(message: string, kind: McpToolErrorKind) {
    super(message);
    this.name = "McpToolError";
    this.kind = kind;
  }
}

/** Provider id that actually served the most recent call (or the default). */
function activeSourceId(): MarketDataSourceId {
  return getLastActiveProviderInfo()?.id ?? getMarketDataProvider().id;
}

function sourceLabel(sourceId: MarketDataSourceId): string {
  return SOURCE_LABELS[sourceId] ?? sourceId;
}

function isFallbackSource(sourceId: MarketDataSourceId): boolean {
  return sourceId === "coingecko-public-api";
}

/** Normalize + validate a symbol against the supported Sentinel universe. */
export function resolveSupportedSymbol(raw: string): string {
  const symbol = raw.trim().toUpperCase();
  if (!SUPPORTED_SYMBOLS.includes(symbol)) {
    throw new McpToolError(
      `Unsupported symbol "${symbol}". Supported symbols: ${SUPPORTED_SYMBOLS.join(", ")}.`,
      "invalid-symbol"
    );
  }
  return symbol;
}

/**
 * get_current_price — latest public price + 24h statistics.
 */
export interface CurrentPriceResult {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  quoteVolume: number;
  trades: number;
  dataSource: string;
  fallbackUsed: boolean;
  timestamp: string;
}

export async function getCurrentPrice(rawSymbol: string): Promise<CurrentPriceResult> {
  const symbol = resolveSupportedSymbol(rawSymbol);
  const provider = getMarketDataProvider();

  let ticker;
  try {
    ticker = await provider.getTicker24h(symbol);
  } catch {
    throw new McpToolError("Market data is temporarily unavailable.", "provider");
  }

  const sourceId = activeSourceId();

  return {
    symbol,
    currentPrice: ticker.lastPrice,
    priceChange24h: ticker.priceChangePercent,
    high24h: ticker.highPrice,
    low24h: ticker.lowPrice,
    volume: ticker.volume,
    quoteVolume: ticker.quoteVolume,
    trades: ticker.count,
    dataSource: sourceLabel(sourceId),
    fallbackUsed: isFallbackSource(sourceId),
    timestamp: new Date().toISOString(),
  };
}

/**
 * get_market_data — structured market snapshot via the existing provider.
 */
export interface MarketDataResult {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  interval: string;
  currentPrice: number;
  priceChange24h: number;
  high24h: number;
  low24h: number;
  volume: number;
  quoteVolume: number;
  trades: number;
  recentBars: Array<{
    openTime: number;
    open: number;
    high: number;
    low: number;
    close: number;
  }>;
  klineCount: number;
  dataSource: string;
  fallbackUsed: boolean;
  timestamp: string;
}

export async function getMarketData(rawSymbol: string): Promise<MarketDataResult> {
  const symbol = resolveSupportedSymbol(rawSymbol);
  const provider = getMarketDataProvider();

  let snapshot;
  try {
    snapshot = await provider.getMarketSnapshot(symbol, {
      interval: "1d",
      klineLimit: 100,
    });
  } catch {
    throw new McpToolError("Market data is temporarily unavailable.", "provider");
  }

  const sourceId = snapshot.source;

  return {
    symbol: snapshot.symbol,
    baseAsset: snapshot.baseAsset,
    quoteAsset: snapshot.quoteAsset,
    interval: snapshot.interval,
    currentPrice: snapshot.ticker.lastPrice,
    priceChange24h: snapshot.ticker.priceChangePercent,
    high24h: snapshot.ticker.highPrice,
    low24h: snapshot.ticker.lowPrice,
    volume: snapshot.ticker.volume,
    quoteVolume: snapshot.ticker.quoteVolume,
    trades: snapshot.ticker.count,
    recentBars: snapshot.klines.slice(-20).map((k) => ({
      openTime: k.openTime,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
    })),
    klineCount: snapshot.klines.length,
    dataSource: sourceLabel(sourceId),
    fallbackUsed: isFallbackSource(sourceId),
    timestamp: new Date(snapshot.timestamp).toISOString(),
  };
}

/**
 * analyze_market — Sentinel's research-only market intelligence analysis.
 *
 * Runs the SAME deterministic engine used by the web dashboard
 * (`analyzeMarket`) and derives the directional signal from the SAME code
 * path the dashboard uses (`mockRiskInterpretation` + `mockMarketThesis` +
 * `computeDirectionalSignal`), so results match the dashboard as closely as
 * possible. Research-only: no trades, no advice, no predictions of profit.
 */
export interface AnalyzeMarketResult {
  symbol: string;
  currentPrice: number;
  priceChange24h: number;
  riskScore: number;
  riskLabel: string;
  readinessScore: number;
  readinessLabel: string;
  directionalSignal: "UP" | "DOWN" | "NEUTRAL";
  modelConfidence: number;
  evidence: string[];
  momentum: {
    value: number;
    direction: "bullish" | "bearish" | "neutral";
  };
  volatility: {
    dailyStd: number;
    annualized: number;
    level: number;
    band: string;
  };
  activity: {
    level: number;
    label: string;
    quoteVolume: number;
  };
  trend: {
    direction: string;
    strength: number;
    clarity: number;
  };
  drawdown: {
    current: number;
    max: number;
  };
  dataSource: string;
  fallbackUsed: boolean;
  researchOnly: true;
  timestamp: string;
}

function momentumDirection(change24hPercent: number): "bullish" | "bearish" | "neutral" {
  if (change24hPercent >= 2) return "bullish";
  if (change24hPercent <= -2) return "bearish";
  return "neutral";
}

function volatilityBand(level: number): string {
  if (level >= 0.66) return "High";
  if (level >= 0.33) return "Moderate";
  return "Low";
}

export async function analyzeMarketTool(rawSymbol: string): Promise<AnalyzeMarketResult> {
  const symbol = resolveSupportedSymbol(rawSymbol);

  let analysis: MarketAnalysisResult;
  try {
    analysis = await analyzeMarket(symbol);
  } catch {
    throw new McpToolError("Sentinel analysis could not be completed.", "analysis");
  }

  // Reuse the dashboard's deterministic interpretation + report assembly so the
  // directional signal and its evidence match the web app exactly.
  const interpretation = mockRiskInterpretation(analysis);
  const thesis = mockMarketThesis(analysis, interpretation);
  const asset = {
    symbol: analysis.symbol,
    marketSummary: thesis.thesis,
    risk: analysis.risk.score,
    riskBand: analysis.risk.band,
    readiness: analysis.readiness.score,
    readinessBand: analysis.readiness.band,
    keyDrivers: interpretation.drivers,
    observations: interpretation.observations,
    thesis,
    uncertainty: thesis.uncertainty,
    marketData: toReportMarketData(analysis),
  } satisfies ReportAsset;

  const signal = computeDirectionalSignal(asset);

  const sourceId = analysis.source;
  const changePct = analysis.snapshot.ticker.priceChangePercent;

  return {
    symbol: analysis.symbol,
    currentPrice: analysis.snapshot.ticker.lastPrice,
    priceChange24h: changePct,
    riskScore: analysis.risk.score,
    riskLabel: analysis.risk.band,
    readinessScore: analysis.readiness.score,
    readinessLabel: analysis.readiness.band,
    directionalSignal:
      signal?.direction === "up"
        ? "UP"
        : signal?.direction === "down"
          ? "DOWN"
          : "NEUTRAL",
    modelConfidence: signal?.confidence ?? 0,
    evidence: signal?.reasons ?? [],
    momentum: {
      value: changePct,
      direction: momentumDirection(changePct),
    },
    volatility: {
      dailyStd: analysis.volatility.dailyStd,
      annualized: analysis.volatility.annualized,
      level: analysis.volatility.level,
      band: volatilityBand(analysis.volatility.level),
    },
    activity: {
      level: analysis.liquidity.level,
      label: analysis.liquidity.label,
      quoteVolume: analysis.liquidity.quoteVolume,
    },
    trend: {
      direction: analysis.trend.direction,
      strength: analysis.trend.strength,
      clarity: analysis.trend.clarity,
    },
    drawdown: {
      current: analysis.drawdown.currentDrawdown,
      max: analysis.drawdown.maxDrawdown,
    },
    dataSource: sourceLabel(sourceId),
    fallbackUsed: isFallbackSource(sourceId),
    researchOnly: true,
    timestamp: new Date(analysis.timestamp).toISOString(),
  };
}