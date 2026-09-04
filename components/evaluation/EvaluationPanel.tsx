"use client";

import { useSyncExternalStore } from "react";
import { metricsTracker } from "@/lib/evaluation/metrics";

function MetricRow({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2 border-b border-[var(--border)]/50 last:border-b-0">
      <span className="text-xs text-[var(--muted)]">{label}</span>
      <div className="text-right">
        <span className="text-sm font-medium tabular-nums text-zinc-100">
          {value}
        </span>
        {detail && (
          <span className="ml-2 text-[10px] text-[var(--muted)]">{detail}</span>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="pt-3 pb-1 first:pt-0">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[#f0b90b]">
        {label}
      </span>
    </div>
  );
}

function FreshnessBadge({ freshness }: { freshness: string }) {
  const tone =
    freshness === "Fresh"
      ? "text-[var(--safe)]"
      : freshness === "Recent"
        ? "text-[#f0b90b]"
        : "text-[var(--muted)]";

  return <span className={`text-xs font-medium ${tone}`}>{freshness}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const tone =
    status === "Complete"
      ? "text-[var(--safe)]"
      : status === "Failed"
        ? "text-[var(--danger)]"
        : status === "Partial"
          ? "text-[#f0b90b]"
          : "text-[var(--muted)]";

  return <span className={`text-xs font-medium ${tone}`}>{status}</span>;
}

function formatLatency(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

export function EvaluationPanel() {
  const metrics = useSyncExternalStore(
    (cb) => metricsTracker.subscribe(cb),
    () => metricsTracker.getMetrics()
  );

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
      <div className="mb-3 flex items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-[#f0b90b]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-200">
          Session Metrics
        </h3>
      </div>

      <div className="space-y-0">
        <MetricRow
          label="Data Source"
          value={metrics.dataSourceLabel}
          detail={metrics.dataSourceActive ? "(Live)" : "(Offline)"}
        />

        {/* Scanner section */}
        <SectionHeader label="Scanner" />
        <MetricRow
          label="Last Scan Latency"
          value={formatLatency(metrics.scanLatencyMs)}
          detail={
            metrics.totalScans > 1
              ? `avg ${formatLatency(metrics.avgScanLatencyMs)}`
              : undefined
          }
        />
        <MetricRow
          label="Last Scan Success"
          value={
            metrics.scanRequestedCount > 0
              ? `${metrics.scanSuccessRate.toFixed(1)}%`
              : "—"
          }
          detail={
            metrics.scanRequestedCount > 0
              ? `${metrics.scanSuccessCount}/${metrics.scanRequestedCount}`
              : undefined
          }
        />
        <MetricRow
          label="Last Failure Rate"
          value={
            metrics.scanRequestedCount > 0
              ? `${metrics.scanFailureRate.toFixed(1)}%`
              : "—"
          }
          detail={
            metrics.scanFailureCount > 0
              ? `${metrics.scanFailureCount} failed`
              : undefined
          }
        />
        {metrics.totalScans > 0 && (
          <MetricRow
            label="Total Scans"
            value={`${metrics.totalScans}`}
            detail={
              metrics.totalScans > 1
                ? `avg success ${metrics.cumulativeScanSuccessRate.toFixed(1)}%`
                : undefined
            }
          />
        )}

        {/* Analysis section */}
        <SectionHeader label="Analysis" />
        <MetricRow
          label="Last Analysis Latency"
          value={formatLatency(metrics.analysisLatencyMs)}
          detail={
            metrics.totalAnalyses > 1
              ? `avg ${formatLatency(metrics.avgAnalysisLatencyMs)}`
              : undefined
          }
        />
        <MetricRow
          label="Pipeline Status"
          value=""
          detail=""
        />
        <div className="flex items-center justify-between gap-4 py-2 border-b border-[var(--border)]/50">
          <span className="text-xs text-[var(--muted)]">Pipeline Status</span>
          <StatusBadge status={metrics.pipelineStatus} />
        </div>
        {metrics.totalAnalyses > 0 && (
          <MetricRow
            label="Total Analyses"
            value={`${metrics.totalAnalyses}`}
            detail={`success rate ${metrics.cumulativeAnalysisSuccessRate.toFixed(0)}%`}
          />
        )}

        {/* Data freshness */}
        <div className="flex items-center justify-between gap-4 py-2">
          <span className="text-xs text-[var(--muted)]">Data Freshness</span>
          <FreshnessBadge freshness={metrics.dataFreshness} />
        </div>
      </div>

      <p className="mt-3 text-[10px] leading-4 text-[var(--muted)]">
        Metrics reflect observed runtime behavior and data availability. They
        are not measures of trading performance or investment returns.
      </p>
    </div>
  );
}
