/**
 * Volatility analysis derived from klines.
 *
 * Metrics:
 *  - `dailyStd`: sample std of per-bar log returns. For sub-daily bars these
 *    are per-bar returns but we report them on a per-bar basis and label the
 *    interval.
 *  - `annualized`: per-bar std scaled to a yearly figure using the bars-per-year
 *    for the requested interval. (Crypto year ≈ 365 days.)
 *  - `averageTrueRangePercent`: mean true-range (ATR-style) as a % of price on
 *    the window — an intra-bar volatility read.
 *  - `level`: volatility normalized to a reference scale, 0..1.
 *  - `suitability`: inverse of level — 0..1, higher = more suited to an active
 *    trading context (purely descriptive, not advice).
 */

import type { Kline, KlineInterval } from "@/lib/binance-agent-os/types";
import {
  clamp01,
  mean,
  stddev,
  logReturns,
} from "./indicators";
import type { VolatilityAnalysis } from "./types";

/** Annualization multipliers for each kline interval (bars per ~365d). */
const BARS_PER_YEAR: Record<KlineInterval, number> = {
  "1m": 365 * 24 * 60,
  "3m": 365 * 24 * 20,
  "5m": 365 * 24 * 12,
  "15m": 365 * 24 * 4,
  "30m": 365 * 24 * 2,
  "1h": 365 * 24,
  "2h": 365 * 12,
  "4h": 365 * 6,
  "6h": 365 * 4,
  "8h": 365 * 3,
  "12h": 365 * 2,
  "1d": 365,
  "3d": 365 / 3,
  "1w": 52,
  "1M": 12,
};

/** Per-bar std that maps to a "high" volatility normalized to 1. */
const HI_DAILY_STD = 0.08;

export function analyzeVolatility(
  klines: Kline[],
  interval: KlineInterval
): VolatilityAnalysis {
  const n = klines.length;
  if (n === 0) {
    return {
      dailyStd: 0,
      annualized: 0,
      averageTrueRangePercent: 0,
      level: 0,
      suitability: 1,
      interval,
      bars: 0,
    };
  }

  const closes = klines.map((k) => k.close);
  const perBarStd = stddev(logReturns(closes));
  const barsPerYear = BARS_PER_YEAR[interval] ?? 365;
  const annualized = perBarStd * Math.sqrt(barsPerYear);

  // ATR % = mean of (high - low)/close, as a decimal.
  const trueRangePcts = klines.map((k) =>
    k.close > 0 ? (k.high - k.low) / k.close : 0
  );
  const atrPct = mean(trueRangePcts);

  const level = clamp01(perBarStd / HI_DAILY_STD);
  const suitability = clamp01(1 - level);

  return {
    dailyStd: perBarStd,
    annualized,
    averageTrueRangePercent: atrPct,
    level,
    suitability,
    interval,
    bars: n,
  };
}
