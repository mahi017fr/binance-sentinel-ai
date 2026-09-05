import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the adapter so the real Binance/CoinGecko providers are never contacted.
vi.mock("@/lib/binance-agent-os/adapter", async () => {
  const { providerState } = await import("./state");
  return {
    getMarketDataProvider: () => providerState.provider!,
    getLastActiveProviderInfo: () =>
      providerState.provider
        ? { id: providerState.provider.id, name: providerState.provider.name }
        : null,
  };
});

import {
  analyzeMarketTool,
  getCurrentPrice,
  getMarketData,
  McpToolError,
  resolveSupportedSymbol,
  SUPPORTED_SYMBOLS,
} from "@/lib/mcp/sentinel-tools";
import { resetFakeProvider } from "./mocks";

beforeEach(() => {
  resetFakeProvider();
});

describe("resolveSupportedSymbol", () => {
  it("normalizes case and whitespace", () => {
    expect(resolveSupportedSymbol("  btcusdt ")).toBe("BTCUSDT");
  });

  it("rejects unsupported symbols with the supported universe", () => {
    try {
      resolveSupportedSymbol("LTCUSDT");
      throw new Error("expected McpToolError");
    } catch (err) {
      expect(err).toBeInstanceOf(McpToolError);
      const e = err as McpToolError;
      expect(e.kind).toBe("invalid-symbol");
      expect(e.message).toContain("Unsupported symbol");
      expect(e.message).toContain("ETHUSDT");
    }
  });

  it("accepts the full supported universe", () => {
    for (const symbol of SUPPORTED_SYMBOLS) {
      expect(resolveSupportedSymbol(symbol)).toBe(symbol);
    }
  });
});

describe("getCurrentPrice", () => {
  it("returns real ticker fields + honest source, via primary provider", async () => {
    const r = await getCurrentPrice("BTCUSDT");
    expect(r.symbol).toBe("BTCUSDT");
    expect(typeof r.currentPrice).toBe("number");
    expect(r.currentPrice).toBeGreaterThan(0);
    expect(typeof r.priceChange24h).toBe("number");
    expect(r.high24h).toBeGreaterThan(r.low24h);
    expect(r.volume).toBeGreaterThan(0);
    expect(r.quoteVolume).toBeGreaterThan(0);
    expect(r.trades).toBeGreaterThan(0);
    expect(r.dataSource).toBe("Binance Public Market Data");
    expect(r.fallbackUsed).toBe(false);
    expect(typeof r.timestamp).toBe("string");
  });

  it("throws a safe provider error when the provider fails", async () => {
    resetFakeProvider({ failTicker: true });
    await expect(getCurrentPrice("BTCUSDT")).rejects.toThrow(
      "Market data is temporarily unavailable."
    );
    await expect(getCurrentPrice("BTCUSDT")).rejects.toMatchObject({ kind: "provider" });
  });

  it("rejects unsupported symbols", async () => {
    await expect(getCurrentPrice("DOGE")).rejects.toMatchObject({
      kind: "invalid-symbol",
    });
  });
});

describe("getMarketData", () => {
  it("returns snapshot fields with recent bars", async () => {
    const r = await getMarketData("ETHUSDT");
    expect(r.symbol).toBe("ETHUSDT");
    expect(r.baseAsset).toBe("ETH");
    expect(r.quoteAsset).toBe("USDT");
    expect(r.interval).toBe("1d");
    expect(r.currentPrice).toBeGreaterThan(0);
    expect(r.recentBars.length).toBeLessThanOrEqual(20);
    expect(r.klineCount).toBeGreaterThan(0);
    expect(r.dataSource).toBe("Binance Public Market Data");
    expect(r.fallbackUsed).toBe(false);
  });

  it("reports fallbackUsed true when the snapshot came from CoinGecko", async () => {
    resetFakeProvider({ id: "coingecko-public-api", name: "CoinGecko Public Market Data" });
    const r = await getMarketData("BTCUSDT");
    expect(r.dataSource).toBe("CoinGecko Public Market Data");
    expect(r.fallbackUsed).toBe(true);
  });

  it("throws a safe provider error when the snapshot fails", async () => {
    resetFakeProvider({ failSnapshot: true });
    await expect(getMarketData("BTCUSDT")).rejects.toThrow(
      "Market data is temporarily unavailable."
    );
  });
});

describe("analyzeMarketTool", () => {
  it("runs the real pipeline and returns a rich research-only result", async () => {
    const r = await analyzeMarketTool("BTCUSDT");
    expect(r.symbol).toBe("BTCUSDT");
    expect(r.currentPrice).toBeGreaterThan(0);
    expect(typeof r.priceChange24h).toBe("number");

    // Risk / readiness run through the deterministic engines.
    expect(typeof r.riskScore).toBe("number");
    expect(r.riskScore).toBeGreaterThanOrEqual(0);
    expect(typeof r.riskLabel).toBe("string");
    expect(typeof r.readinessScore).toBe("number");
    expect(typeof r.readinessLabel).toBe("string");

    // Directional signal reuses the dashboard's deterministic path.
    expect(["UP", "DOWN", "NEUTRAL"]).toContain(r.directionalSignal);
    expect(r.modelConfidence).toBeGreaterThanOrEqual(0);
    expect(r.modelConfidence).toBeLessThanOrEqual(100);
    expect(Array.isArray(r.evidence)).toBe(true);
    expect(r.evidence.length).toBeGreaterThanOrEqual(2);

    // Structural bands from the analysis modules.
    expect(["bullish", "bearish", "neutral"]).toContain(r.momentum.direction);
    expect(r.volatility.level).toBeGreaterThanOrEqual(0);
    expect(r.volatility.level).toBeLessThanOrEqual(1);
    expect(["Low", "Moderate", "High"]).toContain(r.volatility.band);
    expect(typeof r.activity.quoteVolume).toBe("number");
    expect(typeof r.drawdown.current).toBe("number");
    expect(typeof r.drawdown.max).toBe("number");

    // Source honesty + research-only guarantee.
    expect(r.dataSource).toBe("Binance Public Market Data");
    expect(r.fallbackUsed).toBe(false);
    expect(r.researchOnly).toBe(true);
    expect(typeof r.timestamp).toBe("string");
  });

  it("responds consistently to the same input (deterministic)", async () => {
    const a = await analyzeMarketTool("BTCUSDT");
    const b = await analyzeMarketTool("BTCUSDT");
    expect(a.directionalSignal).toBe(b.directionalSignal);
    expect(a.modelConfidence).toBe(b.modelConfidence);
    expect(a.evidence).toEqual(b.evidence);
  });

  it("reports fallbackUsed when analyzing via CoinGecko", async () => {
    resetFakeProvider({ id: "coingecko-public-api", name: "CoinGecko Public Market Data" });
    const r = await analyzeMarketTool("SOLUSDT");
    expect(r.dataSource).toBe("CoinGecko Public Market Data");
    expect(r.fallbackUsed).toBe(true);
  });
});