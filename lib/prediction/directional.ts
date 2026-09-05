/**
 * DIRECTIONAL PREDICTION — deterministic, transparent directional scoring.
 *
 * This module derives a research directional signal (UP / DOWN / NEUTRAL) with
 * a 0–100 model confidence from the REAL, deterministic market snapshot already
 * attached to each report asset (`ReportAsset.marketData`).
 *
 * It is deliberately NOT random, NOT hardcoded, and NOT a price guarantee:
 * it re-uses the exact metrics the five-agent pipeline computed from live
 * Binance market data (trend, momentum, volatility, drawdown, activity, risk).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * DIRECTION SCORE (per asset, range −1 … +1)
 *
 *   score = 0.40 · trend   + 0.40 · momentum   + 0.20 · drawdown
 *
 *   1. trend    = sign(trend.direction) · trend.strength · trend.clarity
 *        up → +1, down → −1, flat → 0; scaled by how strong and clear the
 *        observed trend structure is.
 *   2. momentum = tanh(change24hPercent / 6)
 *        saturating short-term momentum so extreme 24h moves do not dominate.
 *   3. drawdown = −tanh(max(0, drawdown.current) / 0.20)
 *        distance from the recent window high pulls the score down (bearish
 *        pressure), weighted lowest so it dampens rather than dominates;
 *        ranges −1 … 0 and never invents upside by itself.
 *
 *   Direction thresholds:
 *     score >= +0.18  → UP
 *     score <= −0.18  → DOWN
 *     otherwise       → NEUTRAL
 *
 * MODEL CONFIDENCE (0–100)
 *
 *   For UP/DOWN the confidence reflects how far the score is from zero and how
 *   stable the conditions are:
 *
 *     stability = (1 − 0.30·volatilityLevel) · (1 − 0.15·risk/100)
 *                 · (0.70 + 0.30·trend.clarity)
 *     confidence = round( clamp( 100 · clamp(0.52 + 0.48·|score|, 0.45, 0.95)
 *                                · stability, 32, 96 ) )
 *
 *   For NEUTRAL the confidence is highest when momentum is genuinely absent:
 *
 *     confidence = round( clamp( 100 · clamp(0.68 − 0.60·|score|, 0.50, 0.68)
 *                                · (1 − 0.20·volatilityLevel), 42, 82 ) )
 *
 *   Volatility and elevated risk always DAMPEN confidence; they never flip the
 *   direction. This keeps the score honest: choppy conditions lower certainty
 *   instead of inventing conviction.
 *
 * The per-asset inputs are the numbers the market agent actually produced, so
 * the same query + same live data always yields the same signal.
 */

import type { ReportAsset } from "@/lib/llm/schema";

export type Direction = "up" | "down" | "neutral";

export interface DirectionalComponents {
  /** Weighted trend signal, −1…+1. */
  trend: number;
  /** Saturated 24h momentum, −1…+1. */
  momentum: number;
  /** Drawdown pressure, ~−1…0. */
  drawdown: number;
  /** Normalized volatility level 0…1 (used as a confidence dampener). */
  volatility: number;
}

export interface DirectionalSignal {
  symbol: string;
  direction: Direction;
  /** Continuous directional score, −1…+1. */
  score: number;
  /** Model confidence 0…100. */
  confidence: number;
  /** Deterministic evidence points derived only from the actual data. */
  reasons: string[];
  components: DirectionalComponents;
}

export interface MarketBias {
  direction: Direction;
  score: number;
  confidence: number;
}

const UP_THRESHOLD = 0.18;
const DOWN_THRESHOLD = -0.18;

const W_TREND = 0.4;
const W_MOMENTUM = 0.4;
const W_DRAWDOWN = 0.2;
const DRAWDOWN_DECAY = 0.2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** sign(direction) mapped to −1 / 0 / +1. */
function trendSign(direction: string): number {
  if (direction === "up") return 1;
  if (direction === "down") return -1;
  return 0;
}

function formatConfidence(value: number): number {
  return Math.round(clamp(value, 0, 100));
}

function momentumReason(m: ReportAsset["marketData"]): string {
  if (m.change24hPercent >= 0.5) return "Positive short-term momentum";
  if (m.change24hPercent <= -0.5) return "Negative short-term momentum";
  return "Flat short-term momentum";
}

function trendReason(m: ReportAsset["marketData"]): string {
  if (m.trend.direction === "up" && m.trend.strength >= 0.45) {
    return "Positive trend structure";
  }
  if (m.trend.direction === "down" && m.trend.strength >= 0.45) {
    return "Negative trend structure";
  }
  if (m.trend.direction === "flat" || m.trend.strength < 0.45) {
    return "Weak / unclear trend";
  }
  return "Mixed trend signals";
}

function activityReason(m: ReportAsset["marketData"]): string {
  if (m.activityLevel >= 0.6) return "Elevated market activity";
  if (m.activityLevel >= 0.35) return "Moderate market activity";
  return "Low market activity";
}

/** Deterministic evidence points (2–4) explaining why the signal was produced. */
function buildReasons(asset: ReportAsset, direction: Direction): string[] {
  const m = asset.marketData;
  const reasons: string[] = [trendReason(m), momentumReason(m)];

  // Elevated activity supports the prevailing move — only listed when real.
  if (m.activityLevel >= 0.6) reasons.push(activityReason(m));

  // High volatility / deep drawdown are honest caveats, not hype.
  if (m.volatility.level >= 0.66) reasons.push("Elevated volatility");
  if (m.drawdown.current >= 0.12) reasons.push("Extended drawdown from window high");
  if (m.drawdown.current >= 0.05 && m.trend.direction === "up" && direction !== "down") {
    reasons.push("Recovering from a recent drawdown");
  }

  if (asset.readiness >= 65) reasons.push("Healthy market structure");
  else if (asset.risk >= 65) reasons.push("Elevated measured risk");

  return reasons.slice(0, 4);
}

/**
 * Compute a deterministic directional signal for a single report asset.
 * Returns null when the asset carries no usable market snapshot (defensive:
 * the report layer always attaches one, but callers must not assume).
 */
export function computeDirectionalSignal(
  asset: ReportAsset
): DirectionalSignal | null {
  const m = asset.marketData;
  if (!m || typeof m.trend?.direction !== "string") return null;

  const trend = trendSign(m.trend.direction) * m.trend.strength * m.trend.clarity;
  const momentum = Math.tanh(m.change24hPercent / 6);
  const drawdown = -Math.tanh(Math.max(0, m.drawdown.current) / DRAWDOWN_DECAY);

  const score = clamp(
    W_TREND * trend + W_MOMENTUM * momentum + W_DRAWDOWN * drawdown,
    -1,
    1
  );

  let direction: Direction;
  if (score >= UP_THRESHOLD) direction = "up";
  else if (score <= DOWN_THRESHOLD) direction = "down";
  else direction = "neutral";

  let confidence: number;
  if (direction === "neutral") {
    const conv = clamp(0.68 - 0.6 * Math.abs(score), 0.5, 0.68);
    confidence = formatConfidence(
      100 * conv * (1 - 0.2 * m.volatility.level)
    );
  } else {
    const magnitude = Math.abs(score);
    const stability =
      (1 - 0.3 * m.volatility.level) *
      (1 - 0.15 * (asset.risk / 100)) *
      (0.7 + 0.3 * m.trend.clarity);
    const base = clamp(0.52 + 0.48 * magnitude, 0.45, 0.95);
    confidence = formatConfidence(100 * base * stability);
  }

  return {
    symbol: asset.symbol,
    direction,
    score: Math.round(score * 1000) / 1000,
    confidence,
    reasons: buildReasons(asset, direction),
    components: {
      trend: Math.round(trend * 1000) / 1000,
      momentum: Math.round(momentum * 1000) / 1000,
      drawdown: Math.round(drawdown * 1000) / 1000,
      volatility: m.volatility.level,
    },
  };
}

/**
 * Aggregate overall market bias across multiple analyzed assets. Only call
 * when more than one asset was actually analyzed — this function returns null
 * for a single asset so callers never show a fabricated "overall" signal.
 */
export function computeMarketBias(
  signals: DirectionalSignal[]
): MarketBias | null {
  if (signals.length < 2) return null;

  const totalWeight = signals.reduce((sum, s) => sum + s.confidence, 0);
  if (totalWeight <= 0) return null;

  const weightedScore =
    signals.reduce((sum, s) => sum + s.score * s.confidence, 0) / totalWeight;

  const direction: Direction =
    weightedScore >= UP_THRESHOLD
      ? "up"
      : weightedScore <= DOWN_THRESHOLD
        ? "down"
        : "neutral";

  const confidence = Math.round(
    signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length
  );

  return {
    direction,
    score: Math.round(weightedScore * 1000) / 1000,
    confidence,
  };
}