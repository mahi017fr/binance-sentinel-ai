"use client";

import { useId } from "react";
import { formatPrice } from "@/components/analysis/format";

export type ChartTone = "up" | "down" | "neutral";

const TONE_STROKE: Record<ChartTone, string> = {
  up: "var(--safe)",
  down: "var(--danger)",
  neutral: "var(--accent)",
};

const VIEW_W = 320;
const VIEW_H = 170;
const PAD_X = 6;
const PAD_TOP = 16;
const PAD_BOTTOM = 12;

interface PriceChartProps {
  /** Close prices, ordered oldest → newest (real kline closes only). */
  values: number[];
  tone: ChartTone;
  /** Bar interval the series was sampled at, e.g. "1h"; rendered as "1H". */
  interval?: string;
  /** Live provider label, e.g. "Binance" / "CoinGecko". */
  sourceLabel?: string;
  /** Whether the snapshot came from the fallback provider. */
  fallbackUsed?: boolean;
  /** Rendered chart height in px (defaults to 136). */
  height?: number;
}

function buildLinePath(
  values: number[],
  min: number,
  span: number
): { line: string; area: string; last: { x: number; y: number }; base: number } {
  const base = VIEW_H - PAD_BOTTOM;
  const xAt = (i: number) =>
    PAD_X + (i / (values.length - 1)) * (VIEW_W - PAD_X * 2);
  const yAt = (v: number) =>
    PAD_TOP + (1 - (v - min) / span) * (VIEW_H - PAD_TOP - PAD_BOTTOM);

  const line = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${xAt(values.length - 1).toFixed(1)},${base} L${PAD_X.toFixed(1)},${base} Z`;

  return {
    line,
    area,
    last: { x: xAt(values.length - 1), y: yAt(values[values.length - 1]) },
    base,
  };
}

/**
 * PriceChart — compact, minimal recent-price action chart.
 *
 * Renders real OHLC closes (never invented) as a thin line with a subtle area
 * fill, faint horizontal gridlines, min/max reference labels and a marker on
 * the latest close. Static SVG — no charting library, honors reduced motion,
 * uses a unique gradient per instance, and falls back to an explicit
 * unavailable state instead of ever drawing fabricated data.
 */
export function PriceChart({
  values,
  tone,
  interval,
  sourceLabel,
  fallbackUsed,
  height = 136,
}: PriceChartProps) {
  const gradId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const stroke = TONE_STROKE[tone];

  const valid =
    values.length >= 2 && values.every((v) => Number.isFinite(v));

  if (!valid) {
    return (
      <div className="flex h-[170px] items-center justify-center rounded-xl border border-[var(--border)]/60 bg-[var(--surface)]/50 px-4 text-center">
        <span className="text-[11px] text-[var(--muted)]">
          Historical chart unavailable
        </span>
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const { line, area, last, base } = buildLinePath(values, min, span);
  const latest = values[values.length - 1];

  return (
    <div className="rounded-xl border border-[var(--border)]/60 bg-[var(--surface)]/50 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
          Recent Price Action
        </span>
        <div className="flex items-center gap-2">
          {interval && (
            <span className="rounded border border-[var(--border)] bg-[var(--surface-raised)]/70 px-1.5 py-0.5 text-[9px] font-semibold uppercase tabular-nums tracking-wider text-zinc-300">
              {interval.toUpperCase()}
            </span>
          )}
          <span className="text-[9px] font-medium tabular-nums" style={{ color: stroke }}>
            ${formatPrice(latest)}
          </span>
          <span className="flex items-center gap-1 text-[9px] text-[var(--muted)]">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                fallbackUsed ? "bg-[var(--info)]" : "bg-[var(--safe)]"
              }`}
              aria-hidden="true"
            />
            {sourceLabel ?? "Market data"}
            {fallbackUsed && <span className="text-[var(--info)]">fallback</span>}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        preserveAspectRatio="none"
        className="w-full"
        style={{ height }}
        role="img"
        aria-label={`${interval ?? "Recent"} price action`}
      >
        <defs>
          <linearGradient id={`pg-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.16" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75].map((frac) => {
          const y = PAD_TOP + frac * (VIEW_H - PAD_TOP - PAD_BOTTOM);
          return (
            <line
              key={frac}
              x1={PAD_X}
              x2={VIEW_W - PAD_X}
              y1={y}
              y2={y}
              stroke="var(--border)"
              strokeOpacity="0.35"
              strokeDasharray="3 4"
            />
          );
        })}

        <text
          x={PAD_X}
          y={PAD_TOP - 3}
          fill="var(--muted)"
          fontSize="9"
          fontFamily="inherit"
        >
          {formatPrice(max)}
        </text>
        <text
          x={PAD_X}
          y={VIEW_H - PAD_BOTTOM + 10}
          fill="var(--muted)"
          fontSize="9"
          fontFamily="inherit"
        >
          {formatPrice(min)}
        </text>

        <path d={area} fill={`url(#pg-${gradId})`} stroke="none" />
        <path
          d={line}
          fill="none"
          stroke={stroke}
          strokeWidth="1.75"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        <circle
          cx={last.x.toFixed(1)}
          cy={last.y.toFixed(1)}
          r="2.75"
          fill="var(--background)"
          stroke={stroke}
          strokeWidth="1.75"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={`M${last.x.toFixed(1)},${base} L${last.x.toFixed(1)},${last.y.toFixed(1)} L${last.x.toFixed(1)},${PAD_TOP}`}
          stroke={stroke}
          strokeOpacity="0.35"
          strokeDasharray="2 3"
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}