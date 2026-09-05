# Binance Sentinel AI — Claude MCP Connector

This document describes the **remote MCP endpoint** (`/api/mcp`) that lets
Claude (and other MCP clients) read Binance Sentinel AI's public market data
and research analysis.

> Read this first to stay consistent with the existing architecture. Existing
> Binance Agent OS OAuth/MCP work (`lib/binance-agent-os/*`, `app/api/mcp/verify`,
> `app/api/mcp/discovery`, `app/api/auth/*`) is intentionally preserved and is
> NOT part of this connector.

## Overview

- **Endpoint:** `POST /api/mcp` (Streamable HTTP, MCP protocol)
- **Transport:** `WebStandardStreamableHTTPServerTransport` (Web Standard, stateless)
- **Client:** Anthropic Claude Custom Connector
- **Auth:** None (public, read-only). All data comes from public providers; no keys involved.
- **Research-only:** no account, balance, order, or portfolio access.

## Protocol & monthlies

- MCP protocol version `2025-11-25` (the SDK's `LATEST_PROTOCOL_VERSION`) is
  negotiated at `initialize`. The `initialize` response includes
  `mcp-protocol-version: '2025-11-25'`.
- Transports are **stateless**: each HTTP request gets a fresh MCP server +
  transport (the pattern required on Vercel/serverless). The SDK returns
  session headers when a client supplies them; clients that never created a
  session remain in anonymous mode.
- CORS: `Access-Control-Allow-Origin: *`, allows `content-type`,
  `mcp-session-id`, `mcp-protocol-version`, `last-event-id`, `authorization`.

## How to connect (Anthropic Claude)

1. Run/deploy this Next.js app and ensure `POST /api/mcp` is public.
2. In Anthropic Console → Connections → Custom Connectors, create:
   - **MCP server URL:** `https://<your-host>/api/mcp`
   - **Auth:** None (public).
3. Add the connector to a project; give Claude the URL if it cannot reach it.

No `mcp-servers` JSON is needed for Anthropic Custom Connectors; the URL alone
is the conniest path because the endpoint is unauthenticated by design.

## Tools

All tools return `structuredContent` (a JSON object) plus a `text` JSON
rendering, and are annotated `readOnlyHint: true` / `destructiveHint: false`.

| Tool | Description |
| --- | --- |
| `get_current_price` | Latest price + 24h stats (high/low, volume, trades). |
| `get_market_data` | Full snapshot snapshot: price, 24h range, volume, recent 1d bars. |
| `analyze_market` | Sentinel research analysis: risk score/label, readiness, directional signal, model confidence, evidence, volatility/activity/trend bands, drawdown. |

### Inputs

Every tool takes a single `symbol` argument. Only these are supported
(mirrors `lib/scanner/universe.ts`):

```
BTCUSDT, ETHUSDT, SOLUSDT, BNBUSDT, XRPUSDT, ADAUSDT, DOGEUSDT, AVAXUSDT, LINKUSDT, SUIUSDT
```

Symbols are normalized (trimmed + uppercased). Anything else returns an
`isError: true` result listing the supported universe. No symbol
configuration through env or config.

## Data sources & fallback

The tools reuse the existing provider chain (`getMarketDataProvider()`) in
`lib/binance-agent-os/adapter.ts`:

1. **Binance Public Market Data** (primary; `binance-public-api`)
2. **CoinGecko Public Market Data** (fallback; `coingecko-public-api`, for the
   10 supported symbols)

Each response includes:

- `dataSource`: human-readable source label
- `fallbackUsed`: `true` when CoinGecko served the data (i.e. Binance was
  temporarily unavailable)

`analyze_market` additionally includes the source in its `dataSource` field
and derives `directionalSignal` + `modelConfidence` + `evidence` from the same
deterministic engine the web dashboard uses
(`mockRiskInterpretation` + `mockMarketThesis` + `computeDirectionalSignal`).

> User-facing tool descriptions stay generic ("consults public market data")
> so they remain accurate across source/fallback.

## Behavior on failure

Tool failures return a **tool error result** (`isError: true`) with a safe,
human-readable message — never a stack trace or internal detail:

- Unsupported symbol → lists the supported universe.
- Provider unavailable → `"Market data is temporarily unavailable."`
- Analysis failure → `"Sentinel analysis could not be completed."`

## Branding & icon

- Service name shown in Claude remains **"Binance Sentinel AI"** (see
  `SENTINEL_MCP_NAME`).
- Claude's connector permission dialog icon is driven by the MCP **`Tool.icons`**
  metadata returned by `tools/list`. The MCP protocol (2025-11-25) has **no
  server/connector-level icon field**, so this connector advertises a custom
  branded icon per tool. When `NEXT_PUBLIC_BASE_URL` is set (as in production),
  each tool exposes:
  - `https://<host>/icon.svg` (`image/svg+xml`, scalable "any")
  - `https://<host>/icon-96.png` (`image/png`, `96x96`) as a raster fallback
- The icon is an original **Sentinel** mark in Binance's brand palette on a dark
  background. The official Binance logo/trademark is intentionally **not** used
  (Binance's brand terms restrict it to press/media use, and Claude renders the
  icon only from the `Tool.icons` metadata — we don't impersonate Binance).
- A disclaimer is delivered via `InitializeResult.instructions`: this is a
  **community-built, research-only** project using Binance public market data,
  **not** an official or affiliated Binance product.

> Claude-side note: Claude derives the connector avatar from per-tool `icons`
> metadata (and the tool name). There is no separate "server icon" field in the
> current MCP protocol, so how prominently the icon appears in the permission
> modal is controlled by Claude's client, not by this server. Tool function is
> unchanged.

## Example prompts

> "What is the current price and 24h change of BTCUSDT?"
> Uses `get_current_price` with symbol `BTCUSDT`.

> "Get recent market data for SOLUSDT."
> Uses `get_market_data` with symbol `SOLUSDT`.

> "Analyze the market for ETHUSDT and give me the risk score, readiness, and
> whether the directional signal is up or down."
> Uses `analyze_market` with symbol `ETHUSDT`. Claude relays the structured
> result (risk, readiness, signal, confidence, evidence).

> "Is ADAUSDT or LINKUSDT a more attractive candidate right now?"
> Claude calls `analyze_market` twice and compares readiness/risk.

## Testing

The endpoint logic is covered by Vitest unit tests:

```bash
npm test            # vitest run (all MCP tests)
npm run lint        # next lint
npm run build       # next build
```

## Files

- `app/api/mcp/route.ts` — Streamable HTTP endpoint (transport wiring, CORS)
- `app/api/mcp/health/route.ts` — liveness + exposed tool list
- `lib/mcp/sentinel-server.ts` — MCP server factory, tool registration
- `lib/mcp/sentinel-tools.ts` — tool handlers, symbol validation, safe errors
- Tests: `tests/mcp/*.test.ts` + shared fixtures in `tests/mcp/mocks.ts`