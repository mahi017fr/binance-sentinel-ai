/**
 * GET /api/market/klines?symbol=BTCUSDT&interval=5m&limit=60
 *
 * Read-only frontend-support feed for the hero BTC live card. It reuses the
 * exact same provider chain as /api/market — Binance Public Market Data API
 * with CoinGecko fallback — and never sends, stores, or fabricates anything.
 *
 * Params:
 *   - symbol:   a Binance spot symbol, e.g. BTCUSDT (default)
 *   - interval: one of the supported kline intervals, e.g. 5m (default)
 *   - limit:    number of candles to return, clamped 2..500 (default 60)
 *
 * The response includes the actual provider that served the candles so the UI
 * can stay source-transparent (never claims Binance when CoinGecko answered).
 */

import {
  getMarketDataProvider,
  getLastActiveProviderInfo,
} from "@/lib/binance-agent-os/adapter";
import type { KlineInterval } from "@/lib/binance-agent-os/types";

const SUPPORTED_INTERVALS = new Set<KlineInterval>([
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

function clampLimit(raw: string | null): number {
  const parsed = raw ? Number.parseInt(raw, 10) : 60;
  if (Number.isNaN(parsed)) return 60;
  return Math.min(500, Math.max(2, parsed));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const rawSymbol = searchParams.get("symbol") ?? "BTCUSDT";
  const symbol = rawSymbol.trim().toUpperCase();
  if (!/^[A-Z0-9]{5,20}$/.test(symbol)) {
    return Response.json(
      { success: false, error: "Invalid symbol" },
      { status: 400 }
    );
  }

  const rawInterval = searchParams.get("interval") ?? "5m";
  const interval = rawInterval as KlineInterval;
  if (!SUPPORTED_INTERVALS.has(interval)) {
    return Response.json(
      { success: false, error: "Unsupported interval" },
      { status: 400 }
    );
  }

  const limit = clampLimit(searchParams.get("limit"));

  try {
    const provider = getMarketDataProvider();
    const klines = await provider.getKlines(symbol, interval, limit);
    const sourceInfo = getLastActiveProviderInfo();

    if (!Array.isArray(klines) || klines.length < 2) {
      return Response.json(
        { success: false, error: "Insufficient kline data returned" },
        { status: 502 }
      );
    }

    return Response.json(
      {
        success: true,
        symbol,
        interval,
        source: sourceInfo?.id ?? provider.id,
        sourceName: sourceInfo?.name ?? provider.name,
        candles: klines.map((k) => ({
          openTime: k.openTime,
          close: k.close,
          open: k.open,
          high: k.high,
          low: k.low,
        })),
      },
      {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return Response.json(
      {
        success: false,
        error: "Unable to fetch klines",
        detail: message,
      },
      { status: 500 }
    );
  }
}