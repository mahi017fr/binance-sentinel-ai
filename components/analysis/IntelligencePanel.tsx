"use client";

import type { ReportAsset, Driver } from "@/lib/llm/schema";
import { formatDrawdown, formatFloatPct } from "./format";

function DataBadge() {
  return (
    <span className="inline-flex items-center rounded border border-[var(--info)]/40 bg-[var(--info)]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--info)]">
      Data
    </span>
  );
}

function InterpBadge() {
  return (
    <span className="inline-flex items-center rounded border border-[#f0b90b]/40 bg-[#f0b90b]/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#f0b90b]">
      Interpretation
    </span>
  );
}

function SectionTitle({
  children,
  badge,
}: {
  children: React.ReactNode;
  badge: React.ReactNode;
}) {
  return (
    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-200">
      {children}
      {badge}
    </h3>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-[var(--border)] py-2 first:pt-0 last:border-0 last:pb-0 sm:border-b-0 sm:py-0">
      <div className="text-xs text-[var(--muted)]">{label}</div>
      <div className="mt-0.5 text-sm font-medium tabular-nums text-zinc-100">{value}</div>
    </div>
  );
}

function ImpactPill({ impact }: { impact: Driver["impact"] }) {
  const tone =
    impact === "increases"
      ? "text-[var(--danger)]"
      : impact === "decreases"
        ? "text-[var(--safe)]"
        : "text-[var(--muted)]";
  return (
    <span className={`shrink-0 text-xs font-medium ${tone}`}>
      {impact === "increases" ? "↑" : impact === "decreases" ? "↓" : "·"}
    </span>
  );
}

const OBS_CATEGORY_LABEL: Record<string, string> = {
  trend: "Trend",
  volatility: "Volatility",
  drawdown: "Drawdown",
  "market-activity": "Market Activity",
  risk: "Risk",
  readiness: "Readiness",
};

const OBS_TONE: Record<string, string> = {
  risk: "text-[#f0b90b]",
  readiness: "text-[#38bdf8]",
};

/**
 * Market intelligence panel. Strictly splits measured market data from the
 * agent's interpretation, and always surfaces uncertainty. No guaranteed
 * forward-looking claims are made.
 */
export function IntelligencePanel({ asset }: { asset: ReportAsset }) {
  const m = asset.marketData;
  const thesis = asset.thesis;
  const dataBased = thesis?.dataBased ?? [];
  const interpretation = thesis?.interpretation ?? [];

  return (
    <div className="space-y-6">
      {/* Market thesis / summary */}
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface-raised)]/60 px-4 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--muted)]">
          Market summary
        </div>
        <p className="mt-1.5 text-sm leading-6 text-zinc-100">
          {asset.marketSummary || thesis?.thesis}
        </p>
      </div>

      {/* Data metrics */}
      <div>
        <SectionTitle badge={<DataBadge />}>Measured metrics</SectionTitle>
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
          <div className="space-y-0">
            <h4 className="mb-1 text-xs text-[var(--muted)]">Trend</h4>
            <Stat label="Direction" value={m.trend.direction} />
            <Stat label="Strength" value={formatFloatPct(m.trend.strength)} />
            <Stat label="Clarity" value={formatFloatPct(m.trend.clarity)} />
          </div>
          <div className="space-y-0">
            <h4 className="mb-1 text-xs text-[var(--muted)]">Volatility</h4>
            <Stat label="Level" value={formatFloatPct(m.volatility.level)} />
            <Stat label="Annualized" value={formatFloatPct(m.volatility.annualized)} />
            <Stat label="Per-bar σ" value={formatFloatPct(m.volatility.std)} />
          </div>
          <div className="space-y-0">
            <h4 className="mb-1 text-xs text-[var(--muted)]">Drawdown</h4>
            <Stat label="Current" value={formatDrawdown(m.drawdown.current)} />
            <Stat label="Window max" value={formatDrawdown(m.drawdown.max)} />
          </div>
        </div>
      </div>

      {/* Data-backed observations from the thesis */}
      {dataBased.length > 0 && (
        <div>
          <SectionTitle badge={<DataBadge />}>Data-backed observations</SectionTitle>
          <ul className="space-y-2">
            {dataBased.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-6 text-[var(--muted)]">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[var(--info)]" aria-hidden="true" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Interpretation: drivers + interpretation lines */}
      <div>
        <SectionTitle badge={<InterpBadge />}>Agent interpretation</SectionTitle>

        <div className="mb-4 space-y-2">
          {asset.keyDrivers.map((d) => (
            <div
              key={d.key}
              className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2.5"
            >
              <ImpactPill impact={d.impact} />
              <div>
                <div className="text-sm font-medium text-zinc-100">{d.label}</div>
                <div className="text-xs leading-5 text-[var(--muted)]">
                  {d.explanation}
                </div>
              </div>
            </div>
          ))}
        </div>

        {interpretation.length > 0 && (
          <ul className="space-y-2">
            {interpretation.map((line, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-6 text-[var(--muted)]">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#f0b90b]" aria-hidden="true" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Observations */}
      {asset.observations.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-200">Observations</h3>
          <ul className="space-y-2">
            {asset.observations.map((o, i) => {
              const tone = OBS_TONE[o.category] ?? "text-[var(--muted)]";
              return (
                <li key={i} className="flex items-start gap-2 text-sm leading-6 text-[var(--muted)]">
                  <span className={`w-24 shrink-0 text-[11px] font-semibold uppercase ${tone}`}>
                    {OBS_CATEGORY_LABEL[o.category] ?? o.category}
                  </span>
                  <span className="min-w-0">
                    {o.text}{" "}
                    <span className="ml-1 text-xs text-[var(--muted)]/70">
                      ({o.confidence} confidence)
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Uncertainty */}
      {asset.uncertainty && (
        <div className="rounded-lg border border-[var(--warning)]/30 bg-[var(--warning)]/5 px-3 py-2.5 text-xs leading-5 text-[var(--warning)]">
          <span className="font-semibold">Uncertainty:</span> {asset.uncertainty}
        </div>
      )}
    </div>
  );
}
