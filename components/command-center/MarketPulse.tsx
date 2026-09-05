"use client";

import { useEffect, useRef, useState } from "react";
import type { UseMarketScan } from "@/hooks/useMarketScan";
import type { MarketScanAsset } from "@/lib/scanner/types";
import { SCANNER_UNIVERSE } from "@/lib/scanner/universe";
import { stripQuoteSuffix } from "@/lib/scanner/symbol";
import { formatPrice, formatPct } from "@/components/analysis/format";
import { Button } from "@/components/ui/Button";

/** Flash the price color on change against the previous scan. */
function FlashPrice({ value }: { value: number }) {
  const prev = useRef(value);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (prev.current !== value) {
      setFlash(value > prev.current ? "up" : "down");
      prev.current = value;
      const t = window.setTimeout(() => setFlash(null), 1000);
      return () => window.clearTimeout(t);
    }
  }, [value]);

  return (
    <span
      className={`text-sm font-semibold tabular-nums text-zinc-100 ${
        flash === "up"
          ? "sentinel-tick-up"
          : flash === "down"
            ? "sentinel-tick-down"
            : ""
      }`}
    >
      ${formatPrice(value)}
    </span>
  );
}

function RangeMarker({ asset }: { asset: MarketScanAsset }) {
  const { price, low24h, high24h } = asset;
  const pct =
    high24h > low24h
      ? Math.min(1, Math.max(0, (price - low24h) / (high24h - low24h)))
      : 0.5;

  return (
    <div
      className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]"
      role="img"
      aria-label={`24h range position ${Math.round(pct * 100)}%`}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[var(--danger)]/40 via-[var(--warning)]/35 to-[var(--safe)]/50"
        style={{ width: `${pct * 100}%` }}
      />
      <span
        className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-zinc-200 shadow-[0_0_6px_rgba(240,185,11,0.8)]"
        style={{ left: `${pct * 100}%` }}
        aria-hidden="true"
      />
    </div>
  );
}

function PulseItem({ asset }: { asset: MarketScanAsset }) {
  const positive = asset.change24h > 0;
  const changeColor = positive
    ? "text-[var(--safe)]"
    : asset.change24h < 0
      ? "text-[var(--danger)]"
      : "text-[var(--muted)]";

  return (
    <div className="group min-w-[158px] flex-1 rounded-xl border border-[var(--border)]/80 bg-[var(--glass)] px-4 py-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.4)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:border-[#f0b90b]/30 hover:bg-[var(--surface-raised)]/70 sm:min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold tracking-wide text-zinc-100">
          {stripQuoteSuffix(asset.symbol)}
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-[#f0b90b]/70 sentinel-live-orb" aria-hidden="true" />
      </div>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <FlashPrice value={asset.price} />
        <span className={`text-xs font-medium tabular-nums ${changeColor}`}>
          {formatPct(asset.change24h)}
        </span>
      </div>
      <RangeMarker asset={asset} />
      <div className="mt-1 text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
        24h range
      </div>
    </div>
  );
}

interface MarketPulseProps {
  scan: UseMarketScan;
}

export function MarketPulse({ scan }: MarketPulseProps) {
  const { status, result, error, scan: runScan } = scan;
  const provider = result?.source;

  return (
    <section id="pulse" className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 lg:px-10 lg:py-20" aria-label="Live market pulse">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f0b90b]">
            <span className="h-px w-6 bg-[#f0b90b]/50" aria-hidden="true" />
            Live feed
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
            Market Pulse
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {provider && (
            <div className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--glass)] px-3 py-1.5 text-[11px] text-[var(--muted)]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  provider.fallbackUsed ? "bg-[var(--info)]" : "bg-[var(--safe)]"
                } sentinel-live-orb`}
                aria-hidden="true"
              />
              <span className="font-medium text-zinc-200">{provider.providerLabel}</span>
              {provider.fallbackUsed && (
                <span className="text-[var(--info)]">· fallback active</span>
              )}
              <span className="hidden sm:inline">
                · fetched {new Date(provider.fetchedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
          <Button variant="secondary" onClick={() => runScan()} disabled={status === "loading"} className="px-3 py-1.5 text-xs">
            {status === "loading" ? "Scanning…" : "Refresh"}
          </Button>
        </div>
      </div>

      {status === "error" && error && (
        <div className="mb-4 rounded-xl border border-[var(--danger)]/40 bg-[var(--danger)]/5 px-4 py-3 text-sm text-[var(--danger)]">
          Live feed unavailable: {error}
        </div>
      )}

      {status === "idle" || (!result && status === "loading") ? (
        <div
          className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible xl:grid-cols-5"
          aria-hidden="true"
        >
          {SCANNER_UNIVERSE.map((sym) => (
            <div
              key={sym}
              className="h-[104px] min-w-[158px] flex-1 animate-pulse rounded-xl border border-[var(--border)]/60 bg-[var(--surface-raised)]/60 sm:min-w-0"
            />
          ))}
        </div>
      ) : (
        <div className="flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-3 sm:overflow-visible xl:grid-cols-5">
          {result?.assets.map((asset) => (
            <PulseItem key={asset.symbol} asset={asset} />
          ))}
        </div>
      )}

      <p className="mt-4 text-[11px] text-[var(--muted)]">
        Ten selected liquid USDT markets pulled through the provider chain.
        Numbers are real scan payloads — never fabricated or cached across
        sessions.
      </p>
    </section>
  );
}