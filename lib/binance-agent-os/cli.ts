/**
 * Binance CLI market-data provider (server-side).
 *
 * Integrates the OFFICIAL Binance skill tooling from `.agents/skills/binance`:
 * the `binance-cli` executable (SKILL.md). The skill is CLI-skill tooling — a
 * Next.js agent "uses the skill" by invoking `binance-cli` as a subprocess
 * with the public command surface documented in `references/spot.md`.
 *
 * SCOPE — PUBLIC MARKET-DATA ONLY:
 *   This provider issues ONLY the read-only, unauthenticated SPOT market-data
 *   commands:
 *     - `spot klines`          (GET /api/v3/klines)
 *     - `spot ticker24hr`      (GET /api/v3/ticker/24hr)
 *     - `spot exchange-info`   (GET /api/v3/exchangeInfo)
 *   These are the same REST endpoints the existing public REST provider uses,
 *   but resolved through the official Binance CLI binary.
 *
 *   It NEVER invokes `--signed`, `--profile`, or any trading / account /
 *   balance / transfer / wallet command. No API credentials are required for
 *   these public endpoints, and none are read or sent.
 *
 * ACTIVATION POLICY (mirrors Phase 10.1 rule 7 for the MCP provider):
 *   Disabled by default. It is only used when the server operator explicitly
 *   sets `BINANCE_ENABLE_CLI_PROVIDER=1` AND selects it via
 *   `BINANCE_MARKET_DATA_PROVIDER=binance-cli-public-api`. Otherwise it throws
 *   `CliProviderUnavailableError` so the default Binance → CoinGecko chain
 *   serves traffic untouched.
 *
 * The binary availability and JSON responses are verified at runtime with
 * real subprocess execution — nothing is mocked or fabricated.
 */

import { spawn } from "node:child_process";
import type {
  Kline,
  KlineInterval,
  MarketDataProvider,
  MarketSnapshot,
  SymbolInfo,
  Ticker24h,
} from "./types";

const DEFAULT_KLINE_LIMIT = 200;
const CLI_TIMEOUT_MS = 20_000;
const MAX_BUFFER_BYTES = 4 * 1024 * 1024;

/** Thrown when the CLI provider is not permitted to run (gate not satisfied). */
export class CliProviderUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CliProviderUnavailableError";
  }
}

/**
 * Allowed kline intervals — exactly the enum documented in the skill's
 * `references/spot.md` (intersected with the domain `KlineInterval`).
 */
const SUPPORTED_INTERVALS: ReadonlySet<KlineInterval> = new Set<KlineInterval>([
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

/** Validate a symbol is a safe Binance trading-pair token (no shell chars). */
function isSafeSymbol(symbol: string): boolean {
  return /^[A-Z][A-Z0-9]{1,29}$/.test(symbol.toUpperCase());
}

function truthy(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/** Quote an argument for a single command line (Windows-safe). */
function quoteArg(arg: string): string {
  if (/^[A-Z0-9:.,_/-]+$/i.test(arg) && !arg.includes(" ")) return arg;
  return `"${arg.replace(/"/g, '\\"')}"`;
}

/**
 * Run `binance-cli` with an argument list, capturing stdout.
 *
 * The CLI reads stdin synchronously until EOF when run non-interactively (not
 * a TTY), so stdin is piped and immediately ended to avoid a hang. On Windows
 * a `.cmd` shim needs a shell; arguments are fully validated/constructed by
 * this module so the constructed command line is safe.
 */
function runCli(args: string[], timeoutMs = CLI_TIMEOUT_MS): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const isWindows = process.platform === "win32";
    const command = isWindows ? `binance-cli ${args.map(quoteArg).join(" ")}` : "binance-cli";

    const child = spawn(/*turbopackIgnore: true*/ isWindows ? (process.env.ComSpec ?? "cmd.exe") : "binance-cli",
      isWindows ? ["/d", "/s", "/c", command] : args,
      {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      }
    );

    // Close stdin immediately — the CLI reads to EOF when not a TTY.
    child.stdin.end();

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error(`binance-cli timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
      if (stdout.length > MAX_BUFFER_BYTES) {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        child.kill("SIGKILL");
        reject(new Error("binance-cli stdout exceeded buffer limit"));
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      // Distinguish "binary not installed" (ENOENT) from other spawn errors.
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new CliProviderUnavailableError(
            "binance-cli is not installed or not on PATH. Install it per the " +
              "official Binance skill (.agents/skills/binance/SKILL.md) to use " +
              "this provider."
          )
        );
      } else {
        reject(err instanceof Error ? err : new Error(String(err)));
      }
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        const detail = stderr.trim() || `exit code ${code}`;
        reject(new Error(`binance-cli failed (${detail})`));
        return;
      }
      // The skill notes agents should use both stdout and stderr output.
      if (stderr.trim() && !stdout.trim()) {
        reject(new Error(stderr.trim()));
        return;
      }
      resolve(stdout);
    });
  });
}

/** Convert a raw Binance kline array into a typed `Kline`. */
function parseKline(raw: unknown[]): Kline {
  return {
    openTime: Number(raw[0]),
    open: Number(raw[1]),
    high: Number(raw[2]),
    low: Number(raw[3]),
    close: Number(raw[4]),
    volume: Number(raw[5]),
    closeTime: Number(raw[6]),
    quoteAssetVolume: Number(raw[7]),
    numberOfTrades: Number(raw[8]),
  };
}

interface RawTicker24h {
  symbol: string;
  lastPrice?: string;
  priceChange?: string;
  priceChangePercent?: string;
  highPrice?: string;
  lowPrice?: string;
  volume?: string;
  quoteVolume?: string;
  count?: string | number;
}

interface RawSymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  isSpotTradingAllowed: boolean;
  baseAssetPrecision: number;
  quotePrecision: number;
  filters?: unknown[];
}

export class BinanceCliMarketDataProvider implements MarketDataProvider {
  readonly id = "binance-cli-public-api" as const;
  readonly name = "Binance CLI (Public Market Data)";

  private get enabled(): boolean {
    return truthy(process.env.BINANCE_ENABLE_CLI_PROVIDER);
  }

  private assertPermitted(): void {
    if (!this.enabled) {
      throw new CliProviderUnavailableError(
        "Binance CLI provider is disabled. Set BINANCE_ENABLE_CLI_PROVIDER=1 " +
          "to activate it (no API credentials are needed for its public " +
          "market-data commands). The active provider chain is unaffected until then."
      );
    }
  }

  async isSymbolValid(symbol: string): Promise<boolean> {
    this.assertPermitted();
    const normalized = symbol.toUpperCase();
    if (!isSafeSymbol(normalized)) return false;
    try {
      const out = await runCli(["spot", "ticker24hr", "--symbol", normalized]);
      const parsed = JSON.parse(out) as RawTicker24h;
      return parsed.symbol === normalized && isFinite(Number(parsed.lastPrice));
    } catch {
      return false;
    }
  }

  async getTicker24h(symbol: string): Promise<Ticker24h> {
    this.assertPermitted();
    const normalized = symbol.toUpperCase();
    if (!isSafeSymbol(normalized)) {
      throw new CliProviderUnavailableError(`Unsafe symbol: ${symbol}`);
    }
    const out = await runCli(["spot", "ticker24hr", "--symbol", normalized]);
    const raw = JSON.parse(out) as RawTicker24h;
    if (raw.symbol !== normalized) {
      throw new Error(`binance-cli returned unexpected symbol ${raw.symbol ?? "<unknown>"}`);
    }
    const lastPrice = Number(raw.lastPrice ?? 0);
    return {
      symbol: raw.symbol,
      lastPrice,
      priceChange: Number(raw.priceChange ?? 0),
      priceChangePercent: Number(raw.priceChangePercent ?? 0),
      highPrice: Number(raw.highPrice ?? lastPrice),
      lowPrice: Number(raw.lowPrice ?? lastPrice),
      volume: Number(raw.volume ?? 0),
      quoteVolume: Number(raw.quoteVolume ?? 0),
      count: Number(raw.count ?? 0),
    };
  }

  async getKlines(
    symbol: string,
    interval: KlineInterval,
    limit = DEFAULT_KLINE_LIMIT
  ): Promise<Kline[]> {
    this.assertPermitted();
    const normalized = symbol.toUpperCase();
    if (!isSafeSymbol(normalized)) {
      throw new CliProviderUnavailableError(`Unsafe symbol: ${symbol}`);
    }
    if (!SUPPORTED_INTERVALS.has(interval)) {
      throw new Error(`Unsupported kline interval for binance-cli: ${interval}`);
    }
    const cappedLimit = Math.min(1000, Math.max(1, Math.floor(limit)));
    const out = await runCli([
      "spot",
      "klines",
      "--symbol", normalized,
      "--interval", interval,
      "--limit", String(cappedLimit),
    ]);
    const raw = JSON.parse(out) as unknown[][];
    return raw.map(parseKline).slice(-cappedLimit);
  }

  async getSymbolInfo(symbol: string): Promise<SymbolInfo> {
    this.assertPermitted();
    const normalized = symbol.toUpperCase();
    if (!isSafeSymbol(normalized)) {
      throw new CliProviderUnavailableError(`Unsafe symbol: ${symbol}`);
    }
    const out = await runCli(["spot", "exchange-info", "--symbol", normalized]);
    const parsed = JSON.parse(out) as { symbols?: RawSymbolInfo[] };
    const raw = parsed.symbols?.find((s) => s.symbol === normalized);
    if (!raw) {
      throw new Error(`binance-cli returned no exchange info for ${normalized}`);
    }
    return {
      symbol: raw.symbol,
      baseAsset: raw.baseAsset,
      quoteAsset: raw.quoteAsset,
      status: raw.status,
      isSpotTradingAllowed: raw.isSpotTradingAllowed,
      baseAssetPrecision: raw.baseAssetPrecision,
      quotePrecision: raw.quotePrecision,
      filters: raw.filters as unknown as Record<string, unknown>,
    };
  }

  async getMarketSnapshot(
    symbol: string,
    opts?: { interval?: KlineInterval; klineLimit?: number }
  ): Promise<MarketSnapshot> {
    this.assertPermitted();
    const normalized = symbol.toUpperCase();
    if (!isSafeSymbol(normalized)) {
      throw new CliProviderUnavailableError(`Unsafe symbol: ${symbol}`);
    }

    const interval = opts?.interval ?? "1d";
    const klineLimit = opts?.klineLimit ?? DEFAULT_KLINE_LIMIT;

    const [ticker, klines, symbolInfo] = await Promise.all([
      this.getTicker24h(normalized),
      this.getKlines(normalized, interval, klineLimit),
      this.getSymbolInfo(normalized),
    ]);

    return {
      symbol: normalized,
      baseAsset: symbolInfo.baseAsset,
      quoteAsset: symbolInfo.quoteAsset,
      ticker,
      klines,
      interval,
      source: this.id,
      timestamp: Date.now(),
    };
  }
}