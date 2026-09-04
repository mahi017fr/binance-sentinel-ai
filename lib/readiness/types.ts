/**
 * Types specific to the TRADE READINESS engine.
 *
 * Trade readiness is a SEPARATE metric from risk. It measures how favorable
 * current market conditions are for active trading activity, using neutral
 * terminology — it is not a recommendation to trade and never promises
 * profitability.
 */

import type { ScoreResult } from "@/lib/analysis/types";

/** Stable machine keys for each readiness factor. */
export type ReadinessFactorKey =
  | "trend-clarity"
  | "trend-strength"
  | "market-activity"
  | "volatility-suitability"
  | "risk-penalty";

/** Human-readable readiness bands. */
export const READINESS_BANDS: ReadonlyArray<{
  min: number;
  max: number;
  label: string;
}> = [
  { min: 75, max: 100, label: "Favorable" },
  { min: 50, max: 74, label: "Developing" },
  { min: 25, max: 49, label: "Cautious" },
  { min: 0, max: 24, label: "Unfavorable" },
];

/** Result of the trade-readiness score computation. */
export interface ReadinessResult extends ScoreResult {
  /** Always false — defensive marker; readiness is not advice. */
  isAdvice: false;
}
