/**
 * Types specific to the explainable RISK engine.
 *
 * The low-level `ScoreResult` / `ScoreFactor` shapes live in
 * `@/lib/analysis/types` because both the risk and the readiness engines share
 * them. This file defines the risk-specific factor keys, labels, and bands.
 */

import type { ScoreResult } from "@/lib/analysis/types";

/** Stable machine keys for each risk factor. */
export type RiskFactorKey =
  | "volatility"
  | "trend-uncertainty"
  | "drawdown"
  | "market-activity";

/** Human-readable risk bands. */
export const RISK_BANDS: ReadonlyArray<{
  min: number;
  max: number;
  label: string;
}> = [
  { min: 75, max: 100, label: "Very High" },
  { min: 50, max: 74, label: "High" },
  { min: 25, max: 49, label: "Moderate" },
  { min: 0, max: 24, label: "Low" },
];

/** Result of the risk score computation. */
export interface RiskResult extends ScoreResult {
  /** Always false — a defensive marker; risk is never advisory. */
  isFinancialAdvice: false;
}
