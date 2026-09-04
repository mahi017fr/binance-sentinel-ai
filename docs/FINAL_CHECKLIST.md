# Final Testing Checklist

Pre-submission verification checklist for Binance Sentinel AI.

---

## Functional

- [ ] App loads without errors
- [ ] All navigation works (Overview / Analyze / Market Scanner / Workflow)
- [ ] Market Scanner renders and responds
- [ ] "Scan Market" fetches live assets
- [ ] Search input filters by symbol
- [ ] Column sorting works (default: highest risk first)
- [ ] Auto-refresh works (OFF / 30s / 1m / 5m)
- [ ] "Analyze" from a scanner row navigates to Analyze with the query pre-filled
- [ ] Analysis SSE pipeline streams all 5 stages (Intent → Market → Risk → Research → Report)
- [ ] Final report renders
- [ ] "Back to Scanner" returns smoothly
- [ ] Error states render gracefully (no blank/crash)

## Data

- [ ] Binance provider tested (primary)
- [ ] CoinGecko fallback tested (Binance unavailable → fallback succeeds)
- [ ] No fake/mock/hardcoded market data anywhere
- [ ] Source metadata visible on scanner (provider, label, fallbackUsed, fetchedAt)
- [ ] Per-asset source visible on analysis asset summaries
- [ ] Fallback data is labeled as CoinGecko, never claimed as Binance

## Security

- [ ] No API secrets in frontend code
- [ ] No tokens/credentials exposed to the browser
- [ ] No trading, order placement, transfers, or autonomous execution
- [ ] OAuth/MCP tokens (if any) server-side only
- [ ] Research-only disclaimer present and visible
- [ ] MCP status is honestly reported (not claimed active)

## Build

- [ ] `npm run lint` — no errors
- [ ] `npx tsc --noEmit` — no errors
- [ ] `npm run build` — succeeds
- [ ] Production server boots and serves pages/APIs

---

## Notes

- Mark each box by running the actual command or interaction; do not mark based
  on assumption.
- Re-run the Build section after any change.
