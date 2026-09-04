"use client";

import type { ReportAsset } from "@/lib/llm/schema";
import { MarketSummary } from "./MarketSummary";
import { ScoreCard } from "./ScoreCard";
import { RiskBreakdown } from "./RiskBreakdown";
import { IntelligencePanel } from "./IntelligencePanel";

interface ComparisonViewProps {
  assets: ReportAsset[];
}

/**
 * Renders one full analysis panel per asset. For multiple assets the panels sit
 * side-by-side on wide screens and stack on narrow screens. No asset is claimed
 * to be "better" than another — each panel only presents its own measured profile.
 */
export function ComparisonView({ assets }: ComparisonViewProps) {
  const multi = assets.length > 1;
  return (
    <div>
      {multi && (
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-[var(--muted)]">
          Asset comparison · {assets.length} symbols
        </h2>
      )}
      <div className={multi ? "grid gap-6 xl:grid-cols-2" : "grid gap-6"}>
        {assets.map((asset) => (
          <section
            key={asset.symbol}
            className={`space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.4)] animate-fade-up ${
              multi ? "xl:max-w-none" : ""
            }`}
          >
            <MarketSummary asset={asset} />
            <div className="grid gap-4 sm:grid-cols-2">
              <ScoreCard
                label="Risk Score"
                score={asset.risk}
                band={asset.riskBand}
                tone="risk"
              />
              <ScoreCard
                label="Trade Readiness"
                score={asset.readiness}
                band={asset.readinessBand}
                tone="readiness"
              />
            </div>
            <RiskBreakdown asset={asset} />
            <IntelligencePanel asset={asset} />
          </section>
        ))}
      </div>
    </div>
  );
}
