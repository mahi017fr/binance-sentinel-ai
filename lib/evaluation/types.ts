/**
 * Evaluation metrics types.
 *
 * These types describe runtime performance observations — they are NOT
 * measures of trading accuracy, profitability, or investment returns.
 */

/** Data freshness classification based on age of scannedAt timestamp. */
export type DataFreshness = "Fresh" | "Recent" | "Stale";

/** Pipeline completion status for the analysis workflow. */
export type PipelineStatus = "Complete" | "Partial" | "Failed" | "Idle";

/** Snapshot of all observed evaluation metrics at a point in time. */
export interface EvaluationMetrics {
  /** Whether a data source is active. */
  dataSourceActive: boolean;

  /** Human label for the active data source. */
  dataSourceLabel: string;

  /** Latency of the most recent scanner request in ms. */
  scanLatencyMs: number | null;

  /** Latency of the most recent analysis request in ms. */
  analysisLatencyMs: number | null;

  /** Number of successfully scanned assets in the last scan. */
  scanSuccessCount: number;

  /** Total assets requested in the last scan. */
  scanRequestedCount: number;

  /** Scan success rate 0–100%. */
  scanSuccessRate: number;

  /** Number of partial failures in the last scan. */
  scanFailureCount: number;

  /** Partial failure rate 0–100%. */
  scanFailureRate: number;

  /** Age classification of the last scan data. */
  dataFreshness: DataFreshness;

  /** Whether the analysis SSE workflow completed successfully. */
  pipelineStatus: PipelineStatus;

  /** ISO timestamp of the last scan. */
  lastScanAt: string | null;

  /** ISO timestamp of the last analysis completion. */
  lastAnalysisAt: string | null;

  /** Total number of scans performed in this session. */
  totalScans: number;

  /** Total number of analyses performed in this session. */
  totalAnalyses: number;

  /** Average scan latency across all scans in this session (ms). */
  avgScanLatencyMs: number | null;

  /** Average analysis latency across all analyses in this session (ms). */
  avgAnalysisLatencyMs: number | null;

  /** Cumulative scan success rate across all scans (0–100%). */
  cumulativeScanSuccessRate: number;

  /** Cumulative analysis success rate across all analyses (0–100%). */
  cumulativeAnalysisSuccessRate: number;
}
