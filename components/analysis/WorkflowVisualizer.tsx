"use client";

import type { WorkflowStage, WorkflowStatus } from "@/hooks/useAnalysisStream";

const STAGE_LABELS: Record<string, string> = {
  intent: "Intent Agent",
  market: "Market Agent",
  risk: "Risk Agent",
  research: "Research Agent",
  report: "Report Agent",
};

const STAGE_DESC: Record<string, string> = {
  intent: "Parses the query and identifies assets & intent",
  market: "Fetches live deterministic market metrics",
  risk: "Interprets scores into drivers & observations",
  research: "Composes a neutral, uncertainty-aware thesis",
  report: "Assembles the final structured report",
};

function StatusBadge({ status, durationMs }: { status: WorkflowStatus; durationMs?: number }) {
  const base =
    "ml-auto flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium";
  if (status === "running") {
    return (
      <span className={`${base} border-[#f0b90b]/40 bg-[#f0b90b]/10 text-[#f0b90b]`}>
        <span className="h-1.5 w-1.5 rounded-full bg-[#f0b90b] sentinel-status-dot" aria-hidden="true" />
        Analyzing…
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className={`${base} border-[var(--safe)]/40 bg-[var(--safe)]/10 text-[var(--safe)]`}>
        {durationMs !== undefined && (
          <span className="tabular-nums">{formatDuration(durationMs)}</span>
        )}
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className={`${base} border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--danger)]`}>
        Failed
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </span>
    );
  }
  return <span className={`${base} border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)]`}>Queued</span>;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function NodeDot({ status }: { status: WorkflowStatus }) {
  if (status === "running") {
    return (
      <span className="relative flex h-3.5 w-3.5 items-center justify-center">
        <span className="absolute h-3.5 w-3.5 rounded-full bg-[#f0b90b]/30 animate-ping" aria-hidden="true" />
        <span className="h-2 w-2 rounded-full bg-[#f0b90b]" aria-hidden="true" />
      </span>
    );
  }
  if (status === "completed") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--safe)]/40 bg-[var(--safe)]/10">
        <svg viewBox="0 0 24 24" className="h-3 w-3 text-[var(--safe)]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" />
        </svg>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--danger)]/40 bg-[var(--danger)]/10">
        <svg viewBox="0 0 24 24" className="h-3 w-3 text-[var(--danger)]" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </span>
    );
  }
  return <span className="h-2 w-2 rounded-full bg-[var(--muted)]/40" aria-hidden="true" />;
}

function TimelineConnector({ active }: { active: boolean }) {
  return (
    <div className="ml-[1.35rem] w-px self-stretch" aria-hidden="true">
      <div
        className={`h-full w-full transition-colors duration-500 ${
          active ? "bg-[#f0b90b]/40" : "bg-[var(--border)]"
        }`}
      />
    </div>
  );
}

/**
 * Vertical pipeline timeline. Renders the User Query entry, each agent stage
 * with live status, and the Final Intelligence Report entry. Driven entirely by
 * the real workflow stages from the streamed API.
 */
export function WorkflowVisualizer({ workflow }: { workflow: WorkflowStage[] }) {
  const anyRunning = workflow.some((s) => s.status === "running");
  const anyFailed = workflow.some((s) => s.status === "failed");
  const allCompleted = workflow.every((s) => s.status === "completed");

  // Calculate total pipeline duration from completed stages
  const completedDurations = workflow
    .filter((s) => s.status === "completed" && s.durationMs !== undefined)
    .map((s) => s.durationMs!);
  const totalMs =
    completedDurations.length > 0
      ? completedDurations.reduce((sum, d) => sum + d, 0)
      : null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
          Live Agent Workflow
        </h2>
        <div className="flex items-center gap-3">
          {totalMs !== null && allCompleted && (
            <span className="rounded-full border border-[var(--safe)]/40 bg-[var(--safe)]/10 px-2.5 py-1 text-[11px] font-medium tabular-nums text-[var(--safe)]">
              Total: {formatDuration(totalMs)}
            </span>
          )}
          <span className="text-xs text-[var(--muted)]" aria-live="polite">
            {anyFailed
              ? "Pipeline stopped"
              : allCompleted
                ? "Pipeline complete"
                : anyRunning
                  ? "Agents in progress"
                  : "Awaiting query"}
          </span>
        </div>
      </div>

      <ol className="space-y-0" aria-label="Agent workflow stages">
        {/* Query entry */}
        <li className="flex items-center gap-3">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-[#f0b90b]/40 bg-[#f0b90b]/10">
            <svg viewBox="0 0 24 24" className="h-3 w-3 text-[#f0b90b]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h10M4 18h16" />
            </svg>
          </span>
          <span className="text-sm font-medium text-zinc-100">User Query</span>
          <span className="ml-auto text-xs text-[var(--muted)]">Input</span>
        </li>

        {workflow.map((stage, i) => (
          <li key={stage.agent} className="flex flex-col">
            <TimelineConnector active={stage.status !== "pending"} />
            <div
              className={`relative flex items-start gap-3 rounded-xl border px-4 py-3 transition ${
                stage.status === "running"
                  ? "sentinel-scan border-[#f0b90b]/40"
                  : stage.status === "failed"
                    ? "border-[var(--danger)]/40 bg-[var(--danger)]/5"
                    : stage.status === "completed"
                      ? "border-[var(--border)] bg-[var(--surface-raised)]/60"
                      : "border-[var(--border)] bg-[var(--surface)] opacity-60"
              }`}
            >
              <span className="mt-0.5">
                <NodeDot status={stage.status} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-sm font-medium ${
                      stage.status === "completed" ? "text-zinc-100" : "text-zinc-100"
                    }`}
                  >
                    {STAGE_LABELS[stage.agent] ?? stage.agent}
                  </span>
                  <span className="hidden text-[11px] text-[var(--muted)] sm:inline">
                    {STAGE_DESC[stage.agent]}
                  </span>
                </div>
                {stage.status === "failed" && stage.error && (
                  <p className="mt-1 text-xs leading-5 text-[var(--danger)]">
                    {stage.error}
                  </p>
                )}
              </div>
              <span className="mt-0.5">
                <StatusBadge status={stage.status} durationMs={stage.durationMs} />
              </span>
            </div>
            {i === workflow.length - 1 && (
              <TimelineConnector active={allCompleted} />
            )}
          </li>
        ))}

        {/* Final report entry */}
        <li className="flex items-center gap-3">
          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
              allCompleted
                ? "border-[var(--safe)]/50 bg-[var(--safe)]/15 text-[var(--safe)]"
                : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)]"
            }`}
          >
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2l2.5 4.5 5 1-3.5 3.8.8 5-4.8-2.5-4.8 2.5.8-5L4.5 7.5l5-1z" />
            </svg>
          </span>
          <span className="text-sm font-medium text-zinc-100">
            Final Intelligence Report
          </span>
          <span className="ml-auto text-xs text-[var(--muted)]">
            {allCompleted ? "Delivered" : "Pending"}
          </span>
        </li>
      </ol>
    </div>
  );
}
