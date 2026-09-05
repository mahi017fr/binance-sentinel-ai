"use client";

/**
 * useKlines — real sparkline data for the hero BTC live card.
 *
 * Fetches the read-only `/api/market/klines` feed (same provider chain as
 * /api/market — Binance public API with CoinGecko fallback) and exposes the
 * closing prices + actual source. No polling storm: one fetch per symbol,
 * plus a manual refresh.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export interface KlineCandle {
  openTime: number;
  close: number;
  open: number;
  high: number;
  low: number;
}

export interface UseKlines {
  status: "idle" | "loading" | "done" | "error";
  closes: number[];
  candles: KlineCandle[];
  sourceName: string | null;
  error: string | null;
  refresh: () => Promise<void>;
}

interface KlinesResponse {
  candles?: KlineCandle[];
  sourceName?: string | null;
}

async function fetchKlines(symbol: string, interval: string, limit: number): Promise<KlinesResponse> {
  const res = await fetch(
    `/api/market/klines?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(interval)}&limit=${limit}`
  );
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Klines failed with status ${res.status}`);
  }
  const data = await res.json();
  if (!data || !Array.isArray(data.candles) || data.candles.length < 2) {
    throw new Error("Klines returned malformed data.");
  }
  return { candles: data.candles as KlineCandle[], sourceName: data.sourceName ?? null };
}

export function useKlines(
  symbol: string,
  interval = "5m",
  limit = 48
): UseKlines {
  const [status, setStatus] = useState<UseKlines["status"]>("idle");
  const [candles, setCandles] = useState<KlineCandle[]>([]);
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setStatus("loading");
    setError(null);

    try {
      const data = await fetchKlines(symbol, interval, limit);
      setCandles(data.candles ?? []);
      setSourceName(data.sourceName ?? null);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Klines unavailable.");
      setStatus("error");
    } finally {
      inFlight.current = false;
    }
  }, [symbol, interval, limit]);

  useEffect(() => {
    let cancelled = false;

    fetchKlines(symbol, interval, limit)
      .then((data) => {
        if (cancelled) return;
        setCandles(data.candles ?? []);
        setSourceName(data.sourceName ?? null);
        setStatus("done");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Klines unavailable.");
        setStatus("error");
      })
      .finally(() => {
        inFlight.current = false;
      });
    inFlight.current = true;

    return () => {
      cancelled = true;
    };
  }, [symbol, interval, limit]);

  return {
    status,
    closes: candles.map((c) => c.close),
    candles,
    sourceName,
    error,
    refresh,
  };
}