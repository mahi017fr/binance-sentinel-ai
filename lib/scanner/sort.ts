/**
 * Shared presentation helpers for sorting scanner results by a column key.
 *
 * Pure, deterministic; no business logic (the backend already classifies
 * volatility / momentum / risk / activity — this only orders the UI rows).
 */

import type { MarketScanResult } from "@/lib/scanner/types";
import type { SortConfig, SortKey } from "@/components/scanner/ScannerTable";

export function getSortValue(
  asset: MarketScanResult["assets"][number],
  key: SortKey
): number {
  if (!asset) return 0;
  switch (key) {
    case "symbol":
      return 0;
    case "price":
      return asset.price ?? 0;
    case "change24h":
      return asset.change24h ?? 0;
    case "volatility":
      return asset.volatility?.value ?? 0;
    case "momentum":
      return asset.momentum?.value ?? 0;
    case "risk":
      return asset.risk?.score ?? 0;
    case "activity":
      return asset.activity?.value ?? 0;
    default:
      return 0;
  }
}

export function sortAssets(
  assets: MarketScanResult["assets"],
  sort: SortConfig
): MarketScanResult["assets"] {
  const sorted = [...assets].sort((a, b) => {
    if (sort.key === "symbol") {
      return sort.direction === "asc"
        ? a.symbol.localeCompare(b.symbol)
        : b.symbol.localeCompare(a.symbol);
    }
    const diff = getSortValue(a, sort.key) - getSortValue(b, sort.key);
    return sort.direction === "asc" ? diff : -diff;
  });
  return sorted;
}

export type { SortConfig, SortKey };