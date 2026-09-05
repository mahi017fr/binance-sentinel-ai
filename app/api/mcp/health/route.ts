import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Lightweight health/liveness endpoint for the remote MCP service. */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "Binance Sentinel AI MCP",
    tools: ["get_current_price", "get_market_data", "analyze_market"],
    readOnly: true,
  });
}