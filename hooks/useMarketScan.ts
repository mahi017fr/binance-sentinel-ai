"use client";

/**
 * useMarketScan — shared live-market scanner hook.
 *
 * Fetches `/api/market-scan` (real provider-chain data), records the observed
 * latency/success metrics, and exposes status/result/error with a `scan()`
 * re-run trigger. Used by the single-page command center so the market pulse,
 * scanner table, and data-trust section all reflect the SAME scan result.
 */

import { useCallback, useRef, useState } from "react";
import type { MarketScanResult } from "@/lib/scanner/types";
import { metricsTracker } from "@/lib/evaluation/metrics";

export type ScanStatus = "idle" | "loading" | "done" | "error";

export interface UseMarketScan {
  status: ScanStatus;
  result: MarketScanResult | null;
  error: string | null;
  scan: () => Promise<void>;
  /** Latest request id — incremented on each resolved scan for keyed re-animations. */
  revision: number;
}

export function useMarketScan(): UseMarketScan {
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [result, setResult] = useState<MarketScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const inFlight = useRef(false);

  const scan = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus("loading");
    setError(null);

    const startTime = performance.now();

    try {
      const res = await fetch("/api/market-scan");
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `Scan failed with status ${res.status}`);
      }
      const data: MarketScanResult = await res.json();

      // Defensive: ensure required arrays exist
      if (!data || !Array.isArray(data.assets) || !Array.isArray(data.universe)) {
        throw new Error("Scan returned malformed data. Please try again.");
      }

      const latencyMs = performance.now() - startTime;
      const requestedCount = data.universe.length;
      const failureCount = data.failures?.length ?? 0;
      const successCount = requestedCount - failureCount;

      metricsTracker.recordScan(
        latencyMs,
        successCount,
        requestedCount,
        failureCount,
        data.scannedAt
      );

      // Defensive: ensure highlights exists with required arrays
      if (!data.highlights || typeof data.highlights !== "object") {
        data.highlights = {
          highVolatility: [],
          strongMomentum: [],
          elevatedRisk: [],
          highActivity: [],
          topMovers: [],
        };
      }

      setResult(data);
      setStatus("done");
      setRevision((r) => r + 1);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Scan failed unexpectedly.";
      setError(message);
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }, []);

  return { status, result, error, scan, revision };
}