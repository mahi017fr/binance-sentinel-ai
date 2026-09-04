"use client";

import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  viewName: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.viewName}]`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="rounded-2xl border border-[var(--danger)]/40 bg-[var(--danger)]/5 p-6">
            <div className="flex items-start gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--danger)]/40 bg-[var(--danger)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--danger)]">
                Error
              </span>
              <div>
                <h2 className="text-sm font-semibold text-[var(--danger)]">
                  Something went wrong loading the {this.props.viewName}
                </h2>
                <p className="mt-1.5 text-sm leading-6 text-zinc-200">
                  {this.state.error?.message ?? "An unexpected error occurred."}
                </p>
                <button
                  onClick={() => this.setState({ hasError: false, error: null })}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-1 text-xs font-medium text-[var(--muted)] transition hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f0b90b]"
                >
                  <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M1 4v6h6" />
                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                  </svg>
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
