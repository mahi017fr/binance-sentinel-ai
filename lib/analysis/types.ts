/**
 * Shared types for the deterministic market-analysis engine.
 *
 * These types describe the *analysis* layer — the computed insight derived
 * from the raw market snapshot. The analysis engine is fully deterministic
 * and free of any LLM involvement (added in a later phase). It consumes the
 * `MarketDataProvider` abstraction only, never a concrete data source.
 */

import type {
  MarketDataSourceId,
  MarketSnapshot,
} from "@/lib/binance-agent-os/types";

/** One-side direction of a numeric quantity. */
export type Direction = "up" | "down" | "flat";

/** A horizontal band label used for readability (semantic, not advisory). */
export type Band =
  | "very-low"
  | "low"
  | "moderate"
  | "high"
  | "very-high";

/** Summary statistics computed from a set of close prices. */
export interface PriceStats {
  count: number;
  mean: number;
  min: number;
  max: number;
  stddev: number;
  first: number;
  last: number;
}

/** Percent change computed relative to a reference price. */
export interface PercentChange {
  value: number; // decimal, e.g. 0.05 = +5%
  /** Human label, e.g. "24h". */
  reference: string;
}

export interface RecentRange {
  high: number;
  low: number;
  widthPercent: number; // (high - low) / low, decimal
  /** Fraction of the range currently occupied by the last price, 0..1. */
  position: number;
}

/** Volatility metrics derived from klines. */
export interface VolatilityAnalysis {
  /** Sample standard deviation of daily log returns, decimal. */
  dailyStd: number;
  /** Annualized volatility estimate from dailyStd, decimal. */
  annualized: number;
  /** True range / ATR style measure on the selected window. */
  averageTrueRangePercent: number;
  /** Normalized volatility level relative to a reference threshold, 0..1. */
  level: number;
  /**
   * Volatility suitability for a typical active trader, 0..1.
   * Lower volatility == more suitable to a trading context (not a forecast).
   */
  suitability: number;
  interval: string;
  bars: number;
}

export interface TrendAnalysis {
  direction: Direction;
  /** Signed slope of the linear regression of log-prices, decimal per period. */
  slope: number;
  /** R^2 of the log-price linear regression — clarity/linearity, 0..1. */
  clarity: number;
  /** Normalized trend strength combining clarity and magnitude, 0..1. */
  strength: number;
  /** Price today vs the mean of its own window, decimal. */
  priceVsMean: number;
  /** SMA / EMA relationship sign (short vs long), as a boolean series. */
  movingAverageTrend: boolean;
  windowBars: number;
}

export interface DrawdownAnalysis {
  /** Max drawdown from local peak within the window, decimal (>=0). */
  maxDrawdown: number;
  /** Current drawdown from the window high, decimal (>=0). */
  currentDrawdown: number;
  /** Index/date of the peak that defines the current drawdown. */
  peakTime: number;
  /** Normalized drawdown risk, 0..1. */
  risk: number;
}

/** Market activity signal derived from ticker volume (see liquidity.ts). */
export interface LiquidityAnalysis {
  /**
   * Relative activity of the market for this symbol, 0..1.
   * Based exclusively on the 24h quote volume (USDT equivalent), which is the
   * only volume measure we have from the ticker. We intentionally avoid
   * overclaiming book-depth liquidity when only traded volume is available.
   */
  level: number;
  /** Raw quote volume used for the computation. */
  quoteVolume: number;
  /** Human banded label for the activity level. */
  label: string;
  /**
   * Transparency note explaining that this is a traded-volume activity signal,
   * not measured order-book liquidity.
   */
  disclaimer: string;
}

/** One factor within a score (risk or readiness). */
export interface ScoreFactor {
  /** Stable machine key, e.g. "volatility-risk". */
  key: string;
  /** Human-readable factor name, e.g. "Volatility risk". */
  name: string;
  /** Normalized underlying signal used, 0..1 (before weighting). */
  signal: number;
  /** Fixed weight of this factor, sum of weights == 1. */
  weight: number;
  /** Contribution = signal * weight (the amount this factor adds to the score). */
  contribution: number;
  /** Short, factual explanation of what this factor measures. */
  explanation: string;
}

/** Result of one score computation (risk or readiness). */
export interface ScoreResult {
  /**
   * Final bounded score, 0..100.
   * Rounded to two decimal places; derived from `level * 100`.
   */
  score: number;
  /**
   * Full-precision normalized score, 0..1.
   * Internal value used for all downstream calculations (never rounded).
   */
  level: number;
  /** Band label for the score. */
  band: string;
  /** Ordered factor breakdown. */
  factors: ScoreFactor[];
  /** Aggregate: sum of all contributions must equal `level`. */
  weightSum: number;
}

/**
 * Unified, strongly-typed output of the analysis engine.
 */
export interface MarketAnalysisResult {
  symbol: string;
  interval: string;
  snapshot: MarketSnapshot;
  stats: PriceStats;
  recentRange: RecentRange;
  trend: TrendAnalysis;
  volatility: VolatilityAnalysis;
  drawdown: DrawdownAnalysis;
  liquidity: LiquidityAnalysis;
  risk: ScoreResult;
  readiness: ScoreResult;
  source: MarketDataSourceId;
  timestamp: number;
}
