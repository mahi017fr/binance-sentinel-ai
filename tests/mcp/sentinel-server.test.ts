import { describe, it, expect, beforeEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import type { Icon } from "@modelcontextprotocol/sdk/types.js";
import {
  createSentinelMcpServer,
  createSentinelMcpServerWithBranding,
  SENTINEL_MCP_NAME,
  SENTINEL_MCP_VERSION,
} from "@/lib/mcp/sentinel-server";
import { resetFakeProvider } from "./mocks";

beforeEach(() => {
  resetFakeProvider();
});

async function connectClient() {
  const client = new Client({ name: "sentinel-test-client", version: "1.0.0" });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const mcpServer = createSentinelMcpServer();
  await mcpServer.connect(serverTransport);
  await client.connect(clientTransport);
  return { client, mcpServer };
}

describe("createSentinelMcpServer", () => {
  it("advertices identity", async () => {
    const { client } = await connectClient();
    const serverInfo = client.getServerVersion();
    expect(serverInfo?.name).toBe(SENTINEL_MCP_NAME);
    expect(serverInfo?.version).toBe(SENTINEL_MCP_VERSION);
  });

  it("exposes exactly the three read-only tools with annotations", async () => {
    const { client } = await connectClient();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(["analyze_market", "get_current_price", "get_market_data"]);

    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.annotations?.destructiveHint).toBe(false);
    }
  });

  it("each tool declares a symbol input with a description", async () => {
    const { client } = await connectClient();
    const { tools } = await client.listTools();
    const tool = tools.find((t) => t.name === "get_current_price")!;
    const properties = (tool.inputSchema as { properties?: Record<string, unknown> })
      .properties;
    const required = (tool.inputSchema as { required?: string[] }).required;
    expect(properties?.symbol).toBeDefined();
    expect(required).toContain("symbol");
  });

  it("calls get_current_price and returns data-backed structured content", async () => {
    const { client } = await connectClient();
    const result = await client.callTool({
      name: "get_current_price",
      arguments: { symbol: "BTCUSDT" },
    });
    expect(result.isError).toBeFalsy();
    expect(result.structuredContent).toBeDefined();
    const data = result.structuredContent as Record<string, unknown>;
    expect(data.symbol).toBe("BTCUSDT");
    expect(data.dataSource).toBe("Binance Public Market Data");
  });

  it("returns isError for an unsupported symbol", async () => {
    const { client } = await connectClient();
    const result = await client.callTool({
      name: "analyze_market",
      arguments: { symbol: "LTCUSDT" },
    });
    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain("Unsupported symbol");
  });

  it("returns isError for malformed input (missing symbol)", async () => {
    const { client } = await connectClient();
    const result = await client.callTool({
      name: "get_market_data",
      arguments: {},
    });
    expect(result.isError).toBe(true);
  });

  it("calls analyze_market and returns the full research result", async () => {
    const { client } = await connectClient();
    const result = await client.callTool({
      name: "analyze_market",
      arguments: { symbol: "ETHUSDT" },
    });
    expect(result.isError).toBeFalsy();
    const data = result.structuredContent as Record<string, unknown>;
    expect(data.symbol).toBe("ETHUSDT");
    expect(data.researchOnly).toBe(true);
    expect(data.directionalSignal).toBeDefined();
    expect(Array.isArray(data.evidence)).toBe(true);
  });

  it("exposes branded icons via tools/list when branding is configured", async () => {
    const iconUrl = "https://acme.example/icon.svg";
    const client = new Client({ name: "sentinel-brand-client", version: "1.0.0" });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const mcpServer = createSentinelMcpServerWithBranding({ iconUrl });
    await mcpServer.connect(serverTransport);
    await client.connect(clientTransport);

    const { tools } = await client.listTools();
    expect(tools).toHaveLength(3);

    for (const tool of tools) {
      const icons = tool.icons as Icon[] | undefined;
      expect(icons).toBeDefined();
      const svg = icons!.find((i) => i.mimeType === "image/svg+xml");
      const png = icons!.find((i) => i.mimeType === "image/png");
      expect(svg).toBeDefined();
      expect(svg!.src).toBe(iconUrl);
      expect(svg!.sizes).toEqual(["any"]);
      expect(png).toBeDefined();
      expect(png!.src).toBe("https://acme.example/icon-96.png");
      expect(png!.sizes).toContain("96x96");
      // Still functions and remains read-only even when branded.
      const result = await client.callTool({
        name: "get_current_price",
        arguments: { symbol: "BTCUSDT" },
      });
      expect(result.isError).toBeFalsy();
      expect(tool.annotations?.readOnlyHint).toBe(true);
    }

    await client.close();
    await mcpServer.close();
  });
});
