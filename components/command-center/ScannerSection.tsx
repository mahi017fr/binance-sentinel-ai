"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UseMarketScan } from "@/hooks/useMarketScan";
import type { MarketScanResult } from "@/lib/scanner/types";
import {
  sortAssets,
  getSortValue,
  type SortConfig,
  type SortKey,
} from "@/lib/scanner/sort";
import { UNIVERSE_LABEL, UNIVERSE_DESCRIPTION } from "@/lib/scanner/universe";
import { ScannerSummary } from "@/components/scanner/ScannerSummary";
import { ScannerTable } from "@/components/scanner/ScannerTable";
import { ScannerHighlights } from "@/components/scanner/ScannerHighlights";
import { SignalOverview } from "@/components/scanner/SignalOverview";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { SectionHeading } from "./SectionHeading";

type AutoRefreshInterval = "off" | "30s" | "1m" | "5m";

const REFRESH_OPTIONS: { label: string; value: AutoRefreshInterval; ms: number }[] = [
  { label: "OFF", value: "off", ms: 0 },
  { label: "30s", value: "30s", ms: 30_000 },
  { label: "1m", value: "1m", ms: 60_000 },
  { label: "5m", value: "5m", ms: 300_000 },
];

interface ScannerSectionProps {
  scan: UseMarketScan;
  onAnalyzeAsset: (symbol: string) => void;
}

export function ScannerSection({ scan, onAnalyzeAsset }: ScannerSectionProps) {
  const { status, result, error, scan: runScan } = scan;
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortConfig>({ key: "risk", direction: "desc" });
  const [autoRefresh, setAutoRefresh] = useState<AutoRefreshInterval>("off");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (autoRefresh !== "off" && status !== "loading") {
      const ms = REFRESH_OPTIONS.find((o) => o.value === autoRefresh)?.ms ?? 0;
      if (ms > 0) {
        timerRef.current = setInterval(() => {
          runScan().catch(() => {
            /* error state handled inside the hook */
          });
        }, ms);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, status, runScan]);

  const handleSort = useCallback((key: SortKey) => {
    setSort((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
    }));
  }, []);

  const filteredAssets: MarketScanResult["assets"] = result
    ? sortAssets(
        result.assets.filter((a) =>
          search.trim() === ""
            ? true
            : a.symbol.toLowerCase().includes(search.trim().toLowerCase())
        ),
        sort
      )
    : [];

  const lastScan = result;
  const source = lastScan?.source;

  return (
    <section
      id="scanner"
      className="mx-auto max-w-[1280px] scroll-mt-20 px-4 py-16 sm:px-6 lg:px-10 lg:py-20"
      aria-label="Market intelligence scanner"
    >
      <SectionHeading
        kicker="Surveillance"
        title="Market Intelligence Scanner"
        description="Live classification across the curated USDT universe — volatility, momentum, risk and activity, derived from real public market data."
      >
        <div className="flex items-center gap-2">
          {source && (
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                source.fallbackUsed
                  ? "border-[var(--info)]/40 bg-[var(--info)]/10 text-[var(--info)]"
                  : "border-[var(--safe)]/40 bg-[var(--safe)]/10 text-[var(--safe)]"
              }`}
            >
              {source.fallbackUsed ? "Fallback active" : "Binance live"}
            </span>
          )}
          <Button variant="secondary" onClick={() => runScan()} disabled={status === "loading"} className="px-3 py-1.5 text-xs">
            {status === "loading" ? (
              <>
                <Spinner className="h-3.5 w-3.5" label="Scanning" /> Scanning
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                  <path d="M21 3v6h-6" />
                </svg>
                Scan Market
              </>
            )}
          </Button>
        </div>
      </SectionHeading>

      {status === "error" && error && (
        <div className="mb-6 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/5 px-4 py-3 text-sm text-[var(--danger)]">
          Scan failed: {error}
        </div>
      )}

      {status === "idle" || (!result && status === "loading") ? (
        <div className="space-y-4">
          <div className="h-24 animate-pulse rounded-xl border border-[var(--border)]/60 bg-[var(--surface-raised)]/60" />
          <div className="h-80 animate-pulse rounded-xl border border-[var(--border)]/60 bg-[var(--surface-raised)]/60" />
        </div>
      ) : lastScan ? (
        <div className="space-y-6">
          {lastScan.source && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-[var(--border)]/60 bg-[var(--glass)] px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    lastScan.source.fallbackUsed ? "bg-[var(--info)]" : "bg-[var(--safe)]"
                  } sentinel-live-orb`}
                  aria-hidden="true"
                />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                  Market Data Source
                </span>
              </div>
              <span className="text-sm font-medium text-zinc-100">
                {lastScan.source.providerLabel}
              </span>
              {lastScan.source.fallbackUsed ? (
                <span className="text-xs text-[var(--info)]">
                  Binance unavailable in this environment — using public fallback
                  provider.
                </span>
              ) : (
                <span className="text-xs text-[var(--muted)]">
                  Direct from the active provider chain. Scanned at{" "}
                  {new Date(lastScan.scannedAt).toLocaleTimeString()}.
                </span>
              )}
            </div>
          )}

          <ScannerSummary result={lastScan} />

          {filteredAssets.length > 0 && <SignalOverview assets={filteredAssets} />}

          <div className="flex flex-wrap items-center gap-3 border-y border-[var(--border)]/50 py-3">
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
                placeholder="Filter by symbol…"
                aria-label="Filter scanner by symbol"
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
              {filteredAssets.length} of {lastScan.assets.length} assets
            </span>

            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]">
                {REFRESH_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setAutoRefresh(opt.value)}
                    className={`px-2.5 py-1.5 text-[11px] font-medium uppercase transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b90b] ${
                      autoRefresh === opt.value
                        ? "bg-[#f0b90b]/15 text-[#f0b90b]"
                        : "text-[var(--muted)] hover:text-zinc-200"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
              <span>{UNIVERSE_LABEL}</span>
              <span className="text-[var(--muted)]/60">· {UNIVERSE_DESCRIPTION}</span>
            </div>
            <ScannerTable
              assets={filteredAssets}
              onAnalyzeAsset={onAnalyzeAsset}
              sort={sort}
              onSort={handleSort}
            />
          </div>

          <div>
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
              Intelligence Highlights
            </div>
            <ScannerHighlights highlights={lastScan.highlights} />
          </div>

          {lastScan.failures && lastScan.failures.length > 0 && (
            <div className="rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/5 px-4 py-3">
              <h3 className="text-sm font-semibold text-[var(--warning)]">
                Partial scan results
              </h3>
              <div className="mt-1 flex flex-wrap gap-2 text-xs text-[var(--muted)]">
                {lastScan.failures.map((f) => (
                  <span key={f.symbol}>
                    <span className="font-medium text-zinc-300">{f.symbol}</span>: {f.error}
                  </span>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs leading-5 text-[var(--muted)]">
            Research and decision-support only. All classifications derive from
            transparent deterministic formulas using real public market data. Not
            financial advice. No trading functionality is provided.
          </p>
        </div>
      ) : null}
    </section>
  );
}

// Re-exported so consumers can rely on the shared sort helpers.
export type { SortConfig, SortKey };
export { getSortValue };