"use client";

import type { ScannerSourceMetadata } from "@/lib/scanner/types";
import { SectionHeading } from "./SectionHeading";

interface DataTrustRow {
  role: string;
  name: string;
  desc: string;
  dotClass: string;
  tag: string;
  tagClass: string;
}

interface DataTrustSectionProps {
  source: ScannerSourceMetadata | null;
}

export function DataTrustSection({ source }: DataTrustSectionProps) {
  const provider = source?.provider ?? null;
  const cliActive = provider === "binance-cli-public-api";
  const binanceActive = provider === "binance-public-api";

  const rows: DataTrustRow[] = [
    {
      role: "Primary",
      name: "Binance Public REST API",
      desc: "Unauthenticated SPOT market data — prices, 24h change, high/low, volume, klines.",
      dotClass: binanceActive
        ? "bg-[var(--safe)] sentinel-live-orb"
        : "bg-[var(--safe)]",
      tag: binanceActive ? "SERVING LAST SCAN" : "LIVE · DEFAULT",
      tagClass: "border-[var(--safe)]/40 bg-[var(--safe)]/10 text-[var(--safe)]",
    },
    {
      role: "Fallback",
      name: "CoinGecko Public API",
      desc: "Transparent failover used automatically when Binance is unreachable.",
      dotClass: source?.fallbackUsed
        ? "bg-[var(--info)] sentinel-live-orb"
        : "bg-[var(--info)]",
      tag: source?.fallbackUsed ? "ACTIVE · LAST SCAN" : "AVAILABLE",
      tagClass: source?.fallbackUsed
        ? "border-[var(--info)]/50 bg-[var(--info)]/15 text-[var(--info)]"
        : "border-[var(--info)]/40 bg-[var(--info)]/10 text-[var(--info)]",
    },
    {
      role: "Optional",
      name: "Binance CLI Public Provider",
      desc: "Official binance-cli read-only market commands — local-only, no credentials.",
      dotClass: cliActive ? "bg-[#f0b90b] sentinel-live-orb" : "bg-[var(--muted)]",
      tag: cliActive ? "ACTIVE · CLI" : "LOCAL-ONLY · OFF",
      tagClass: cliActive
        ? "border-[#f0b90b]/50 bg-[#f0b90b]/15 text-[#f0b90b]"
        : "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)]",
    },
    {
      role: "MCP",
      name: "Binance Hosted MCP",
      desc: "Real Streamable HTTP client prepared — inactive until a supported-agent bearer token is authorized.",
      dotClass: "bg-[var(--muted)]",
      tag: "PREPARED · INACTIVE",
      tagClass: "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)]",
    },
  ];

  return (
    <section
      id="trust"
      className="mx-auto max-w-[1280px] scroll-mt-20 px-4 py-16 sm:px-6 lg:px-10 lg:py-20"
      aria-label="Data sources and trust"
    >
      <SectionHeading
        kicker="Trust"
        title="Data &amp; Source Transparency"
        description="Every number you see is labeled with the provider that actually served it. Nothing is fabricated, and fallback data is never claimed as Binance data."
      />

      <div className="overflow-hidden rounded-2xl border border-[var(--border)]/70 bg-[var(--glass)] backdrop-blur-xl">
        <ul className="divide-y divide-[var(--border)]/60">
          {rows.map((row) => (
            <li
              key={row.name}
              className="flex flex-col gap-3 px-5 py-4 transition hover:bg-[var(--surface-raised)]/40 sm:flex-row sm:items-center sm:gap-6"
            >
              <div className="flex w-full items-start gap-3 sm:w-64 sm:shrink-0">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${row.dotClass}`} aria-hidden="true" />
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                    {row.role}
                  </div>
                  <div className="mt-0.5 text-sm font-semibold text-zinc-100">{row.name}</div>
                </div>
              </div>
              <p className="min-w-0 flex-1 text-xs leading-5 text-[var(--muted)]">{row.desc}</p>
              <span
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${row.tagClass}`}
              >
                {row.tag}
              </span>
            </li>
          ))}
        </ul>
        <p className="border-t border-[var(--border)]/60 px-5 py-3.5 text-[11px] leading-5 text-[var(--muted)]">
          Binance hosted MCP remains intentionally inactive: Binance&rsquo;s Agent
          MCP endpoint rejected our real authorization attempt with
          &ldquo;The AI Agent you are using is not currently supported.&rdquo; We
          do not bypass that restriction and never display a &ldquo;connected&rdquo;
          state for MCP.
        </p>
      </div>
    </section>
  );
}