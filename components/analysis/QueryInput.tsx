"use client";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
}

export function QueryInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  loading,
}: QueryInputProps) {
  return (
    <form
      className="flex flex-col gap-3 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        if (!loading && value.trim()) onSubmit();
      }}
    >
      <label htmlFor="sentinel-query" className="sr-only">
        Ask Sentinel a market question
      </label>
      <div className="relative flex-1">
        <div className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[var(--muted)]">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
        </div>
        <input
          id="sentinel-query"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask Sentinel about BTC, ETH, SOL..."
          disabled={loading}
          aria-label="Ask Sentinel a market question"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-3.5 pl-11 pr-4 text-sm text-zinc-100 shadow-[0_1px_2px_rgba(0,0,0,0.4)] outline-none transition placeholder:text-[var(--muted)] focus:border-[#f0b90b]/60 focus:ring-2 focus:ring-[#f0b90b]/25 disabled:opacity-60"
        />
      </div>
      {loading ? (
        <Button type="button" variant="secondary" onClick={onCancel} className="sm:w-auto">
          <Spinner className="h-4 w-4" /> Cancel
        </Button>
      ) : (
        <Button type="submit" className="rounded-xl px-6 sm:w-auto">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          Analyze
        </Button>
      )}
    </form>
  );
}
