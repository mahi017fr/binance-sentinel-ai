"use client";

import { SectionHeading } from "./SectionHeading";

interface ArchNode {
  label: string;
  caption: string;
  icon: React.ReactNode;
}

const NODES: ArchNode[] = [
  {
    label: "Binance Capabilities",
    caption: "Public REST · skill CLI · MCP infra",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
  {
    label: "Sentinel Agent",
    caption: "Single intent surface",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 2l2.5 4.5 5 1-3.5 3.8.8 5-4.8-2.5-4.8 2.5.8-5L4.5 7.5l5-1z" />
      </svg>
    ),
  },
  {
    label: "Multi-Agent Runtime",
    caption: "Intent → Market → Risk → Research → Report",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="12" width="6" height="6" rx="1" />
        <rect x="15" y="4" width="6" height="6" rx="1" />
        <rect x="15" y="14" width="6" height="6" rx="1" />
        <path d="M9 15h3a2 2 0 002-2v-3" />
      </svg>
    ),
  },
  {
    label: "Market Intelligence",
    caption: "Measured, explainable metrics",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 17l5-5 4 4 6-7" />
        <path d="M16 9h4v4" />
      </svg>
    ),
  },
  {
    label: "Decision Support",
    caption: "Risk & readiness report",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 12h6M9 16h6M9 8h2" />
        <rect x="4" y="3" width="16" height="18" rx="2" />
      </svg>
    ),
  },
];

const INTEGRATIONS = [
  { label: "Binance Public REST + CoinGecko", value: "Live data chain" },
  { label: "Official Binance skill (binance-cli)", value: "Local, optional" },
  { label: "Binance MCP server + client", value: "Prepared, inactive" },
  { label: "Serverless-safe", value: "No local binaries required" },
];

export function ArchitectureSection() {
  return (
    <section
      id="architecture"
      className="mx-auto max-w-[1280px] scroll-mt-20 px-4 py-16 sm:px-6 lg:px-10 lg:py-20"
      aria-label="Sentinel architecture"
    >
      <SectionHeading
        kicker="Architecture"
        title="From Binance Capabilities to Decision Support"
        description="A single orchestration layer composes Binance market capabilities into a streamed multi-agent intelligence runtime."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
        {/* Flow visualization */}
        <div className="hidden lg:block">
          <ol className="flex items-start" aria-label="Architecture flow — horizontal">
            {NODES.map((node, i) => (
              <li key={node.label} className="flex min-w-0 flex-1 flex-col items-center">
                <div className="relative flex w-full items-center">
                  {i > 0 && (
                    <div className="sentinel-connector" aria-hidden="true" />
                  )}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#f0b90b]/25 bg-[#f0b90b]/5 text-[#f0b90b] shadow-[0_0_18px_rgba(240,185,11,0.08)]">
                    {node.icon}
                  </div>
                  {i < NODES.length - 1 && (
                    <div className="sentinel-connector" aria-hidden="true" />
                  )}
                </div>
                <div className="mt-3 flex flex-col items-center px-1 text-center">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-100">
                    {node.label}
                  </span>
                  <span className="mt-1 text-[10px] leading-4 text-[var(--muted)]">
                    {node.caption}
                  </span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        {/* Vertical flow — below lg */}
        <ol className="lg:hidden" aria-label="Architecture flow — vertical">
          {NODES.map((node, i) => (
            <li key={node.label} className="flex flex-col">
              {i > 0 && <div className="sentinel-connector-v ml-[21px]" aria-hidden="true" />}
              <div className="flex items-center gap-3 rounded-xl border border-[var(--border)]/70 bg-[var(--glass)] px-4 py-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#f0b90b]/25 bg-[#f0b90b]/5 text-[#f0b90b]">
                  {node.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-zinc-100">{node.label}</div>
                  <div className="text-[11px] text-[var(--muted)]">{node.caption}</div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Integration card */}
        <div className="rounded-2xl border border-[var(--border)]/70 bg-[var(--glass)] p-5 backdrop-blur-xl">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f0b90b]">
            Binance Agent OS ecosystem
          </div>
          <ul className="space-y-3">
            {INTEGRATIONS.map((item) => (
              <li key={item.label} className="flex items-start justify-between gap-4 border-b border-[var(--border)]/50 pb-3 last:border-b-0 last:pb-0">
                <span className="text-xs text-zinc-200">{item.label}</span>
                <span className="shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {item.value}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] leading-5 text-[var(--muted)]">
            Built on the Binance Agent OS ecosystem via official skill tooling
            and public market data. It does not depend on the hosted Binance MCP
            endpoint — that integration is prepared but remains inactive until a
            supported-agent credential is authorized.
          </p>
        </div>
      </div>
    </section>
  );
}