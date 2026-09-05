"use client";

import type {
  AnalysisStatus,
  WorkflowStage,
  WorkflowStatus,
} from "@/hooks/useAnalysisStream";

type NodeStatus = "idle" | "running" | "completed" | "error";

const AGENT_CAPTION: Record<string, string> = {
  intent: "Parses assets & intent",
  market: "Live market metrics",
  risk: "Explainable risk & readiness",
  research: "Neutral, uncertainty-aware thesis",
  report: "Structured intelligence report",
};

interface NodeDef {
  id: string;
  num: string;
  label: string;
  caption: string;
}

const NODES: NodeDef[] = [
  { id: "query", num: "00", label: "User Query", caption: "Natural-language request" },
  { id: "intent", num: "01", label: "Intent Agent", caption: AGENT_CAPTION.intent },
  { id: "market", num: "02", label: "Market Agent", caption: AGENT_CAPTION.market },
  { id: "risk", num: "03", label: "Risk Agent", caption: AGENT_CAPTION.risk },
  { id: "research", num: "04", label: "Research Agent", caption: AGENT_CAPTION.research },
  { id: "report", num: "05", label: "Report Agent", caption: AGENT_CAPTION.report },
  { id: "final", num: "06", label: "Final Intelligence", caption: "Delivered decision support" },
];

function formatDuration(ms?: number): string {
  if (ms === undefined) return "Done";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function mapStageStatus(s: WorkflowStatus | undefined): NodeStatus {
  switch (s) {
    case "running":
      return "running";
    case "completed":
      return "completed";
    case "failed":
      return "error";
    default:
      return "idle";
  }
}

function Chip({ status, num }: { status: NodeStatus; num: string }) {
  const base =
    "relative flex h-11 w-11 items-center justify-center rounded-xl border text-xs font-semibold tabular-nums transition-colors duration-300";
  if (status === "running") {
    return (
      <span
        className={`${base} border-[#f0b90b]/60 bg-[#f0b90b]/10 text-[#f0b90b] sentinel-scan shadow-[0_0_22px_rgba(240,185,11,0.35)]`}
      >
        <span className="absolute inset-0 rounded-xl border border-[#f0b90b]/40 animate-ping" aria-hidden="true" />
        {num}
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className={`${base} border-[var(--safe)]/40 bg-[var(--safe)]/10 text-[var(--safe)]`}>
        <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className={`${base} border-[var(--danger)]/50 bg-[var(--danger)]/10 text-[var(--danger)]`}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </span>
    );
  }
  return (
    <span className={`${base} border-[var(--border)] bg-[var(--surface-raised)]/60 text-[var(--muted)]`}>
      {num}
    </span>
  );
}

function StatusLine({ status, ms }: { status: NodeStatus; ms?: number }) {
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f0b90b]/40 bg-[#f0b90b]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#f0b90b]">
        <span className="h-1 w-1 rounded-full bg-[#f0b90b] sentinel-status-dot" aria-hidden="true" />
        Running
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="rounded-full border border-[var(--safe)]/40 bg-[var(--safe)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--safe)]">
        {ms !== undefined ? `${formatDuration(ms)}` : "Done"}
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="rounded-full border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--danger)]">
        Failed
      </span>
    );
  }
  return (
    <span className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)]/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
      Idle
    </span>
  );
}

interface AgentPipelineProps {
  workflow: WorkflowStage[];
  status: AnalysisStatus;
  query: string;
  hasReport: boolean;
}

export function AgentPipeline({ workflow, status, query, hasReport }: AgentPipelineProps) {
  const stageOf = new Map(
    workflow.map((s) => [s.agent, s] as [string, WorkflowStage])
  );

  const nodeStatus = (id: string): { status: NodeStatus; ms?: number } => {
    if (id === "query") return { status: status === "idle" ? "idle" : "completed" };
    if (id === "final") return { status: hasReport ? "completed" : "idle" };
    const stage = stageOf.get(id);
    return { status: mapStageStatus(stage?.status), ms: stage?.durationMs };
  };

  const resolved = NODES.map((n) => ({ ...n, ...nodeStatus(n.id) }));

  const anyRunning = resolved.some((n) => n.status === "running");
  const anyError = resolved.some((n) => n.status === "error");
  const allDone = resolved.every(
    (n) => n.id === "query" || n.id === "final" || n.status === "completed"
  );

  const totalMs = workflow
    .filter((s) => s.status === "completed" && s.durationMs !== undefined)
    .reduce((sum, s) => sum + (s.durationMs as number), 0);

  const statusCopy = anyError
    ? "Pipeline stopped"
    : allDone
      ? "Pipeline complete"
      : anyRunning
        ? "Agents in progress"
        : status === "error"
          ? "Pipeline failed"
          : "Awaiting query";

  const connectorClass = (next: NodeStatus) =>
    next === "running"
      ? "sentinel-connector--flow"
      : next !== "idle"
        ? "sentinel-connector--done"
        : "";

  const connectorClassV = (next: NodeStatus) =>
    next === "running"
      ? "sentinel-connector-v--flow"
      : next !== "idle"
        ? "sentinel-connector-v--done"
        : "";

  return (
    <section
      id="runtime"
      className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20"
      aria-label="Sentinel agent runtime"
    >
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="max-w-2xl">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f0b90b]">
            <span className="h-px w-6 bg-[#f0b90b]/50" aria-hidden="true" />
            Agent runtime
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
            Five agents. One answer streamed live.
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Every status below comes from the real SSE workflow — nothing is
            simulated.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {allDone && totalMs > 0 && (
            <span className="rounded-full border border-[var(--safe)]/40 bg-[var(--safe)]/10 px-3 py-1 text-[11px] font-medium tabular-nums text-[var(--safe)]">
              Total · {formatDuration(totalMs)}
            </span>
          )}
          <span
            className="rounded-full border border-[var(--border)] bg-[var(--glass)] px-3 py-1 text-[11px] font-medium text-[var(--muted)]"
            aria-live="polite"
          >
            {statusCopy}
          </span>
        </div>
      </div>

      {query && status !== "idle" && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-[var(--border)]/70 bg-[var(--glass)] px-4 py-2.5 text-xs text-[var(--muted)]">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 text-[#f0b90b]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M4 6h16M4 12h10M4 18h16" />
          </svg>
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
            Request
          </span>
          <span className="truncate text-zinc-200">&ldquo;{query}&rdquo;</span>
        </div>
      )}

      {/* Horizontal pipeline — xl and up */}
      <div className="hidden xl:block">
        <ol className="flex items-start" aria-label="Agent pipeline — horizontal">
          {resolved.map((node, i) => (
            <li key={node.id} className="flex min-w-0 flex-1 flex-col items-center">
              <div className="relative flex w-full items-center">
                {i > 0 && (
                  <div
                    className={`sentinel-connector ${connectorClass(resolved[i - 1].status)}`}
                    aria-hidden="true"
                  />
                )}
                <div className="shrink-0">
                  <Chip status={node.status} num={node.num} />
                </div>
                {i < resolved.length - 1 && (
                  <div
                    className={`sentinel-connector ${connectorClass(resolved[i + 1].status)}`}
                    style={
                      resolved[i + 1].status === "error"
                        ? { background: "rgba(239,68,68,0.55)" }
                        : undefined
                    }
                    aria-hidden="true"
                  />
                )}
              </div>
              <div className="mt-3 text-center">
                <div className="flex flex-col items-center">
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-[0.14em] ${
                      node.status === "idle" ? "text-[var(--muted)]" : "text-zinc-100"
                    }`}
                  >
                    {node.label}
                  </span>
                  <span className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
                    {node.caption}
                  </span>
                </div>
                <div className="mt-2.5">
                  <StatusLine status={node.status} ms={node.ms} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>

      {/* Vertical pipeline — below xl */}
      <ol
        className="space-y-0 xl:hidden"
        aria-label="Agent pipeline — vertical"
      >
        {resolved.map((node, i) => (
          <li key={node.id} className="flex flex-col">
            {i > 0 && (
              <div
                className={`sentinel-connector-v ml-[21px] ${connectorClassV(resolved[i - 1].status)}`}
                style={
                  resolved[i - 1].status === "error"
                    ? { background: "rgba(239,68,68,0.55)" }
                    : undefined
                }
                aria-hidden="true"
              />
            )}
            <div
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${
                node.status === "running"
                  ? "border-[#f0b90b]/40 bg-[#f0b90b]/5"
                  : node.status === "error"
                    ? "border-[var(--danger)]/40 bg-[var(--danger)]/5"
                    : "border-[var(--border)]/70 bg-[var(--glass)]"
              }`}
            >
              <div className="shrink-0">
                <Chip status={node.status} num={node.num} />
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-sm font-semibold tracking-tight ${
                    node.status === "idle" ? "text-[var(--muted)]" : "text-zinc-100"
                  }`}
                >
                  {node.label}
                </div>
                <div className="text-[11px] leading-4 text-[var(--muted)]">
                  {node.caption}
                </div>
              </div>
              <StatusLine status={node.status} ms={node.ms} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}