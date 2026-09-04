import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      "https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT",
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch Binance market data");
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      source: "Binance",
      data: {
        symbol: data.symbol,
        lastPrice: data.lastPrice,
        priceChange: data.priceChange,
        priceChangePercent: data.priceChangePercent,
        highPrice: data.highPrice,
        lowPrice: data.lowPrice,
        volume: data.volume,
        quoteVolume: data.quoteVolume,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Unable to fetch market data",
      },
      { status: 500 }
    );
  }
}