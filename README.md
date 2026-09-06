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
- **Optional Binance CLI provider** — public market-data commands from the
  official Binance skill via the `binance-cli` binary (no credentials,
  verified live, disabled by default)
- **Optional Binance MCP provider** — real Streamable HTTP client for the
  official Binance Agent MCP endpoint; prepared but inactive until a valid
  authorized connection is available

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

| Priority | Provider | Auth | Fields | Status |
|---|---|---|---|---|
| Primary | Binance Public REST API | None | price, 24h change, high, low, volume, klines | Active |
| Fallback | CoinGecko Public REST API | None | price, 24h change, high, low, USD volume, OHLC | Active |
| Optional | Binance CLI (`binance-cli` binary) | None | price, 24h change, high, low, volume, klines, exchange info | Available, off by default |
| Optional | Binance Agent MCP | Bearer access token | market-data tools (when connected) | Prepared, inactive |

The provider chain tries **Binance first**. If Binance is unavailable from the
deployment environment (restricted location / network / availability), it
fails over to **CoinGecko**. Fallback data is never claimed as Binance data —
every response and UI indicator labels its real source.

The active backend can be forced via `BINANCE_MARKET_DATA_PROVIDER` (e.g.
`binance-cli-public-api` to route the pipeline through the CLI provider, or
`binance-mcp` when a real token is configured).

## Binance CLI Integration

The optional CLI provider (`lib/binance-agent-os/cli.ts`) integrates the
**official Binance skill tooling** (`.agents/skills/binance`) by invoking the
`binance-cli` binary as a subprocess, restricted to the **read-only, public,
unauthenticated** SPOT market-data commands documented in the skill:

- `spot klines`
- `spot ticker24hr`
- `spot exchange-info`

No API credentials are required (public endpoints only) and no `--signed`,
`--profile`, account, balance, transfer, or trading command is ever invoked.
Symbols are validated with `/^[A-Z][A-Z0-9]{1,29}$/`, intervals come from a
fixed whitelist, and every subprocess call is Windows-safe (quoted args via
`cmd.exe` shim, stdin closed to avoid the non-TTY hang, hard timeouts).

It is **disabled by default** and is **not** in the default chain. Enable it in
a local/development environment with:

```
BINANCE_ENABLE_CLI_PROVIDER=1
BINANCE_MARKET_DATA_PROVIDER=binance-cli-public-api
```

Because it shells out to a local binary, it is intended for **local dev /
self-hosted** use. On Vercel/serverless it is not available, so deployments
there simply keep the default Binance → CoinGecko chain — the production
fallback is never broken by the CLI provider.

## Binance Agent OS / MCP Status

**Current state**: MCP is **NOT** the active data source for the scanner or
analysis pipeline.

| Aspect | Status |
|---|---|
| Infrastructure | Prepared — real connectivity probe, OAuth discovery, client provider, and diagnostic routes (server-side) |
| Authentication | Incomplete — OAuth/PKCE scaffolding exists; no verified end-to-end authorization |
| Pipeline integration | None — MCP not wired into the data flow |
| Current limitation | **External blocker:** Binance's hosted Agent MCP endpoint rejected our real authorization attempt with "The AI Agent you are using is not currently supported." MCP activation therefore requires an official Binance supported-agent credential; we do not bypass that restriction. |

The MCP provider is gated on **all** of: `BINANCE_ENABLE_MCP_PROVIDER=1`, a
real `BINANCE_MCP_ACCESS_TOKEN`, and explicit selection via
`BINANCE_MARKET_DATA_PROVIDER=binance-mcp`. Without them every MCP method
throws and the default Binance → CoinGecko chain serves traffic. Discovered
tool names come only from a **real** `listTools()` response — nothing is
hardcoded or fabricated — and any trading / order / account / balance /
transfer / withdrawal / margin tool is explicitly blocked, never called.

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
- **Binance hosted MCP is not active** — Binance's Agent MCP endpoint rejected
  our real authorization attempt with "The AI Agent you are using is not
  currently supported." This is an external (Binance-side) supported-agent
  restriction; the app will not bypass it and does not claim MCP data that was
  not truly served. MCP data is intentionally excluded from the live pipeline.
- **Binance CLI provider is local-only** — it shells out to the `binance-cli`
  binary, so it is not available on Vercel/serverless and is disabled by
  default; the default chain is unaffected.
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
cp .env.example .env.local   # optional; all variables are optional
npm install
npm run dev
```

Open (https://binance-sentinel-ai.vercel.app/).

The app works out of the box with **no environment variables** (public Binance
REST → CoinGecko fallback, deterministic LLM mode).

### Environment Variables (all optional)

| Variable | Default | Purpose |
|---|---|---|
| `BINANCE_API_BASE_URL` | `https://api.binance.com` | Override Binance REST API base |
| `BINANCE_MARKET_DATA_PROVIDER` | `binance-public-api` (chain) | Force a specific backend: `binance-public-api`, `coingecko-public-api`, `binance-mcp`, or `binance-cli-public-api` |
| `BINANCE_ENABLE_CLI_PROVIDER` | unset | `1` activates the official `binance-cli` public market-data provider (local-only, no credentials) |
| `BINANCE_ENABLE_MCP_PROVIDER` | unset | `1` activates the MCP provider gate (requires a real access token below) |
| `BINANCE_MCP_ACCESS_TOKEN` | — | Server-side Bearer token for the official Binance Agent MCP endpoint (never exposed to the browser) |
| `BINANCE_MCP_ENDPOINT_URL` | `https://agent.binance.com/mcp/agentic` | Override the MCP endpoint |
| `BINANCE_MCP_STORE_SECRET` | dev-only fallback | 32+ char secret encrypting the OAuth token cookie (set in production) |
| `LLM_PROVIDER` | `mock` | `"mock"` or `"openai"` for report generation |
| `OPENAI_API_KEY` | — | Enables real OpenAI LLM output |
| `OPENAI_MODEL` | `gpt-4o-mini` | Model to use with OpenAI |
| `NEXT_PUBLIC_BASE_URL` | `http://localhost:3000` | Public URL for OAuth client metadata |

> current LLM client resolves `mock` or `openai`, so Anthropic is not wired yet.

## Disclaimer

> **This project is research and decision-support software. It does not execute
> trades or provide guaranteed financial outcomes.**

This application is for **research and decision-support only**. It is not
financial advice. No profit guarantees are made. Digital assets are volatile
and carry risk. Always conduct your own research before making any investment
decisions.
