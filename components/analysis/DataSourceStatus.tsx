"use client";

/**
 * DataSourceStatus — transparent display of the currently active market-data
 * source, MCP integration status, and fallback behavior.
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
              Primary Market Data
            </span>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Binance Public REST API — no authentication required.
          </p>
        </div>

        <div className="border-t border-[var(--border)]/50 pt-3">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--muted)]" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
              MCP Status
            </span>
          </div>
          <p className="text-xs text-[var(--muted)]">
            Not currently active in the analysis pipeline.
          </p>
          <p className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
            Agent OS OAuth discovery infrastructure implemented separately;
            authenticated MCP pipeline integration pending successful
            authorization.
          </p>
        </div>

        <div className="border-t border-[var(--border)]/50 pt-3">
          <div className="mb-1 flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--info)]" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
              Fallback Behavior
            </span>
          </div>
          <ul className="mt-1 space-y-1 text-[10px] leading-4 text-[var(--muted)]">
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" aria-hidden="true" />
              <span>
                If the Binance REST API is unreachable, the scanner returns an error
                with details — no data is fabricated.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" aria-hidden="true" />
              <span>
                If individual symbols fail (rate limits, delisting), they are reported
                as partial failures — other assets continue scanning.
              </span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full bg-[var(--muted)]" aria-hidden="true" />
              <span>
                The LLM defaults to a deterministic mock reporter when no OpenAI key
                is configured — the analysis pipeline always completes.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
