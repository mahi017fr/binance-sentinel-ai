/**
 * INTENT agent.
 *
 * Determines what the user wants from a natural-language query:
 *   - intent (analyze / explain / assess-conditions / compare / general)
 *   - symbol(s)
 *   - timeframe
 *   - focus
 *
 * Extraction is fully deterministic and works with NO API key. The natural-
 * language parser below is the single source of truth for intent; it always
 * runs so the pipeline is dependable keyless or not.
 */

import type { Intent } from "@/lib/llm/schema";
import { normalizeSymbol } from "@/lib/binance-agent-os/market-data";
import type { AgentContext, IntentAgentResult } from "./types";

/** Common crypto ticker map used to recognize bare symbols like "btc". */
const KNOWN_TICKERS = [
  "BTC",
  "ETH",
  "SOL",
  "XRP",
  "DOGE",
  "ADA",
  "BNB",
  "AVAX",
  "DOT",
  "LINK",
  "LTC",
  "MATIC",
  "SHIB",
  "TRX",
  "UNI",
  "ATOM",
  "NEAR",
  "ARB",
  "OP",
  "TIA",
];

const TIMEFRAME_KEYWORDS: Array<[RegExp, Intent["timeframe"]]> = [
  [/1 month|monthly|1m\b/i, "1M"],
  [/weekly|1 week|1w\b/i, "1w"],
  [/daily|1 day|1d\b|day/i, "1d"],
  [/4 hour|4h\b/i, "4h"],
  [/1 hour|hourly|1h\b/i, "1h"],
  [/15 min|15m\b/i, "15m"],
  [/5 min|5m\b/i, "5m"],
];

const FOCUS_KEYWORDS: Array<[RegExp, Intent["focus"]]> = [
  [/risk/i, "risk"],
  [/volatil/i, "volatility"],
  [/trend|momentum|direction/i, "trend"],
  [/liquid|volume|activity/i, "liquidity"],
  [/readiness|favorable|conditions|suitable/i, "readiness"],
];

function detectIntent(query: string, symbolCount: number): Intent["intent"] {
  const q = query.toLowerCase();
  if (
    symbolCount > 1 ||
    /\bcompare\b|\bcomparison\b|\bversus\b|\bvs\.?|\bboth\b/.test(q)
  ) {
    return "compare";
  }
  if (/explain|why\b|what drives|reason/.test(q)) return "explain";
  if (/conditions|favorable|suitable|worth|should i|opportunit/.test(q)) {
    return "assess-conditions";
  }
  if (/analy|risk|volatil|trend|liquid|readiness/.test(q)) return "analyze";
  return "general";
}

/**
 * Tokenize a query into candidate ticker-like words (uppercased).
 */
function tokenize(query: string): string[] {
  return query
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.toUpperCase());
}

/** True if a token looks like an explicit asset/ticker mention. */
function looksLikeAssetMention(upper: string): boolean {
  // Explicit pair with a known quote currency suffix (USDT/USDC/BUSD/USD).
  if (/^[A-Z0-9]{4,12}(USDT|USDC|BUSD|USD)$/.test(upper)) return true;
  // All-caps word of 5+ characters (e.g. UNKNOWNXYZ, DOGE, SHIBA) that isn't in
  // the short allowlist of common all-caps English/non-asset words.
  if (/^[A-Z0-9]{5,12}$/.test(upper)) {
    return !NON_ASSET_CAPS.has(upper);
  }
  return false;
}

/** Common all-caps tokens that should NOT be flagged as unknown assets. */
const NON_ASSET_CAPS = new Set([
  "RISK",
  "MARKET",
  "CONDITIONS",
  "ANALYZE",
  "EXPLAIN",
  "COMPARE",
  "VOLATILITY",
  "TREND",
  "READINESS",
  // Ordinary English intent words — they must never be mistaken for asset
  // symbols even though they are all-caps tokens of 5-12 characters.
  "CURRENT",
  "ANALYSIS",
  "ASSESSMENT",
  "LIQUIDITY",
  "MOMENTUM",
  "DIRECTION",
  "SENTIMENT",
  "OUTLOOK",
  "STATUS",
  "GENERAL",
]);

/**
 * Recognize crypto symbols in a query and normalize them to SPOT pairs.
 * Handles full pairs (BTCUSDT / ethusdt) and bare tickers (BTC, eth), plus
 * multi-symbol lists joined by "and" / "," / "vs".
 */
function extractSymbols(query: string): string[] {
  const found = new Set<string>();
  const tokens = tokenize(query);

  for (const upper of tokens) {
    // Full pair.
    if (/^[A-Z0-9]{6,12}$/.test(upper) && upper.endsWith("USDT")) {
      found.add(upper);
      continue;
    }

    // Bare known ticker.
    for (const ticker of KNOWN_TICKERS) {
      if (upper === ticker) {
        const normalized = normalizeSymbol(ticker, "USDT");
        if (normalized) found.add(normalized);
        break;
      }
    }
  }

  return [...found].slice(0, 5);
}

/**
 * Find explicit asset mentions that we could NOT recognize. Used to give a
 * helpful error instead of silently analyzing a benchmark we never asked for.
 */
function detectUnknownAssets(query: string): string[] {
  const recognized = new Set<string>();
  for (const s of extractSymbols(query)) {
    recognized.add(s);
  }
  // Same recognition the extractor uses, so we can compare by base ticker.
  const unknown = new Set<string>();
  for (const upper of tokenize(query)) {
    // Skip if it is a recognized base of an extracted pair.
    const base = upper.replace(/(USDT|USDC|BUSD|USD)$/, "");
    const recognizedBase =
      [...recognized].some((s) => base === s.replace(/(USDT|USDC|BUSD|USD)$/, "")) ||
      KNOWN_TICKERS.includes(upper);
    if (recognizedBase) continue;
    if (looksLikeAssetMention(upper)) unknown.add(upper);
  }
  return [...unknown].slice(0, 5);
}

export function parseIntentDeterministically(rawQuery: string): Intent {
  const query = rawQuery;
  const symbols = extractSymbols(query);
  const unknownSymbols = detectUnknownAssets(query);

  let timeframe: Intent["timeframe"] = "1d";
  for (const [re, tf] of TIMEFRAME_KEYWORDS) {
    if (re.test(query)) {
      timeframe = tf;
      break;
    }
  }

  let focus: Intent["focus"] = "general";
  for (const [re, f] of FOCUS_KEYWORDS) {
    if (re.test(query)) {
      focus = f;
      break;
    }
  }

  const intent = detectIntent(query, symbols.length);

  return {
    intent,
    symbols,
    timeframe,
    focus,
    ...(unknownSymbols.length > 0 ? { unknownSymbols } : {}),
  };
}

export async function runIntentAgent(
  context: AgentContext
): Promise<IntentAgentResult> {
  const intent = parseIntentDeterministically(context.query);
  assertRecognizedAssets(context.query, intent);
  context.intent = intent;
  return { intent };
}

/**
 * Validate that any explicitly-mentioned asset(s) are recognizable.
 *
 * UX rule: if the user explicitly names an unknown/unsupported asset we must
 * NOT silently fall back to a BTCUSDT benchmark. Only a query with NO asset
 * mention at all is allowed to use the benchmark fallback (handled later by the
 * market agent).
 */
export function assertRecognizedAssets(query: string, intent: Intent): void {
  if (intent.unknownSymbols && intent.unknownSymbols.length > 0) {
    const listed = intent.unknownSymbols.join(", ");
    throw new Error(
      `Unsupported or unknown asset(s): ${listed}. ` +
        `Sentinel recognizes common assets such as BTC, ETH, SOL, XRP, DOGE, ADA, BNB and more. ` +
        `Try "Analyze BTC risk" or "Compare BTC and ETH".`
    );
  }
}
