import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { Readable } from "node:stream";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Tool } from "@modelcontextprotocol/sdk/types.js";
import { handleMcpRequest, mcpPreflightResponse } from "@/lib/mcp/transport";
import { resetFakeProvider } from "./mocks";

// Offline provider so no real network is ever contacted by the E2E tests.
vi.mock("@/lib/binance-agent-os/adapter", async () => {
  const { providerState } = await import("./state");
  return {
    getMarketDataProvider: () => providerState.provider!,
    getLastActiveProviderInfo: () =>
      providerState.provider
        ? { id: providerState.provider.id, name: providerState.provider.name }
        : null,
  };
});

interface TestServer {
  url: string;
  close(): Promise<void>;
}

/**
 * Spin up a real HTTP server that dispatches EXACTLY like
 * `app/api/mcp/route.ts` (OPTIONS → preflight, everything else → MCP handler).
 */
async function startTestServer(): Promise<TestServer> {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://127.0.0.1");
      const headers = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (value === undefined) continue;
        if (Array.isArray(value)) value.forEach((v) => headers.append(key, v));
        else headers.set(key, value);
      }

      let body: BodyInit | undefined;
      if (req.method !== "GET" && req.method !== "HEAD") {
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(chunk as Buffer);
        body = Buffer.concat(chunks);
      }

      const webRequest = new Request(url, {
        method: req.method ?? "GET",
        headers,
        body,
      });

      const mcpResponse =
        req.method === "OPTIONS"
          ? mcpPreflightResponse()
          : await handleMcpRequest(webRequest, { keepAliveMs: 300 });

      res.writeHead(
        mcpResponse.status,
        Object.fromEntries(mcpResponse.headers.entries())
      );

      if (!mcpResponse.body) {
        res.end();
        return;
      }

      const isSseGet =
        req.method === "GET" &&
        (mcpResponse.headers.get("content-type")?.includes("text/event-stream") ??
          false);

      if (isSseGet) {
        // SSE streams stay open — pipe and let the client manage the lifetime.
        Readable.fromWeb(mcpResponse.body as never)
          .on("error", () => res.end())
          .pipe(res);
      } else {
        res.end(Buffer.from(await mcpResponse.arrayBuffer()));
      }
    } catch {
      res.writeHead(500);
      res.end();
    }
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${address.port}/api/mcp`,
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}

/** Read a POST SSE response and return the last parsed JSON-RPC message. */
async function rpcPost(
  url: string,
  message: unknown,
  headers: Record<string, string> = {}
): Promise<{ status: number; json?: unknown; text: string; responseHeaders: Headers }> {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...headers,
    },
    body: JSON.stringify(message),
  });
  const text = await res.text();
  let json: unknown;
  for (const line of text.split("\n")) {
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data) continue;
    try {
      json = JSON.parse(data);
    } catch {
      // priming or partial frames — keep the last parsed event
    }
  }
  return { status: res.status, json, text, responseHeaders: res.headers };
}

const PROTOCOL = "2025-11-25";

function initializeMessage(batchReply = false) {
  void batchReply;
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: PROTOCOL,
      capabilities: {},
      clientInfo: { name: "e2e-test", version: "1.0.0" },
    },
  };
}

let server: TestServer | undefined;

beforeEach(async () => {
  resetFakeProvider();
  server = await startTestServer();
});

afterEach(async () => {
  await server?.close();
  server = undefined;
});

describe("POST /api/mcp (wire-level)", () => {
  it("handles initialize and returns capabilities + identity", async () => {
    const { status, json, responseHeaders } = await rpcPost(
      server!.url,
      initializeMessage()
    );
    expect(status).toBe(200);
    const result = (json as { result?: Record<string, unknown> }).result!;
    expect(result.protocolVersion).toBe(PROTOCOL);
    expect((result as { serverInfo: { name: string } }).serverInfo.name).toBe(
      "Binance Sentinel AI"
    );
    expect(result.capabilities).toMatchObject({ tools: {} });
    expect(responseHeaders.get("Access-Control-Allow-Origin")).toBe("*");
    expect(responseHeaders.get("mcp-protocol-version")).toBe(PROTOCOL);
  });

  it("lists the three read-only tools with annotations", async () => {
    const { json } = await rpcPost(server!.url, {
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });
    const tools = (json as { result: { tools: Tool[] } }).result.tools;
    expect(tools.map((t) => t.name).sort()).toEqual([
      "analyze_market",
      "get_current_price",
      "get_market_data",
    ]);
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.annotations?.destructiveHint).toBe(false);
    }
  });

  it("calls analyze_market and returns structured data", async () => {
    const { json } = await rpcPost(server!.url, {
      jsonrpc: "2.0",
      id: 3,
      method: "tools/call",
      params: { name: "analyze_market", arguments: { symbol: "BTCUSDT" } },
    });
    const result = (json as { result?: { structuredContent?: unknown } }).result!;
    expect(result.structuredContent).toBeDefined();
    const data = result.structuredContent as Record<string, unknown>;
    expect(data.symbol).toBe("BTCUSDT");
    expect(data.researchOnly).toBe(true);
  });

  it("returns isError for an unsupported symbol", async () => {
    const { json } = await rpcPost(server!.url, {
      jsonrpc: "2.0",
      id: 4,
      method: "tools/call",
      params: { name: "get_current_price", arguments: { symbol: "SHIBUSDT" } },
    });
    const result = json as {
      result?: { isError?: boolean; content?: Array<{ text: string }> };
    };
    expect(result.result?.isError).toBe(true);
    expect(result.result?.content?.[0].text).toContain("Unsupported symbol");
  });

  it("returns isError for malformed input", async () => {
    const { json } = await rpcPost(server!.url, {
      jsonrpc: "2.0",
      id: 5,
      method: "tools/call",
      params: { name: "get_market_data", arguments: {} },
    });
    const result = json as { result?: { isError?: boolean } };
    expect(result.result?.isError).toBe(true);
  });

  it("returns 400 without leaking internals for malformed JSON", async () => {
    const res = await fetch(server!.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: "{ definitely-not-json",
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: { message?: string } };
    expect(body.error?.message ?? "").not.toMatch(/stack|internal|sdk/i);
  });
});

describe("GET /api/mcp (SSE)", () => {
  it("serves text/event-stream for clients that accept it (with CORS)", async () => {
    const res = await fetch(server!.url, {
      method: "GET",
      headers: {
        Accept: "text/event-stream",
        "mcp-protocol-version": PROTOCOL,
      },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/event-stream");
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    // The stream stays open (keep-alive); cancel immediately rather than
    // waiting for the first keep-alive frame.
    await res.body!.cancel().catch(() => undefined);
  });
});

describe("OPTIONS /api/mcp", () => {
  it("returns a permissive CORS preflight", async () => {
    const res = await fetch(server!.url, { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toContain("POST");
    expect(res.headers.get("access-control-allow-headers")).toContain(
      "mcp-protocol-version"
    );
  });
});

describe("SDK Client E2E over Streamable HTTP", () => {
  it("drives initialize → listTools → callTool like a real connector client", async () => {
    const transport = new StreamableHTTPClientTransport(new URL(server!.url));
    const client = new Client({ name: "sdk-e2e", version: "1.0.0" });
    await client.connect(transport);

    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "analyze_market",
      "get_current_price",
      "get_market_data",
    ]);

    const price = await client.callTool({
      name: "get_current_price",
      arguments: { symbol: "BTCUSDT" },
    });
    expect(price.isError).toBeFalsy();
    expect((price.structuredContent as Record<string, unknown>).dataSource).toBe(
      "Binance Public Market Data"
    );

    const analysis = await client.callTool({
      name: "analyze_market",
      arguments: { symbol: "ETHUSDT" },
    });
    expect(analysis.isError).toBeFalsy();
    expect(
      (analysis.structuredContent as Record<string, unknown>).directionalSignal
    ).toBeDefined();

    await client.close();
  });
});