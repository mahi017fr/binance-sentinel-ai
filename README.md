# Binance Sentinel AI

Agentic market intelligence for research and decision-support.

## Problem

Crypto market data is fragmented, fast-moving, and overwhelming. Traders and
researchers need structured workflows that go beyond raw ticker feeds — they
need explainable analysis, risk profiling, and market intelligence they can
actually reason about.

## Solution

Binance Sentinel AI is a research-focused multi-stage market intelligence
application. It combines a live market scanner, a deterministic analysis
engine, and a multi-agent workflow to produce explainable risk and readiness
profiles for digital assets.

No trading functionality. No buy/sell recommendations. Research only.

## Key Features

- **Live Market Scanner** — scans a curated universe of liquid USDT markets
  in real time using Binance public data
- **Multi-asset Scanning** — classifies 10+ assets by volatility, momentum,
  risk, and activity in a single operation
- **Deterministic Risk Scoring** — weighted-factor risk engine with full
  factor breakdown and transparent formulas
- **Volatility Analysis** — 24h range-based classification with documented
  thresholds
- **Momentum Analysis** — directional classification derived from real 24h
  price change
- **Market Activity Analysis** — relative volume classification against the
  scanned universe
- **Market Signal Overview** — at-a-glance cards for top gainer, top loser,
  highest volatility, highest risk, and most active
- **Searchable & Sortable Table** — filter assets by symbol, sort any column
  (default: highest risk first)
- **Auto-Refresh** — configurable scan intervals (OFF / 30s / 1m / 5m)
- **Risk Visual Indicators** — color-coded risk bars and momentum arrows
- **Deep Asset Analysis** — select any scanned asset and run the full
  multi-agent analysis pipeline
- **Analysis Context** — clear display of data source, asset, and pipeline
  status during analysis
- **Multi-stage Workflow Visualization** — watch the 5-stage agent pipeline
  progress in real time via SSE streaming with per-stage and total duration
- **Partial Failure Handling** — scanner degrades gracefully; failed symbols
  are reported without crashing the scan
- **Session Metrics** — scanner and analysis performance tracking with
  averages across the session
- **Fallback Transparency** — clear display of active data source, provider
  chain (Binance → CoinGecko), MCP integration status, and fallback behavior
- **Data Source Metadata** — every scan and analysis labels the real provider
  used (Binance or CoinGecko) with a fallback flag; fallback data is never
  claimed as Binance
- **Provider Chain** — tries Binance first, automatically fails over to
  CoinGecko when Binance is unavailable

## Live Demo Workflow

```
1. Open the app at http://localhost:3000
2. Navigate to "Market Scanner" in the sidebar
3. Click "Scan Market" to fetch live data (Binance primary)
4. Watch the scanner classify all assets in real time
5. Note the "Market Data Source" indicator (Binance, or CoinGecko if Binance is blocked)
6. Use the search bar to filter by symbol (e.g. "BTC")
7. Click any column header to sort (default: highest risk first)
8. Set auto-refresh to "1m" to keep data current
9. Review the Market Signals section for top gainer/loser/risk
10. Click "Analyze" on any asset to launch the full agent pipeline
11. Watch the 5-stage agent workflow progress in real time
12. Review the Final Intelligence Report (note the per-asset data source)
13. Click "Back to Scanner" to return and analyze another asset
14. Check "Session Metrics" in the sidebar for runtime performance
```

## User Flow

```
User
  |
  v
Market Scanner  -->  Select Asset  -->  Deep Analysis
  |                     |                    |
  v                     v                    v
Live Binance Data   Query Input         Agent Pipeline
  |                     |                    |
  v                     v                    v
Deterministic      Auto-populated      SSE Streaming
Classification         Query                   |
  |                     |                    v
  v                     v              Intelligence Report
Evaluation Panel   Back to Scanner
```

## Architecture

```
Next.js 16 UI (React 19)
  |
  v
API Routes (App Router)
  |
  v
Chained Market Data Provider (Adapter Pattern)
  |-- Primary:   Binance Public REST API (no auth)
  |-- Fallback:  CoinGecko Public REST API (no auth)
  |
  v
Deterministic Analysis Engine
  - Trend analysis (linear regression, R², SMA)
  - Volatility analysis (log-return std, ATR)
  - Drawdown analysis (peak-to-trough)
  - Liquidity/activity (24h quote volume)
  - Risk score (weighted factor composition)
  - Readiness score (weighted factor composition)
  |
  v
Agent Pipeline (5 stages)
  Intent -> Market -> Risk -> Research -> Report
  |
  v
SSE Streaming to Dashboard
  |
  v
Professional Dark-theme Dashboard
```

## Agent Workflow

Each deep analysis runs a 5-stage multi-agent pipeline streamed to the UI in
real time:

1. **Intent Agent** — parses the query and identifies assets & intent
2. **Market Agent** — fetches the live deterministic market snapshot
3. **Risk Agent** — interprets scores into explainable drivers & observations
4. **Research Agent** — composes a neutral, uncertainty-aware thesis
5. **Report Agent** — assembles the final structured intelligence report

The pipeline emits `agent-start`, `agent-complete`, `report`, and `done` SSE
events so the user watches each stage progress with per-stage and total
durations.

## Market Data Sources

| Priority | Provider | Auth | Fields |
|---|---|---|---|
| Primary | Binance Public REST API | None | price, 24h change, high, low, volume, klines |
| Fallback | CoinGecko Public REST API | None | price, 24h change, high, low, USD volume, OHLC |

The provider chain tries **Binance first**. If Binance is unavailable from the
deployment environment (restricted location / network / availability), it
fails over to **CoinGecko**. Fallback data is never claimed as Binance data —
every response and UI indicator labels its real source.

## Binance Agent OS / MCP Status

**Current state**: MCP is **NOT** the active data source for the scanner or
analysis pipeline.

| Aspect | Status |
|---|---|
| Infrastructure | Prepared — real connectivity probe, OAuth discovery, client provider, and diagnostic routes (server-side) |
| Authentication | Incomplete — OAuth/PKCE scaffolding exists; no verified end-to-end authorization |
| Pipeline integration | None — MCP not wired into the data flow |
| Current limitation | The Binance MCP endpoint requires OAuth authorization; integration proceeds only when a working authorized flow is confirmed |

Diagnostic routes (`/api/mcp/verify`, `/api/mcp/discovery`, `/api/auth/status`)
perform **real** connectivity and OAuth-discovery checks against the official
Binance Agent MCP endpoint. Nothing is mocked or claimed as connected unless
actually verified. The live pipeline uses Binance REST (primary) + CoinGecko
REST (fallback). The modular `MarketDataProvider` adapter allows swapping in an
MCP-backed provider when a verified authorized connection is available.

## Security Model

- No private Binance API keys required for current market scanning
- No trading permissions needed
- No withdrawal access
- No account balances accessed
- No portfolio management
- OAuth tokens (if implemented later) remain server-side only
- All market data is from public endpoints
- Research-only design by default

## Known Limitations

- **Restricted deployment environments** may block Binance's public REST API;
  the app automatically falls back to CoinGecko rather than failing.
- **CoinGecko free-tier rate limits** (~10-30 req/min) are mitigated by batching
  and retry/backoff; under extreme repeated load some symbols may be reported as
  partial failures (never fabricated).
- **CoinGecko OHLC** provides real price bars but not per-bar volume (the
  analysis modules that rely on volume degrade gracefully; trend/volatility/
  drawdown are price-based and unaffected).
- **Binance MCP is not active** — OAuth authorization is not completed, so MCP
  data is intentionally excluded from the live pipeline.
- LLM report generation defaults to a deterministic reporter when no OpenAI key
  is configured (the quantitative analysis is always real and deterministic).

## Evaluation

The application tracks real runtime metrics:

| Metric | Description |
|---|---|
| Scan Latency | Time to fetch and classify all scanner assets |
| Avg Scan Latency | Average across all scans in the session |
| Analysis Latency | Time for the full 5-stage agent pipeline |
| Avg Analysis Latency | Average across all analyses in the session |
| Scan Success Rate | Successful assets / requested assets × 100 |
| Partial Failure Rate | Failed symbols / requested assets × 100 |
| Data Freshness | Age of last scan (< 5m Fresh, < 30m Recent, else Stale) |
| Pipeline Status | Complete / Partial / Failed / Idle |
| Total Scans | Number of scans performed this session |
| Total Analyses | Number of analyses performed this session |

These are **not** measures of trading accuracy or investment returns.

## Setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables (all optional)

| Variable | Default | Purpose |
|---|---|---|
| `BINANCE_API_BASE_URL` | `https://api.binance.com` | Override Binance REST API base |
| `LLM_PROVIDER` | `mock` | `"mock"` or `"openai"` for report generation |
| `OPENAI_API_KEY` | — | Enables real OpenAI LLM output |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model to use with OpenAI |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | Public URL for OAuth client metadata |

## Deployment

### Vercel

1. Push to a Git repository
2. Import in the [Vercel dashboard](https://vercel.com)
3. No environment variables are required for basic functionality
4. Deploy — the app is fully functional with public Binance data

Do not commit secrets or API keys to the repository.

## Disclaimer

> **This project is research and decision-support software. It does not execute
> trades or provide guaranteed financial outcomes.**

This application is for **research and decision-support only**. It is not
financial advice. No profit guarantees are made. Digital assets are volatile
and carry risk. Always conduct your own research before making any investment
decisions.
