/** Format a price in a compact, locale-aware way. */
export function formatPrice(value: number): string {
  if (value >= 1000) return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (value >= 1) return value.toFixed(2);
  return value.toFixed(6);
}

/** Format a signed percent change, e.g. 5.6 -> "+5.6%". */
export function formatPct(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(value >= 100 ? 0 : 1)}%`;
}

/** Format a decimal fraction as a percent, e.g. 0.344 -> "34.4%". */
export function formatFloatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** Format a decimal drawdown as a percent, e.g. 0.302 -> "30.2%". */
export function formatDrawdown(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
