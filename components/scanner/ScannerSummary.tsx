"use client";

import type { MarketScanResult } from "@/lib/scanner/types";

interface ScannerSummaryProps {
  result: MarketScanResult;
}

interface SummaryCardProps {
  label: string;
  count: number;
  icon: React.ReactNode;
  accentClass: string;
}

function SummaryCard({ label, count, icon, accentClass }: SummaryCardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accentClass}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
            {label}
          </div>
          <div className="text-2xl font-semibold tabular-nums text-zinc-100">
            {count}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScannerSummary({ result }: ScannerSummaryProps) {
  const { highlights } = result;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <SummaryCard
        label="High Volatility"
        count={highlights.highVolatility.length}
        accentClass="border border-[var(--warning)]/30 bg-[var(--warning)]/10"
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--warning)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        }
      />
      <SummaryCard
        label="Strong Momentum"
        count={highlights.strongMomentum.length}
        accentClass="border border-[var(--info)]/30 bg-[var(--info)]/10"
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--info)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        }
      />
      <SummaryCard
        label="Elevated Risk"
        count={highlights.elevatedRisk.length}
        accentClass="border border-[var(--danger)]/30 bg-[var(--danger)]/10"
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--danger)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        }
      />
      <SummaryCard
        label="High Activity"
        count={highlights.highActivity.length}
        accentClass="border border-[var(--safe)]/30 bg-[var(--safe)]/10"
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--safe)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        }
      />
    </div>
  );
}
