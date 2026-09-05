"use client";

/**
 * Sparkline — a tiny SVG line chart for real close prices.
 *
 * Pure SVG + gradient polyline, no charting library. Accepts any ordered
 * series of numbers; normalizes to the viewBox width/height. Honors
 * prefers-reduced-motion by keeping the draw static (no dash animation).
 */

interface SparklineProps {
  values: number[];
  className?: string;
  positive?: boolean;
  negative?: boolean;
  viewWidth?: number;
  viewHeight?: number;
}

function buildPath(values: number[], w: number, h: number) {
  if (values.length < 2) return "";
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = pad + (1 - (v - min) / span) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function Sparkline({
  values,
  className = "",
  positive = false,
  negative = false,
  viewWidth = 96,
  viewHeight = 28,
}: SparklineProps) {
  const stroke = positive
    ? "var(--safe)"
    : negative
      ? "var(--danger)"
      : "var(--accent)";

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label="24-hour price trend"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.18" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {values.length >= 2 && (
        <>
          <path
            d={`${buildPath(values, viewWidth, viewHeight)} L${viewWidth},${viewHeight} L0,${viewHeight} Z`}
            fill="url(#spark-fill)"
            stroke="none"
          />
          <path
            d={buildPath(values, viewWidth, viewHeight)}
            fill="none"
            stroke={stroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
    </svg>
  );
}