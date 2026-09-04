/**
 * Symbol helper utilities for the scanner → analysis workflow.
 *
 * Converts full Binance pair symbols (e.g. BTCUSDT) into bare base
 * asset tickers (e.g. BTC) using generic quote-suffix removal.
 */

const DEFAULT_QUOTE = "USDT";

/**
 * Strip the quote-asset suffix from a full Binance pair symbol.
 *
 * Examples:
 *   stripQuoteSuffix("BTCUSDT") → "BTC"
 *   stripQuoteSuffix("ETHUSDT") → "ETH"
 *   stripQuoteSuffix("SOLUSDT") → "SOL"
 *   stripQuoteSuffix("BTC")     → "BTC" (no suffix to strip)
 *
 * Returns the input unchanged if it does not end with the quote suffix.
 */
export function stripQuoteSuffix(
  symbol: string,
  quote = DEFAULT_QUOTE
): string {
  const upper = symbol.trim().toUpperCase();
  if (upper.endsWith(quote) && upper.length > quote.length) {
    return upper.slice(0, -quote.length);
  }
  return upper;
}

/**
 * Build a natural-language analysis query from a scanner symbol.
 *
 * Examples:
 *   buildAnalysisQuery("BTCUSDT") → "Analyze BTC market risk and conditions"
 *   buildAnalysisQuery("ETHUSDT") → "Analyze ETH market risk and conditions"
 */
export function buildAnalysisQuery(symbol: string): string {
  const base = stripQuoteSuffix(symbol);
  return `Analyze ${base} market risk and conditions`;
}
