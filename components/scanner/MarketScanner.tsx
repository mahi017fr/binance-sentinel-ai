"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { MarketScanResult } from "@/lib/scanner/types";
import type { SortConfig, SortKey } from "./ScannerTable";
import { UNIVERSE_LABEL, UNIVERSE_DESCRIPTION } from "@/lib/scanner/universe";
import { metricsTracker } from "@/lib/evaluation/metrics";
import { ScannerSummary } from "./ScannerSummary";
import { ScannerTable } from "./ScannerTable";
import { ScannerHighlights } from "./ScannerHighlights";
import { SignalOverview } from "./SignalOverview";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";

type ScanStatus = "idle" | "loading" | "done" | "error";
type AutoRefreshInterval = "off" | "30s" | "1m" | "5m";

const REFRESH_OPTIONS: { label: string; value: AutoRefreshInterval; ms: number }[] = [
  { label: "OFF", value: "off", ms: 0 },
  { label: "30s", value: "30s", ms: 30_000 },
  { label: "1m", value: "1m", ms: 60_000 },
  { label: "5m", value: "5m", ms: 300_000 },
];

function getSortValue(
  asset: MarketScanResult["assets"][number],
  key: SortKey
): number {
  if (!asset) return 0;
  switch (key) {
    case "symbol":
      return 0;
    case "price":
      return asset.price ?? 0;
    case "change24h":
      return asset.change24h ?? 0;
    case "volatility":
      return asset.volatility?.value ?? 0;
    case "momentum":
      return asset.momentum?.value ?? 0;
    case "risk":
      return asset.risk?.score ?? 0;
    case "activity":
      return asset.activity?.value ?? 0;
    default:
      return 0;
  }
}

function sortAssets(
  assets: MarketScanResult["assets"],
  sort: SortConfig
): MarketScanResult["assets"] {
  const sorted = [...assets].sort((a, b) => {
    if (sort.key === "symbol") {
      return sort.direction === "asc"
        ? a.symbol.localeCompare(b.symbol)
        : b.symbol.localeCompare(a.symbol);
    }
    const diff = getSortValue(a, sort.key) - getSortValue(b, sort.key);
    return sort.direction === "asc" ? diff : -diff;
  });
  return sorted;
}

interface MarketScannerProps {
  onAnalyzeAsset?: (symbol: string) => void;
}

export function MarketScanner({ onAnalyzeAsset }: MarketScannerProps) {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [result, setResult] = useState<MarketScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortConfig>({ key: "risk", direction: "desc" });
  const [autoRefresh, setAutoRefresh] = useState<AutoRefreshInterval>("off");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const handleScan = useCallback(async () => {
    setStatus("loading");
    setError(null);

    const startTime = performance.now();

    try {
      const res = await fetch("/api/market-scan");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error ?? `Scan failed with status ${res.status}`
        );
      }
      const data: MarketScanResult = await res.json();

      // Defensive: ensure required arrays exist
      if (!data || !Array.isArray(data.assets) || !Array.isArray(data.universe)) {
        throw new Error("Scan returned malformed data. Please try again.");
      }

      const latencyMs = performance.now() - startTime;

      const requestedCount = data.universe.length;
      const failureCount = data.failures?.length ?? 0;
      const successCount = requestedCount - failureCount;

      metricsTracker.recordScan(
        latencyMs,
        successCount,
        requestedCount,
        failureCount,
        data.scannedAt
      );

      // Defensive: ensure highlights exists with required arrays
      if (!data.highlights || typeof data.highlights !== "object") {
        data.highlights = {
          highVolatility: [],
          strongMomentum: [],
          elevatedRisk: [],
          highActivity: [],
          topMovers: [],
        };
      }

      setResult(data);
      setStatus("done");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Scan failed unexpectedly.";
      setError(message);
      setStatus("error");
    }
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Auto-refresh timer
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (autoRefresh !== "off" && status !== "loading") {
      const ms = REFRESH_OPTIONS.find((o) => o.value === autoRefresh)?.ms ?? 0;
      if (ms > 0) {
        timerRef.current = setInterval(() => {
          if (mountedRef.current) {
            handleScan().catch(() => {
              // Auto-refresh scan failed; error state is set inside handleScan.
            });
          }
        }, ms);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, status, handleScan]);

  const handleSort = useCallback((key: SortKey) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  }, []);

  // Filter and sort assets — defensive against malformed data
  const filteredAssets = result?.assets
    ? sortAssets(
        result.assets.filter((a) => {
          if (!a || typeof a.symbol !== "string") return false;
          return search.trim() === ""
            ? true
            : a.symbol.toLowerCase().includes(search.trim().toLowerCase());
        }),
        sort
      )
    : [];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
          Live Market Scanner
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Real-time intelligence across selected liquid markets
        </p>
      </div>

      {/* Controls bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_1px_3px_rgba(0,0,0,0.5)]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[var(--safe)]" aria-hidden="true" />
            <span className="text-xs font-medium text-zinc-200">
              LIVE DATA
            </span>
          </div>
          {result && (
            <span className="text-xs text-[var(--muted)]">
              Last scanned: {new Date(result.scannedAt).toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-refresh toggle */}
          <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]">
            {REFRESH_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAutoRefresh(opt.value)}
                className={`px-2.5 py-1.5 text-[11px] font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b90b] ${
                  autoRefresh === opt.value
                    ? "bg-[#f0b90b]/15 text-[#f0b90b]"
                    : "text-[var(--muted)] hover:text-zinc-200"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button onClick={handleScan} disabled={status === "loading"}>
            {status === "loading" ? (
              <>
                <Spinner className="h-4 w-4" label="Scanning" />
                Scanning...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                Scan Market
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Universe label */}
      <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
        <Badge tone="accent">{UNIVERSE_LABEL}</Badge>
        <span>{UNIVERSE_DESCRIPTION}</span>
      </div>

      {/* Loading state */}
      {status === "loading" && (
        <Card pad className="animate-fade-up">
          <div className="flex flex-col items-center justify-center py-8">
            <Spinner className="h-8 w-8 text-[#f0b90b]" label="Scanning markets" />
            <p className="mt-4 text-sm text-zinc-200">
              Scanning selected liquid markets...
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Fetching real-time data from Binance public API
            </p>
          </div>
        </Card>
      )}

      {/* Error state */}
      {status === "error" && error && (
        <Card pad className="border-[var(--danger)]/40 bg-[var(--danger)]/5 animate-fade-up">
          <div className="flex items-start gap-3">
            <Badge tone="danger">Error</Badge>
            <div>
              <h2 className="text-sm font-semibold text-[var(--danger)]">
                Market scan failed
              </h2>
              <p className="mt-1.5 text-sm leading-6 text-zinc-200">{error}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Results */}
      {status === "done" && result && (
        <div className="space-y-6 animate-fade-up">
          {/* Summary cards */}
          <ScannerSummary result={result} />

          {/* Signal overview */}
          {filteredAssets.length > 0 && (
            <SignalOverview assets={filteredAssets} />
          )}

          {/* Search and sort controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 sm:max-w-xs">
              <svg
                viewBox="0 0 24 24"
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by symbol..."
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder-[var(--muted)] transition focus:border-[#f0b90b]/40 focus:outline-none focus:ring-1 focus:ring-[#f0b90b]/40"
              />
            </div>
            {search.trim() !== "" && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="text-xs text-[var(--muted)] transition hover:text-zinc-200"
              >
                Clear
              </button>
            )}
            <span className="text-xs text-[var(--muted)]">
              {filteredAssets.length} of {result.assets.length} assets
            </span>
          </div>

          {/* Market table */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-200">
              Market Overview
            </h2>
            {onAnalyzeAsset && (
              <p className="mb-2 text-xs text-[var(--muted)]">
                Click any row or &quot;Analyze&quot; button to run deep analysis on that
                asset.
              </p>
            )}
            <ScannerTable
              assets={filteredAssets}
              onAnalyzeAsset={onAnalyzeAsset}
              sort={sort}
              onSort={handleSort}
            />
          </div>

          {/* Intelligence highlights */}
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-200">
              Intelligence Highlights
            </h2>
            <ScannerHighlights highlights={result.highlights} />
          </div>

          {/* Failures */}
          {result.failures && result.failures.length > 0 && (
            <Card pad className="border-[var(--warning)]/30 bg-[var(--warning)]/5">
              <h3 className="text-sm font-semibold text-[var(--warning)]">
                Partial scan results
              </h3>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {result.failures.length} symbol(s) could not be scanned and are
                excluded from the results.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.failures.map((f) => (
                  <span
                    key={f.symbol}
                    className="text-xs text-[var(--muted)]"
                  >
                    <span className="font-medium text-zinc-300">{f.symbol}</span>
                    : {f.error}
                  </span>
                ))}
              </div>
            </Card>
          )}

          {/* Disclaimer */}
          <p className="text-xs leading-5 text-[var(--muted)]">
            Research and decision-support only. All classifications are derived
            from transparent deterministic formulas using real public market
            data. Not financial advice. No trading functionality is provided.
          </p>
        </div>
      )}

      {/* Idle state */}
      {status === "idle" && !result && (
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
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.3-4.3" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-100">
              Scan the market universe
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
              Click{" "}
              <span className="font-medium text-zinc-300">Scan Market</span> to
              fetch real-time data across the{" "}
              <span className="font-medium text-zinc-300">
                {UNIVERSE_LABEL}
              </span>
              . The scanner classifies each asset by volatility, momentum, risk,
              and activity using transparent deterministic formulas.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {["Volatility", "Momentum", "Risk", "Activity"].map((cap) => (
                <span
                  key={cap}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 text-xs text-[var(--muted)]"
                >
                  {cap}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
