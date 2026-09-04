"use client";

import type { MarketScanAsset } from "@/lib/scanner/types";
import { formatPrice } from "@/components/analysis/format";

interface SignalOverviewProps {
  assets: MarketScanAsset[];
}

interface SignalItemProps {
  label: string;
  value: string;
  symbol: string;
  accentClass: string;
  icon: React.ReactNode;
}

function SignalItem({
  label,
  value,
  symbol,
  accentClass,
  icon,
}: SignalItemProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-2">
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${accentClass}`}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
            {label}
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-semibold tabular-nums text-zinc-100">
              {symbol}
            </span>
            <span className="text-[10px] tabular-nums text-[var(--muted)]">
              {value}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function findTopGainer(assets: MarketScanAsset[]): MarketScanAsset | null {
  if (assets.length === 0) return null;
  return assets.reduce((best, a) =>
    a.change24h > best.change24h ? a : best
  );
}

function findTopLoser(assets: MarketScanAsset[]): MarketScanAsset | null {
  if (assets.length === 0) return null;
  return assets.reduce((worst, a) =>
    a.change24h < worst.change24h ? a : worst
  );
}

function findHighestVolatility(assets: MarketScanAsset[]): MarketScanAsset | null {
  if (assets.length === 0) return null;
  return assets.reduce((highest, a) =>
    a.volatility.value > highest.volatility.value ? a : highest
  );
}

function findHighestRisk(assets: MarketScanAsset[]): MarketScanAsset | null {
  if (assets.length === 0) return null;
  return assets.reduce((highest, a) =>
    a.risk.score > highest.risk.score ? a : highest
  );
}

function findMostActive(assets: MarketScanAsset[]): MarketScanAsset | null {
  if (assets.length === 0) return null;
  return assets.reduce((most, a) =>
    a.activity.value > most.activity.value ? a : most
  );
}

function formatPct(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

export function SignalOverview({ assets }: SignalOverviewProps) {
  const gainer = findTopGainer(assets);
  const loser = findTopLoser(assets);
  const highVol = findHighestVolatility(assets);
  const highRisk = findHighestRisk(assets);
  const mostActive = findMostActive(assets);

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-zinc-200">
        Market Signals
      </h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {gainer && (
          <SignalItem
            label="Top Gainer"
            symbol={gainer.symbol}
            value={`${formatPct(gainer.change24h)} · $${formatPrice(gainer.price)}`}
            accentClass="border border-[var(--safe)]/30 bg-[var(--safe)]/10"
            icon={
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[var(--safe)]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            }
          />
        )}
        {loser && (
          <SignalItem
            label="Top Loser"
            symbol={loser.symbol}
            value={`${formatPct(loser.change24h)} · $${formatPrice(loser.price)}`}
            accentClass="border border-[var(--danger)]/30 bg-[var(--danger)]/10"
            icon={
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[var(--danger)]" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                <polyline points="17 18 23 18 23 12" />
              </svg>
            }
          />
        )}
        {highVol && (
          <SignalItem
            label="Highest Volatility"
            symbol={highVol.symbol}
            value={`${highVol.volatility.value.toFixed(1)}% · ${highVol.volatility.band}`}
            accentClass="border border-[var(--warning)]/30 bg-[var(--warning)]/10"
            icon={
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[var(--warning)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            }
          />
        )}
        {highRisk && (
          <SignalItem
            label="Highest Risk"
            symbol={highRisk.symbol}
            value={`${highRisk.risk.score} · ${highRisk.risk.band}`}
            accentClass="border border-[var(--danger)]/30 bg-[var(--danger)]/10"
            icon={
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[var(--danger)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            }
          />
        )}
        {mostActive && (
          <SignalItem
            label="Most Active"
            symbol={mostActive.symbol}
            value={`${mostActive.activity.level}`}
            accentClass="border border-[var(--info)]/30 bg-[var(--info)]/10"
            icon={
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[var(--info)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
              </svg>
            }
          />
        )}
      </div>
    </div>
  );
}
