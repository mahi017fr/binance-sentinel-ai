"use client";

const EXAMPLES = [
  "Analyze BTC risk",
  "Explain ETH volatility",
  "Analyze SOL market conditions",
  "Compare BTC and ETH risk",
];

interface ExampleQueriesProps {
  onSelect: (query: string) => void;
  disabled?: boolean;
}

export function ExampleQueries({ onSelect, disabled }: ExampleQueriesProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs text-[var(--muted)]">Try:</span>
      {EXAMPLES.map((q) => (
        <button
          key={q}
          type="button"
          onClick={() => onSelect(q)}
          disabled={disabled}
          className="rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1.5 text-xs text-[var(--muted)] shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition hover:-translate-y-px hover:border-[#f0b90b]/50 hover:text-[#f0b90b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b90b] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
