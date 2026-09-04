/**
 * RESEARCH / REASONING agent.
 *
 * Produces a structured, neutral market thesis for each analyzed symbol by
 * combining the deterministic market analysis with the risk interpretation.
 *
 * Rules enforced:
 *   - No guaranteed outcomes or promised profit.
 *   - No direct buy/sell commands.
 *   - Data clearly separated from interpretation.
 *   - Uncertainty always stated.
 *
 * Uses the configured LLM (mock in demo mode, real provider when configured).
 */

import { getLlmClient } from "@/lib/llm/client";
import type { MarketThesis } from "@/lib/llm/schema";
import type { AgentContext, ResearchAgentResult } from "./types";

export async function runResearchAgent(
  context: AgentContext
): Promise<ResearchAgentResult> {
  const client = getLlmClient();
  const theses: Record<string, MarketThesis> = {};

  for (const symbol of Object.keys(context.analyses)) {
    const analysis = context.analyses[symbol];
    const interpretation = context.interpretations[symbol];
    theses[symbol] = await client.generateMarketThesis(
      analysis,
      interpretation
    );
  }

  context.theses = theses;
  return { theses };
}
