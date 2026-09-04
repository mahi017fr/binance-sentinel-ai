import type { ReactNode } from "react";

type Tone = "default" | "accent" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  default:
    "border-[var(--border)] bg-[var(--surface-raised)] text-[var(--muted)]",
  accent: "border-[#f0b90b]/40 bg-[#f0b90b]/10 text-[#f0b90b]",
  success: "border-[var(--safe)]/40 bg-[var(--safe)]/10 text-[var(--safe)]",
  warning: "border-[var(--warning)]/40 bg-[var(--warning)]/10 text-[var(--warning)]",
  danger: "border-[var(--danger)]/40 bg-[var(--danger)]/10 text-[var(--danger)]",
  info: "border-[var(--info)]/40 bg-[var(--info)]/10 text-[var(--info)]",
};

interface BadgeProps {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}

export function Badge({ children, tone = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
