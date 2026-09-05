"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formatPrice, formatPct } from "@/components/analysis/format";
import { stripQuoteSuffix } from "@/lib/scanner/symbol";
import { SCANNER_UNIVERSE } from "@/lib/scanner/universe";
import type { UseMarketScan } from "@/hooks/useMarketScan";
import type { MarketScanAsset } from "@/lib/scanner/types";
import { useKlines } from "@/hooks/useKlines";
import { Sparkline } from "./Sparkline";

const CAPABILITIES = [
  "LIVE DATA",
  "MULTI-AGENT ANALYSIS",
  "RISK & TREND INTELLIGENCE",
  "RESEARCH ONLY",
] as const;

const QUICK_ACTIONS = [
  "Analyze BTCUSDT",
  "Compare BTC, ETH, SOL",
  "Find the strongest setup",
  "Market risk analysis",
] as const;

const CAPABILITY_ICONS: Record<string, React.ReactNode> = {
  "LIVE DATA": (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  ),
  "MULTI-AGENT ANALYSIS": (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" />
    </svg>
  ),
  "RISK & TREND INTELLIGENCE": (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 17l5-5 4 4 6-7" />
      <path d="M16 9h4v4" />
    </svg>
  ),
  "RESEARCH ONLY": (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
};

interface HeroProps {
  query: string;
  onQueryChange: (value: string) => void;
  onAnalyze: (query: string) => void;
  onCancel: () => void;
  loading: boolean;
  scan: UseMarketScan;
}

/** Flash gold/green/red on price change. */
function HeroPrice({ value }: { value: number | null }) {
  const prev = useRef<number | null>(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (prev.current !== null && value !== null && prev.current !== value) {
      setFlash(value > prev.current ? "up" : "down");
      const t = window.setTimeout(() => setFlash(null), 1000);
      prev.current = value;
      return () => window.clearTimeout(t);
    }
    if (value !== null) prev.current = value;
  }, [value]);

  if (value === null) {
    return <span className="h-7 w-28 animate-pulse rounded bg-[var(--surface-raised)]" aria-hidden="true" />;
  }

  return (
    <span
      className={`text-2xl font-semibold tabular-nums text-zinc-50 sm:text-3xl ${
        flash === "up" ? "sentinel-tick-up" : flash === "down" ? "sentinel-tick-down" : ""
      }`}
    >
      ${formatPrice(value)}
    </span>
  );
}

function Panel({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`sentinel-float rounded-2xl border border-[var(--border)]/80 bg-[var(--glass)] p-3 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.9),0_0_40px_rgba(240,185,11,0.05)] backdrop-blur-xl ${className}`}
    >
      <div style={delay ? { animationDelay: `${delay}ms` } : undefined} className="sentinel-card-in">
        {children}
      </div>
    </div>
  );
}

function BtcLiveCard({ scan }: { scan: UseMarketScan }) {
  const asset = scan.result?.assets.find((a) => a.symbol === "BTCUSDT") ?? null;
  const { status, closes, sourceName, error } = useKlines("BTCUSDT", "5m", 48);
  const positive = (asset?.change24h ?? 0) > 0;
  const negative = (asset?.change24h ?? 0) < 0;

  return (
    <Panel>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#f7931a]/20 text-sm font-bold text-[#f7931a]">
            ₿
          </span>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-zinc-100">BTC / USDT</div>
            <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
              Spot · Binance
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-[var(--safe)]/30 bg-[var(--safe)]/10 px-2.5 py-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--safe)] sentinel-live-orb" aria-hidden="true" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--safe)]">Live</span>
        </div>
      </div>

      <div className="mt-3 flex items-baseline justify-between gap-3">
        <HeroPrice value={asset?.price ?? null} />
        <span
          className={`rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums ${
            positive
              ? "bg-[var(--safe)]/10 text-[var(--safe)]"
              : negative
                ? "bg-[var(--danger)]/10 text-[var(--danger)]"
                : "bg-[var(--surface-raised)] text-[var(--muted)]"
          }`}
        >
          {asset ? formatPct(asset.change24h) : "—"}
        </span>
      </div>

      <div className="mt-2.5">
        {closes.length >= 2 ? (
          <Sparkline
            values={closes}
            positive={positive}
            negative={negative}
            className="h-12 w-full"
            viewWidth={168}
            viewHeight={40}
          />
        ) : status === "error" ? (
          <div className="flex h-12 items-center justify-center rounded-lg border border-[var(--border)]/60 bg-[var(--surface-raised)]/50 text-[10px] text-[var(--muted)]">
            Sparkline unavailable{error ? ` · ${error}` : ""}
          </div>
        ) : (
          <div className="h-12 animate-pulse rounded-lg bg-[var(--surface-raised)]/60" aria-hidden="true" />
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-[var(--surface-raised)]/60 px-2.5 py-1.5">
          <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">24h High</div>
          <div className="mt-0.5 font-medium tabular-nums text-zinc-200">
            {asset ? `$${formatPrice(asset.high24h)}` : "—"}
          </div>
        </div>
        <div className="rounded-lg bg-[var(--surface-raised)]/60 px-2.5 py-1.5">
          <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">24h Low</div>
          <div className="mt-0.5 font-medium tabular-nums text-zinc-200">
            {asset ? `$${formatPrice(asset.low24h)}` : "—"}
          </div>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-[var(--surface-raised)]/60 px-2.5 py-1.5">
          <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">24h Volume</div>
          <div className="mt-0.5 font-medium tabular-nums text-zinc-200">
            {asset ? compactUsd(asset.volume24h) : "—"}
          </div>
        </div>
        <div className="rounded-lg bg-[var(--surface-raised)]/60 px-2.5 py-1.5">
          <div className="text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">24h Range</div>
          <div className="mt-0.5 font-medium tabular-nums text-zinc-200">
            {asset ? `${fmtInt(asset.price)}` : "—"}
          </div>
        </div>
      </div>

      {status === "done" && sourceName && (
        <div className="mt-2 text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
          Sparkline · {sourceName}
        </div>
      )}
    </Panel>
  );
}

function SentimentCard({ scan }: { scan: UseMarketScan }) {
  const assets = scan.result?.assets ?? [];
  const changes = assets.map((a) => a.change24h);
  const avg = changes.length
    ? changes.reduce((acc, v) => acc + v, 0) / changes.length
    : 0;
  const score = Math.max(0, Math.min(100, 50 + avg * 12));
  const filled = Math.round(score / 20);
  const label =
    score >= 62 ? "Positive" : score >= 42 ? "Neutral" : "Cautious";
  const bullish = assets.filter((a) => a.momentum.direction === "bullish").length;
  const bearish = assets.filter((a) => a.momentum.direction === "bearish").length;

  return (
    <Panel>
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        Market Sentiment
      </div>
      <div className="mt-2 flex items-center gap-1.5" aria-hidden="true">
        {Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={`h-2 w-6 rounded-[3px] ${
              i < filled
                ? "bg-[var(--safe)] shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                : "bg-[var(--surface-raised)]"
            }`}
          />
        ))}
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-xl font-semibold text-zinc-100">{label}</span>
        <span className="text-xs text-[var(--muted)]">
          {bullish} bullish · {bearish} bearish
        </span>
      </div>
      <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
        Derived from live 24h scan
      </div>
    </Panel>
  );
}

function moversPill(asset: MarketScanAsset, i: number) {
  const positive = asset.change24h > 0;
  return (
    <div key={asset.symbol} className="flex items-center justify-between gap-3 rounded-lg bg-[var(--surface-raised)]/60 px-2.5 py-1">
      <div className="flex items-center gap-2">
        <span className="w-4 text-[10px] font-semibold tabular-nums text-[var(--muted)]">{i + 1}</span>
        <span className="text-xs font-semibold text-zinc-200">{stripQuoteSuffix(asset.symbol)}</span>
      </div>
      <span
        className={`text-xs font-semibold tabular-nums ${
          positive ? "text-[var(--safe)]" : "text-[var(--danger)]"
        }`}
      >
        {formatPct(asset.change24h)}
      </span>
    </div>
  );
}

function TopMoversCard({ scan }: { scan: UseMarketScan }) {
  const top =
    scan.result?.assets
      .slice()
      .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
      .slice(0, 3) ?? [];

  return (
    <Panel>
      <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
        Top Movers · 24h
      </div>
      {top.length ? (
        <div className="mt-2 space-y-1.5">{top.map(moversPill)}</div>
      ) : (
        <div className="mt-2 h-14 animate-pulse rounded-lg bg-[var(--surface-raised)]/60" aria-hidden="true" />
      )}
    </Panel>
  );
}

/** Format a compact USD figure from the real 24h volume. */
function compactUsd(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function fmtInt(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

/** Card 4 — global tracked market volume derived from the live scan payload. */
function MarketVolumeCard({ scan }: { scan: UseMarketScan }) {
  const { status, result } = scan;
  const assets = result?.assets ?? [];
  const totalVol = assets.reduce((acc, a) => acc + a.volume24h, 0);
  const avgChange =
    assets.length > 0
      ? assets.reduce((acc, a) => acc + a.change24h, 0) / assets.length
      : null;

  if (status === "idle" || (status === "loading" && !result)) {
    return (
      <Panel>
        <div className="flex items-center justify-between">
          <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Market Volume
          </div>
          <span className="h-1.5 w-1.5 rounded-full bg-[#f0b90b] sentinel-live-orb" aria-hidden="true" />
        </div>
        <div className="mt-3 h-7 w-32 animate-pulse rounded bg-[var(--surface-raised)]/70" aria-hidden="true" />
        <div className="mt-2 h-3 w-40 animate-pulse rounded bg-[var(--surface-raised)]/50" aria-hidden="true" />
        <div className="mt-3 text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
          Awaiting live scan…
        </div>
      </Panel>
    );
  }

  if (status === "error" || assets.length === 0) {
    return (
      <Panel>
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
          Market Volume
        </div>
        <div className="mt-3 text-sm text-[var(--muted)]">
          Volume data unavailable
        </div>
        <div className="mt-2 text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
          Live feed did not resolve
        </div>
      </Panel>
    );
  }

  const positive = avgChange !== null && avgChange > 0;

  return (
    <Panel>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
          Market Volume
        </div>
        <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-[var(--muted)]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              result?.source.fallbackUsed ? "bg-[var(--info)]" : "bg-[var(--safe)]"
            } sentinel-live-orb`}
            aria-hidden="true"
          />
          LIVE
        </div>
      </div>
      <div className="mt-2 text-xl font-semibold tabular-nums text-zinc-50">
        {compactUsd(totalVol)}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        <span className={`font-semibold tabular-nums ${positive ? "text-[var(--safe)]" : "text-[var(--danger)]"}`}>
          {avgChange !== null ? formatPct(avgChange) : "—"}
        </span>
        <span className="text-[var(--muted)]">avg movement · {assets.length} markets</span>
      </div>
      <div className="mt-2 text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
        Derived from live 24h scan volume
      </div>
    </Panel>
  );
}

export function Hero({
  query,
  onQueryChange,
  onAnalyze,
  onCancel,
  loading,
  scan,
}: HeroProps) {
  return (
    <section
      id="overview"
      className="relative overflow-hidden"
      aria-labelledby="hero-heading"
    >
      {/* Cinematic reference background: full-bleed, centered, gold/black.
          It carries the character and visual identity. The layer starts below
          the fixed navbar (h-16) so the top of the character's head is never
          hidden behind it. */}
      <div className="absolute inset-0" aria-hidden="true">
        <div className="sentinel-hero-bg absolute inset-x-0 top-20 bottom-0" />
        {/* Subtle dark overlay only where text needs readability; the
            character near the center stays visible. Top is kept light so the
            character's head stays bright and fully visible below the navbar. */}
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.42)_0%,rgba(0,0,0,0.2)_4%,rgba(0,0,0,0.12)_12%,rgba(0,0,0,0.12)_42%,rgba(0,0,0,0.16)_55%,rgba(0,0,0,0.82)_88%,rgba(0,0,0,0.94)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.72)_0%,rgba(0,0,0,0.05)_45%,rgba(0,0,0,0.55)_100%)] lg:block" />
        <div className="sentinel-hero-vignette absolute inset-0" />
      </div>

      <div className="relative z-10 flex min-h-[100svh] w-full flex-col justify-between px-4 pb-8 pt-24 sm:px-6 sm:pt-28 lg:px-10 xl:px-12">
        {/* Main row: left copy pinned to the LEFT edge, market cards pinned to
            the RIGHT edge; the flexible center column keeps the character
            centered with clear breathing room on both sides. */}
        <div className="flex flex-1 items-start justify-between gap-6 lg:gap-8 xl:gap-12">
          {/* Left: branding / content — ~30% of the hero, anchored LEFT */}
          <div className="relative z-20 w-full max-w-[600px] lg:w-[28%] xl:w-[31%]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#f0b90b]/25 bg-[rgba(0,0,0,0.55)] px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#f0b90b] backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-[#f0b90b] sentinel-live-orb" aria-hidden="true" />
              Powered by Binance Agent OS
            </div>

            <h1
              id="hero-heading"
              className="mt-5 text-4xl font-semibold leading-[1.05] tracking-tight text-zinc-50 sm:text-5xl xl:text-6xl"
            >
              Smarter Market
              <br />
              Decisions with{" "}
              <span className="bg-gradient-to-r from-[#f0b90b] via-[#f6d76b] to-[#f0b90b] bg-clip-text text-transparent">
                AI Agents
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-300/90 sm:text-base">
              Live market data. Multi-agent analysis. Actionable research
              insights. All in one place.
            </p>

            <div className="mt-5 flex w-full flex-col gap-2 lg:items-start">
              {CAPABILITIES.map((cap, i) => (
                <div
                  key={cap}
                  style={{ animationDelay: `${0.2 + i * 0.12}s` }}
                  className="sentinel-card-in flex w-full items-center gap-2.5 rounded-lg border border-[var(--border)]/70 bg-[rgba(0,0,0,0.45)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-200 backdrop-blur-md lg:w-fit"
                >
                  <span className="text-[#f0b90b]">{CAPABILITY_ICONS[cap]}</span>
                  {cap}
                </div>
              ))}
            </div>
          </div>

          {/* Center: flexible breathing room so the character stays centered
              and never overlaps the left or right UI. */}
          <div className="hidden flex-1 lg:block" aria-hidden="true" />

          {/* Right: live market-data / stat cards — pinned to the RIGHT edge,
              ~24% of the hero; hidden below lg so the character/background
              stays the hero on small screens. */}
          <div className="hidden w-full max-w-[440px] lg:block lg:w-[26%] lg:min-w-[320px] xl:w-[24%]">
            <div className="grid w-full gap-3">
              <BtcLiveCard scan={scan} />
              <div className="grid grid-cols-2 gap-3">
                <Panel delay={120}>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
                    Markets Scanned
                  </div>
                  <div className="mt-2 text-xl font-semibold tabular-nums text-zinc-50">
                    {scan.result ? `${scan.result.assets.length}/${SCANNER_UNIVERSE.length}` : "—"}
                  </div>
                  <div className="mt-0.5 text-[11px] leading-snug text-[var(--muted)]">
                    USDT spot markets
                  </div>
                </Panel>
                <TopMoversCard scan={scan} />
                <MarketVolumeCard scan={scan} />
                <SentimentCard scan={scan} />
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: centered AI chat box + quick actions */}
        <div id="ask" className="relative z-20 mx-auto mt-6 w-full max-w-3xl scroll-mt-24">
          <div className="sentinel-search-glow pointer-events-none absolute -inset-3 rounded-3xl bg-[#f0b90b]/10 blur-2xl" aria-hidden="true" />
          <div className="relative rounded-2xl border border-[#f0b90b]/30 bg-[rgba(0,0,0,0.72)] p-3 shadow-[0_30px_90px_-30px_rgba(0,0,0,0.95),0_0_60px_rgba(240,185,11,0.15)] backdrop-blur-2xl">
            <form
              className="flex items-center gap-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                if (!loading && query.trim()) onAnalyze(query.trim());
              }}
            >
              <label htmlFor="sentinel-hero-query" className="sr-only">
                Ask Sentinel AI about BTC, ETH, SOL...
              </label>
              <div className="relative flex-1">
                <svg
                  viewBox="0 0 24 24"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--muted)]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="M21 21l-4.3-4.3" />
                </svg>
                <input
                  id="sentinel-hero-query"
                  value={query}
                  onChange={(e) => onQueryChange(e.target.value)}
                  placeholder="Ask Sentinel AI about BTC, ETH, SOL..."
                  disabled={loading}
                  aria-label="Ask Sentinel AI about BTC, ETH, SOL"
                  className="w-full rounded-xl border border-[var(--border)]/80 bg-[rgba(0,0,0,0.6)] py-4 pl-11 pr-4 text-base text-zinc-100 shadow-[0_1px_2px_rgba(0,0,0,0.4)] outline-none backdrop-blur-md transition placeholder:text-[var(--muted)] focus:border-[#f0b90b]/60 focus:ring-2 focus:ring-[#f0b90b]/25 disabled:opacity-60"
                />
              </div>
              {loading ? (
                <Button type="button" variant="secondary" onClick={onCancel} className="h-12 shrink-0 px-4 text-sm sm:w-auto">
                  <Spinner className="h-4 w-4" /> Cancel
                </Button>
              ) : (
                <button
                  type="submit"
                  aria-label="Run analysis"
                  disabled={!query.trim()}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f0b90b] text-black shadow-[0_0_24px_rgba(240,185,11,0.45)] transition hover:bg-[#f6d76b] hover:shadow-[0_0_32px_rgba(240,185,11,0.6)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6d76b] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </button>
              )}
            </form>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[var(--border)]/60 px-1 pt-3">
              <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--muted)]">
                Quick actions
              </span>
              <div className="flex flex-1 flex-wrap gap-2">
                {QUICK_ACTIONS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      onQueryChange(q);
                      onAnalyze(q);
                    }}
                    disabled={loading}
                    className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)]/70 px-3 py-1.5 text-[11px] text-zinc-300 shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition hover:-translate-y-px hover:border-[#f0b90b]/50 hover:text-[#f0b90b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b90b] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
