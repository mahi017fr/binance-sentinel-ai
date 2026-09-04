import { NextResponse } from "next/server";
import {
  getMarketDataProvider,
  getLastActiveProviderInfo,
} from "@/lib/binance-agent-os/adapter";

export async function GET() {
  try {
    const provider = getMarketDataProvider();
    const ticker = await provider.getTicker24h("BTCUSDT");
    const sourceInfo = getLastActiveProviderInfo();

    return NextResponse.json({
      success: true,
      source: sourceInfo?.id ?? provider.id,
      sourceName: sourceInfo?.name ?? provider.name,
      data: {
        symbol: ticker.symbol,
        lastPrice: ticker.lastPrice,
        priceChange: ticker.priceChange,
        priceChangePercent: ticker.priceChangePercent,
        highPrice: ticker.highPrice,
        lowPrice: ticker.lowPrice,
        volume: ticker.volume,
        quoteVolume: ticker.quoteVolume,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      {
        success: false,
        error: "Unable to fetch market data",
        detail: message,
      },
      { status: 500 }
    );
  }
}