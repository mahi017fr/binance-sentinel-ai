/**
 * POST /api/analysis
 *
 * Runs the full multi-agent workflow for a natural-language query and streams
 * the progress back to the browser as Server-Sent Events.
 *
 *   body: { query: string }
 *
 * Request-validation failures (empty/overlong query, invalid JSON) return
 * plain JSON with a 4xx status BEFORE any streaming begins. A valid query
 * returns a `text/event-stream` response that progressively emits:
 *
 *   agent-start    → agent-complete    (once per agent, in pipeline order)
 *   report                             (validated final report)
 *   done                               (always last; `success` flags outcome)
 *
 * On a stage failure the stream emits `agent-error` followed by `done` with
 * `success: false`, then closes cleanly.
 *
 * LLM API keys are read server-side only and are never included in any event.
 */
import type { NextRequest } from "next/server";
import { pipelineEvents } from "@/lib/agents/orchestrator";
import { encodeSseFrame } from "@/lib/stream/sse";

const MAX_QUERY_LENGTH = 500;

const encoder = new TextEncoder();

function jsonError(message: string, status: number): Response {
  return Response.json({ success: false, error: message }, { status });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Request body must be valid JSON.", 400);
  }

  const query = (body as { query?: unknown })?.query;
  if (typeof query !== "string" || query.trim().length === 0) {
    return jsonError("A non-empty 'query' string is required.", 400);
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return jsonError(
      `Query is too long (max ${MAX_QUERY_LENGTH} characters).`,
      400
    );
  }

  const normalized = query.trim();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const event of pipelineEvents(normalized)) {
          controller.enqueue(encoder.encode(encodeSseFrame(event)));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          encoder.encode(encodeSseFrame({ type: "agent-error", error: message, timestamp: new Date().toISOString() }))
        );
        controller.enqueue(
          encoder.encode(encodeSseFrame({ type: "done", success: false, timestamp: new Date().toISOString() }))
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
