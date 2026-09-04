"use client";

import type { ReportAsset } from "@/lib/llm/schema";

type Factor = {
  key: string;
  name: string;
  signal: number;
  weight: number;
  contribution: number;
  explanation: string;
};

function FactorList({ factors, accent }: { factors: Factor[]; accent: string }) {
  if (factors.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No factors available.</p>;
  }
  return (
    <ul className="space-y-4">
      {factors.map((f) => {
        const pct = Math.round(f.signal * 100);
        const weightPct = Math.round((f.weight ?? 0) * 100);
        return (
          <li key={f.key ?? f.name}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium text-zinc-100">{f.name}</span>
              <span className="tabular-nums text-zinc-200">{pct}%</span>
            </div>
            <div
              className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={f.name}
            >
              <div
                className={`h-full rounded-full ${accent}`}
                style={{ width: `${Math.max(2, pct)}%` }}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-[var(--muted)]">
              <span>Weight {weightPct}%</span>
              {f.contribution !== undefined && (
                <span>
                  Contribution {(f.contribution * 100).toFixed(1)} pts
                </span>
              )}
            </div>
            {f.explanation && (
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                {f.explanation}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Renders the deterministic risk & readiness factors with weight, contribution and explanation. */
export function RiskBreakdown({ asset }: { asset: ReportAsset }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[#f0b90b]">Risk factors</h3>
        <FactorList factors={asset.marketData.riskFactors as Factor[]} accent="bg-[#f0b90b]" />
      </div>
      <div>
        <h3 className="mb-3 text-sm font-semibold text-[#38bdf8]">
          Readiness factors
        </h3>
        <FactorList
          factors={asset.marketData.readinessFactors as Factor[]}
          accent="bg-[#38bdf8]"
        />
      </div>
    </div>
  );
}
