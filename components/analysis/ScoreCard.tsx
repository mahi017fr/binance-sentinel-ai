"use client";

interface ScoreCardProps {
  label: string;
  score: number;
  band: string;
  explanation?: string;
  tone?: "risk" | "readiness";
}

const ACCENT: Record<string, string> = {
  risk: "text-[#f0b90b]",
  readiness: "text-[#38bdf8]",
};

const ACCENT_BAR: Record<string, string> = {
  risk: "bg-[#f0b90b]",
  readiness: "bg-[#38bdf8]",
};

function bandTone(score: number): string {
  // Descriptive only — no advice. Higher risk is shown warmer.
  if (score >= 66) return "text-[var(--danger)] border-[var(--danger)]/40 bg-[var(--danger)]/10";
  if (score >= 40) return "text-[var(--warning)] border-[var(--warning)]/40 bg-[var(--warning)]/10";
  if (score >= 20) return "text-[#f0b90b] border-[#f0b90b]/40 bg-[#f0b90b]/10";
  return "text-[var(--safe)] border-[var(--safe)]/40 bg-[var(--safe)]/10";
}

/**
 * A prominent numeric score card with a clean gauge bar. Renders the real
 * deterministic score and band from the report — nothing is hardcoded.
 */
export function ScoreCard({
  label,
  score,
  band,
  explanation,
  tone = "risk",
}: ScoreCardProps) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-widest text-[var(--muted)]">
          {label}
        </div>
        <span
          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${bandTone(score)}`}
        >
          {band}
        </span>
      </div>

      <div className={`mt-3 text-4xl font-semibold tabular-nums ${ACCENT[tone]}`}>
        {score.toFixed(2)}
      </div>

      <div
        className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]"
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${label} gauge`}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ${ACCENT_BAR[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {explanation && (
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">{explanation}</p>
      )}
    </div>
  );
}
