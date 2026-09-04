# Demo Script

A concise 2–3 minute walkthrough of Binance Sentinel AI.

---

## 1. Introduction (15 seconds)

**Open the application.**

> "This is Binance Sentinel AI — a research-focused multi-stage market
> intelligence application. It combines a live market scanner with a
> deterministic analysis engine and a multi-agent workflow to produce
> explainable risk profiles for digital assets.
>
> Everything you see uses real live Binance market data. No mock data,
> no fabricated scores. Research and decision-support only."

---

## 2. Market Scanner (45 seconds)

**Navigate to the Market Scanner tab.**

> "The Market Scanner scans 10 liquid USDT pairs from the Sentinel Market
> Universe — BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, LINK, and SUI."

**Click "Scan Market".**

> "It's fetching real-time market data right now — Binance's public API first,
> with an automatic fallback to CoinGecko if Binance is unavailable."

**Wait for results. Point out the "Market Data Source" indicator.**

> "The data source is shown honestly. If Binance serves the data, it says
> Binance. If the deployment environment blocks Binance, it automatically
> falls back to CoinGecko — and clearly labels that as the source. Fallback
> data is never claimed as Binance data."

**Point out the table.**

> "Each asset is classified by four deterministic metrics:
> - **Volatility** — based on the 24h price range
> - **Momentum** — based on 24h directional change
> - **Risk** — a lightweight ticker-based heuristic
> - **Activity** — relative trading volume within the universe"

**Point out the highlights section.**

> "The highlights show which assets have high volatility, strong momentum,
> elevated risk, or high activity — all derived from real data."

**Point out the Evaluation Panel and DataSourceStatus.**

> "The evaluation panel shows real runtime metrics — scan latency, success
> rate, data freshness. The data source panel documents the Binance →
> CoinGecko chain and the MCP status."

---

## 3. Deep Analysis (45 seconds)

**Click "Analyze" on BTCUSDT (or any asset).**

> "When we select an asset from the scanner, it navigates to the Analyze
> view and automatically starts the deep analysis pipeline."

**Watch the workflow stages progress.**

> "The pipeline runs 5 stages:
> 1. Intent Agent — parses the query
> 2. Market Agent — fetches the full market snapshot
> 3. Risk Agent — interprets the risk scores
> 4. Research Agent — composes a neutral thesis
> 5. Report Agent — assembles the final report"

**Wait for the report. Scroll through results.**

> "The report shows real deterministic scores — risk and readiness — with
> full factor breakdowns, trend analysis, volatility metrics, and an
> explainable intelligence panel. All from live market data. The asset
> summary also shows which provider served the data (Binance or CoinGecko)."

---

## 4. Evaluation & Transparency (20 seconds)

**Point to the evaluation metrics (visible on the Scanner tab).**

> "Runtime metrics show exactly what happened — how long the scan took,
> the success rate, and data freshness. These are observations, not
> trading performance claims."

**Point to the DataSourceStatus.**

> "The system clearly documents the provider chain — Binance primary with a
> CoinGecko fallback — and marks which source actually served each scan.
> MCP infrastructure exists but is not active. When you come back to the
> scanner, the 'Back to Scanner' button provides smooth navigation."

---

## 5. Market Intelligence / Session Overview (optional, 15 seconds)

**If time permits, switch to the Workflow or Overview tab.**

> "The Overview explains the five agent stages. The Workflow tab lets you
> watch the pipeline progress in real time with per-stage durations."

---

## 6. Security & Disclaimer (15 seconds)

> "No private API keys are required. No trading functionality exists.
> No buy/sell recommendations. No account access. This is entirely
> research and decision-support — it does not execute trades or guarantee
> financial outcomes.
>
> Digital assets are volatile. Always do your own research."

---

## Key Points to Emphasize

1. **Real data** — all values come from Binance public REST API, or CoinGecko
   when Binance is blocked (never mock/fabricated)
2. **Deterministic** — no random scores, no fabricated values
3. **Transparent** — every formula is documented, and the active data source
   is labeled on every scan and analysis
4. **Resilient** — automatic Binance → CoinGecko failover with honest labeling
5. **Modular** — MCP can be added later without changing the engine
6. **Research only** — no trading, no recommendations
7. **Graceful degradation** — partial failures don't crash the scanner
