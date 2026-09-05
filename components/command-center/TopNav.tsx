"use client";

import { useEffect, useState } from "react";
import type { AnalysisStatus } from "@/hooks/useAnalysisStream";

const NAV_ANCHORS = [
  { id: "overview", label: "Overview" },
  { id: "ask", label: "Analyze" },
  { id: "scanner", label: "Scanner" },
  { id: "runtime", label: "Workflow" },
  { id: "architecture", label: "About" },
] as const;

const STATUS_META: Record<
  AnalysisStatus,
  { label: string; dot: string; text: string }
> = {
  idle: { label: "Agents Idle", dot: "bg-[var(--muted)]", text: "text-[var(--muted)]" },
  loading: {
    label: "Agents Running",
    dot: "bg-[#f0b90b] sentinel-status-dot",
    text: "text-[#f0b90b]",
  },
  done: { label: "Report Ready", dot: "bg-[var(--safe)]", text: "text-[var(--safe)]" },
  error: { label: "Analysis Error", dot: "bg-[var(--danger)]", text: "text-[var(--danger)]" },
};

function scrollToAnchor(id: string) {
  const reduce =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document
    .getElementById(id)
    ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });

  if (id === "ask") {
    // Move focus to the query input once the hero is in view.
    const input = document.querySelector<HTMLInputElement>("#sentinel-query");
    window.setTimeout(() => input?.focus({ preventScroll: true }), 500);
  }
}

function SentinelMark({ size = "h-10 w-10" }: { size?: string }) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-xl border border-[#f0b90b]/30 bg-gradient-to-b from-[#f0b90b]/20 to-[#f0b90b]/5 shadow-[0_0_22px_rgba(240,185,11,0.14)]`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5 text-[#f0b90b]"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 17l5-5 4 4 6-7" />
        <path d="M16 9h4v4" />
      </svg>
    </div>
  );
}

interface TopNavProps {
  analysisStatus: AnalysisStatus;
  sourceLabel: string | null;
  sourceId: string | null;
}

export function TopNav({ analysisStatus, sourceLabel, sourceId }: TopNavProps) {
  const meta = STATUS_META[analysisStatus];
  const servedByCli = sourceId === "binance-cli-public-api";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-all duration-300 ${
        scrolled
          ? "border-b border-[#f0b90b]/15 bg-[rgba(0,0,0,0.82)] backdrop-blur-xl"
          : "border-b border-[#f0b90b]/10 bg-[rgba(0,0,0,0.45)] backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        {/* Brand */}
        <a
          href="#overview"
          onClick={(e) => {
            e.preventDefault();
            scrollToAnchor("overview");
          }}
          className="flex min-w-0 items-center gap-3"
          aria-label="Binance Sentinel AI — back to top"
        >
          <SentinelMark />
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-semibold tracking-tight text-zinc-100">
                Binance&nbsp;Sentinel&nbsp;AI
              </span>
              <span className="hidden rounded-full border border-[#f0b90b]/40 bg-[#f0b90b]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#f0b90b] sm:inline-block">
                Research only
              </span>
            </div>
            <div className="hidden text-[9px] uppercase tracking-[0.24em] text-[var(--muted)] md:block">
              Agentic Market Intelligence
            </div>
          </div>
        </a>

        {/* Nav */}
        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Section navigation"
        >
          {NAV_ANCHORS.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => scrollToAnchor(a.id)}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-[var(--muted)] transition hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b90b]"
            >
              {a.label}
            </button>
          ))}
        </nav>

        {/* Right cluster: status + CTA */}
        <div className="flex shrink-0 items-center gap-2.5">
          <div
            className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(0,0,0,0.7)] px-3 py-1.5 backdrop-blur-md sm:flex"
            role="status"
            aria-live="polite"
          >
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} sentinel-live-orb`} aria-hidden="true" />
            <span className="text-[11px] font-medium text-zinc-200">
              <span className="sr-only">{meta.label}</span>
              {sourceLabel ? `● ${sourceLabel}` : "● Live Data"}
            </span>
          </div>

          <div
            className="hidden items-center gap-2 rounded-full border border-[var(--border)] bg-[rgba(0,0,0,0.7)] px-3 py-1.5 backdrop-blur-md md:flex"
            title={sourceLabel ? `Market data served by ${sourceLabel}` : "Market data source appears after a scan"}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                servedByCli ? "sentinel-live-orb bg-[#f0b90b]" : "sentinel-live-orb bg-[var(--safe)]"
              }`}
              aria-hidden="true"
            />
            <span className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
              {sourceLabel ?? "Idle"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => scrollToAnchor("ask")}
            className="hidden items-center rounded-lg bg-[#f0b90b] px-4 py-2 text-xs font-semibold text-black shadow-[0_0_24px_rgba(240,185,11,0.35)] transition hover:bg-[#f6d76b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f6d76b] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] sm:inline-flex"
          >
            Get Started
          </button>
        </div>
      </div>
    </header>
  );
}