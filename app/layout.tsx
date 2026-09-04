import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Binance Sentinel AI",
    template: "%s · Binance Sentinel AI",
  },
  description:
    "Agentic market intelligence for explainable trade readiness — market data, trend strength, volatility, liquidity, and explainable risk analysis.",
  applicationName: "Binance Sentinel AI",
  keywords: [
    "crypto",
    "market intelligence",
    "risk analysis",
    "trade readiness",
    "Binance",
  ],
  authors: [{ name: "Binance Sentinel AI" }],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
