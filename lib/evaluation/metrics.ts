/**
 * Evaluation metrics tracker.
 *
 * Tracks real runtime performance data observed during scanner and analysis
 * operations. All metrics are derived from actual timing and success/failure
 * data — nothing is fabricated or estimated.
 *
 * Data freshness thresholds:
 *   < 5 minutes  → Fresh
 *   < 30 minutes → Recent
 *   ≥ 30 minutes → Stale
 */

import type {
  DataFreshness,
  EvaluationMetrics,
  PipelineStatus,
} from "./types";

/** Thresholds for data freshness classification (milliseconds). */
const FRESH_MS = 5 * 60 * 1000; // 5 minutes
const RECENT_MS = 30 * 60 * 1000; // 30 minutes

function classifyFreshness(isoTimestamp: string | null): DataFreshness {
  if (!isoTimestamp) return "Stale";
  const age = Date.now() - new Date(isoTimestamp).getTime();
  if (age < FRESH_MS) return "Fresh";
  if (age < RECENT_MS) return "Recent";
  return "Stale";
}

function classifyPipelineStatus(
  status: "idle" | "loading" | "done" | "error"
): PipelineStatus {
  switch (status) {
    case "done":
      return "Complete";
    case "error":
      return "Failed";
    case "loading":
      return "Partial";
    default:
      return "Idle";
  }
}

/**
 * Singleton metrics state. Updated imperatively by the DashboardLayout
 * when scan/analysis events occur.
 */
class MetricsTracker {
  private _scanLatencyMs: number | null = null;
  private _analysisLatencyMs: number | null = null;
  private _scanSuccessCount = 0;
  private _scanRequestedCount = 0;
  private _scanFailureCount = 0;
  private _lastScanAt: string | null = null;
  private _lastAnalysisAt: string | null = null;
  private _analysisStatus: "idle" | "loading" | "done" | "error" = "idle";
  private _listeners: Array<() => void> = [];

  // Session accumulators
  private _totalScans = 0;
  private _totalAnalyses = 0;
  private _totalScanLatencyMs = 0;
  private _totalAnalysisLatencyMs = 0;
  private _cumulativeScanSuccessCount = 0;
  private _cumulativeScanRequestedCount = 0;
  private _cumulativeAnalysisSuccessCount = 0;
  private _cumulativeAnalysisAttemptCount = 0;

  /** Subscribe to metric changes. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    for (const l of this._listeners) l();
  }

  recordScan(
    latencyMs: number,
    successCount: number,
    requestedCount: number,
    failureCount: number,
    scannedAt: string
  ) {
    this._scanLatencyMs = latencyMs;
    this._scanSuccessCount = successCount;
    this._scanRequestedCount = requestedCount;
    this._scanFailureCount = failureCount;
    this._lastScanAt = scannedAt;

    // Session accumulators
    this._totalScans += 1;
    this._totalScanLatencyMs += latencyMs;
    this._cumulativeScanSuccessCount += successCount;
    this._cumulativeScanRequestedCount += requestedCount;

    this.notify();
  }

  recordAnalysisStart() {
    this._analysisStatus = "loading";
    this.notify();
  }

  recordAnalysisComplete(latencyMs: number) {
    this._analysisLatencyMs = latencyMs;
    this._analysisStatus = "done";
    this._lastAnalysisAt = new Date().toISOString();

    // Session accumulators
    this._totalAnalyses += 1;
    this._totalAnalysisLatencyMs += latencyMs;
    this._cumulativeAnalysisSuccessCount += 1;
    this._cumulativeAnalysisAttemptCount += 1;

    this.notify();
  }

  recordAnalysisError() {
    this._analysisStatus = "error";

    // Session accumulators
    this._totalAnalyses += 1;
    this._cumulativeAnalysisAttemptCount += 1;

    this.notify();
  }

  getMetrics(): EvaluationMetrics {
    const scanSuccessRate =
      this._scanRequestedCount > 0
        ? Math.round(
            (this._scanSuccessCount / this._scanRequestedCount) * 100 * 100
          ) / 100
        : 0;

    const scanFailureRate =
      this._scanRequestedCount > 0
        ? Math.round(
            (this._scanFailureCount / this._scanRequestedCount) * 100 * 100
          ) / 100
        : 0;

    const avgScanLatencyMs =
      this._totalScans > 0
        ? Math.round(this._totalScanLatencyMs / this._totalScans)
        : null;

    const avgAnalysisLatencyMs =
      this._cumulativeAnalysisSuccessCount > 0
        ? Math.round(
            this._totalAnalysisLatencyMs / this._cumulativeAnalysisSuccessCount
          )
        : null;

    const cumulativeScanSuccessRate =
      this._cumulativeScanRequestedCount > 0
        ? Math.round(
            (this._cumulativeScanSuccessCount /
              this._cumulativeScanRequestedCount) *
              100 *
              100
          ) / 100
        : 0;

    const cumulativeAnalysisSuccessRate =
      this._cumulativeAnalysisAttemptCount > 0
        ? Math.round(
            (this._cumulativeAnalysisSuccessCount /
              this._cumulativeAnalysisAttemptCount) *
              100 *
              100
          ) / 100
        : 0;

    return {
      dataSourceActive: true,
      dataSourceLabel: "Binance Public REST API",
      scanLatencyMs: this._scanLatencyMs,
      analysisLatencyMs: this._analysisLatencyMs,
      scanSuccessCount: this._scanSuccessCount,
      scanRequestedCount: this._scanRequestedCount,
      scanSuccessRate,
      scanFailureCount: this._scanFailureCount,
      scanFailureRate,
      dataFreshness: classifyFreshness(this._lastScanAt),
      pipelineStatus: classifyPipelineStatus(this._analysisStatus),
      lastScanAt: this._lastScanAt,
      lastAnalysisAt: this._lastAnalysisAt,
      totalScans: this._totalScans,
      totalAnalyses: this._totalAnalyses,
      avgScanLatencyMs,
      avgAnalysisLatencyMs,
      cumulativeScanSuccessRate,
      cumulativeAnalysisSuccessRate,
    };
  }
}

/** Singleton tracker instance shared across the app. */
export const metricsTracker = new MetricsTracker();
