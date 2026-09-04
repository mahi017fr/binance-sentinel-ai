"use client";

import type { MarketScanAsset } from "@/lib/scanner/types";
import { formatPrice } from "@/components/analysis/format";

export type SortKey =
  | "symbol"
  | "price"
  | "change24h"
  | "volatility"
  | "momentum"
  | "risk"
  | "activity";

export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}

interface ScannerTableProps {
  assets: MarketScanAsset[];
  onAnalyzeAsset?: (symbol: string) => void;
  sort: SortConfig;
  onSort: (key: SortKey) => void;
}

function formatPct(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

function VolatilityBadge({ band }: { band: string }) {
  const tone =
    band === "Extreme"
      ? "text-[var(--danger)] border-[var(--danger)]/40 bg-[var(--danger)]/10"
      : band === "High"
        ? "text-[var(--warning)] border-[var(--warning)]/40 bg-[var(--warning)]/10"
        : band === "Moderate"
          ? "text-[#f0b90b] border-[#f0b90b]/40 bg-[#f0b90b]/10"
          : "text-[var(--safe)] border-[var(--safe)]/40 bg-[var(--safe)]/10";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>
      {band}
    </span>
  );
}

function MomentumBadge({ direction }: { direction: string }) {
  const tone =
    direction === "bullish"
      ? "text-[var(--safe)] border-[var(--safe)]/40 bg-[var(--safe)]/10"
      : direction === "bearish"
        ? "text-[var(--danger)] border-[var(--danger)]/40 bg-[var(--danger)]/10"
        : "text-[var(--muted)] border-[var(--border)] bg-[var(--surface-raised)]";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${tone}`}>
      {direction === "bullish" && (
        <svg viewBox="0 0 24 24" className="mr-1 h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      )}
      {direction === "bearish" && (
        <svg viewBox="0 0 24 24" className="mr-1 h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
      {direction}
    </span>
  );
}

function RiskBadge({ band }: { band: string }) {
  const tone =
    band === "Very High" || band === "High"
      ? "text-[var(--danger)] border-[var(--danger)]/40 bg-[var(--danger)]/10"
      : band === "Moderate"
        ? "text-[var(--warning)] border-[var(--warning)]/40 bg-[var(--warning)]/10"
        : "text-[var(--safe)] border-[var(--safe)]/40 bg-[var(--safe)]/10";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>
      {band}
    </span>
  );
}

function ActivityBadge({ level }: { level: string }) {
  const tone =
    level === "Very High" || level === "High"
      ? "text-[var(--safe)] border-[var(--safe)]/40 bg-[var(--safe)]/10"
      : level === "Moderate"
        ? "text-[#f0b90b] border-[#f0b90b]/40 bg-[#f0b90b]/10"
        : "text-[var(--muted)] border-[var(--border)] bg-[var(--surface-raised)]";

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tone}`}>
      {level}
    </span>
  );
}

function RiskBar({ score }: { score: number }) {
  const width = Math.min(Math.max(score, 0), 100);
  const color =
    score >= 70
      ? "bg-[var(--danger)]"
      : score >= 40
        ? "bg-[var(--warning)]"
        : "bg-[var(--safe)]";

  return (
    <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-[var(--surface-raised)]">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${width}%` }}
        aria-hidden="true"
      />
    </div>
  );
}

function SortHeader({
  label,
  sortKey,
  sort,
  onSort,
  className = "",
}: {
  label: string;
  sortKey: SortKey;
  sort: SortConfig;
  onSort: (key: SortKey) => void;
  className?: string;
}) {
  const isActive = sort.key === sortKey;
  return (
    <th
      className={`px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] select-none ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={`inline-flex items-center gap-1 transition hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b90b] rounded ${
          isActive ? "text-zinc-100" : ""
        }`}
      >
        {label}
        {isActive && (
          <svg
            viewBox="0 0 24 24"
            className={`h-3 w-3 transition-transform ${
              sort.direction === "asc" ? "" : "rotate-180"
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="18 15 12 9 6 15" />
          </svg>
        )}
      </button>
    </th>
  );
}

export function ScannerTable({
  assets,
  onAnalyzeAsset,
  sort,
  onSort,
}: ScannerTableProps) {
  if (assets.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-8 text-center">
        <p className="text-sm text-[var(--muted)]">
          No assets match your search. Try a different filter.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--surface-raised)]">
            <SortHeader label="Asset" sortKey="symbol" sort={sort} onSort={onSort} />
            <SortHeader label="Price" sortKey="price" sort={sort} onSort={onSort} />
            <SortHeader label="24h Change" sortKey="change24h" sort={sort} onSort={onSort} />
            <SortHeader label="Volatility" sortKey="volatility" sort={sort} onSort={onSort} />
            <SortHeader
              label="Momentum"
              sortKey="momentum"
              sort={sort}
              onSort={onSort}
              className="hidden sm:table-cell"
            />
            <SortHeader label="Risk" sortKey="risk" sort={sort} onSort={onSort} />
            <SortHeader
              label="Activity"
              sortKey="activity"
              sort={sort}
              onSort={onSort}
              className="hidden md:table-cell"
            />
            {onAnalyzeAsset && (
              <th className="px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                <span className="sr-only">Action</span>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {assets.map((asset) => {
            const changeColor =
              asset.change24h > 0
                ? "text-[var(--safe)]"
                : asset.change24h < 0
                  ? "text-[var(--danger)]"
                  : "text-[var(--muted)]";

            return (
              <tr
                key={asset.symbol}
                className={`border-b border-[var(--border)]/50 transition last:border-b-0 ${
                  onAnalyzeAsset
                    ? "hover:bg-[var(--surface-raised)]/50 cursor-pointer"
                    : ""
                }`}
                onClick={() => onAnalyzeAsset?.(asset.symbol)}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-100">
                      {asset.symbol}
                    </span>
                    <span className="hidden text-[10px] text-[var(--muted)] sm:inline">
                      /USDT
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 tabular-nums text-zinc-100">
                  ${formatPrice(asset.price)}
                </td>
                <td className={`px-4 py-3 font-medium tabular-nums ${changeColor}`}>
                  {formatPct(asset.change24h)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <VolatilityBadge band={asset.volatility.band} />
                    <span className="hidden text-[10px] tabular-nums text-[var(--muted)] lg:inline">
                      {asset.volatility.value.toFixed(1)}%
                    </span>
                  </div>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <MomentumBadge direction={asset.momentum.direction} />
                </td>
                <td className="px-4 py-3">
                  <div>
                    <RiskBadge band={asset.risk.band} />
                    <div className="mt-1 flex items-center gap-2">
                      <RiskBar score={asset.risk.score} />
                      <span className="text-[10px] tabular-nums text-[var(--muted)]">
                        {asset.risk.score}
                      </span>
                    </div>
                  </div>
                </td>
                <td className="hidden px-4 py-3 md:table-cell">
                  <ActivityBadge level={asset.activity.level} />
                </td>
                {onAnalyzeAsset && (
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAnalyzeAsset(asset.symbol);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[#f0b90b]/40 bg-[#f0b90b]/10 px-2.5 py-1 text-[11px] font-medium text-[#f0b90b] transition hover:bg-[#f0b90b]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b90b]"
                    >
                      <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M21 21l-4.3-4.3" />
                      </svg>
                      Analyze
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
