/**
 * Shared types for the agent pipeline.
 *
 * An agent is a single stage in the workflow. Every agent receives and mutates
 * the shared `AgentContext`, returning a typed payload. The orchestrator wraps
 * each agent call with lifecycle/timing bookkeeping, so the whole run is
 * clearly a multi-step workflow with an auditable step log.
 */

import type { Intent, Report, RiskInterpretation, MarketThesis } from "@/lib/llm/schema";
import type { MarketAnalysisResult } from "@/lib/analysis/types";
import type { LlmMode } from "@/lib/llm/client";

export type AgentName =
  | "intent"
  | "market"
  | "risk"
  | "research"
  | "report";

export type AgentStatus = "pending" | "running" | "completed" | "failed";

/** Per-step execution record captured by the orchestrator. */
export interface AgentRunEvent {
  agent: AgentName;
  status: AgentStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

/** Sequential index of each agent stage. */
export const AGENT_PIPELINE: AgentName[] = [
  "intent",
  "market",
  "risk",
  "research",
  "report",
];

/**
 * Shared, mutable state that flows through the entire pipeline.
 * Each stage adds its contribution so downstream stages can consume upstream
 * results without re-fetching or recalculating.
 */
export interface AgentContext {
  /** The original natural-language query. */
  query: string;
  /** Output of the Intent agent. */
  intent: Intent;
  /** Per-symbol deterministic market analysis (source of quantitative truth). */
  analyses: Record<string, MarketAnalysisResult>;
  /** Per-symbol risk interpretation. */
  interpretations: Record<string, RiskInterpretation>;
  /** Per-symbol research thesis. */
  theses: Record<string, MarketThesis>;
  /** Final structured report. */
  report?: Report;
  /** Ordered step log produced by the orchestrator. */
  events: AgentRunEvent[];
  /** Which LLM backend was active during this run. */
  llmMode: LlmMode;
}

/** Typed payload each agent returns. */
export interface IntentAgentResult {
  intent: Intent;
}

export interface MarketAgentResult {
  /** Keyed by normalized symbol. */
  analyses: Record<string, MarketAnalysisResult>;
}

export interface RiskAgentResult {
  interpretations: Record<string, RiskInterpretation>;
}

export interface ResearchAgentResult {
  theses: Record<string, MarketThesis>;
}

export interface ReportAgentResult {
  report: Report;
}

/** The final outcome of a full pipeline run. */
export interface AgentRunResult {
  /** True if every stage completed without error. */
  success: boolean;
  /** Final structured report (present when success). */
  report?: Report;
  /** The shared context, including the full step log. */
  context?: AgentContext;
  /** If a stage failed, a human-readable message. */
  error?: string;
}
