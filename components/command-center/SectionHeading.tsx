import type { ReactNode } from "react";

interface SectionHeadingProps {
  kicker: string;
  title: string;
  description?: string;
  children?: ReactNode;
}

/**
 * Command-center section header: uppercase gold kicker, expressive title,
 * muted description, and an optional right-side slot (live status etc.).
 */
export function SectionHeading({
  kicker,
  title,
  description,
  children,
}: SectionHeadingProps) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="max-w-2xl">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f0b90b]">
          <span className="h-px w-6 bg-[#f0b90b]/50" aria-hidden="true" />
          {kicker}
        </div>
        <h2 className="text-2xl font-semibold leading-tight tracking-tight text-zinc-100 sm:text-3xl">
          {title}
        </h2>
        {description && (
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{description}</p>
        )}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}