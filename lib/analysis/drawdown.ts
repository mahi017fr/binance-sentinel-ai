/**
 * Drawdown analysis.
 *
 * Computes:
 *  - `maxDrawdown`: the largest peak-to-trough decline within the window.
 *  - `currentDrawdown`: decline of the last close from the window's running
 *    high (the trough — or 0 if at a new high).
 *  - `risk`: a normalized 0..1 representation of drawdown risk, derived from
 *    the current drawdown depth and how far down within the window we are.
 */

import type { Kline } from "@/lib/binance-agent-os/types";
import { clamp01 } from "./indicators";
import type { DrawdownAnalysis } from "./types";

export function analyzeDrawdown(klines: Kline[]): DrawdownAnalysis {
  const n = klines.length;
  if (n === 0) {
    return { maxDrawdown: 0, currentDrawdown: 0, peakTime: 0, risk: 0 };
  }

  let peakPrice = -Infinity;
  let peakTime = klines[0].openTime;
  let maxDrawdown = 0;

  // Running peak tracking.
  for (const k of klines) {
    if (k.high > peakPrice) {
      peakPrice = k.high;
      peakTime = k.openTime;
    }
    const ddFromPeak = peakPrice > 0 ? (peakPrice - k.low) / peakPrice : 0;
    if (ddFromPeak > maxDrawdown) maxDrawdown = ddFromPeak;
  }

  // Current drawdown from the window's highest high.
  const windowHigh = Math.max(...klines.map((k) => k.high));
  const lastClose = klines[n - 1].close;
  const currentDrawdown = windowHigh > 0 ? (windowHigh - lastClose) / windowHigh : 0;

  // Normalize drawdown risk: favor deeper current drawdown.
  // A 30% current drawdown maps to ~0.6 relative risk.
  const risk = clamp01(currentDrawdown / 0.5);

  return {
    maxDrawdown: clamp01(maxDrawdown),
    currentDrawdown: clamp01(currentDrawdown),
    peakTime,
    risk: clamp01(risk),
  };
}
