"use client";

import type {
  AnalysisStatus,
  WorkflowStage,
} from "@/hooks/useAnalysisStream";
import type { Report } from "@/lib/llm/schema";
import { QueryInput } from "./QueryInput";
import { ExampleQueries } from "./ExampleQueries";
import { WorkflowVisualizer } from "./WorkflowVisualizer";
import { ComparisonView } from "./ComparisonView";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

interface AnalysisDashboardProps {
  status: AnalysisStatus;
  workflow: WorkflowStage[];
  report: Report | null;
  error: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  onAnalyze: (query: string) => void;
  onCancel: () => void;
}

function EmptyState({ onRun }: { onRun: (q: string) => void }) {
  const capabilities = [
    "Analyze market risk",
    "Explain volatility",
    "Evaluate market conditions",
    "Compare multiple assets",
  ];
  return (
    <Card pad className="animate-fade-up">
      <div className="mx-auto max-w-xl text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#f0b90b]/30 bg-gradient-to-b from-[#f0b90b]/20 to-[#f0b90b]/5">
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6 text-[#f0b90b]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 17l5-5 4 4 6-7" />
            <path d="M16 9h4v4" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
          Multi-step market intelligence agent
        </h2>
        <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
          Binance Sentinel AI runs a live agent workflow that fetches real market
          data, measures trend, volatility, drawdown and activity, then produces
          an explainable risk &amp; readiness profile — streamed to you in real
          time.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {capabilities.map((c) => (
            <span
              key={c}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--muted)]"
            >
              {c}
            </span>
          ))}
        </div>
        <div className="mt-5">
          <button
            onClick={() => onRun("Analyze BTC risk")}
            className="rounded-full border border-[#f0b90b]/40 bg-[#f0b90b]/10 px-3 py-1.5 text-xs font-medium text-[#f0b90b] transition hover:bg-[#f0b90b]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b90b]"
          >
            Try: &quot;Analyze BTC risk&quot;
          </button>
        </div>
      </div>
    </Card>
  );
}

export function AnalysisDashboard({
  status,
  workflow,
  report,
  error,
  query,
  onQueryChange,
  onAnalyze,
  onCancel,
}: AnalysisDashboardProps) {
  const loading = status === "loading";

  return (
    <div className="mx-auto max-w-6xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Analyze
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Ask a market question and watch the agent workflow run against real data.
        </p>
      </div>

      {/* Query area */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
        <QueryInput
          value={query}
          onChange={onQueryChange}
          onSubmit={() => onAnalyze(query.trim())}
          onCancel={onCancel}
          loading={loading}
        />
        <div className="mt-4">
          <ExampleQueries
            onSelect={(q) => {
              onQueryChange(q);
              onAnalyze(q);
            }}
            disabled={loading}
          />
        </div>
      </div>

      <div className="mt-8">
        {/* Empty state */}
        {status === "idle" && !report && (
          <EmptyState
            onRun={(q) => {
              onQueryChange(q);
              onAnalyze(q);
            }}
          />
        )}

        {/* Loading / done / error: show live workflow */}
        {(status === "loading" || status === "done" || status === "error") && (
          <div className="space-y-6">
            <WorkflowVisualizer workflow={workflow} />

            {status === "error" && error && (
              <Card pad className="border-[var(--danger)]/40 bg-[var(--danger)]/5 animate-fade-up">
                <div className="flex items-start gap-3">
                  <Badge tone="danger">Error</Badge>
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--danger)]">
                      Analysis could not complete
                    </h2>
                    <p className="mt-1.5 text-sm leading-6 text-zinc-200">
                      {error}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {status === "done" && report && (
              <div className="space-y-5 animate-fade-up">
                {/* Report header */}
                <div className="rounded-2xl border border-[var(--border)] bg-gradient-to-b from-[var(--surface-raised)]/60 to-[var(--surface)] p-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#f0b90b]">
                      Final Intelligence Report
                    </span>
                    <div className="text-xs text-[var(--muted)]">
                      {new Date(report.generatedAt).toLocaleString()}
                    </div>
                  </div>
                  <div className="mt-1 text-sm text-[var(--muted)]">
                    For:{" "}
                    <span className="font-medium text-zinc-100">{report.query}</span>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-zinc-200">
                    {report.overallSummary}
                  </p>
                </div>

                <ComparisonView assets={report.assets} />

                <p className="text-xs leading-5 text-[var(--muted)]">
                  {report.disclaimer}
                </p>
              </div>
            )}

            {status === "done" && !report && (
              <Card pad>
                <p className="text-sm text-[var(--muted)]">
                  The workflow completed, but no report payload was received.
                </p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
