/**
 * Low-level statistical and helper primitives used by the analysis engine.
 *
 * All functions are deterministic and pure. They operate on plain numbers and
 * arrays so they are trivial to test and reason about.
 */

/** Clamp a number into [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Clamp into [0, 1]. */
export function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

/** Mean of an array (ignores non-finite values). */
export function mean(values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return 0;
  return finite.reduce((a, b) => a + b, 0) / finite.length;
}

/** Sample standard deviation (n - 1 denominator). Returns 0 for < 2 samples. */
export function stddev(values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length < 2) return 0;
  const m = mean(finite);
  const variance =
    finite.reduce((acc, v) => acc + (v - m) * (v - m), 0) / (finite.length - 1);
  return Math.sqrt(variance);
}

/** Return the min of an array (0 for empty). */
export function min(values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return 0;
  return Math.min(...finite);
}

/** Return the max of an array (0 for empty). */
export function max(values: number[]): number {
  const finite = values.filter(Number.isFinite);
  if (finite.length === 0) return 0;
  return Math.max(...finite);
}

/** Simple moving average of the last `period` values. */
export function sma(values: number[], period: number): number {
  if (period <= 0) return values[values.length - 1] ?? 0;
  const window = values.slice(-period);
  return mean(window);
}

/**
 * Linear regression of y vs x using least squares.
 * Returns slope and R^2 (coefficient of determination) if there is variance.
 */
export function linearRegression(x: number[], y: number[]): {
  slope: number;
  r2: number;
} {
  const n = Math.min(x.length, y.length);
  if (n < 2) return { slope: 0, r2: 0 };

  const xMean = mean(x);
  const yMean = mean(y);

  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - xMean;
    const dy = y[i] - yMean;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }

  if (sxx === 0) return { slope: 0, r2: 0 };
  const slope = sxy / sxx;
  const r2 = syy === 0 ? 0 : clamp01((sxy * sxy) / (sxx * syy));
  return { slope, r2 };
}

/** Convert an array of prices to their base-10 logarithms (guard vs <= 0). */
export function logPrices(prices: number[]): number[] {
  return prices.map((p) => (p > 0 ? Math.log(p) : 0));
}

/** Discrete (simple) returns between consecutive prices, decimals. */
export function returns(prices: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    if (prev > 0 && Number.isFinite(prices[i])) {
      out.push(prices[i] / prev - 1);
    }
  }
  return out;
}

/** Log returns between consecutive prices, decimals. */
export function logReturns(prices: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    if (prices[i - 1] > 0 && prices[i] > 0) {
      out.push(Math.log(prices[i] / prices[i - 1]));
    }
  }
  return out;
}
