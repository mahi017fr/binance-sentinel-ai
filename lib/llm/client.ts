/**
 * LLM client abstraction.
 *
 * The agent pipeline depends ONLY on this module — never on a specific
 * provider. The active backend is chosen from the environment:
 *
 *   LLM_PROVIDER=mock        (default — no API key required)
 *   LLM_PROVIDER=openai      (requires OPENAI_API_KEY)
 *
 * In mock mode, outputs come from the deterministic generators in `mock.ts`
 * and are validated against the same Zod schemas used for real LLM output, so
 * both modes produce identical trusted shapes.
 *
 * Secrets are read server-side only and never exposed to the client/browser.
 */

import { createOpenAI } from "@ai-sdk/openai";
import {
  generateObject,
  type FlexibleSchema,
  type InferSchema,
} from "ai";
import {
  IntentSchema,
  MarketThesisSchema,
  ReportSchema,
  RiskInterpretationSchema,
  type Intent,
  type MarketThesis,
  type Report,
  type RiskInterpretation,
} from "./schema";
import {
  mockIntent,
  mockMarketThesis,
  mockReport,
  mockRiskInterpretation,
} from "./mock";
import type { MarketAnalysisResult } from "@/lib/analysis/types";

export type LlmMode = "mock" | "openai";

export interface LlmContext {
  query: string;
  analysis: MarketAnalysisResult;
  interpretation: RiskInterpretation;
}

export interface LlmClient {
  readonly mode: LlmMode;
  /** True if a real provider is active (not mock). */
  readonly realProvider: boolean;
  generateIntent(query: string): Promise<Intent>;
  generateRiskInterpretation(analysis: MarketAnalysisResult): Promise<RiskInterpretation>;
  generateMarketThesis(
    analysis: MarketAnalysisResult,
    interpretation: RiskInterpretation
  ): Promise<MarketThesis>;
  generateReport(
    query: string,
    assets: {
      analysis: MarketAnalysisResult;
      interpretation: RiskInterpretation;
      thesis: MarketThesis;
    }[]
  ): Promise<Report>;
}

function resolveMode(): LlmMode {
  const provider = (process.env.LLM_PROVIDER ?? "mock").trim().toLowerCase();
  return provider === "openai" ? "openai" : "mock";
}

class OpenAiClient implements LlmClient {
  readonly mode: LlmMode = "openai";
  readonly realProvider = true;
  private model;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      throw new Error(
        "LLM_PROVIDER=openai requires OPENAI_API_KEY to be set. " +
          "Set the key in .env.local or use LLM_PROVIDER=mock."
      );
    }
    const client = createOpenAI({ apiKey });
    this.model = client(
      process.env.OPENAI_MODEL ?? "gpt-4o-mini"
    );
  }

  private async object<SCHEMA extends FlexibleSchema<unknown>>(
    schema: SCHEMA,
    system: string,
    user: string
  ): Promise<InferSchema<SCHEMA>> {
    const { object } = (await generateObject({
      model: this.model,
      schema,
      system,
      prompt: user,
    })) as unknown as { object: InferSchema<SCHEMA> };
    return object;
  }

  async generateIntent(query: string): Promise<Intent> {
    return this.object(IntentSchema,
      "Extract intent, symbols, timeframe and focus from a crypto market query. Neutral and structural.",
      query
    );
  }

  async generateRiskInterpretation(
    analysis: MarketAnalysisResult
  ): Promise<RiskInterpretation> {
    return this.object(
      RiskInterpretationSchema,
      "Interpret an existing deterministic market risk analysis. Do not recalculate scores. No advice.",
      JSON.stringify({
        symbol: analysis.symbol,
        risk: analysis.risk,
        readiness: analysis.readiness,
        volatility: analysis.volatility,
        trend: analysis.trend,
        drawdown: analysis.drawdown,
        liquidity: analysis.liquidity,
      })
    );
  }

  async generateMarketThesis(
    analysis: MarketAnalysisResult,
    interpretation: RiskInterpretation
  ): Promise<MarketThesis> {
    return this.object(
      MarketThesisSchema,
      "Write a neutral market research thesis. Never promise outcomes or profit. No buy/sell commands. Separate data from interpretation and state uncertainty.",
      JSON.stringify({
        analysis,
        interpretation,
      })
    );
  }

  async generateReport(
    query: string,
    assets: {
      analysis: MarketAnalysisResult;
      interpretation: RiskInterpretation;
      thesis: MarketThesis;
    }[]
  ): Promise<Report> {
    return this.object(
      ReportSchema,
      "Assemble a structured research report with an overall summary and a clear disclaimer. Neutral, non-advisory.",
      JSON.stringify({ query, assets })
    );
  }
}

class MockClient implements LlmClient {
  readonly mode: LlmMode = "mock";
  readonly realProvider = false;

  async generateIntent(query: string): Promise<Intent> {
    return IntentSchema.parse(mockIntent(query));
  }

  async generateRiskInterpretation(
    analysis: MarketAnalysisResult
  ): Promise<RiskInterpretation> {
    return RiskInterpretationSchema.parse(mockRiskInterpretation(analysis));
  }

  async generateMarketThesis(
    analysis: MarketAnalysisResult,
    interpretation: RiskInterpretation
  ): Promise<MarketThesis> {
    return MarketThesisSchema.parse(
      mockMarketThesis(analysis, interpretation)
    );
  }

  async generateReport(
    query: string,
    assets: {
      analysis: MarketAnalysisResult;
      interpretation: RiskInterpretation;
      thesis: MarketThesis;
    }[]
  ): Promise<Report> {
    return ReportSchema.parse(mockReport(query, assets));
  }
}

let clientSingleton: LlmClient | null = null;

export function getLlmClient(): LlmClient {
  if (clientSingleton) return clientSingleton;
  const mode = resolveMode();
  clientSingleton = mode === "openai" ? new OpenAiClient() : new MockClient();
  return clientSingleton;
}

/** For test/diagnostic use: report the active mode without constructing. */
export function llmMode(): LlmMode {
  return clientSingleton ? clientSingleton.mode : resolveMode();
}
