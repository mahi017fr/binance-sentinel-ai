/**
 * Convert a deterministic MarketAnalysisResult into the compact market-data
 * snapshot attached to each report asset for UI rendering.
 *
 * This is pure and deterministic — it only restructures engine numbers and
 * never invents any. Both the mock generator and the report agent use it so the
 * UI always receives exact figures from the deterministic engine.
 */

import type { MarketAnalysisResult } from "@/lib/analysis/types";
import type { MarketData } from "@/lib/llm/schema";

const SOURCE_LABELS: Record<string, string> = {
  "binance-public-api": "Binance",
  "coingecko-public-api": "CoinGecko",
};

export function toReportMarketData(analysis: MarketAnalysisResult): MarketData {
  const sourceId = analysis.source;
  const sourceLabel = SOURCE_LABELS[sourceId] ?? sourceId;
  const fallbackUsed = sourceId === "coingecko-public-api";

  return {
    price: analysis.snapshot.ticker.lastPrice,
    change24hPercent: analysis.snapshot.ticker.priceChangePercent,
    activity: analysis.liquidity.label,
    activityLevel: analysis.liquidity.level,
    trend: {
      direction: analysis.trend.direction,
      strength: analysis.trend.strength,
      clarity: analysis.trend.clarity,
    },
    volatility: {
      annualized: analysis.volatility.annualized,
      std: analysis.volatility.dailyStd,
      level: analysis.volatility.level,
    },
    drawdown: {
      current: analysis.drawdown.currentDrawdown,
      max: analysis.drawdown.maxDrawdown,
    },
    riskFactors: analysis.risk.factors.map((f) => ({
      key: f.key,
      name: f.name,
      signal: f.signal,
      weight: f.weight,
      contribution: f.contribution,
      explanation: f.explanation,
    })),
    readinessFactors: analysis.readiness.factors.map((f) => ({
      key: f.key,
      name: f.name,
      signal: f.signal,
      weight: f.weight,
      contribution: f.contribution,
      explanation: f.explanation,
    })),
    source: sourceId,
    sourceLabel,
    fallbackUsed,
  };
}
