/**
 * GET /api/market-scan
 *
 * Scans the Sentinel Market Universe using real Binance public market data.
 * Returns deterministic classifications for volatility, momentum, risk, and
 * activity — no LLM, no mock data, no fabricated scores.
 *
 * Handles partial failures gracefully: if some symbols fail, the successful
 * ones are still returned alongside structured failure information.
 *
 * No authentication required. No API keys needed.
 * Public market data only.
 */

import { scanMarketUniverse } from "@/lib/scanner/scanner";

export async function GET() {
  try {
    const result = await scanMarketUniverse();
    return Response.json(result, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Market scan failed unexpectedly.";
    return Response.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
