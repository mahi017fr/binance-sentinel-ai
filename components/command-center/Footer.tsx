"use client";

function scrollTo(id: string) {
  const reduce =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}

export function Footer() {
  return (
    <footer className="border-t border-[var(--border)]/60 bg-gradient-to-b from-transparent to-[rgba(0,0,0,0.6)]">
      <div className="mx-auto max-w-[1280px] px-4 py-12 sm:px-6 lg:px-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:items-start">
          {/* Left: brand */}
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#f0b90b]/30 bg-gradient-to-b from-[#f0b90b]/20 to-[#f0b90b]/5 shadow-[0_0_22px_rgba(240,185,11,0.14)]" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5 text-[#f0b90b]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l5-5 4 4 6-7" />
                <path d="M16 9h4v4" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold tracking-tight text-zinc-100">
                Binance Sentinel AI
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
                Agentic Market Intelligence
              </div>
              <p className="mt-3 max-w-xs text-[11px] leading-5 text-[var(--muted)]">
                Research &amp; decision-support only. Not financial advice.
              </p>
            </div>
          </div>

          {/* Center: build / source transparency */}
          <div className="sm:col-span-2 lg:col-span-1 lg:text-center">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              Built on
            </div>
            <div className="mt-1 text-base font-semibold text-zinc-100">
              <span className="bg-gradient-to-r from-[#f0b90b] to-[#f6d76b] bg-clip-text text-transparent">
                Binance Agent OS
              </span>
            </div>
            <p className="mx-auto mt-3 max-w-xs text-[11px] leading-5 text-[var(--muted)] lg:mx-auto">
              Number-driven research only — no trading, no execution, no
              accounts. Live data is served by the real active provider
              (Binance public API, with transparent CoinGecko fallback).
            </p>
          </div>

          {/* Right: links */}
          <div className="lg:text-right">
            <div className="text-[10px] uppercase tracking-[0.22em] text-[var(--muted)]">
              Explore
            </div>
            <div className="mt-3 flex flex-col gap-2 text-sm lg:items-end">
              <button
                type="button"
                onClick={() => scrollTo("trust")}
                className="text-zinc-300 transition hover:text-[#f0b90b]"
              >
                Docs
              </button>
              <a
                href="https://github.com/mahi017fr/binance-sentinel-ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-300 transition hover:text-[#f0b90b]"
              >
                GitHub
              </a>
              <button
                type="button"
                onClick={() => scrollTo("architecture")}
                className="text-zinc-300 transition hover:text-[#f0b90b]"
              >
                Community
              </button>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-[var(--border)]/50 pt-6 text-[11px] text-[var(--muted)] sm:flex-row sm:items-center">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--safe)] sentinel-live-orb" aria-hidden="true" />
            Multi-agent runtime · No trading · No execution
          </span>
          <span>© {new Date().getFullYear()} Binance Sentinel AI</span>
        </div>
      </div>
    </footer>
  );
}
