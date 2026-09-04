/**
 * Sentinel Market Universe — a curated list of liquid USDT trading pairs
 * on Binance SPOT. This is NOT the entire Binance market; it is a
 * hand-selected set of highly liquid assets used by the scanner for
 * broad market intelligence.
 *
 * The list can be extended, but every entry must be a valid, actively
 * traded Binance SPOT USDT pair.
 */

export const SCANNER_UNIVERSE: readonly string[] = [
  "BTCUSDT",
  "ETHUSDT",
  "SOLUSDT",
  "BNBUSDT",
  "XRPUSDT",
  "ADAUSDT",
  "DOGEUSDT",
  "AVAXUSDT",
  "LINKUSDT",
  "SUIUSDT",
] as const;

export type UniverseSymbol = (typeof SCANNER_UNIVERSE)[number];

export const UNIVERSE_LABEL = "Sentinel Market Universe";

export const UNIVERSE_DESCRIPTION =
  "Selected liquid USDT markets — not the full Binance universe.";
