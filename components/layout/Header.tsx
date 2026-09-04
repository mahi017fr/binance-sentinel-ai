"use client";

import type { AnalysisStatus } from "@/hooks/useAnalysisStream";
import { Badge } from "@/components/ui/Badge";

const STATUS_META: Record<
  AnalysisStatus,
  { label: string; dot: string; text: string; pulse?: boolean }
> = {
  idle: { label: "System Idle", dot: "bg-[var(--muted)]", text: "text-[var(--muted)]" },
  loading: {
    label: "Agents Running",
    dot: "bg-[#f0b90b] sentinel-status-dot",
    text: "text-[#f0b90b]",
  },
  done: { label: "Report Ready", dot: "bg-[var(--safe)]", text: "text-[var(--safe)]" },
  error: { label: "Analysis Error", dot: "bg-[var(--danger)]", text: "text-[var(--danger)]" },
};

export function Header({ status }: { status: AnalysisStatus }) {
  const meta = STATUS_META[status];
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--border)] bg-[var(--background)]/85 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#f0b90b]/30 bg-gradient-to-b from-[#f0b90b]/20 to-[#f0b90b]/5 shadow-[0_0_20px_rgba(240,185,11,0.15)]">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5 text-[#f0b90b]"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 17l5-5 4 4 6-7" />
            <path d="M16 9h4v4" />
          </svg>
        </div>
        <div className="leading-tight">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold tracking-tight text-zinc-100">
              Binance Sentinel AI
            </span>
            <span className="hidden sm:inline-flex">
              <Badge tone="accent">Research only</Badge>
            </span>
          </div>
          <div className="hidden text-[11px] uppercase tracking-[0.18em] text-[var(--muted)] sm:block">
            Agentic Market Intelligence
          </div>
        </div>
      </div>

      <div
        className="flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
        role="status"
        aria-live="polite"
      >
        <span className={`h-2 w-2 rounded-full ${meta.dot}`} aria-hidden="true" />
        <span className={`text-xs font-medium ${meta.text}`}>{meta.label}</span>
      </div>
    </header>
  );
}
