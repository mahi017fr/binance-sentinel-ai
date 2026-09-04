/**
 * Trend analysis — direction, clarity, and strength.
 *
 * Methods:
 *  - Linear regression of log-prices over the window gives a signed slope
 *    (per-period log return) and an R^2. R^2 measures how linear and
 *    consistent the trend is = clarity.
 *  - Strength is a normalized 0..1 blend of clarity and the magnitude of the
 *    slope relative to a reference scale.
 *  - A short vs. long simple moving-average relationship corroborates
 *    direction.
 *
 * This is a deterministic, heuristic indicator — not a prediction or advice.
 */

import type { Kline } from "@/lib/binance-agent-os/types";
import {
  clamp01,
  linearRegression,
  logPrices,
  sma,
} from "./indicators";
import type { Direction, TrendAnalysis } from "./types";

/** Reference slope scale (per-bar log return) treated as "strong" (~0.5%/bar). */
const REFERENCE_SLOPE = 0.005;
/** Weight of clarity vs magnitude in the strength blend. */
const CLARITY_WEIGHT = 0.65;
/** Moving-average comparison lookbacks. */
const SMA_SHORT = 7;
const SMA_LONG = 25;

function normalizedDirection(slope: number): Direction {
  if (Math.abs(slope) < 1e-9) return "flat";
  return slope > 0 ? "up" : "down";
}

export function analyzeTrend(klines: Kline[]): TrendAnalysis {
  const n = klines.length;
  if (n === 0) {
    return {
      direction: "flat",
      slope: 0,
      clarity: 0,
      strength: 0,
      priceVsMean: 0,
      movingAverageTrend: true,
      windowBars: 0,
    };
  }

  const closes = klines.map((k) => k.close);
  const logs = logPrices(closes);

  // Slope of log-price vs bar index.
  const x = Array.from({ length: n }, (_, i) => i);
  const { slope, r2 } = linearRegression(x, logs);

  const direction = normalizedDirection(slope);

  // Magnitude component normalized against reference slope.
  const magnitude = clamp01(Math.abs(slope) / REFERENCE_SLOPE);

  // Strength = blend of how linear (clarity) and how steep (magnitude).
  const clarity = r2;
  const strength = clamp01(CLARITY_WEIGHT * clarity + (1 - CLARITY_WEIGHT) * magnitude);

  // Price today vs the mean of the window (signed, decimal).
  const avg = closes.reduce((a, b) => a + b, 0) / n;
  const last = closes[n - 1];
  const priceVsMean = avg > 0 ? last / avg - 1 : 0;

  // Short vs long moving average relationship.
  const shortSma = sma(closes, Math.min(SMA_SHORT, n));
  const longSma = sma(closes, Math.min(SMA_LONG, n));
  const movingAverageTrend = shortSma >= longSma;

  return {
    direction,
    slope,
    clarity,
    strength,
    priceVsMean,
    movingAverageTrend,
    windowBars: n,
  };
}
