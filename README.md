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
- **Fallback Transparency** — clear display of active data source, MCP
  integration status, and fallback behavior

## Live Demo Workflow

```
1. Open the app at http://localhost:3000
2. Navigate to "Market Scanner" in the sidebar
3. Click "Scan Market" to fetch live data from Binance
4. Watch the scanner classify all assets in real time
5. Use the search bar to filter by symbol (e.g. "BTC")
6. Click any column header to sort (default: highest risk first)
7. Set auto-refresh to "1m" to keep data current
8. Review the Market Signals section for top gainer/loser/risk
9. Click "Analyze" on any asset to launch the full agent pipeline
10. Watch the 5-stage agent workflow progress in real time
11. Review the Final Intelligence Report
12. Click "Back to Scanner" to return and analyze another asset
13. Check "Session Metrics" in the sidebar for runtime performance
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
Market Data Provider (Adapter Pattern)
  |
  v
Binance Public REST API (no auth required)
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

## Agent OS Integration Status

- Binance Agent OS / MCP OAuth discovery infrastructure has been explored
  using official Binance endpoints
- The Binance MCP endpoint requires OAuth authorization
- Self-built/custom agent support is being monitored based on official Binance
  updates
- **MCP is NOT currently the active data source** in the main analysis or
  scanner pipelines
- Current production market data uses live **Binance Public REST API**
- The architecture is modular so MCP can be swapped in when authorization is
  completed

## Security Model

- No private Binance API keys required for current market scanning
- No trading permissions needed
- No withdrawal access
- No account balances accessed
- No portfolio management
- OAuth tokens (if implemented later) remain server-side only
- All market data is from public endpoints
- Research-only design by default

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

This application is for **research and decision-support only**. It is not
financial advice. No profit guarantees are made. Digital assets are volatile
and carry risk. Always conduct your own research before making any investment
decisions.
