"use client";

import type { ScannerHighlights } from "@/lib/scanner/types";

interface ScannerHighlightsProps {
  highlights: ScannerHighlights;
}

interface HighlightSectionProps {
  title: string;
  icon: React.ReactNode;
  symbols: string[];
  accentClass: string;
}

function HighlightSection({
  title,
  icon,
  symbols,
  accentClass,
}: HighlightSectionProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-200">
          {title}
        </h3>
        {symbols.length > 0 && (
          <span className="ml-auto rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] font-medium tabular-nums text-[var(--muted)]">
            {symbols.length}
          </span>
        )}
      </div>
      {symbols.length === 0 ? (
        <p className="text-xs leading-5 text-[var(--muted)]">
          No significant signals detected in the current scan.
        </p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {symbols.map((sym) => (
            <span
              key={sym}
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${accentClass}`}
            >
              {sym}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function ScannerHighlights({ highlights }: ScannerHighlightsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <HighlightSection
        title="High Volatility"
        symbols={highlights.highVolatility}
        accentClass="border-[var(--warning)]/30 bg-[var(--warning)]/5 text-[var(--warning)]"
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--warning)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        }
      />
      <HighlightSection
        title="Strong Momentum"
        symbols={highlights.strongMomentum}
        accentClass="border-[var(--info)]/30 bg-[var(--info)]/5 text-[var(--info)]"
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--info)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
            <polyline points="17 6 23 6 23 12" />
          </svg>
        }
      />
      <HighlightSection
        title="Elevated Risk"
        symbols={highlights.elevatedRisk}
        accentClass="border-[var(--danger)]/30 bg-[var(--danger)]/5 text-[var(--danger)]"
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--danger)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        }
      />
      <HighlightSection
        title="High Activity"
        symbols={highlights.highActivity}
        accentClass="border-[var(--safe)]/30 bg-[var(--safe)]/5 text-[var(--safe)]"
        icon={
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--safe)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        }
      />
    </div>
  );
}
