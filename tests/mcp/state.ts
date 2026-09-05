import type { MarketDataProvider } from "@/lib/binance-agent-os/types";

/**
 * Dependency-free shared holder bridging the vi.mock'd adapter module and the
 * test bodies. Imported by both, so the mock factory never re-enters the
 * module graph it is mocking (no import cycle, no TDZ races).
 */
export const providerState: { provider: MarketDataProvider | null } = {
  provider: null,
};

export function setSharedProvider(provider: MarketDataProvider | null): void {
  providerState.provider = provider;
}