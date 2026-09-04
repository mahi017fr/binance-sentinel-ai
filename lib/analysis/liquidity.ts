/**
 * Market activity / liquidity signal.
 *
 * IMPORTANT naming decision: the only volume measure available from the 24h
 * ticker is the *traded* quote volume (USDT equivalent). That is a measure of
 * market ACTIVITY, not directly of order-book liquidity (depth). We therefore
 * expose a "market activity signal" and are explicit about this in
 * `disclaimer`. The level is normalized against an absolute reference volume
 * threshold.
 */

import type { Ticker24h } from "@/lib/binance-agent-os/types";
import { clamp01 } from "./indicators";
import type { LiquidityAnalysis } from "./types";

/**
 * Reference 24h quote volume (in quote asset, e.g. USDT) that maps to a
 * normalized activity level of 1.0. Chosen to be a "large, liquid" crypto pair
 * scale (≈ $1B/24h). Symbols well above this register at the top of the scale.
 */
const REFERENCE_QUOTE_VOLUME = 1_000_000_000;

export function analyzeLiquidity(ticker: Ticker24h): LiquidityAnalysis {
  const quoteVolume = ticker.quoteVolume;
  const level = clamp01(quoteVolume / REFERENCE_QUOTE_VOLUME);

  let label: string;
  if (level >= 0.66) label = "high activity";
  else if (level >= 0.33) label = "moderate activity";
  else if (level >= 0.1) label = "low activity";
  else label = "minimal activity";

  return {
    level,
    quoteVolume,
    label,
    disclaimer:
      "Based only on 24h traded quote volume; this is a market-activity signal, not a measure of order-book depth/liquidity.",
  };
}
