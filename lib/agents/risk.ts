/**
 * RISK INTERPRETATION agent.
 *
 * Interprets the EXISTING deterministic scores — it never recalculates them.
 * For each symbol it produces:
 *   - key drivers (which factors push risk/readiness and why)
 *   - structured observations across categories
 *
 * When a real LLM is configured, the deterministic analysis values are passed
 * as input and the LLM writes the interpretation. In mock mode, the
 * deterministic generators produce the same validated shapes directly from the
 * analysis values — so no market score is ever fabricated.
 */

import { getLlmClient } from "@/lib/llm/client";
import type { RiskInterpretation } from "@/lib/llm/schema";
import type { AgentContext, RiskAgentResult } from "./types";

export async function runRiskAgent(
  context: AgentContext
): Promise<RiskAgentResult> {
  const client = getLlmClient();
  const interpretations: Record<string, RiskInterpretation> = {};

  for (const symbol of Object.keys(context.analyses)) {
    const analysis = context.analyses[symbol];
    interpretations[symbol] = await client.generateRiskInterpretation(analysis);
  }

  context.interpretations = interpretations;
  return { interpretations };
}
