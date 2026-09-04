/**
 * Strongly-typed event model for real-time agent workflow streaming.
 *
 * Each event is a discriminated union. Every event carries a `type`; timing
 * events carry an ISO `timestamp`; the `agent-complete` event also carries
 * `durationMs` so the final UI can display per-stage timing.
 *
 * These events are serialized to Server-Sent-Events (or an equivalent streaming
 * format) by lib/stream/sse.ts and consumed by the client as they arrive.
 */

import type { Report } from "@/lib/llm/schema";
import type { AgentName } from "@/lib/agents/types";

/** Progress of the multi-agent pipeline at a single point in time. */
export type StreamEvent =
  | {
      /** Fired the moment an agent stage begins executing. */
      type: "agent-start";
      agent: AgentName;
      timestamp: string;
    }
  | {
      /** Fired the moment an agent stage finishes successfully. */
      type: "agent-complete";
      agent: AgentName;
      /** Elapsed wall-clock time for this stage, in milliseconds. */
      durationMs: number;
      timestamp: string;
    }
  | {
      /** Fired when a stage fails, with a safe human-readable message. */
      type: "agent-error";
      agent?: AgentName;
      error: string;
      timestamp: string;
    }
  | {
      /**
       * Fired once, after the report agent completes, carrying the validated
       * final report.
       */
      type: "report";
      report: Report;
      timestamp: string;
    }
  | {
      /** Fired last to signal the stream is complete (success or failure). */
      type: "done";
      success: boolean;
      timestamp: string;
    };