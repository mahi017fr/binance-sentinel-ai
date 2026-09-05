"use client";

import type { ReportAsset } from "@/lib/llm/schema";
import {
  computeDirectionalSignal,
  computeMarketBias,
  type Direction,
} from "@/lib/prediction/directional";
import { PriceChart } from "./PriceChart";

const ARROWS: Record<Direction, { label: string; glyph: React.ReactNode }> = {
  up: {
    label: "UP",
    glyph: (
      <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    ),
  },
  down: {
    label: "DOWN",
    glyph: (
      <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 5v14M19 12l-7 7-7-7" />
      </svg>
    ),
  },
  neutral: {
    label: "NEUTRAL",
    glyph: (
      <svg viewBox="0 0 24 24" className="h-9 w-9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
        <path d="M5 12h14" />
      </svg>
    ),
  },
};

const TONES: Record<
  Direction,
  { text: string; bar: string; glow: string; chip: string }
> = {
  up: {
    text: "text-[var(--safe)]",
    bar: "bg-[var(--safe)]",
    glow: "shadow-[0_0_44px_-12px_rgba(34,197,94,0.45)]",
    chip: "border-[var(--safe)]/40 bg-[var(--safe)]/10 text-[var(--safe)]",
  },
  down: {
    text: "text-[var(--danger)]",
    bar: "bg-[var(--danger)]",
    glow: "shadow-[0_0_44px_-12px_rgba(239,68,68,0.45)]",
    chip: "border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--danger)]",
  },
  neutral: {
    text: "text-[#f0b90b]",
    bar: "bg-[#f0b90b]",
    glow: "shadow-[0_0_44px_-12px_rgba(240,185,11,0.45)]",
    chip: "border-[#f0b90b]/40 bg-[#f0b90b]/10 text-[#f0b90b]",
  },
};

interface DirectionCardProps {
  asset: ReportAsset;
  /**
   * "full" — spacious single-asset layout (~900px panel): two-column signal
   * header, full-width chart, two-column evidence.
   * "grid" — compact card used inside the multi-asset comparison grid.
   */
  variant?: "full" | "grid";
}

function DirectionCard({ asset, variant = "grid" }: DirectionCardProps) {
  const signal = computeDirectionalSignal(asset);
  if (!signal) {
    return (
      <div className="rounded-2xl border border-[var(--border)]/70 bg-[var(--glass)] p-5 text-center backdrop-blur-xl">
        <div className="text-sm text-[var(--muted)]">
          Prediction unavailable — insufficient analysis data
        </div>
      </div>
    );
  }

  const tone = TONES[signal.direction];
  const arrow = ARROWS[signal.direction];
  const m = asset.marketData;
  const full = variant === "full";

  return (
    <div
      className={`sentinel-card-in flex flex-col rounded-2xl border border-[var(--border)]/70 bg-[var(--glass)] backdrop-blur-xl ${tone.glow} ${
        full ? "p-6 sm:p-8" : "p-5 sm:p-6"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div
            className={`font-semibold tracking-tight text-zinc-100 ${
              full ? "text-base" : "text-sm"
            }`}
          >
            {signal.symbol}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-[0.18em] text-[var(--muted)]">
            Spot · USDT
          </div>
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${tone.chip}`}
        >
          Research signal
        </span>
      </div>

      <div
        className={
          full
            ? "mt-6 grid gap-6 sm:grid-cols-2 sm:gap-8"
            : "mt-4"
        }
      >
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
            Market Direction
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className={tone.text}>{arrow.glyph}</span>
            <span
              className={`font-semibold tracking-tight ${tone.text} ${
                full ? "text-4xl" : "text-3xl"
              }`}
            >
              {arrow.label}
            </span>
          </div>
        </div>
        <div className={full ? "flex flex-col justify-end" : undefined}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[var(--muted)]">
              Model Confidence
            </span>
            <span
              className={`font-semibold tabular-nums ${tone.text} ${
                full ? "text-2xl" : "text-lg"
              }`}
            >
              {signal.confidence}%
            </span>
          </div>
          <div
            className={`overflow-hidden rounded-full bg-[var(--surface-raised)] ${
              full ? "mt-2.5 h-2" : "mt-2 h-1.5"
            }`}
          >
            <div
              className={`h-full rounded-full ${tone.bar}`}
              style={{ width: `${signal.confidence}%` }}
            />
          </div>
          {full && (
            <p className="mt-2 text-right text-[9px] uppercase tracking-[0.14em] text-[var(--muted)]">
              Directional score · {signal.score >= 0 ? "+" : ""}
              {signal.score.toFixed(3)}
            </p>
          )}
        </div>
      </div>

      <div className={full ? "mt-6" : "mt-4"}>
        <PriceChart
          values={m.priceSeries ?? []}
          tone={signal.direction}
          interval={m.interval}
          sourceLabel={m.sourceLabel}
          fallbackUsed={m.fallbackUsed}
          height={full ? 186 : undefined}
        />
      </div>

      <div
        className={`rounded-xl border border-[var(--border)]/60 bg-[var(--surface)]/70 ${
          full ? "mt-6 p-4" : "mt-4 p-3.5"
        }`}
      >
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#f0b90b]">
          Why this signal?
        </div>
        <ul
          className={
            full
              ? "mt-2.5 grid gap-2 sm:grid-cols-2 sm:gap-x-8"
              : "mt-2 space-y-1.5"
          }
        >
          {signal.reasons.map((reason) => (
            <li key={reason} className="flex items-start gap-2 text-xs leading-5 text-zinc-300">
              <span className={`mt-[7px] h-1 w-1 shrink-0 rounded-full ${tone.bar}`} aria-hidden="true" />
              {reason}
            </li>
          ))}
        </ul>
      </div>

      <p
        className={`text-[10px] uppercase tracking-[0.14em] text-[var(--muted)] ${
          full ? "mt-5 text-center" : "mt-4"
        }`}
      >
        Research signal · Based on current market conditions · Not financial advice
      </p>
    </div>
  );
}

interface PredictionCardProps {
  assets: ReportAsset[];
}

/**
 * Prominent, evidence-backed directional prediction shown above the detailed
 * analysis report. Never displays Buy/Sell or certainty language — it is a
 * research signal derived deterministically from the live analysis data.
 */
export function PredictionCard({ assets }: PredictionCardProps) {
  if (!assets.length) {
    return (
      <div className="mx-auto w-full max-w-2xl">
        <div className="rounded-2xl border border-[var(--border)]/70 bg-[var(--glass)] p-5 text-center backdrop-blur-xl">
          <div className="text-sm text-[var(--muted)]">
            Prediction unavailable — insufficient analysis data
          </div>
        </div>
      </div>
    );
  }

  const signals = assets
    .map(computeDirectionalSignal)
    .filter((s): s is NonNullable<typeof s> => s !== null);
  const bias = computeMarketBias(signals);
  const biasTone = bias ? TONES[bias.direction] : null;
  const biasArrow = bias ? ARROWS[bias.direction] : null;

  return (
    <div className="mx-auto w-full max-w-[1280px]">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f0b90b]">
        Directional Signal
      </div>

      {assets.length === 1 ? (
        <div className="mx-auto w-full max-w-[900px]">
          <DirectionCard asset={assets[0]} variant="full" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {assets.map((asset, i) => (
              <div key={asset.symbol} className="animate-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <DirectionCard asset={asset} variant="grid" />
              </div>
            ))}
          </div>

          {bias && biasTone && biasArrow && (
            <div
              className={`mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--border)]/70 bg-[var(--glass)] px-5 py-4 backdrop-blur-xl ${biasTone.glow}`}
            >
              <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                Overall Market Bias
                <span className="ml-2 text-[9px] font-medium normal-case tracking-normal text-[var(--muted)]/80">
                  · {assets.length} assets analyzed
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className={biasTone.text}>{biasArrow.glyph}</span>
                <span className={`text-xl font-semibold tracking-tight ${biasTone.text}`}>
                  {biasArrow.label}
                </span>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums ${biasTone.chip}`}>
                  {bias.confidence}% confidence
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}