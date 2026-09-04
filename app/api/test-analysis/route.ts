/**
 * TEMPORARY development route to verify the deterministic market-analysis
 * engine end-to-end.
 *
 *   GET /api/test-analysis?symbol=BTCUSDT
 *   GET /api/test-analysis?symbol=ETHUSDT&interval=4h&limit=100
 *
 * Returns the complete `MarketAnalysisResult` as JSON.
 * Symbol is validated server-side against the market-data provider.
 */

import type { NextRequest } from "next/server";
import type { KlineInterval } from "@/lib/binance-agent-os/types";
import { analyzeMarket } from "@/lib/analysis/market-analysis";

const VALID_INTERVALS = new Set<KlineInterval>([
  "1m",
  "3m",
  "5m",
  "15m",
  "30m",
  "1h",
  "2h",
  "4h",
  "6h",
  "8h",
  "12h",
  "1d",
  "3d",
  "1w",
  "1M",
]);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawSymbol = searchParams.get("symbol")?.trim() ?? "";

  if (!rawSymbol) {
    return Response.json(
      {
        error:
          "A 'symbol' query parameter is required, e.g. /api/test-analysis?symbol=BTCUSDT.",
      },
      { status: 400 }
    );
  }

  // Basic structural guard: allow letters, digits, and a small set of separators.
  if (!/^[A-Za-z0-9./-]+$/.test(rawSymbol)) {
    return Response.json(
      { error: `Invalid symbol characters in: '${rawSymbol}'.` },
      { status: 400 }
    );
  }

  const rawInterval = searchParams.get("interval") ?? "1d";
  if (!VALID_INTERVALS.has(rawInterval as KlineInterval)) {
    return Response.json(
      { error: `Invalid interval: '${rawInterval}' (must be a valid kline interval).` },
      { status: 400 }
    );
  }

  const rawLimit = searchParams.get("limit");
  let limit = 200;
  if (rawLimit) {
    const parsed = Number(rawLimit);
    if (!Number.isFinite(parsed) || parsed <= 1 || parsed > 1000) {
      return Response.json(
        { error: "'limit' must be an integer between 2 and 1000." },
        { status: 400 }
      );
    }
    limit = Math.floor(parsed);
  }

  try {
    const result = await analyzeMarket(rawSymbol, {
      interval: rawInterval as KlineInterval,
      klineLimit: limit,
    });
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown analysis error";
    const isNotFound = /unknown|non-tradeable|not tradeable/i.test(message);
    return Response.json({ error: message }, { status: isNotFound ? 404 : 500 });
  }
}
