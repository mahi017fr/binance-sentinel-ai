/**
 * Strongly-typed schemas for the Live Market Scanner.
 *
 * Every classification (volatility band, momentum direction, risk band,
 * activity level) is the result of a transparent deterministic calculation —
 * never a random or fabricated value.
 *
 * Zod v4 schemas validate the API response shape.
 */

import { z } from "zod";

// ---------------------------------------------------------------------------
// Per-asset scanner metrics
// ---------------------------------------------------------------------------

export const VolatilityMetricSchema = z.object({
  /** Raw volatility value: ((high - low) / price) * 100, as a percentage. */
  value: z.number(),
  /** Human-readable band: "Low" | "Moderate" | "High" | "Extreme". */
  band: z.string(),
  /** Transparent explanation of the calculation. */
  explanation: z.string(),
});
export type VolatilityMetric = z.infer<typeof VolatilityMetricSchema>;

export const MomentumMetricSchema = z.object({
  /** 24h price change percentage. */
  value: z.number(),
  /** Direction derived from 24h change + trend clarity. */
  direction: z.enum(["bullish", "bearish", "neutral"]),
  /** Transparent explanation. */
  explanation: z.string(),
});
export type MomentumMetric = z.infer<typeof MomentumMetricSchema>;

export const RiskMetricSchema = z.object({
  /** Deterministic risk score 0-100 (reuses the existing risk engine). */
  score: z.number(),
  /** Band label. */
  band: z.string(),
});
export type RiskMetric = z.infer<typeof RiskMetricSchema>;

export const ActivityMetricSchema = z.object({
  /** Human-readable activity level. */
  level: z.string(),
  /** Numeric activity level 0..1. */
  value: z.number(),
});
export type ActivityMetric = z.infer<typeof ActivityMetricSchema>;

export const MarketScanAssetSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  change24h: z.number(),
  volume24h: z.number(),
  high24h: z.number(),
  low24h: z.number(),
  volatility: VolatilityMetricSchema,
  momentum: MomentumMetricSchema,
  risk: RiskMetricSchema,
  activity: ActivityMetricSchema,
});
export type MarketScanAsset = z.infer<typeof MarketScanAssetSchema>;

// ---------------------------------------------------------------------------
// Highlights
// ---------------------------------------------------------------------------

export const ScannerHighlightsSchema = z.object({
  highVolatility: z.array(z.string()),
  strongMomentum: z.array(z.string()),
  elevatedRisk: z.array(z.string()),
  highActivity: z.array(z.string()),
  topMovers: z.array(z.string()),
});
export type ScannerHighlights = z.infer<typeof ScannerHighlightsSchema>;

// ---------------------------------------------------------------------------
// Failure info (partial-failure model)
// ---------------------------------------------------------------------------

export const ScannerFailureSchema = z.object({
  symbol: z.string(),
  error: z.string(),
});
export type ScannerFailure = z.infer<typeof ScannerFailureSchema>;

// ---------------------------------------------------------------------------
// Full scan result
// ---------------------------------------------------------------------------

export const MarketScanResultSchema = z.object({
  scannedAt: z.string(),
  universe: z.array(z.string()),
  assets: z.array(MarketScanAssetSchema),
  highlights: ScannerHighlightsSchema,
  failures: z.array(ScannerFailureSchema).optional(),
});
export type MarketScanResult = z.infer<typeof MarketScanResultSchema>;
