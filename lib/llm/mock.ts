/**
 * Mock / demo LLM generator.
 *
 * Produces all structured outputs deterministically from the analysis values —
 * so the whole agent pipeline runs with NO API key. The outputs are then
 * validated against the same Zod schemas used for the real LLM, guaranteeing
 * identical trusted shapes in both modes.
 *
 * These generators never fabricate market numbers: every figure quoted comes
 * directly from the deterministic engine result passed in. No buy/sell
 * advice, no profit guarantees, uncertainty always present.
 */

import type { MarketAnalysisResult } from "@/lib/analysis/types";
import { toReportMarketData } from "@/lib/analysis/report-data";
import { parseIntentDeterministically } from "@/lib/agents/intent";
import type {
  Driver,
  Intent,
  MarketThesis,
  Observation,
  Report,
  ReportAsset,
  RiskInterpretation,
} from "./schema";

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function fmtPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(6);
}

function confidenceFor(signal: number): "low" | "medium" | "high" {
  if (signal >= 0.66) return "high";
  if (signal >= 0.33) return "medium";
  return "low";
}

/** Deterministic intent extraction — reuses the shared natural-language parser. */
export function mockIntent(query: string): Intent {
  return parseIntentDeterministically(query);
}

/** Deterministic risk interpretation derived from the deterministic analysis. */
export function mockRiskInterpretation(
  analysis: MarketAnalysisResult
): RiskInterpretation {
  const { risk, readiness, volatility, trend, drawdown, liquidity } = analysis;
  const drivers: Driver[] = [];

  if (volatility.level > 0.5) {
    drivers.push({
      key: "volatility",
      label: "Volatility",
      impact: "increases",
      explanation: `Volatility level is ${pct(volatility.level)} of the reference scale; the daily std is ${pct(volatility.dailyStd)}. Higher volatility raises risk magnitude.`,
    });
  } else {
    drivers.push({
      key: "volatility",
      label: "Volatility",
      impact: "decreases",
      explanation: `Volatility level is ${pct(volatility.level)} of the reference scale; the daily std is ${pct(volatility.dailyStd)}. A calmer market lowers risk magnitude.`,
    });
  }

  if (trend.clarity < 0.4) {
    drivers.push({
      key: "trend-uncertainty",
      label: "Trend uncertainty",
      impact: "increases",
      explanation: `Trend clarity is ${pct(trend.clarity)} (low), so the current direction is not well established.`,
    });
  } else {
    drivers.push({
      key: "trend-uncertainty",
      label: "Trend uncertainty",
      impact: "decreases",
      explanation: `Trend clarity is ${pct(trend.clarity)} with direction "${trend.direction}", indicating a more established move.`,
    });
  }

  if (drawdown.currentDrawdown > 0.2) {
    drivers.push({
      key: "drawdown",
      label: "Drawdown",
      impact: "increases",
      explanation: `Current drawdown from the recent high is ${pct(drawdown.currentDrawdown)}.`,
    });
  } else if (drawdown.currentDrawdown > 0.05) {
    drivers.push({
      key: "drawdown",
      label: "Drawdown",
      impact: "neutral",
      explanation: `Current drawdown from the recent high is ${pct(drawdown.currentDrawdown)}, a moderate pullback.`,
    });
  } else {
    drivers.push({
      key: "drawdown",
      label: "Drawdown",
      impact: "decreases",
      explanation: `Current drawdown from the recent high is ${pct(drawdown.currentDrawdown)}, near recent highs.`,
    });
  }

  if (liquidity.level < 0.33) {
    drivers.push({
      key: "market-activity",
      label: "Market activity",
      impact: "increases",
      explanation: `24h traded quote volume is $${(liquidity.quoteVolume / 1e9).toFixed(2)}B (${liquidity.label}); lower activity can increase execution risk.`,
    });
  } else {
    drivers.push({
      key: "market-activity",
      label: "Market activity",
      impact: "decreases",
      explanation: `24h traded quote volume is $${(liquidity.quoteVolume / 1e9).toFixed(2)}B (${liquidity.label}); higher activity supports execution.`,
    });
  }

  const observations: Observation[] = [
    {
      category: "risk",
      text: `Overall risk score is ${risk.score.toFixed(2)} ("${risk.band}").`,
      confidence: confidenceFor(risk.level),
    },
    {
      category: "readiness",
      text: `Trade readiness score is ${readiness.score.toFixed(2)} ("${readiness.band}").`,
      confidence: confidenceFor(readiness.level),
    },
    {
      category: "volatility",
      text: `Annualized volatility estimate is ${pct(volatility.annualized)} (per-bar std ${pct(volatility.dailyStd)}).`,
      confidence: confidenceFor(volatility.level),
    },
    {
      category: "trend",
      text: `Trend direction is "${trend.direction}" with clarity ${pct(trend.clarity)} and strength ${pct(trend.strength)}.`,
      confidence: confidenceFor(trend.strength),
    },
    {
      category: "drawdown",
      text: `Maximum drawdown in the window is ${pct(drawdown.maxDrawdown)}; current drawdown is ${pct(drawdown.currentDrawdown)}.`,
      confidence: confidenceFor(drawdown.risk),
    },
    {
      category: "market-activity",
      text: `24h activity signal is ${liquidity.label} based on traded quote volume.`,
      confidence: confidenceFor(liquidity.level),
    },
  ];

  return {
    symbol: analysis.symbol,
    riskBand: risk.band,
    readinessBand: readiness.band,
    drivers,
    observations,
  };
}

/** Deterministic neutral market thesis. */
export function mockMarketThesis(
  analysis: MarketAnalysisResult,
  riskInterpretation: RiskInterpretation
): MarketThesis {
  const { trend, volatility, drawdown, liquidity, risk, readiness } = analysis;
  const close = analysis.snapshot.ticker.lastPrice;

  const dataBased = [
    `Latest price is ${fmtPrice(close)} with a 24h change of ${pct(analysis.snapshot.ticker.priceChangePercent / 100)}.`,
    `Risk score ${risk.score.toFixed(2)} ("${risk.band}"); readiness ${readiness.score.toFixed(2)} ("${readiness.band}").`,
    `Trend: ${trend.direction}, clarity ${pct(trend.clarity)}, strength ${pct(trend.strength)}.`,
    `Volatility: per-bar std ${pct(volatility.dailyStd)}, annualized ${pct(volatility.annualized)}.`,
    `Current drawdown from high ${pct(drawdown.currentDrawdown)}; activity ${liquidity.label}.`,
  ];

  const interpretation: string[] = [
    `The market shows a ${trend.direction} movement with ${pct(trend.strength)} strength and ${pct(trend.clarity)} clarity, implying ${trend.clarity >= 0.5 ? "a relatively" : "a not clearly"} established directional context.`,
    readiness.level >= 0.5
      ? "Conditions are comparatively more favorable for active engagement under current metrics."
      : "Conditions are comparatively less favorable for active engagement under current metrics.",
    "These are interpretive summaries of measured data, not forecasts or recommendations.",
  ];

  return {
    symbol: analysis.symbol,
    thesis: `For ${analysis.symbol}, the measured profile is ${risk.band.toLowerCase()} risk (${risk.score.toFixed(2)}) and ${readiness.band.toLowerCase()} readiness (${readiness.score.toFixed(2)}), with ${trend.direction} trend and ${pct(volatility.annualized)} annualized volatility.`,
    dataBased,
    interpretation,
    uncertainty:
      "Results are based on the selected window of historical data; they do not predict future price movement.",
    caveats: riskInterpretation.drivers.map((d) => d.explanation),
  };
}

export function mockReport(
  query: string,
  assets: {
    analysis: MarketAnalysisResult;
    interpretation: RiskInterpretation;
    thesis: MarketThesis;
  }[]
): Report {
  const reportAssets: ReportAsset[] = assets.map((a) => ({
    symbol: a.analysis.symbol,
    marketSummary: a.thesis.thesis,
    risk: a.analysis.risk.score,
    riskBand: a.analysis.risk.band,
    readiness: a.analysis.readiness.score,
    readinessBand: a.analysis.readiness.band,
    keyDrivers: a.interpretation.drivers,
    observations: a.interpretation.observations,
    thesis: a.thesis,
    uncertainty: a.thesis.uncertainty,
    marketData: toReportMarketData(a.analysis),
  }));

  let overallSummary: string;
  if (reportAssets.length === 1) {
    const a = reportAssets[0];
    overallSummary = `${a.symbol}: risk ${a.risk.toFixed(2)} (${a.riskBand}), readiness ${a.readiness.toFixed(2)} (${a.readinessBand}). ${a.thesis.thesis}`;
  } else {
    overallSummary = `Compared across ${reportAssets.length} asset(s): ${reportAssets
      .map((a) => `${a.symbol} risk ${a.risk.toFixed(2)}/${a.riskBand}, readiness ${a.readiness.toFixed(2)}/${a.readinessBand}`)
      .join(" · ")}.`;
  }

  return {
    query,
    generatedAt: new Date().toISOString(),
    assets: reportAssets,
    overallSummary,
    disclaimer:
      "Binance Sentinel AI is a research and decision-support tool. Scores are descriptive measures of historical market conditions and are not financial advice; they do not guarantee outcomes and should not be used as the sole basis for trading decisions.",
  };
}
