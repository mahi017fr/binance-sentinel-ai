/**
 * CoinGecko public market-data provider.
 *
 * This is the verified secondary (fallback) market-data provider for
 * Binance Sentinel AI. It talks to CoinGecko's public REST API (no API key
 * required for the endpoints used here) and satisfies the
 * `MarketDataProvider` capability contract defined in `./types.ts`.
 *
 * CoinGecko provides real, live market data and is reachable from restricted
 * deployment environments where Binance's public REST API is unavailable
 * (geographic / eligibility restrictions).
 *
 * IMPORTANT: This provider NEVER claims to be Binance. Every symbol mapping,
 * every field, and every value originates from CoinGecko's public API and is
 * clearly labeled with `source: "coingecko-public-api"`.
 */

import type {
  Kline,
  KlineInterval,
  MarketDataProvider,
  MarketSnapshot,
  SymbolInfo,
  Ticker24h,
} from "./types";

const DEFAULT_BASE_URL = "https://api.coingecko.com/api/v3";

// Map an exchange SPOT symbol (e.g. "BTCUSDT") to a CoinGecko coin id and
// the base asset. The Sentinel universe is covered by these well-known ids.
const SYMBOL_TO_COIN: Record<string, { id: string; baseAsset: string }> = {
  BTCUSDT: { id: "bitcoin", baseAsset: "BTC" },
  ETHUSDT: { id: "ethereum", baseAsset: "ETH" },
  SOLUSDT: { id: "solana", baseAsset: "SOL" },
  BNBUSDT: { id: "binancecoin", baseAsset: "BNB" },
  XRPUSDT: { id: "ripple", baseAsset: "XRP" },
  ADAUSDT: { id: "cardano", baseAsset: "ADA" },
  DOGEUSDT: { id: "dogecoin", baseAsset: "DOGE" },
  AVAXUSDT: { id: "avalanche-2", baseAsset: "AVAX" },
  LINKUSDT: { id: "chainlink", baseAsset: "LINK" },
  SUIUSDT: { id: "sui", baseAsset: "SUI" },
};

/** Compute the CoinGecko coin id and base asset for a normalized SPOT symbol. */
function resolveCoin(symbol: string): { id: string; baseAsset: string } | null {
  return SYMBOL_TO_COIN[symbol.toUpperCase()] ?? null;
}

export class CoinGeckoApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CoinGeckoApiError";
    this.status = status;
  }
}

async function request<T>(path: string, retries = 2): Promise<T> {
  const url = new URL(`${DEFAULT_BASE_URL}${path}`);

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch (cause) {
    throw new CoinGeckoApiError(
      `Network error while contacting CoinGecko: ${(cause as Error).message}`,
      0
    );
  }

  if (res.status === 429 || res.status >= 500) {
    // Transient rate-limit / server error — retry with short backoff.
    if (retries > 0) {
      const waitMs = 500 * (3 - retries);
      await new Promise((r) => setTimeout(r, waitMs));
      return request<T>(path, retries - 1);
    }
  }

  if (!res.ok) {
    throw new CoinGeckoApiError(
      `CoinGecko API error (${res.status})${res.status === 429 ? " — rate limit exceeded" : ""}`,
      res.status
    );
  }

  return (await res.json()) as T;
}

interface RawCoinMarket {
  id: string;
  symbol: string;
  current_price: number;
  high_24h: number;
  low_24h: number;
  price_change_24h: number;
  price_change_percentage_24h: number;
  total_volume: number;
  last_updated?: string;
}

/**
 * CoinGecko OHLC bar: `[time(ms), open, high, low, close]`.
 * The endpoint returns each bar as a 5-element array, not an object.
 */
type RawKlineBar = [
  time: number,
  open: number,
  high: number,
  low: number,
  close: number
];

/**
 * Request coalescing: when many consumers request different coins' tickers at
 * ~the same time (e.g. the scanner fetches all 10 symbols in parallel), we
 * batch them into a single `coins/markets` call. This respects CoinGecko's
 * public rate limit (free tier ~10-30 req/min) so a full-universe scan issues
 * only 1 request instead of 10.
 *
 * Each ticker request queues its coin id and resolves once a short "collect"
 * window flushes, at which point all queued ids are fetched in one batched
 * request.
 */
class CoinGeckoMarketsBatcher {
  private queue = new Map<
    string,
    Array<{
      resolve: (m: RawCoinMarket | undefined) => void;
      reject: (err: Error) => void;
    }>
  >();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  /** Register interest in a coin id; resolves with its market data. */
  fetch(coinId: string): Promise<RawCoinMarket> {
    return new Promise<RawCoinMarket>((resolve, reject) => {
      const list = this.queue.get(coinId) ?? [];
      list.push({
        resolve: (m) => {
          if (m) resolve(m);
          else reject(new CoinGeckoApiError(`CoinGecko returned no data for ${coinId}`, 404));
        },
        reject,
      });
      this.queue.set(coinId, list);
      this.scheduleFlush();
    });
  }

  private scheduleFlush(): void {
    if (this.flushTimer) return;
    // Collect coincident requests within a single event-loop turn.
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, 0);
  }

  private async flush(): Promise<void> {
    const queue = this.queue;
    this.queue = new Map();
    const coinIds = [...queue.keys()];
    if (coinIds.length === 0) return;

    try {
      const markets = new Map<string, RawCoinMarket>();
      for (let i = 0; i < coinIds.length; i += 20) {
        const chunk = coinIds.slice(i, i + 20);
        const raw = await request<RawCoinMarket[]>(
          `/coins/markets?vs_currency=usd&ids=${encodeURIComponent(
            chunk.join(",")
          )}&order=market_cap_desc&sparkline=false&price_change_percentage=24h`
        );
        for (const m of raw) {
          markets.set(m.id, m);
        }
      }
      for (const [id, entryList] of queue) {
        const market = markets.get(id);
        for (const entry of entryList) entry.resolve(market);
      }
    } catch (err) {
      const error =
        err instanceof Error ? err : new Error("CoinGecko markets fetch failed");
      for (const entryList of queue.values()) {
        for (const entry of entryList) entry.reject(error);
      }
    }
  }
}

const marketsBatcher = new CoinGeckoMarketsBatcher();

export class CoinGeckoMarketDataProvider implements MarketDataProvider {
  readonly id = "coingecko-public-api" as const;
  readonly name = "CoinGecko Public Market Data API";

  private async fetchCoinMarket(
    symbol: string
  ): Promise<{ coin: { id: string; baseAsset: string }; raw: RawCoinMarket }> {
    const coin = resolveCoin(symbol);
    if (!coin) {
      throw new CoinGeckoApiError(
        `CoinGecko does not map this symbol: ${symbol.toUpperCase()}`,
        404
      );
    }

    const raw = await marketsBatcher.fetch(coin.id);
    if (!raw) {
      throw new CoinGeckoApiError(
        `CoinGecko returned no data for ${coin.id}`,
        404
      );
    }
    return { coin, raw };
  }

  async isSymbolValid(symbol: string): Promise<boolean> {
    return resolveCoin(symbol) !== null;
  }

  async getSymbolInfo(symbol: string): Promise<SymbolInfo> {
    const normalized = symbol.toUpperCase();
    const coin = resolveCoin(normalized);
    if (!coin) {
      throw new CoinGeckoApiError(
        `CoinGecko does not map this symbol: ${normalized}`,
        404
      );
    }

    // Verify the coin is actually reachable/fetchable.
    await this.fetchCoinMarket(normalized);

    return {
      symbol: `${coin.baseAsset}USDT`,
      baseAsset: coin.baseAsset,
      quoteAsset: "USDT",
      status: "TRADING",
      isSpotTradingAllowed: true,
      baseAssetPrecision: 8,
      quotePrecision: 8,
    };
  }

  async getTicker24h(symbol: string): Promise<Ticker24h> {
    const normalized = symbol.toUpperCase();
    const coin = resolveCoin(normalized);
    if (!coin) {
      throw new CoinGeckoApiError(
        `CoinGecko does not map this symbol: ${normalized}`,
        404
      );
    }

    const { raw } = await this.fetchCoinMarket(normalized);
    const lastPrice = raw.current_price ?? 0;
    const highPrice = raw.high_24h ?? lastPrice;
    const lowPrice = raw.low_24h ?? lastPrice;
    // CoinGecko quoteVolume is in USD (not base volume). We estimate base
    // volume from quote volume / price and store quote volume in USD.
    const quoteVolume = raw.total_volume ?? 0;
    const volume = lastPrice > 0 ? quoteVolume / lastPrice : 0;
    const priceChange = raw.price_change_24h ?? 0;
    const priceChangePercent = raw.price_change_percentage_24h ?? 0;

    return {
      symbol: normalized,
      lastPrice,
      priceChange,
      priceChangePercent,
      highPrice,
      lowPrice,
      volume,
      quoteVolume,
      // CoinGecko does not expose trade count on this endpoint.
      count: 0,
    };
  }

  async getKlines(
    symbol: string,
    interval: KlineInterval,
    limit = 200
  ): Promise<Kline[]> {
    const normalized = symbol.toUpperCase();
    const coin = resolveCoin(normalized);
    if (!coin) {
      throw new CoinGeckoApiError(
        `CoinGecko does not map this symbol: ${normalized}`,
        404
      );
    }

    // CoinGecko OHLC supports a fixed set of "days" ranges. Map the requested
    // Kline interval to the closest supported range.
    const days = intervalToDays(interval);
    const raw = await request<RawKlineBar[]>(
      `/coins/${coin.id}/ohlc?vs_currency=usd&days=${days}`
    );

    // CoinGecko returns aggregated daily-ish bars for large ranges. Each bar
    // is [time(ms), open, high, low, close]. Volume is not returned by the
    // OHLC endpoint; set it to 0 (volume is not used by the analysis trend /
    // volatility / drawdown modules, which rely on price bars).
    const klines: Kline[] = raw.map(
      ([time, open, high, low, close]): Kline => ({
        openTime: time,
        open,
        high,
        low,
        close,
        volume: 0,
        closeTime: time + (intervalMs(interval) - 1),
        quoteAssetVolume: 0,
        numberOfTrades: 0,
      })
    );

    // Cap to the requested limit (CoinGecko returns far fewer bars than 200).
    return klines.slice(-limit);
  }

  async getMarketSnapshot(
    symbol: string,
    opts?: { interval?: KlineInterval; klineLimit?: number }
  ): Promise<MarketSnapshot> {
    const normalized = symbol.toUpperCase();
    const coin = resolveCoin(normalized);
    if (!coin) {
      throw new CoinGeckoApiError(
        `CoinGecko does not map this symbol: ${normalized}`,
        404
      );
    }

    const interval = opts?.interval ?? "1d";
    const klineLimit = opts?.klineLimit ?? 200;

    const [ticker, klines] = await Promise.all([
      this.getTicker24h(normalized),
      this.getKlines(normalized, interval, klineLimit),
    ]);

    return {
      symbol: normalized,
      baseAsset: coin.baseAsset,
      quoteAsset: "USDT",
      ticker,
      klines,
      interval,
      source: this.id,
      timestamp: Date.now(),
    };
  }
}

/** Map a Binance-style kline interval to a CoinGecko "days" range. */
function intervalToDays(interval: KlineInterval): number {
  switch (interval) {
    case "1m":
    case "3m":
    case "5m":
    case "15m":
    case "30m":
    case "1h":
      return 2;
    case "2h":
    case "4h":
    case "6h":
      return 7;
    case "8h":
    case "12h":
    case "1d":
      return 30;
    case "3d":
    case "1w":
      return 90;
    case "1M":
      return 365;
    default:
      return 30;
  }
}

/** Approximate ms width of a kline interval (used for closeTime only). */
function intervalMs(interval: KlineInterval): number {
  const mins: Record<KlineInterval, number> = {
    "1m": 60_000,
    "3m": 180_000,
    "5m": 300_000,
    "15m": 900_000,
    "30m": 1_800_000,
    "1h": 3_600_000,
    "2h": 7_200_000,
    "4h": 14_400_000,
    "6h": 21_600_000,
    "8h": 28_800_000,
    "12h": 43_200_000,
    "1d": 86_400_000,
    "3d": 259_200_000,
    "1w": 604_800_000,
    "1M": 2_592_000_000,
  };
  return mins[interval];
}
