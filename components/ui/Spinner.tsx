interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className = "h-4 w-4", label = "Loading" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}
