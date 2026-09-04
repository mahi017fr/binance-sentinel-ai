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

export type AnalysisSource = "scanner" | null;

interface AnalysisDashboardProps {
  status: AnalysisStatus;
  workflow: WorkflowStage[];
  report: Report | null;
  error: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  onAnalyze: (query: string) => void;
  onCancel: () => void;
  analysisSource?: AnalysisSource;
  onBackToScanner?: () => void;
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

function AnalysisContext({
  source,
  query,
  status,
}: {
  source: AnalysisSource;
  query: string;
  status: AnalysisStatus;
}) {
  if (status === "idle" && !query) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
      <div className="flex flex-wrap items-center gap-3 text-xs">
        {source === "scanner" && (
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--safe)]" aria-hidden="true" />
            <span className="text-[var(--muted)]">Source:</span>
            <span className="font-medium text-zinc-200">Live Market Scan</span>
          </div>
        )}
        {source === null && query && (
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f0b90b]" aria-hidden="true" />
            <span className="text-[var(--muted)]">Source:</span>
            <span className="font-medium text-zinc-200">Manual Query</span>
          </div>
        )}
        {query && (
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--muted)]">Asset:</span>
            <span className="font-medium text-zinc-200">
              {query.replace(/^(Analyze|Analyze the risk of|Compare)\s+/i, "").split(" ")[0]}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--muted)]">Pipeline:</span>
          {status === "idle" && (
            <span className="font-medium text-[var(--muted)]">Ready</span>
          )}
          {status === "loading" && (
            <span className="font-medium text-[#f0b90b]">Running</span>
          )}
          {status === "done" && (
            <span className="font-medium text-[var(--safe)]">Complete</span>
          )}
          {status === "error" && (
            <span className="font-medium text-[var(--danger)]">Failed</span>
          )}
        </div>
      </div>
    </div>
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
  analysisSource,
  onBackToScanner,
}: AnalysisDashboardProps) {
  const loading = status === "loading";

  return (
    <div className="mx-auto max-w-6xl">
      {/* Page header */}
      <div className="mb-6">
        <div className="flex flex-wrap items-center gap-3">
          {onBackToScanner && (
            <button
              onClick={onBackToScanner}
              className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 text-xs font-medium text-[var(--muted)] transition hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b90b]"
            >
              <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M19 12H5" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Back to Scanner
            </button>
          )}
          {analysisSource === "scanner" && (
            <Badge tone="accent">Source: Live Market Scan</Badge>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-100">
          Analyze
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Ask a market question and watch the agent workflow run against real data.
        </p>
      </div>

      {/* Analysis context bar */}
      <AnalysisContext source={analysisSource ?? null} query={query} status={status} />

      {/* Query area */}
      <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
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
