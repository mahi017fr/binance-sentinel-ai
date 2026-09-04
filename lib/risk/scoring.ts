/**
 * Explainable RISK engine (deterministic, non-advisory).
 *
 * The risk score is a weighted combination of several normalized signals,
 * each with an explicit contribution so the total is fully explainable:
 *
 *   level   = Σ factor.signal * factor.weight        // full precision, 0..1
 *   score   = round(level * 100, 2 decimals)         // 0..100
 *
 * The internal `level` is always kept at full precision; only the exposed
 * `score` is rounded to two decimal places.
 *
 * Bands (0-100):
 *   0-24   Low
 *   25-49  Moderate
 *   50-74  High
 *   75-100 Very High
 *
 * Design notes:
 *  - Weights always sum to 1, and every signal is clamped to 0..1, so the
 *    total is mathematically bounded to [0, 100].
 *  - The score is a descriptive measure of market risk for research /
 *    decision-support. It is NOT financial advice and never recommends
 *    trading action.
 */

import type {
  DrawdownAnalysis,
  LiquidityAnalysis,
  ScoreFactor,
  TrendAnalysis,
  VolatilityAnalysis,
} from "@/lib/analysis/types";
import { RISK_BANDS, type RiskFactorKey, type RiskResult } from "./types";

interface RiskInput {
  volatility: VolatilityAnalysis;
  trend: TrendAnalysis;
  drawdown: DrawdownAnalysis;
  liquidity: LiquidityAnalysis;
}

/** Factor weights — sum guaranteed to equal 1. */
const WEIGHTS: Record<RiskFactorKey, number> = {
  volatility: 0.35,
  "trend-uncertainty": 0.25,
  drawdown: 0.25,
  "market-activity": 0.15,
};

function trendUncertaintySignal(trend: TrendAnalysis): number {
  // Low clarity or low strength means the direction is not confidently
  // established -> higher uncertainty. Blend clarity (inverse) with strength
  // (inverse).
  const notClear = 1 - trend.clarity;
  const notStrong = 1 - trend.strength;
  return 0.6 * notClear + 0.4 * notStrong;
}

export function computeRisk(input: RiskInput): RiskResult {
  const factors: ScoreFactor[] = [
    {
      key: "volatility",
      name: "Volatility risk",
      signal: input.volatility.level,
      weight: WEIGHTS.volatility,
      contribution: 0,
      explanation:
        "Higher price volatility increases the magnitude of potential adverse moves.",
    },
    {
      key: "trend-uncertainty",
      name: "Trend uncertainty",
      signal: trendUncertaintySignal(input.trend),
      weight: WEIGHTS["trend-uncertainty"],
      contribution: 0,
      explanation:
        "Low trend clarity/strength means direction is less reliably established.",
    },
    {
      key: "drawdown",
      name: "Drawdown risk",
      signal: input.drawdown.risk,
      weight: WEIGHTS.drawdown,
      contribution: 0,
      explanation:
        "Measures how far price has declined from its recent high (elevated at deeper drawdowns).",
    },
    {
      key: "market-activity",
      name: "Market activity risk",
      signal: 1 - input.liquidity.level,
      weight: WEIGHTS["market-activity"],
      contribution: 0,
      explanation:
        "Low traded-volume activity can reduce execution liquidity and increase slippage risk.",
    },
  ];

  // Compute contributions and aggregate.
  let level = 0;
  for (const f of factors) {
    f.contribution = f.signal * f.weight;
    level += f.contribution;
  }
  // Clamp defense against floating-point drift.
  level = Math.min(1, Math.max(0, level));

  const score = Math.round(level * 100 * 100) / 100; // 2 decimals
  const weightSum = factors.reduce((a, f) => a + f.weight, 0);
  const band = bandForScore(score);

  return {
    score,
    level,
    band,
    factors,
    weightSum,
    isFinancialAdvice: false,
  };
}

export function bandForScore(score: number): string {
  for (const b of RISK_BANDS) {
    if (score >= b.min && score <= b.max) return b.label;
  }
  return "Low";
}
