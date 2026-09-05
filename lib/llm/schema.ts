/**
 * Zod schemas for LLM structured output.
 *
 * These schemas define the exact shapes that:
 *   - the real LLM must produce (via `generateObject` with a schema), and
 *   - the mock/demo generator must produce (then validated against the same
 *     schema so both paths yield identical, trusted shapes).
 *
 * Everything here is deterministic-neutral: no buy/sell advice, no profit
 * guarantees, and uncertainty is always represented.
 */

import { z } from "zod";

/** Supported analysis focuses (interface-clarifying intents). */
export const FocusSchema = z.enum([
  "risk",
  "volatility",
  "trend",
  "liquidity",
  "readiness",
  "general",
]);
export type Focus = z.infer<typeof FocusSchema>;

export const IntentSchema = z.object({
  intent: z.enum([
    "analyze",
    "explain",
    "assess-conditions",
    "compare",
    "general",
  ]),
  symbols: z.array(z.string()).min(0).max(5),
  timeframe: z
    .enum(["1m", "5m", "15m", "1h", "4h", "1d", "1w", "1M"])
    .default("1d"),
  focus: FocusSchema.default("general"),
  /** Explicit asset mentions that could not be recognized (for a helpful error). */
  unknownSymbols: z.array(z.string()).optional(),
});
export type Intent = z.infer<typeof IntentSchema>;

/** One driver identified by the risk-interpretation agent. */
export const DriverSchema = z.object({
  key: z.string(),
  label: z.string(),
  /** Direction/impact of the driver relative to risk: "increases" | "decreases" | "neutral". */
  impact: z.enum(["increases", "decreases", "neutral"]),
  /** A short evidence-backed explanation (ties back to a deterministic value). */
  explanation: z.string(),
});
export type Driver = z.infer<typeof DriverSchema>;

/** One observation from the risk-interpretation agent. */
export const ObservationSchema = z.object({
  category: z.enum([
    "trend",
    "volatility",
    "drawdown",
    "market-activity",
    "risk",
    "readiness",
  ]),
  text: z.string(),
  /** Confidence level expressed as qualitative hedge, not a promise. */
  confidence: z.enum(["low", "medium", "high"]),
});
export type Observation = z.infer<typeof ObservationSchema>;

/** Per-asset risk interpretation (no recalculation — interprets existing scores). */
export const RiskInterpretationSchema = z.object({
  symbol: z.string(),
  riskBand: z.string(),
  readinessBand: z.string(),
  drivers: z.array(DriverSchema),
  observations: z.array(ObservationSchema),
});
export type RiskInterpretation = z.infer<typeof RiskInterpretationSchema>;

/** Structured market thesis produced by the research/reasoning agent. */
export const MarketThesisSchema = z.object({
  symbol: z.string(),
  thesis: z.string(),
  /** Explicit separation of data-driven facts from interpretation. */
  dataBased: z.array(z.string()),
  interpretation: z.array(z.string()),
  uncertainty: z.string(),
  caveats: z.array(z.string()),
});
export type MarketThesis = z.infer<typeof MarketThesisSchema>;

/** One deterministic score factor in a report (for transparent UI breakdown). */
export const FactorBreakdown = z.object({
  /** Stable machine key, e.g. "volatility-risk". */
  key: z.string(),
  /** Human-readable factor name, e.g. "Volatility risk". */
  name: z.string(),
  /** Normalized underlying signal 0..1 (before weighting). */
  signal: z.number(),
  /** Fixed factor weight (all weights sum to 1). */
  weight: z.number(),
  /** Contribution = signal * weight (the amount this factor adds to the score). */
  contribution: z.number(),
  /** Short, factual explanation of what this factor measures. */
  explanation: z.string(),
});

/** Deterministic market snapshot attached to each report asset (UI rendering). */
export const MarketDataSchema = z.object({
  /** Latest price (quote asset). */
  price: z.number(),
  /** 24h percent change, e.g. 5.6 means +5.6%. */
  change24hPercent: z.number(),
  /** Market activity label, e.g. "high activity". */
  activity: z.string(),
  /** Market activity level, 0..1. */
  activityLevel: z.number(),
  trend: z.object({
    direction: z.string(),
    /** Trend strength 0..1. */
    strength: z.number(),
    /** Trend clarity (R²) 0..1. */
    clarity: z.number(),
  }),
  volatility: z.object({
    /** Annualized volatility estimate, decimal. */
    annualized: z.number(),
    /** Per-bar std, decimal. */
    std: z.number(),
    /** Normalized volatility level 0..1. */
    level: z.number(),
  }),
  drawdown: z.object({
    /** Current drawdown from window high, decimal. */
    current: z.number(),
    /** Max drawdown within window, decimal. */
    max: z.number(),
  }),
  /**
   * Recent close prices (oldest → newest) taken directly from the klines the
   * market agent already fetched for this asset. Present whenever OHLC history
   * is available; intentionally NOT modeled as guaranteed or predictive.
   */
  priceSeries: z.array(z.number()).optional(),
  /** Kline interval `priceSeries` was sampled at, e.g. "1h". */
  interval: z.string().optional(),
  /** Deterministic risk-score factor breakdown (signal 0..1 each). */
  riskFactors: z.array(FactorBreakdown),
  /** Deterministic readiness-score factor breakdown (signal 0..1 each). */
  readinessFactors: z.array(FactorBreakdown),
  /** Provider id that served the market data (e.g. binance-public-api). */
  source: z.string().optional(),
  /** Human-readable provider label. */
  sourceLabel: z.string().optional(),
  /** Whether a fallback provider was used for this asset's market data. */
  fallbackUsed: z.boolean().optional(),
});
export type MarketData = z.infer<typeof MarketDataSchema>;

/** A single asset entry in the final report. */
export const ReportAssetSchema = z.object({
  symbol: z.string(),
  marketSummary: z.string(),
  risk: z.number().min(0).max(100),
  riskBand: z.string(),
  readiness: z.number().min(0).max(100),
  readinessBand: z.string(),
  keyDrivers: z.array(DriverSchema),
  observations: z.array(ObservationSchema),
  thesis: MarketThesisSchema,
  uncertainty: z.string(),
  /** Deterministic market snapshot attached by the report agent. */
  marketData: MarketDataSchema,
});
export type ReportAsset = z.infer<typeof ReportAssetSchema>;

/** Final structured report. */
export const ReportSchema = z.object({
  query: z.string(),
  generatedAt: z.string(),
  assets: z.array(ReportAssetSchema),
  overallSummary: z.string(),
  disclaimer: z.string(),
});
export type Report = z.infer<typeof ReportSchema>;
