"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Header } from "./Header";
import { MobileNav, Sidebar, type ViewId } from "./Sidebar";
import { AnalysisDashboard } from "@/components/analysis/AnalysisDashboard";
import type { AnalysisSource } from "@/components/analysis/AnalysisDashboard";
import { DataSourceStatus } from "@/components/analysis/DataSourceStatus";
import { WorkflowVisualizer } from "@/components/analysis/WorkflowVisualizer";
import { MarketScanner } from "@/components/scanner/MarketScanner";
import { EvaluationPanel } from "@/components/evaluation/EvaluationPanel";
import { Card } from "@/components/ui/Card";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { useAnalysisStream } from "@/hooks/useAnalysisStream";
import { buildAnalysisQuery } from "@/lib/scanner/symbol";
import { metricsTracker } from "@/lib/evaluation/metrics";

function StepRow({
  title,
  desc,
  step,
}: {
  title: string;
  desc: string;
  step: number;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[#f0b90b]/30 bg-[#f0b90b]/10 text-xs font-semibold text-[#f0b90b]">
        {step}
      </span>
      <div>
        <div className="text-sm font-medium text-zinc-100">{title}</div>
        <div className="text-xs leading-5 text-[var(--muted)]">{desc}</div>
      </div>
    </div>
  );
}

function OverviewPanel() {
  const steps = [
    { title: "Intent Agent", desc: "Parses what you're asking and identifies assets & intent" },
    { title: "Market Agent", desc: "Fetches live deterministic market metrics" },
    { title: "Risk Agent", desc: "Interprets scores into explainable drivers & observations" },
    { title: "Research Agent", desc: "Composes a neutral, uncertainty-aware thesis" },
    { title: "Report Agent", desc: "Assembles the final structured intelligence report" },
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Agentic Market Intelligence
        </h1>
        <p className="mt-2 text-sm leading-7 text-[var(--muted)]">
          Binance Sentinel AI is an agentic market intelligence engine for
          explainable trade readiness. It runs a real multi-agent workflow that
          analyzes market data, trend strength, volatility, liquidity, and
          drawdown — then produces an explainable risk and readiness profile for
          each asset. Research and decision-support only.
        </p>
      </div>

      <Card pad className="animate-fade-up">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-200">
          How the agent pipeline works
        </h2>
        <div className="space-y-4">
          {steps.map((s, i) => (
            <StepRow key={s.title} step={i + 1} title={s.title} desc={s.desc} />
          ))}
        </div>
        <p className="mt-5 text-xs leading-5 text-[var(--muted)]">
          Open the{" "}
          <span className="text-zinc-300">Market Scanner</span> to scan
          multiple assets, or go to{" "}
          <span className="text-zinc-300">Analyze</span> to ask a question
          directly. Watch agents run live in the{" "}
          <span className="text-zinc-300">Workflow</span> tab.
        </p>
      </Card>
    </div>
  );
}

export function DashboardLayout() {
  const [active, setActive] = useState<ViewId>("analyze");
  const [query, setQuery] = useState("");
  const [analysisSource, setAnalysisSource] = useState<AnalysisSource>(null);
  const stream = useAnalysisStream();
  const analysisStartTime = useRef<number | null>(null);

  const handleAnalyzeAsset = useCallback(
    (symbol: string) => {
      const q = buildAnalysisQuery(symbol);
      setQuery(q);
      setAnalysisSource("scanner");
      setActive("analyze");
      setTimeout(() => {
        analysisStartTime.current = performance.now();
        metricsTracker.recordAnalysisStart();
        stream.analyze(q);
      }, 50);
    },
    [stream]
  );

  const handleBackToScanner = useCallback(() => {
    setAnalysisSource(null);
    setActive("scanner");
  }, []);

  const handleManualAnalyze = useCallback(
    (q: string) => {
      setAnalysisSource(null);
      analysisStartTime.current = performance.now();
      metricsTracker.recordAnalysisStart();
      stream.analyze(q);
    },
    [stream]
  );

  // Track analysis completion for evaluation metrics
  const prevStatus = useRef(stream.status);
  useEffect(() => {
    if (prevStatus.current !== stream.status) {
      if (stream.status === "done" && analysisStartTime.current !== null) {
        const latency = performance.now() - analysisStartTime.current;
        metricsTracker.recordAnalysisComplete(latency);
        analysisStartTime.current = null;
      }
      if (stream.status === "error" && analysisStartTime.current !== null) {
        metricsTracker.recordAnalysisError();
        analysisStartTime.current = null;
      }
      prevStatus.current = stream.status;
    }
  }, [stream.status]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header status={stream.status} />

      <div className="flex flex-1">
        <Sidebar active={active} onNavigate={setActive} />

        <main className="flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-10">
          {active === "overview" && (
            <ErrorBoundary viewName="Overview">
              <OverviewPanel />
            </ErrorBoundary>
          )}
          {active === "analyze" && (
            <ErrorBoundary viewName="Analyze">
              <AnalysisDashboard
                status={stream.status}
                workflow={stream.workflow}
                report={stream.report}
                error={stream.error}
                query={query}
                onQueryChange={setQuery}
                onAnalyze={handleManualAnalyze}
                onCancel={stream.cancel}
                analysisSource={analysisSource}
                onBackToScanner={analysisSource === "scanner" ? handleBackToScanner : undefined}
              />
            </ErrorBoundary>
          )}
          {active === "scanner" && (
            <ErrorBoundary viewName="Market Scanner">
              <div className="space-y-6">
                <MarketScanner onAnalyzeAsset={handleAnalyzeAsset} />
                <div className="mx-auto max-w-6xl grid gap-4 sm:grid-cols-2">
                  <EvaluationPanel />
                  <DataSourceStatus />
                </div>
              </div>
            </ErrorBoundary>
          )}
          {active === "workflow" && (
            <ErrorBoundary viewName="Workflow">
              <div className="mx-auto max-w-3xl space-y-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
                    Agent Workflow
                  </h1>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Watch the multi-agent pipeline progress in real time.
                  </p>
                </div>
                <WorkflowVisualizer workflow={stream.workflow} />
              </div>
            </ErrorBoundary>
          )}
        </main>
      </div>

      <MobileNav active={active} onNavigate={setActive} />
    </div>
  );
}
