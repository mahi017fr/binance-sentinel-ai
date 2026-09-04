"use client";

import { useEffect, useState } from "react";

type Market = {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  quoteVolume: number;
  volatility: number;
  riskScore: number;
  opportunityScore: number;
};

type ApiResponse = {
  success: boolean;
  source: string;
  updatedAt: string;
  data: Market[];
};

function formatPrice(price: number) {
  if (price >= 1000) {
    return price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  if (price >= 1) {
    return price.toFixed(4);
  }

  return price.toFixed(6);
}

function getRiskLabel(score: number) {
  if (score < 30) return "Low";
  if (score < 55) return "Moderate";
  if (score < 75) return "High";
  return "Extreme";
}

export function MarketScanner() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchMarkets = async () => {
    try {
      setError(null);

      const response = await fetch("/api/scanner", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch market data");
      }

      const result: ApiResponse = await response.json();

      if (!result.success) {
        throw new Error("Market scanner unavailable");
      }

      setMarkets(result.data);
      setLastUpdated(result.updatedAt);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();

    const interval = setInterval(() => {
      fetchMarkets();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const bestOpportunity = markets[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-100">
            Market Scanner
          </h1>

          <p className="mt-1 text-sm text-zinc-400">
            Live Binance market intelligence across major assets.
          </p>
        </div>

        <button
          onClick={fetchMarkets}
          className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm font-medium text-yellow-400 transition hover:bg-yellow-500/20"
        >
          ↻ Refresh
        </button>
      </div>

      {/* Status */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        <span className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          LIVE BINANCE DATA
        </span>

        {lastUpdated && (
          <span>
            Updated:{" "}
            {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Best Opportunity */}
      {bestOpportunity && (
        <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/5 p-5">
          <div className="text-xs font-medium uppercase tracking-wider text-yellow-500">
            Best Opportunity
          </div>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="text-2xl font-bold text-zinc-100">
                {bestOpportunity.symbol.replace("USDT", "")}
              </div>

              <div className="mt-1 text-sm text-zinc-400">
                ${formatPrice(bestOpportunity.price)}
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm text-zinc-400">
                Opportunity Score
              </div>

              <div className="text-3xl font-bold text-yellow-400">
                {bestOpportunity.opportunityScore.toFixed(1)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-10 text-center text-zinc-400">
          Scanning live Binance markets...
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-5 text-red-400">
          {error}
        </div>
      )}

      {/* Market Table */}
      {!loading && !error && (
        <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px]">
              <thead className="border-b border-zinc-800 bg-zinc-900/70">
                <tr className="text-left text-xs uppercase tracking-wider text-zinc-500">
                  <th className="px-5 py-4">Asset</th>
                  <th className="px-5 py-4">Price</th>
                  <th className="px-5 py-4">24H</th>
                  <th className="px-5 py-4">Volatility</th>
                  <th className="px-5 py-4">Risk</th>
                  <th className="px-5 py-4">Opportunity</th>
                </tr>
              </thead>

              <tbody>
                {markets.map((market) => {
                  const positive =
                    market.change24h >= 0;

                  return (
                    <tr
                      key={market.symbol}
                      className="border-b border-zinc-800/70 transition hover:bg-zinc-800/30"
                    >
                      <td className="px-5 py-4">
                        <div className="font-semibold text-zinc-100">
                          {market.symbol.replace("USDT", "")}
                        </div>

                        <div className="mt-1 text-xs text-zinc-500">
                          {market.symbol}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-medium text-zinc-200">
                        ${formatPrice(market.price)}
                      </td>

                      <td
                        className={`px-5 py-4 font-medium ${
                          positive
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {positive ? "+" : ""}
                        {market.change24h.toFixed(2)}%
                      </td>

                      <td className="px-5 py-4 text-zinc-300">
                        {market.volatility.toFixed(2)}%
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-20 overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-2 rounded-full bg-yellow-400"
                              style={{
                                width: `${market.riskScore}%`,
                              }}
                            />
                          </div>

                          <span className="text-sm text-zinc-300">
                            {market.riskScore.toFixed(1)}
                          </span>
                        </div>

                        <div className="mt-1 text-xs text-zinc-500">
                          {getRiskLabel(market.riskScore)}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-20 overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className="h-2 rounded-full bg-sky-400"
                              style={{
                                width: `${market.opportunityScore}%`,
                              }}
                            />
                          </div>

                          <span className="font-medium text-sky-400">
                            {market.opportunityScore.toFixed(1)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}