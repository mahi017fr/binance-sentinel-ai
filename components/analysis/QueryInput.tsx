"use client";

import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

interface QueryInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  loading: boolean;
  /** "lg" renders the larger hero-grade input; default is the compact one. */
  size?: "md" | "lg";
}

export function QueryInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  loading,
  size = "md",
}: QueryInputProps) {
  const large = size === "lg";
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
        <div
          className={`pointer-events-none absolute left-4 flex items-center text-[var(--muted)] ${
            large ? "top-1/2 -translate-y-1/2" : "inset-y-0"
          }`}
        >
          <svg viewBox="0 0 24 24" className={`${large ? "h-5 w-5" : "h-4 w-4"}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
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
          className={`w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] text-zinc-100 shadow-[0_1px_2px_rgba(0,0,0,0.4)] outline-none transition placeholder:text-[var(--muted)] focus:border-[#f0b90b]/60 focus:ring-2 focus:ring-[#f0b90b]/25 disabled:opacity-60 ${
            large
              ? "py-4 pl-12 pr-4 text-base"
              : "py-3.5 pl-11 pr-4 text-sm"
          }`}
        />
      </div>
      {loading ? (
        <Button type="button" variant="secondary" onClick={onCancel} className={`${large ? "px-8 py-3.5 text-base" : ""} sm:w-auto`}>
          <Spinner className="h-4 w-4" /> Cancel
        </Button>
      ) : (
        <Button type="submit" className={`rounded-xl sm:w-auto ${large ? "px-8 py-3.5 text-base font-semibold" : "px-6"}`}>
          <svg viewBox="0 0 24 24" className={large ? "h-5 w-5" : "h-4 w-4"} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
          Analyze
        </Button>
      )}
    </form>
  );
}
