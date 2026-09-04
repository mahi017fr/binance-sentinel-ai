/**
 * Agent ORCHESTRATOR.
 *
 * Runs the full multi-step agent workflow in order, threading the shared
 * `AgentContext` through every stage and producing an auditable step log.
 *
 *   User Query
 *     → Intent
 *     → Market Analysis
 *     → Risk Interpretation
 *     → Research / Reasoning
 *     → Final Report
 *
 * Each step records a lifecycle event (pending → running → completed|failed)
 * with start/end timestamps and duration, so the run is transparently a
 * multi-agent workflow. Errors are captured per-step without crashing the
 * whole process.
 *
 * The pipeline supports BOTH execution modes without duplication:
 *   - async generator:   `for await (const event of pipelineEvents(query))`
 *   - callback:          `runAgentPipeline(query, { onEvent })`
 *   - non-streaming:     `runAgentPipeline(query)` / `runAnalysis(query)`
 * The generator and callback modes both emit periodic agent events while the
 * pipeline runs; the non-streaming call just returns the final result.
 */

import {
  AGENT_PIPELINE,
  type AgentContext,
  type AgentName,
  type AgentRunResult,
  type AgentStatus,
} from "./types";
import type { StreamEvent } from "@/lib/stream/types";
import { runIntentAgent } from "./intent";
import { runMarketAgent } from "./market";
import { runRiskAgent } from "./risk";
import { runResearchAgent } from "./research";
import { runReportAgent } from "./report";
import { getLlmClient, type LlmMode } from "@/lib/llm/client";

export interface PipelineOptions {
  /** Invoked with a stream event as each lifecycle transition occurs. */
  onEvent?: (event: StreamEvent) => void;
}

type AgentRunner = (context: AgentContext) => Promise<unknown>;

const AGENTS: ReadonlyArray<{ name: AgentName; run: AgentRunner }> = [
  { name: "intent", run: runIntentAgent },
  { name: "market", run: runMarketAgent },
  { name: "risk", run: runRiskAgent },
  { name: "research", run: runResearchAgent },
  { name: "report", run: runReportAgent },
];

/** Resolve the LLM mode, gracefully falling back to mock on misconfiguration. */
function resolveLlmMode(): LlmMode {
  try {
    return getLlmClient().mode;
  } catch {
    return "mock";
  }
}

/** Maps a caught error to a safe human-readable message. */
function toErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Core generator: runs the full pipeline, YIELDING a stream event at every
 * lifecycle transition and RETURNING the final AgentRunResult. Both the
 * callback form and the standalone generator form wrap this single loop, so
 * there is no duplicated pipeline logic.
 */
async function* runPipelineCore(
  query: string
): AsyncGenerator<StreamEvent, AgentRunResult, void> {
  const llmMode = resolveLlmMode();

  const context: AgentContext = {
    query,
    intent: {
      intent: "general",
      symbols: [],
      timeframe: "1d",
      focus: "general",
    },
    analyses: {},
    interpretations: {},
    theses: {},
    events: [],
    llmMode,
  };

  // Initialize a pending event for every pipeline stage up front.
  context.events = AGENT_PIPELINE.map((agent) => ({
    agent,
    status: "pending" as AgentStatus,
  }));

  try {
    for (const { name, run } of AGENTS) {
      const event = context.events.find((e) => e.agent === name)!;

      yield {
        type: "agent-start",
        agent: name,
        timestamp: new Date().toISOString(),
      };

      event.status = "running";
      event.startedAt = new Date().toISOString();
      const start = performance.now();

      try {
        await run(context);
        event.status = "completed";
        event.completedAt = new Date().toISOString();
        event.durationMs = Math.round(performance.now() - start);

        yield {
          type: "agent-complete",
          agent: name,
          durationMs: event.durationMs,
          timestamp: new Date().toISOString(),
        };
      } catch (err) {
        event.status = "failed";
        event.completedAt = new Date().toISOString();
        event.durationMs = Math.round(performance.now() - start);
        event.error = toErrorMessage(err);

        yield {
          type: "agent-error",
          agent: name,
          error: event.error,
          timestamp: new Date().toISOString(),
        };
        yield {
          type: "done",
          success: false,
          timestamp: new Date().toISOString(),
        };

        return {
          success: false,
          error: event.error,
          context,
        };
      }
    }

    yield {
      type: "report",
      report: context.report!,
      timestamp: new Date().toISOString(),
    };
    yield {
      type: "done",
      success: true,
      timestamp: new Date().toISOString(),
    };

    return {
      success: true,
      report: context.report,
      context,
    };
  } finally {
    // Ensure every event reaches a terminal/non-pending state even on unexpected
    // control flow above (defensive).
    for (const event of context.events) {
      if (event.status === "pending" || event.status === "running") {
        event.status = "failed";
        event.error = event.error ?? "Pipeline did not complete.";
        event.completedAt = event.completedAt ?? new Date().toISOString();
        if (event.durationMs === undefined && event.startedAt) {
          event.durationMs = 0;
        }
      }
    }
  }
}

/** Async-generator entry point: `for await (const e of pipelineEvents(q))`. */
export function pipelineEvents(
  query: string
): AsyncGenerator<StreamEvent, AgentRunResult, void> {
  return runPipelineCore(query);
}

/**
 * Callback entry point: runs the pipeline, forwarding every stream event to
 * `options.onEvent`, and resolves with the final AgentRunResult.
 */
export async function runAgentPipeline(
  query: string,
  options?: PipelineOptions
): Promise<AgentRunResult> {
  return await consumePipeline(runPipelineCore(query), options);
}

/**
 * Non-streaming entry point (used by tests / callers that only need the final
 * result). Behaves exactly like the streaming path minus the callbacks.
 */
export async function runAnalysis(query: string): Promise<AgentRunResult> {
  return runAgentPipeline(query);
}

async function consumePipeline(
  source: AsyncGenerator<StreamEvent, AgentRunResult, void>,
  options: PipelineOptions | undefined
): Promise<AgentRunResult> {
  const iterator = source[Symbol.asyncIterator]();
  let result: AgentRunResult | undefined;
  while (true) {
    const { value, done } = await iterator.next();
    if (done) {
      result = value;
      break;
    }
    options?.onEvent?.(value);
  }
  return result;
}
