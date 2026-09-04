"use client";

/**
 * useAnalysisStream — client hook for the real-time agent workflow.
 *
 * POSTs a query to /api/analysis, reads the `text/event-stream` response body
 * incrementally, parses SSE frames as they arrive, and exposes:
 *   - `workflow`: per-agent lifecycle state (pending/running/completed/failed)
 *   - `report`:   the validated final report (once the `report` event arrives)
 *   - `error`:    a safe, human-readable error message
 *   - `status`:   "idle" | "loading" | "done" | "error"
 *
 * The hook never sends or exposes any API key — it only talks to the app's own
 * `/api/analysis` endpoint. Duplicate submissions are prevented while a run is
 * active, and a run can be cancelled (the fetch is aborted).
 */

import { useCallback, useRef, useState } from "react";
import type { Report } from "@/lib/llm/schema";

export type WorkflowStatus = "pending" | "running" | "completed" | "failed";

export interface WorkflowStage {
  agent: string;
  status: WorkflowStatus;
  durationMs?: number;
  error?: string;
}

export type AnalysisStatus = "idle" | "loading" | "done" | "error";

const STAGES = ["intent", "market", "risk", "research", "report"] as const;

function initialWorkflow(): WorkflowStage[] {
  return STAGES.map((agent) => ({ agent, status: "pending" }));
}

/** Incrementally split an SSE text buffer into complete frames (blank-line delimited). */
function splitFrames(buffer: string, incoming: string): { frames: string[]; rest: string } {
  const all = buffer + incoming;
  const frames: string[] = [];
  let idx = 0;
  while (idx < all.length) {
    const end = all.indexOf("\n\n", idx);
    if (end === -1) break;
    frames.push(all.slice(idx, end));
    idx = end + 2;
  }
  return { frames, rest: all.slice(idx) };
}

/** Parse a single SSE frame into { event, data }. */
function parseFrame(frame: string): { event: string; data: string } {
  let event = "message";
  let data = "";
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data = line.slice(5).trim();
  }
  return { event, data };
}

export interface UseAnalysisStream {
  status: AnalysisStatus;
  workflow: WorkflowStage[];
  report: Report | null;
  error: string | null;
  analyze: (query: string) => void;
  cancel: () => void;
  reset: () => void;
}

export function useAnalysisStream(): UseAnalysisStream {
  const [workflow, setWorkflow] = useState<WorkflowStage[]>(initialWorkflow);
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<AnalysisStatus>("idle");

  const abortRef = useRef<AbortController | null>(null);
  const runningRef = useRef(false);

  const applyEvent = useCallback((event: string, data: string) => {
    switch (event) {
      case "agent-start": {
        const payload = JSON.parse(data) as { agent: string };
        setWorkflow((prev) =>
          prev.map((s) =>
            s.agent === payload.agent ? { agent: s.agent, status: "running" } : s
          )
        );
        break;
      }
      case "agent-complete": {
        const payload = JSON.parse(data) as {
          agent: string;
          durationMs: number;
        };
        setWorkflow((prev) =>
          prev.map((s) =>
            s.agent === payload.agent
              ? {
                  agent: s.agent,
                  status: "completed",
                  durationMs: payload.durationMs,
                }
              : s
          )
        );
        break;
      }
      case "agent-error": {
        const payload = JSON.parse(data) as { agent?: string; error: string };
        setWorkflow((prev) =>
          prev.map((s) =>
            s.agent === payload.agent
              ? { agent: s.agent, status: "failed", error: payload.error }
              : s
          )
        );
        break;
      }
      case "report": {
        const payload = JSON.parse(data) as { report: Report };
        setReport(payload.report);
        break;
      }
      case "done": {
        const payload = JSON.parse(data) as { success: boolean };
        setStatus(payload.success ? "done" : "error");
        break;
      }
      default:
        break;
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    runningRef.current = false;
    setStatus("idle");
    // Leave workflow/report intact for inspection; error cleared.
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    runningRef.current = false;
    setWorkflow(initialWorkflow());
    setReport(null);
    setError(null);
    setStatus("idle");
  }, []);

  const analyze = useCallback(
    (query: string) => {
      if (runningRef.current) return; // prevent duplicate submissions

      runningRef.current = true;
      const controller = new AbortController();
      abortRef.current = controller;

      setWorkflow(initialWorkflow());
      setReport(null);
      setError(null);
      setStatus("loading");

      (async () => {
        try {
          const res = await fetch("/api/analysis", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ query }),
            signal: controller.signal,
          });

          if (!res.ok || !res.body) {
            const body = await res.text();
            let message = `Request failed (${res.status}).`;
            try {
              const parsed = JSON.parse(body);
              if (parsed?.error) message = parsed.error;
            } catch {
              /* non-JSON body */
            }
            setError(message);
            setStatus("error");
            return;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (!controller.signal.aborted) {
            const { value, done } = await reader.read();
            if (done) break;
            const parsed = splitFrames(buffer, decoder.decode(value, { stream: true }));
            buffer = parsed.rest;
            for (const frame of parsed.frames) {
              const { event, data } = parseFrame(frame);
              if (data) {
                try {
                  applyEvent(event, data);
                } catch {
                  // Ignore a malformed frame rather than fail the whole stream.
                }
              }
            }
          }
        } catch (err) {
          if (controller.signal.aborted) {
            setStatus("idle");
            return;
          }
          setError(err instanceof Error ? err.message : String(err));
          setStatus("error");
        } finally {
          runningRef.current = false;
          abortRef.current = null;
        }
      })();
    },
    [applyEvent]
  );

  return { status, workflow, report, error, analyze, cancel, reset };
}
