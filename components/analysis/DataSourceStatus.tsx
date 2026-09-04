"use client";

/**
 * DataSourceStatus — transparent display of the currently active market-data
 * provider chain, MCP integration status, and fallback behavior.
 *
 * This component is informational/static: it documents the configured provider
 * chain (Primary: Binance → Secondary: CoinGecko). The provider that actually
 * served the most recent scan is reported by the scanner itself via
 * `result.source` on the Market Scanner response.
 *
 * It never claims a runtime status that has not been observed.
 */

export function DataSourceStatus() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_1px_2px_rgba(0,0,0,0.4)]">
      <div className="mb-3 flex items-center gap-2">
        <svg
          viewBox="0 0 24 24"
          className="h-4 w-4 text-[#f0b90b]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <ellipse cx="12" cy="5" rx="9" ry="3" />
          <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
          <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
        </svg>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-zinc-200">
          System / Data Source
        </h3>
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--safe)]" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
              Primary Provider
            </span>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Binance Public REST API — no authentication required.
          </p>
        </div>

        <div className="border-t border-[var(--border)]/50 pt-3">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--info)]" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
              Fallback Provider
            </span>
          </div>
          <p className="text-xs text-[var(--muted)]">
            CoinGecko Public Market Data API (no API key) — verified live
            fallback used automatically when Binance is unavailable (e.g.
            restricted deployment environments).
          </p>
        </div>

        <div className="border-t border-[var(--border)]/50 pt-3">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)]" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
              Active Source
            </span>
          </div>
          <p className="text-xs text-zinc-200">
            Shown on the Market Scanner card after each scan.
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
            Fallback data is never claimed as Binance data. Each response and
            UI indicator labels its real source.
          </p>
        </div>

        <div className="border-t border-[var(--border)]/50 pt-3">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)]" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
              MCP Integration Status
            </span>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Binance MCP is prepared but not active.
          </p>
          <ul className="mt-1.5 space-y-1 text-[10px] leading-4 text-[var(--muted)]">
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" aria-hidden="true" />
              <span>
                <span className="text-zinc-300">Infrastructure:</span> prepared —
                real connectivity probe, OAuth discovery, client provider, and
                diagnostic routes exist (server-side).
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" aria-hidden="true" />
              <span>
                <span className="text-zinc-300">Authentication:</span> incomplete —
                OAuth/PKCE scaffolding implemented, no verified end-to-end
                authorization.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" aria-hidden="true" />
              <span>
                <span className="text-zinc-300">Pipeline integration:</span> none —
                MCP is not wired into the scanner or analysis data flow.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" aria-hidden="true" />
              <span>
                <span className="text-zinc-300">Current limitation:</span> the Binance
                MCP endpoint requires OAuth authorization; it is left out of the
                live pipeline until a working authorized flow is confirmed.
              </span>
            </li>
          </ul>
        </div>

        <div className="border-t border-[var(--border)]/50 pt-3">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--info)]" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
              Provider Chain Behavior
            </span>
          </div>
          <ul className="mt-1 space-y-1 text-[10px] leading-4 text-[var(--muted)]">
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" aria-hidden="true" />
              <span>
                Tries Binance first; if Binance is unavailable (restricted
                location / network), fails over to CoinGecko.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" aria-hidden="true" />
              <span>
                If individual symbols fail, they are reported as partial
                failures — other assets continue.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" aria-hidden="true" />
              <span>
                If all providers fail, a structured error is returned — no data
                is fabricated.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
