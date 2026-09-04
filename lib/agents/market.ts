/**
 * MARKET ANALYSIS agent.
 *
 * Resolves the intent's symbols and timeframe, then runs the existing
 * deterministic `analyzeMarket()` engine for each symbol. It does NOT
 * duplicate any market calculations — the deterministic engine remains the
 * single source of quantitative truth. Supports single or multiple symbols.
 */

import { analyzeMarket } from "@/lib/analysis/market-analysis";
import type { KlineInterval } from "@/lib/binance-agent-os/types";
import type { MarketAnalysisResult } from "@/lib/analysis/types";
import type { AgentContext, MarketAgentResult } from "./types";

export async function runMarketAgent(
  context: AgentContext
): Promise<MarketAgentResult> {
  const { intent } = context;
  const interval = intent.timeframe as KlineInterval;

  let symbols = intent.symbols.map((s) => s.toUpperCase());
  if (symbols.length === 0) {
    // No explicit symbol — default to a liquid benchmark so the pipeline still
    // produces a useful (clearly-labeled) result.
    symbols = ["BTCUSDT"];
  }

  const analyses: Record<string, MarketAnalysisResult> = {};
  for (const symbol of symbols) {
    analyses[symbol] = await analyzeMarket(symbol, { interval });
  }

  context.analyses = analyses;
  return { analyses };
}
