/**
 * Server-Sent-Events serialization for the streaming agent workflow.
 *
 * Each `StreamEvent` is encoded as a standard SSE frame:
 *
 *   event: <type>
 *   data: <json>
 *   <blank line>
 *
 * The stream is written as a fetch ReadableStream with `text/event-stream`
 * Content-Type. The data payload is always the JSON of the (possibly larger)
 * SSE data line — in this pipeline every event's JSON is well under the SSE
 * 16KB line limit, so single-line `data:` frames are sufficient.
 */

import type { StreamEvent } from "./types";

function jsonOf(event: StreamEvent): string {
  const payload: Record<string, unknown> = { ...event };
  delete payload.type;
  return JSON.stringify(payload);
}

function sseFrame(event: StreamEvent): string {
  const lines = [`event: ${event.type}`, `data: ${jsonOf(event)}`, ""];
  return `${lines.join("\n")}\n`;
}

/** Encode a single stream event as one SSE frame for the wire. */
export function encodeSseFrame(event: StreamEvent): string {
  return sseFrame(event);
}

/**
 * How the client parses frames: SSE frames are delimited by blank lines.
 * This is a shared contract note — the consumer (temporary test page / future
 * UI) splits the decoded body on `\n\n`, reads the `event:` and `data:` lines,
 * and JSON-parses the data.
 */
export const SSE_FRAME_DELIMITER = "\n\n";