"use client";

import type { ReportAsset } from "@/lib/llm/schema";
import { formatPct, formatPrice } from "./format";
import { Badge } from "@/components/ui/Badge";

function ActivityBadge({ activity, level }: { activity: string; level: number }) {
  const tone = level >= 0.66 ? "success" : level >= 0.33 ? "warning" : "default";
  return <Badge tone={tone}>{activity}</Badge>;
}

/** Compact market snapshot strip for one asset: symbol, price, change, activity. */
export function MarketSummary({ asset }: { asset: ReportAsset }) {
  const m = asset.marketData;
  const changePositive = m.change24hPercent > 0;
  const changeColor = changePositive
    ? "text-[var(--safe)]"
    : m.change24hPercent < 0
      ? "text-[var(--danger)]"
      : "text-[var(--muted)]";

  return (
    <div className="grid grid-cols-2 items-center gap-y-3 rounded-xl border border-[var(--border)] bg-gradient-to-b from-[var(--surface-raised)]/80 to-[var(--surface)] px-5 py-4 sm:flex sm:flex-wrap sm:gap-x-8">
      <div className="col-span-2 sm:col-span-1">
        <div className="flex items-center gap-1.5">
          <span className="text-base font-semibold tracking-tight text-zinc-100">
            {asset.symbol}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] uppercase tracking-wider text-[var(--muted)]">
          Spot · USDT
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-[var(--muted)]">Price</div>
        <div className="mt-0.5 text-sm font-medium tabular-nums text-zinc-100">
          ${formatPrice(m.price)}
        </div>
      </div>

      <div>
        <div className="text-[11px] uppercase tracking-wider text-[var(--muted)]">24h</div>
        <div className={`mt-0.5 text-sm font-medium tabular-nums ${changeColor}`}>
          {formatPct(m.change24hPercent)}
        </div>
      </div>

      <div className="col-span-2 sm:col-span-1">
        <div className="text-[11px] uppercase tracking-wider text-[var(--muted)]">Activity</div>
        <div className="mt-1">
          <ActivityBadge activity={m.activity} level={m.activityLevel} />
        </div>
      </div>

      {m.sourceLabel && (
        <div>
          <div className="text-[11px] uppercase tracking-wider text-[var(--muted)]">
            Data Source
          </div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                m.fallbackUsed ? "bg-[var(--info)]" : "bg-[var(--safe)]"
              }`}
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-zinc-100">
              {m.sourceLabel}
            </span>
            {m.fallbackUsed && (
              <span className="text-[10px] text-[var(--info)]">
                fallback
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
