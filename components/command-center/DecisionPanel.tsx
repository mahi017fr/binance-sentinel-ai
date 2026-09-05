"use client";

import type { Report, ReportAsset } from "@/lib/llm/schema";
import { ComparisonView } from "@/components/analysis/ComparisonView";
import { PredictionCard } from "@/components/prediction/PredictionCard";
import { formatPct, formatPrice } from "@/components/analysis/format";
import { SectionHeading } from "./SectionHeading";

function bandTone(band: string): string {
  const b = band.toLowerCase();
  if (b.includes("high") || b.includes("extreme")) {
    return "text-[var(--danger)] border-[var(--danger)]/40 bg-[var(--danger)]/10";
  }
  if (b.includes("moderate") || b.includes("medium")) {
    return "text-[var(--warning)] border-[var(--warning)]/40 bg-[var(--warning)]/10";
  }
  return "text-[var(--safe)] border-[var(--safe)]/40 bg-[var(--safe)]/10";
}

function scoreBarColor(score: number): string {
  if (score >= 66) return "bg-[var(--danger)]";
  if (score >= 40) return "bg-[var(--warning)]";
  return "bg-[var(--safe)]";
}

function assetRiskLabel(asset: ReportAsset): string {
  return `${asset.riskBand} · ${asset.risk.toFixed(1)}`;
}

function assetReadinessLabel(asset: ReportAsset): string {
  return `${asset.readinessBand} · ${asset.readiness.toFixed(1)}`;
}

function DecisionRow({ asset }: { asset: ReportAsset }) {
  const m = asset.marketData;
  const changePositive = m.change24hPercent > 0;
  const changeClass = changePositive
    ? "text-[var(--safe)]"
    : m.change24hPercent < 0
      ? "text-[var(--danger)]"
      : "text-[var(--muted)]";

  return (
    <tr className="border-b border-[var(--border)]/50 last:border-b-0">
      <td className="px-3 py-3">
        <span className="text-sm font-semibold text-zinc-100">{asset.symbol}</span>
      </td>
      <td className="px-3 py-3">
        <div className="text-sm font-medium tabular-nums text-zinc-100">
          ${formatPrice(m.price)}
        </div>
        <div className={`text-xs font-medium tabular-nums ${changeClass}`}>
          {formatPct(m.change24hPercent)}
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${bandTone(asset.riskBand)}`}>
            {assetRiskLabel(asset)}
          </span>
        </div>
        <div className="mt-1.5 h-1 w-24 overflow-hidden rounded-full bg-[var(--surface-raised)]">
          <div
            className={`h-full rounded-full ${scoreBarColor(asset.risk)}`}
            style={{ width: `${Math.min(100, Math.max(0, asset.risk))}%` }}
          />
        </div>
      </td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${bandTone(asset.readinessBand)}`}>
            {assetReadinessLabel(asset)}
          </span>
        </div>
      </td>
      <td className="hidden px-3 py-3 md:table-cell">
        <span className="text-xs text-[var(--muted)]">{m.activity}</span>
      </td>
      <td className="hidden px-3 py-3 sm:table-cell">
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted)]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              m.fallbackUsed ? "bg-[var(--info)]" : "bg-[var(--safe)]"
            }`}
            aria-hidden="true"
          />
          {m.sourceLabel ?? "—"}
        </span>
      </td>
    </tr>
  );
}

interface DecisionPanelProps {
  report: Report | null;
}

export function DecisionPanel({ report }: DecisionPanelProps) {
  return (
    <section
      id="decision"
      className="mx-auto max-w-[1280px] scroll-mt-20 px-4 py-16 sm:px-6 lg:px-10 lg:py-20"
      aria-label="Sentinel decision"
    >
      <SectionHeading
        kicker="Verdict"
        title="Sentinel Decision"
        description="The structured intelligence the five-agent runtime delivered for your request — measured risk, readiness and evidence-backed interpretation."
      >
        {report && (
          <span className="rounded-full border border-[var(--safe)]/40 bg-[var(--safe)]/10 px-3 py-1 text-[11px] font-medium text-[var(--safe)]">
            Delivered · {new Date(report.generatedAt).toLocaleTimeString()}
          </span>
        )}
      </SectionHeading>

      {!report ? (
        <div className="flex flex-col items-center rounded-2xl border border-[var(--border)]/70 bg-[var(--glass)] px-6 py-14 text-center">
          <svg viewBox="0 0 24 24" className="mb-4 h-8 w-8 text-[var(--muted)]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="4" y="3" width="16" height="18" rx="2" />
            <path d="M8 8h8M8 12h8M8 16h5" />
          </svg>
          <h3 className="text-base font-semibold text-zinc-100">
            No intelligence yet
          </h3>
          <p className="mt-2 max-w-md text-sm leading-6 text-[var(--muted)]">
            Ask Sentinel a market question in the hero above. The runtime will
            stream each agent&rsquo;s progress and this panel will reveal the
            final decision.
          </p>
        </div>
      ) : (
        <div
          key={report.generatedAt}
          id="analysis-result"
          className="sentinel-burst scroll-mt-28 rounded-2xl border border-[var(--border)]/70 bg-[var(--glass)] p-1.5 backdrop-blur-xl"
        >
          <div className="rounded-[14px] bg-[var(--surface)]/70 p-5 sm:p-6">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--border)]/60 pb-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f0b90b]">
                  Request
                </div>
                <div className="mt-1 text-sm font-medium text-zinc-100">
                  &ldquo;{report.query}&rdquo;
                </div>
              </div>
              <div className="text-xs text-[var(--muted)]">
                {new Date(report.generatedAt).toLocaleString()}
              </div>
            </div>

            <p className="mb-6 max-w-3xl text-sm leading-7 text-zinc-200">
              {report.overallSummary}
            </p>

            <div className="mb-8">
              <PredictionCard assets={report.assets} />
            </div>

            {report.assets.length > 1 && (
              <div className="mb-6">
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
                  Decision matrix
                </div>
                <div className="overflow-x-auto rounded-xl border border-[var(--border)]/60">
                  <table className="w-full min-w-[560px] text-sm">
                    <thead>
                      <tr className="border-b border-[var(--border)] bg-[var(--surface-raised)]/70 text-[11px] uppercase tracking-wider text-[var(--muted)]">
                        <th className="px-3 py-2.5 text-left font-semibold">Asset</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Price / 24h</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Risk</th>
                        <th className="px-3 py-2.5 text-left font-semibold">Readiness</th>
                        <th className="hidden px-3 py-2.5 text-left font-semibold md:table-cell">Activity</th>
                        <th className="hidden px-3 py-2.5 text-left font-semibold sm:table-cell">Source</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.assets.map((asset) => (
                        <DecisionRow key={asset.symbol} asset={asset} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <ComparisonView assets={report.assets} />

            <p className="mt-6 text-xs leading-5 text-[var(--muted)]">
              {report.disclaimer}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}