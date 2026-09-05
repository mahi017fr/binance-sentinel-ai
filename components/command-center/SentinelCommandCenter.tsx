"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAnalysisStream } from "@/hooks/useAnalysisStream";
import { useMarketScan } from "@/hooks/useMarketScan";
import { buildAnalysisQuery } from "@/lib/scanner/symbol";
import { metricsTracker } from "@/lib/evaluation/metrics";
import { TopNav } from "./TopNav";
import { Hero } from "./Hero";
import { MarketPulse } from "./MarketPulse";
import { AgentPipeline } from "./AgentPipeline";
import { ScannerSection } from "./ScannerSection";
import { DecisionPanel } from "./DecisionPanel";
import { DataTrustSection } from "./DataTrustSection";
import { ArchitectureSection } from "./ArchitectureSection";
import { Reveal } from "./Reveal";
import { Footer } from "./Footer";

function scrollToSection(id: string) {
  const reduce =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.setTimeout(() => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  }, 120);
}

export function SentinelCommandCenter() {
  const [query, setQuery] = useState("");
  const [showMobileAsk, setShowMobileAsk] = useState(false);
  const stream = useAnalysisStream();
  const scan = useMarketScan();
  const runScan = scan.scan;

  const analysisStartTime = useRef<number | null>(null);
  const autoScanStarted = useRef(false);

  // Auto-run one initial scan so the pulse + scanner are live on load.
  useEffect(() => {
    if (autoScanStarted.current) return;
    autoScanStarted.current = true;
    runScan().catch(() => {
      /* error state handled inside the hook */
    });
  }, [runScan]);

  // Track analysis completion for evaluation metrics.
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

  // Auto-scroll to the freshly delivered analysis result. Fires only on the
  // status transition into "done" WITH a valid report, so it never runs on
  // mount, navigation, per-SSE stage, or a failed analysis.
  const scrollStatus = useRef(stream.status);
  useEffect(() => {
    const wasDone = scrollStatus.current === "done";
    const nowDone = stream.status === "done";
    scrollStatus.current = stream.status;
    if (!wasDone && nowDone && stream.report) {
      scrollToSection("analysis-result");
    }
  }, [stream.status, stream.report]);

  const startAnalysis = useCallback(
    (q: string) => {
      analysisStartTime.current = performance.now();
      metricsTracker.recordAnalysisStart();
      stream.analyze(q);
      scrollToSection("runtime");
    },
    [stream]
  );

  const handleManualAnalyze = useCallback(
    (q: string) => {
      setQuery(q);
      startAnalysis(q);
    },
    [startAnalysis]
  );

  const handleAnalyzeAsset = useCallback(
    (symbol: string) => {
      const q = buildAnalysisQuery(symbol);
      setQuery(q);
      startAnalysis(q);
    },
    [startAnalysis]
  );

  // Compact mobile "Ask Sentinel" bar once the hero is scrolled past.
  useEffect(() => {
    const onScroll = () => {
      const hero = document.getElementById("overview");
      if (!hero) return;
      const rect = hero.getBoundingClientRect();
      setShowMobileAsk(rect.bottom < 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const source = scan.result?.source ?? null;

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav
        analysisStatus={stream.status}
        sourceLabel={source ? source.providerLabel : null}
        sourceId={source ? source.provider : null}
      />

      <main className="flex-1">
        <Hero
          query={query}
          onQueryChange={setQuery}
          onAnalyze={handleManualAnalyze}
          onCancel={stream.cancel}
          loading={stream.status === "loading"}
          scan={scan}
        />

        <Reveal>
          <MarketPulse scan={scan} />
        </Reveal>

        <div className="border-t border-[var(--border)]/40" aria-hidden="true" />

        <Reveal>
          <AgentPipeline
            workflow={stream.workflow}
            status={stream.status}
            query={query}
            hasReport={stream.report !== null}
          />
        </Reveal>

        <div className="border-t border-[var(--border)]/40" aria-hidden="true" />

        <Reveal>
          <ScannerSection scan={scan} onAnalyzeAsset={handleAnalyzeAsset} />
        </Reveal>

        <div className="border-t border-[var(--border)]/40" aria-hidden="true" />

        <Reveal>
          <DecisionPanel report={stream.report} />
        </Reveal>

        <div className="border-t border-[var(--border)]/40" aria-hidden="true" />

        <Reveal>
          <DataTrustSection source={source} />
        </Reveal>

        <div className="border-t border-[var(--border)]/40" aria-hidden="true" />

        <Reveal>
          <ArchitectureSection />
        </Reveal>
      </main>

      <Footer />

      {/* Compact mobile ask bar */}
      {showMobileAsk && (
        <button
          type="button"
          onClick={() => scrollToSection("ask")}
          className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2 md:hidden"
          aria-label="Ask Sentinel a question"
        >
          <span className="flex items-center gap-2 rounded-full border border-[#f0b90b]/40 bg-[#050505]/95 px-4 py-2.5 text-xs font-semibold text-[#f0b90b] shadow-[0_10px_30px_rgba(0,0,0,0.6)] backdrop-blur-xl">
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.3-4.3" />
            </svg>
            Ask Sentinel
          </span>
        </button>
      )}
    </div>
  );
}