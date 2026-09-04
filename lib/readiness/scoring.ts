/**
 * TRADE READINESS engine (deterministic, neutral terminology).
 *
 * Trade readiness measures how favorable current market conditions are for
 * active trading activity. It is a SEPARATE metric from the risk score.
 *
 * Readiness rewards:
 *   - trend clarity (linearity of the move)
 *   - trend strength
 *   - market activity confirmation
 *   - volatility suitability (conditions suited to an active context)
 * and applies a small penalty when overall risk is elevated.
 *
 * All weights are positive and sum to 1; signals are clamped to 0..1, so the
 * score is mathematically bounded to [0, 100] and fully explainable.
 *
 *   level   = Σ factor.signal * factor.weight        // full precision, 0..1
 *   score   = round(level * 100, 2 decimals)         // 0..100
 *
 * The internal `level` is always kept at full precision; only the exposed
 * `score` is rounded to two decimal places.
 *
 * Bands:
 *   0-24   Unfavorable
 *   25-49  Cautious
 *   50-74  Developing
 *   75-100 Favorable
 *
 * IMPORTANT: This is descriptive market-condition analysis for research /
 * decision-support. It never recommends buying or selling and does not
 * promise profitability.
 */

import type {
  LiquidityAnalysis,
  ScoreFactor,
  TrendAnalysis,
  VolatilityAnalysis,
} from "@/lib/analysis/types";
import { READINESS_BANDS, type ReadinessFactorKey, type ReadinessResult } from "./types";

interface ReadinessInput {
  volatility: VolatilityAnalysis;
  trend: TrendAnalysis;
  liquidity: LiquidityAnalysis;
  /** Overall risk level (0..1) computed by the risk engine. */
  riskLevel: number;
}

/** Positive factor weights — sum guaranteed to equal 1. */
const WEIGHTS: Record<ReadinessFactorKey, number> = {
  "trend-clarity": 0.3,
  "trend-strength": 0.25,
  "market-activity": 0.2,
  "volatility-suitability": 0.15,
  "risk-penalty": 0.1,
};

export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const factors: ScoreFactor[] = [
    {
      key: "trend-clarity",
      name: "Trend clarity",
      signal: input.trend.clarity,
      weight: WEIGHTS["trend-clarity"],
      contribution: 0,
      explanation:
        "Higher linearity (R²) of the price move means a more coherent/clear trend.",
    },
    {
      key: "trend-strength",
      name: "Trend strength",
      signal: input.trend.strength,
      weight: WEIGHTS["trend-strength"],
      contribution: 0,
      explanation:
        "Combines trend clarity and slope magnitude into a single strength gauge.",
    },
    {
      key: "market-activity",
      name: "Market activity confirmation",
      signal: input.liquidity.level,
      weight: WEIGHTS["market-activity"],
      contribution: 0,
      explanation:
        "Higher 24h traded-volume activity suggests the move is being confirmed by participation.",
    },
    {
      key: "volatility-suitability",
      name: "Volatility suitability",
      signal: input.volatility.suitability,
      weight: WEIGHTS["volatility-suitability"],
      contribution: 0,
      explanation:
        "Lower/normal volatility is generally more suitable to an active trading context.",
    },
    {
      key: "risk-penalty",
      name: "Low-risk premium",
      signal: 1 - input.riskLevel,
      weight: WEIGHTS["risk-penalty"],
      contribution: 0,
      explanation:
        "Rewards lower overall risk; conditions with deep drawdowns or extreme volatility are penalized.",
    },
  ];

  // Positive weights only -> no negative contributions; floor at 0 defensively.
  let level = 0;
  for (const f of factors) {
    f.contribution = f.signal * f.weight;
    level += f.contribution;
  }
  level = Math.min(1, Math.max(0, level));

  const score = Math.round(level * 100 * 100) / 100;
  const weightSum = factors.reduce((a, f) => a + f.weight, 0);
  const band = bandForScore(score);

  return {
    score,
    level,
    band,
    factors,
    weightSum,
    isAdvice: false,
  };
}

export function bandForScore(score: number): string {
  for (const b of READINESS_BANDS) {
    if (score >= b.min && score <= b.max) return b.label;
  }
  return "Unfavorable";
}
