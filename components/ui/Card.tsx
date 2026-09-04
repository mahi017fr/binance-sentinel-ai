import type { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  pad?: boolean;
}

/** A subtle, elevated surface container used throughout the dashboard. */
export function Card({ children, className = "", pad = true }: CardProps) {
  return (
    <section
      className={`rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_1px_2px_rgba(0,0,0,0.4)] ${
        pad ? "p-5" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}
